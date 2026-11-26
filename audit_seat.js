/* ============================================================================
   Is the seat you draw worth more than the game you play?

   TWO PLAYTESTERS, MONTHS APART, NAMED THE SAME THING. Amy's one wish was
   "every starter player gets same resources + money", and her frustration was
   "being 4th player". Rick, at three seats: "FIRST PLAYER ADVANTAGE IS WAY TOO
   HIGH. Not only is the first player handed the first to act, they also start
   with the most money... being selected as the first player is basically
   godsend." His wand was to REVERSE the starting money.

   audit_first_player.js already measures what HOLDING first player is worth and
   finds it close to nothing - the seat that held it most wins 34.1% of the time
   at three players against a 33.3% baseline. But that is a different question.
   It measures a privilege players take during the game. This measures the seat
   they were DEALT, which bundles three things that arrive together:

     capital     seat 1 starts on $25 at three players, seat 3 on $19
     cards       and seat 1 on one Blueprint against seat 3's three
     order       turn order is set once at seating and never rotates. The only
                 thing that moves it is REPOSITION, which costs a player every
                 worker they have. So seat 1 delivers first - into demand icons
                 that are first come, first served - and places the Logistic Hub,
                 potentially for the whole game.

   Seats are randomised against bot archetypes by initGame, so over enough games
   a seat's win rate is the seat's own, not its personality's.

   THE ARMS
     current    as it ships
     flatCash   every seat starts on the table's mean capital; cards untouched
     flatAll    every seat starts on the mean capital AND the mean card count
     reversed   the capital column reversed - Rick's wand - cards untouched
     rotate     turn order rotates one seat every quarter, so first player comes
                round to everybody; capital and cards untouched

   EVERYTHING BELOW WAS RE-MEASURED AFTER v21. The findings this header used to
   carry were taken before built-ground land awards, branch rent and the new card
   ladder went in, and they did not survive the change. They are kept at the
   bottom, marked, because a probe that quietly swaps its conclusion is a probe
   nobody can check.

   WHAT IT FINDS NOW - 1000 games an arm a table size, all five arms, seeds
   1..1000, cross-checked against a 400-game block at --len 12.

   SEAT 2 IS THE BEST SEAT, AND BOTH ENDS OF THE TABLE PAY FOR IT. At three
   players seat 2 wins 41.9% against a 33.3% baseline while seat 1 takes 28.7%
   and seat 3 takes 29.3% - the two extremes land within half a point of each
   other and the middle runs away with it. At four players it is 26.0 / 29.5 /
   23.0 / 21.5. The compensation curve is not too steep or too shallow, it is the
   WRONG SHAPE: most capital and fewest cards is a bad hand, fewest capital and
   most cards is also a bad hand, and the seat holding the middle of both beats
   them. That is not the problem the old numbers described and it does not have
   the same fix.

   AND THE FIX REVERSED TOO. flatAll - equal capital AND equal cards - used to be
   the only arm that closed the gap and is now among the worst: it hands three
   players a 11.6-point spread by making seat 1 dominant at 38.0%, and at four
   players it OPENS the spread, 9.3 against a shipped 8.0. What closes it now is
   the pair that used to fail. REVERSED, which is Rick's wand, takes four players
   to a 4.4-point spread from 8.0 and three to 8.8 from 13.2. ROTATE takes three
   to 7.0. Rick asked for the capital column to be reversed, this probe told him
   it made things worse, and on the rebalanced game he is right. The reason is
   legible: v21 pays for building EARLY and building WIDE, so capital compounds
   where it used to sit, and handing the most of it to the seat that also moves
   first stacks two advantages that now multiply.

   HANNA, PLAYING ONE YEAR, SAID THE LAST PLAYER IS SET TO LOSE - AND AT THAT
   LENGTH SHE IS RIGHT. Her table played FOUR QUARTERS, so --len was added to cut
   the game rather than argue with her. At four players and four quarters the last
   seat wins 17.5% against a 25.0% baseline, a 16.8-point spread; at eight it is
   24.1% and 3.9; at twelve, 21.5% and 8.0. A Blueprint is only worth what you
   have time to build and run, so the late seat's three cards need a game long
   enough to pay, while capital and delivery order pay from quarter one. The
   compensation is sized for twelve quarters and is simply wrong at four.

   THAT MAKES IT A LENGTH-DEPENDENT RULE, not a flat one, and it is the strongest
   argument in this file: whatever the opening table becomes, the beginner game
   and any one-year teaching game need their own, because flatAll at four quarters
   is the worst arm measured anywhere here (20.1-point spread at three players)
   and reversed is the best.

   WHAT IS STILL NOT MODELLED, and it is the honest reason a table may disagree
   in the other direction: bots do not fight over demand icons the way a human
   reading the board does. The ENGINE enforces delivery order - turn order decides
   who sells first and icons are first come first served - but a bot does not
   build somewhere BECAUSE a rival would reach the icon first. Chris, at Hanna's
   table, wrote that there "was no challenge to Player 1". That is the part these
   numbers cannot price.

   THE HUB BLINDNESS IS GONE and it changed nothing. placeNewLH picked uniformly
   at random until recently, so the one first-player privilege that never expires
   was worth zero in every simulation here. It now scores each candidate plot.
   Measured either way the verdict did not move: in audit_first_player the seat
   holding first longest wins 34.0% with aiming and 33.9% without at three
   players, 27.3% against 25.5% at four. Aiming is worth about two points at four
   seats and nothing at three, because first player circulates - held 1.8 quarters
   in a row at four players, with REPOSITION taken five times a game.

   SUPERSEDED, kept for the record - the pre-v21 run, 400 games an arm: seat 1
   worst at 27.9% and seat 3 best at 40.0% at three players; reversing the capital
   pushed seat 3 to 40.5% and rotating to 44.1%; flatAll closed the spread to 1.3
   points against a shipped 12.1. Every one of those statements is false on the
   current engine. Nothing about the probe changed - the game did.

   Run: node audit_seat.js [games a table size] [seats...] [--len N]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ARGV = process.argv.slice(2);
/* --len is pulled out before the seat list is read, or its argument would be
   counted as a table size. */
const LEN_AT = ARGV.indexOf("--len");
const LEN = LEN_AT >= 0 ? parseInt(ARGV[LEN_AT + 1], 10) : 0;
if (LEN_AT >= 0) ARGV.splice(LEN_AT, 2);
const GAMES = parseInt(ARGV[0] || "300", 10);
const SEATS = ARGV.slice(1).map(Number).filter(Boolean);
const SIZES = SEATS.length ? SEATS : [3, 4];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* Every arm is a splice on an exact line. A line that has moved stops the probe
   rather than letting it quietly measure the shipped game five times over. */
const STARTING_NEEDLE = `const STARTING = {
  6: [[25, 1], [22, 2], [22, 2], [19, 3], [19, 3], [16, 4]],
  5: [[25, 1], [22, 2], [22, 2], [19, 3], [16, 4]],
  4: [[25, 1], [22, 2], [22, 2], [19, 3]],
  3: [[25, 1], [22, 2], [19, 3]],
  2: [[20, 2], [20, 2]],
};`;
const FINAL_NEEDLE = `const finalQuarterOf = (state) => (isBeginner(state) ? BEGINNER_QUARTERS : 12);`;
const YEAREND_NEEDLE = `const yearEndsOf = (state) => (isBeginner(state) ? [4, 8] : [4, 8, 12]);`;
const ROTATE_NEEDLE = `  state.quarter += 1;
  log(logMsg("\\u25b6 Year {0}, Quarter {1}", Math.ceil(state.quarter / 4), state.quarter), null);`;
const NEEDLES = [["STARTING", STARTING_NEEDLE], ["quarter advance", ROTATE_NEEDLE]];
if (LEN) NEEDLES.push(["the final quarter", FINAL_NEEDLE], ["the year ends", YEAREND_NEEDLE]);
for (const [name, needle] of NEEDLES) {
  if (!BASE.includes(needle)) {
    console.error(`the engine changed shape around ${name} - update this probe`);
    process.exit(2);
  }
}

/* The shipped table, read back out of the engine so the arms are derived from it
   rather than typed again here and left to drift. */
const SHIPPED = {
  6: [[25, 1], [22, 2], [22, 2], [19, 3], [19, 3], [16, 4]],
  5: [[25, 1], [22, 2], [22, 2], [19, 3], [16, 4]],
  4: [[25, 1], [22, 2], [22, 2], [19, 3]],
  3: [[25, 1], [22, 2], [19, 3]],
  2: [[20, 2], [20, 2]],
};
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function tableFor(mode) {
  const out = {};
  for (const [n, rows] of Object.entries(SHIPPED)) {
    const cash = rows.map((r) => r[0]), cards = rows.map((r) => r[1]);
    if (mode === "flatCash") out[n] = rows.map((r) => [Math.round(mean(cash)), r[1]]);
    else if (mode === "flatAll") out[n] = rows.map(() => [Math.round(mean(cash)), Math.round(mean(cards))]);
    else if (mode === "reversed") out[n] = rows.map((r, i) => [cash[cash.length - 1 - i], r[1]]);
    else out[n] = rows.map((r) => [r[0], r[1]]);
  }
  return out;
}
const ARMS = ["current", "flatCash", "flatAll", "reversed", "rotate"];

function engine(arm) {
  let logic = BASE;
  /* A shorter game, if one was asked for. The land award still pays at every
     year end that FITS - a four-quarter game pays it once, which is what a table
     playing one year actually sees. */
  if (LEN) {
    logic = logic.replace(FINAL_NEEDLE, `const finalQuarterOf = (state) => ${LEN};`);
    logic = logic.replace(YEAREND_NEEDLE,
      `const yearEndsOf = (state) => ${JSON.stringify([4, 8, 12].filter((q) => q <= LEN))};`);
  }
  if (arm !== "current" && arm !== "rotate") {
    logic = logic.replace(STARTING_NEEDLE, "const STARTING = " + JSON.stringify(tableFor(arm)) + ";");
  }
  if (arm === "rotate") {
    /* First player comes round to everybody instead of being a thing you are
       dealt. REPOSITION still works on top of it. */
    logic = logic.replace(ROTATE_NEEDLE,
      "  state.turnOrder = [...state.turnOrder.slice(1), state.turnOrder[0]];\n" + ROTATE_NEEDLE);
  }
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.e = { initGame, advanceDraft, advancePlanning, startPlanning, mulberry32, epTotal, activeBiz };
  `, sandbox);
  return box.e;
}

/* One game, driven to the end with no human in it. Returns the finishing EP in
   SEAT order - seat 0 is whoever turn order started with. */
function play(E, seats, seed) {
  const quiet = () => {};
  let st;
  try {
    st = E.initGame(seats - 1, seed, ["Seat"], undefined, true, undefined);
    st.players[0].isHuman = false;            // nobody to pause for: the game runs to the end
    if (st.phase === "drafting") { E.advanceDraft(st, quiet); E.startPlanning(st); }
    var seating = [...st.turnOrder];          // captured before REPOSITION can touch it
    E.advancePlanning(st, E.mulberry32(seed + 777), quiet);
  } catch (e) { return null; }
  if (!st || st.phase !== "gameover") return null;
  return seating.map((id) => {
    const p = st.players.find((x) => x.id === id);
    return { ep: E.epTotal(p), biz: E.activeBiz(p).length };
  });
}

const pct = (x) => (100 * x).toFixed(1) + "%";
console.log(`\n${GAMES} games an arm a table size, seeds 1..${GAMES}, all-bot tables` +
  (LEN ? `, cut to ${LEN} quarters.` : "."));
console.log("Seat 1 is first in turn order at setup: most capital, fewest cards, first to deliver.\n");

for (const n of SIZES) {
  console.log("=".repeat(62));
  console.log(`${n} PLAYERS      chance would give each seat ${pct(1 / n)}`);
  const rows = [];
  for (const arm of ARMS) {
    const E = engine(arm);
    const wins = new Array(n).fill(0), eps = Array.from({ length: n }, () => []);
    let played = 0;
    for (let g = 0; g < GAMES; g++) {
      const r = play(E, n, g + 1);
      if (!r) continue;
      played++;
      const best = Math.max(...r.map((x) => x.ep));
      const champs = r.map((x, i) => (x.ep === best ? i : -1)).filter((i) => i >= 0);
      champs.forEach((i) => (wins[i] += 1 / champs.length));   // split a dead heat
      r.forEach((x, i) => eps[i].push(x.ep));
    }
    rows.push({ arm, played, wins: wins.map((w) => w / played), eps: eps.map(mean) });
  }

  const pad = (s, w) => String(s).padStart(w);
  console.log("\n  WIN RATE BY SEAT");
  console.log("    arm        " + Array.from({ length: n }, (_, i) => pad("seat " + (i + 1), 9)).join("") + pad("spread", 10));
  for (const r of rows) {
    const spread = Math.max(...r.wins) - Math.min(...r.wins);
    console.log("    " + r.arm.padEnd(11) + r.wins.map((w) => pad(pct(w), 9)).join("") + pad(pct(spread), 10));
  }
  console.log("\n  FINAL SCORE BY SEAT (EP)");
  console.log("    arm        " + Array.from({ length: n }, (_, i) => pad("seat " + (i + 1), 9)).join("") + pad("seat1-last", 12));
  for (const r of rows) {
    console.log("    " + r.arm.padEnd(11) + r.eps.map((e) => pad(e.toFixed(1), 9)).join("")
      + pad((r.eps[0] - r.eps[n - 1]).toFixed(1), 12));
  }
  console.log(`\n  (${rows[0].played}/${GAMES} games reached a final score in the current arm)`);
}
console.log();
