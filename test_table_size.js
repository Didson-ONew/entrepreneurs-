/* The table from two seats to six, and the deadline that can end it early.

   Two rules changed shape at once and both of them are counted, not eyeballed:

     THE TABLE GREW. Two to six seats. The three working tracks carry a fifth slot
     only at five players and a sixth only at six, so the squeeze on placement holds
     roughly steady instead of a sixth player finding every track already full.
     Board Meeting stays at two seats whatever the count - it is meant to be scarce.

     THE GAME GOT A DEADLINE. Three years, OR the close of the quarter in which any
     player launches their SECOND Megacorp. The quarter is always finished, so every
     seat has had the same number of turns when the scores are read.

   Run: node test_table_size.js
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadEngine() {
  const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
  const cut = src.indexOf("/* ============================== REACT UI ============================== */");
  if (cut < 0) { console.error("the engine marker moved - update this test"); process.exit(2); }
  const logic = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, byId, activeBiz, megacorpHQs, epTotal,
      advanceDraft, startPlanning, advancePlanning, finishQuarterAfterRepay,
      workingTrackSlots, makeTracks, endgameRushers, MEGACORPS_TO_END,
      drawMegacorpPool, MEGACORP_TIER, MEGACORP_TILES, PLAYER_COLORS, STARTING,
      DISCS_PER_PLAYER, workersPerPlayer };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n${t}`);
const quiet = () => {};

const SIZES = [2, 3, 4, 5, 6];

/* ------------------------------------------------------------------ seats */
section("Every table size deals a legal game");
for (const n of SIZES) {
  let st = null, err = null;
  try {
    st = E.initGame(n - 1, 4242 + n, ["Seat 1"], undefined, true, undefined);
  } catch (e) { err = e; }
  check(`${n} players: initGame returns a state`, !!st && !err, err ? String(err.message) : "");
  if (!st) continue;
  check(`${n} players: ${n} seats dealt`, st.players.length === n, `got ${st.players.length}`);
  /* the board paints a seat by its id, so the palette has to be at least as long
     as the table - a sixth seat with no colour draws as `undefined` everywhere */
  const colours = new Set(st.players.map((p) => E.PLAYER_COLORS[p.id]));
  check(`${n} players: every seat has its own colour`,
    colours.size === n && ![...colours].some((c) => !c), `${colours.size} distinct`);
  const cash = st.players.map((p) => p.cash);
  check(`${n} players: everyone was given starting cash`, cash.every((c) => c > 0), cash.join("/"));
  const discs = st.players.map((p) => p.discsInBank);
  check(`${n} players: nobody starts in debt`, discs.every((d) => d === 0), discs.join("/"));
}

/* ------------------------------------------------------------------ tracks */
section("The working tracks widen only at five and six seats");
const EXPECTED_SLOTS = { 2: 4, 3: 4, 4: 4, 5: 5, 6: 6 };
for (const n of SIZES) {
  check(`${n} players: workingTrackSlots says ${EXPECTED_SLOTS[n]}`,
    E.workingTrackSlots(n) === EXPECTED_SLOTS[n], `got ${E.workingTrackSlots(n)}`);
  const t = E.makeTracks(n);
  const widths = ["raise_capital", "ma", "rd"].map((k) => t[k].length);
  check(`${n} players: all three working tracks are ${EXPECTED_SLOTS[n]} wide`,
    widths.every((w) => w === EXPECTED_SLOTS[n]), widths.join("/"));
  check(`${n} players: Board Meeting stays at 2 seats`, t.board_meeting.length === 2,
    `got ${t.board_meeting.length}`);
  check(`${n} players: every slot starts empty`,
    [...t.raise_capital, ...t.ma, ...t.rd, ...t.board_meeting].every((s) => s === null));
}

section("There is always somewhere to put a worker");
for (const n of SIZES) {
  const t = E.makeTracks(n);
  const slots = t.raise_capital.length + t.ma.length + t.rd.length + t.board_meeting.length;
  const workers = n * (n === 2 ? 3 : 2);
  check(`${n} players: ${workers} workers, ${slots} slots`, slots > workers, `${workers} vs ${slots}`);
}

/* --------------------------------------------------------------- megacorps */
section("The Megacorp box grows with the table");
const EXPECTED_TILES = { 2: 4, 3: 6, 4: 8, 5: 8, 6: 8 };
for (const n of SIZES) {
  const pool = E.drawMegacorpPool(n, E.mulberry32(99));
  check(`${n} players: ${EXPECTED_TILES[n]} tiles in the box`, pool.length === EXPECTED_TILES[n],
    `got ${pool.length}`);
  const perTier = { 1: 0, 2: 0, 3: 0, 4: 0 };
  pool.forEach((t) => { perTier[E.MEGACORP_TIER[t[0]]]++; });
  const drawn = Object.entries(perTier).filter(([, c]) => c > 0);
  check(`${n} players: exactly two of every tier in play`,
    drawn.every(([, c]) => c === 2), JSON.stringify(perTier));
  const hardest = n >= 4 ? 1 : n >= 3 ? 2 : 3;
  check(`${n} players: hardest tier in the box is ${hardest}`,
    Math.min(...pool.map((t) => E.MEGACORP_TIER[t[0]])) === hardest, JSON.stringify(perTier));
}

/* ---------------------------------------------------------------- deadline */
section("A second Megacorp ends the game at the close of that quarter");
check("the deadline is two Megacorps", E.MEGACORPS_TO_END === 2, `got ${E.MEGACORPS_TO_END}`);
{
  const st = E.initGame(3, 7, ["You"], undefined, false, undefined);
  if (st.phase === "drafting") { E.advanceDraft(st, quiet); E.startPlanning(st); }
  const p = st.players[0];
  const fakeHQ = (name) => ({
    id: 900 + Math.floor(p.businesses.length + Math.random() * 0), isHQ: true, distressed: false,
    megacorpName: name, level: 1, footprint: [], bp: { ind: "MA", name: "shell" },
  });

  check("nobody is a rusher at the start", E.endgameRushers(st).length === 0);
  p.businesses.push(fakeHQ("Local Syndicate"));
  check("one Megacorp is not enough", E.endgameRushers(st).length === 0,
    `${E.megacorpHQs(p).length} HQ`);
  p.businesses.push(fakeHQ("Silent Merger"));
  check("two Megacorps names the rusher", E.endgameRushers(st).length === 1
    && E.endgameRushers(st)[0] === p, `${E.megacorpHQs(p).length} HQ`);

  /* a distressed shell is not a headquarters, and must not trip the deadline */
  const st2 = E.initGame(3, 7, ["You"], undefined, false, undefined);
  const q = st2.players[0];
  q.businesses.push({ isHQ: false, distressed: true, level: 1, footprint: [], bp: { ind: "MA", name: "shell" } });
  q.businesses.push({ isHQ: false, distressed: true, level: 1, footprint: [], bp: { ind: "MA", name: "shell" } });
  check("two distressed shells are not two Megacorps", E.endgameRushers(st2).length === 0);
}

section("The quarter is played out in full, then the game is over");
{
  const st = E.initGame(3, 11, ["You"], undefined, false, undefined);
  if (st.phase === "drafting") { E.advanceDraft(st, quiet); E.startPlanning(st); }
  st.quarter = 6;
  st.phase = "resolution";
  const p = st.players[1];
  const hq = (name) => ({ isHQ: true, distressed: false, megacorpName: name, level: 1,
    footprint: [], bp: { ind: "MA", name: "shell" } });
  p.businesses.push(hq("Local Syndicate"), hq("Silent Merger"));
  const lines = [];
  E.finishQuarterAfterRepay(st, (m) => lines.push(m), E.mulberry32(1));
  check("the game is over in Q6", st.phase === "gameover", `phase ${st.phase} in Q${st.quarter}`);
  check("it ended in the quarter the second Megacorp landed", st.quarter === 6, `Q${st.quarter}`);
  check("the log says why", lines.some((m) => /launched 2 Megacorps/.test(m)),
    lines.slice(-3).join(" | ").slice(0, 90));
  check("final scoring ran", st.players.every((q) => (q.epLog || []).some((e) => /Cash on hand|Unpaid loans|Real-Estate Mogul|Omnipresent/.test(e.label))));
}

section("One Megacorp still plays the full three years");
{
  const st = E.initGame(3, 11, ["You"], undefined, false, undefined);
  if (st.phase === "drafting") { E.advanceDraft(st, quiet); E.startPlanning(st); }
  st.quarter = 6;
  st.phase = "resolution";
  st.players[1].businesses.push({ isHQ: true, distressed: false, megacorpName: "Local Syndicate",
    level: 1, footprint: [], bp: { ind: "MA", name: "shell" } });
  E.finishQuarterAfterRepay(st, quiet, E.mulberry32(1));
  check("the game carries on into Q7", st.phase !== "gameover" && st.quarter === 7,
    `phase ${st.phase} in Q${st.quarter}`);
}

/* ------------------------------------------------------- full games, all sizes */
section("Full games finish at every table size");
for (const n of SIZES) {
  let done = 0, early = 0, quarters = 0, err = null;
  for (let seed = 1; seed <= 12; seed++) {
    try {
      const st = E.initGame(n - 1, seed * 31, ["Seat 1"], undefined, true, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, quiet); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(seed * 31 + 777), quiet);
      if (st.phase !== "gameover") continue;
      done++;
      quarters += st.quarter;
      if (st.quarter < 12) early++;
      /* whatever ended it, the scores must be real numbers */
      if (!st.players.every((p) => Number.isFinite(E.epTotal(p)))) throw new Error("a score is not a number");
      /* and the deadline must have been respected, not overshot */
      if (st.quarter < 12 && !E.endgameRushers(st).length) throw new Error(`ended in Q${st.quarter} with no rusher`);
    } catch (e) { err = err || e; }
  }
  check(`${n} players: 12 games all reach gameover`, done === 12 && !err,
    err ? String(err.message) : `${done}/12, avg last quarter ${(quarters / Math.max(1, done)).toFixed(1)}, ${early} ended early`);
}

console.log(fails ? `\n${fails} FAILED\n` : "\nall good\n");
process.exit(fails ? 1 : 0);
