/* ============================================================================
   Does the beginner game work?

   It is a teaching mode: two years instead of three, no Megacorps, and one
   action per track - LOAN, LAUNCH, RESEARCH, REPOSITION. Building claims its
   ground free, six discs instead of twelve, land scores districts only, and a
   company reaches one demand column above its level. BEGINNER_MODE.md has the
   whole design and why each piece is there.

   The supply chain is untouched, which is the point: production sells into the
   demand icons, operating costs go into the industry pots and are split among
   whoever owns companies there, and a build moves four prices. Everything cut
   is a subsystem that needs a second explanation.

   THIS IS NOT A BALANCE SWEEP. Nobody needs the teaching game to be perfectly
   fair; they need it to be a game. So it asks the three questions that decide
   whether it is one, and each has a way of coming out wrong:

     1. DOES ANYTHING COMPOUND? Eight quarters is short. If scores are flat
        after Q5, or the last two quarters add nothing, then it ends before the
        second-order effects a euro player came for ever appear, and it teaches
        a game nobody would want to graduate from. Measured as the share of the
        winner's score earned in each half, and companies standing by quarter.

     2. IS A BAD START FATAL? There is no BUY, no reclaim and no renovate, so a
        player whose companies fail has no way back in. Measured as how often a
        seat ends with nothing standing, and where a seat that was last at the
        halfway point finishes.

     3. IS THERE ONE LINE? RESEARCH into a level-2 or level-3 card is the only
        route to a big footprint, the only route to the fourth demand column,
        and the only route to spanning districts for one disc - which is now the
        whole land award. Three payoffs down one path. Measured as the level mix
        of what actually gets built, and whether the winner built taller than
        the table.

   The full game runs alongside as a reference, on the same seeds. It is not a
   fairness comparison - the two are different lengths and different games - it
   is there so "is that number small?" has something to be small against.

   WHAT IT FOUND - 200 games per arm at each of the mode's three table sizes,
   the full game on the same seeds as a reference. The mode seats four, so
   there is no 5p or 6p arm to run.

   1. THINGS COMPOUND. The last two quarters carry 32.8% of the winning score
      at two seats, 37.2% at three and 38.5% at four - against the full game's
      30.4 / 35.8 / 36.1. The endgame is worth the same share of a short game as
      of a long one, so eight quarters does not end before anything happens.
      More of the score is banked by halfway (44-49% against 31-40%), which is
      what a shorter game should look like.

   2. A BAD START IS NOT FATAL. It is gentler than the full game, by a lot. No
      seat ended with nothing standing at any table size, against 3.5% to 7.5%
      in the full game, and almost none was ever emptied at all (0-2.8% against
      32-42%). A seat last at halfway reached the top half 34.9% / 44.6% / 32.9%
      of the time against 29.7 / 43.8 / 24.9.

      The cost of that is worth stating: SOLVENCY IS CLOSE TO DEAD CODE here.
      It was kept as the only way out of a company, and it almost never fires.

   3. THERE IS NO ONE LINE. Level 3 is 27.6-34.7% of what gets built against the
      full game's 30.9-36.7%, and the winner's average company level is
      2.07-2.19 against a table average of 1.91-2.07. Winners build slightly
      taller; RESEARCH-into-a-level-3 is not the only game.

   CASH WAS THE ONE THING WORTH CHANGING, AND IT HAS BEEN CHANGED. It used to be
   21.8% of the winning score at two and three seats and 26.0% at four, against
   the full game's 14.9 / 13.3 / 14.1 - a teaching game in which a quarter of the
   answer was holding money, which is not what the full game teaches. The cause
   was structural: no land to buy, nothing to upgrade and no Megacorp to form
   left money with nowhere to go, and a seat ended this mode on about as much
   cash as a full game three quarters longer.

   Cash now scores only when it is SPENT, at a year end, at a price that rises
   ($50 at the end of Year 1, $100 at the end of Year 2), and money still on the
   table at the end is worth nothing. Measured over 300 games per arm per table,
   that puts cash at 12.5 / 11.7 / 14.5% against the full game's 15.3 / 14.0 /
   14.4, and end-of-game cash at $45-48 against $445-532. Nothing else paid for
   it: companies standing held at 4.33-4.45, lead changes moved 1.69/2.40/2.65 to
   1.60/2.37/2.74, and a seat last at halfway still reaches the top half 27.8-45.9%
   of the time. A LAUNCH-TIME ground charge was measured first and rejected: it
   is regressive, because the price rises with what is already built, and at two
   seats it put 43.3% of games wire to wire against 14.7%.

   What the money went to is companies and debuts: 43.5-45.4% and 24.1-25.2%
   against the full game's 34.6-35.0% and 12.1-12.7%. Land holds at 17.9-18.3% on
   the districts award alone, against 17.8-26.8% from two awards - level with the
   full game at four seats and behind it at two.

   TENSION IS FINE. Fewer lead changes per game than the full game - 1.60 / 2.37
   / 2.74 against 1.87 / 2.85 / 3.32 - but MORE per quarter at every table size,
   0.20 / 0.30 / 0.34 against 0.16 / 0.24 / 0.28, because the game is a third
   shorter. Games never headed at all run 14.3% at two seats against 17.0%, and
   7.7% / 5.7% at three and four against 6.0% / 1.7%: the short game leaves a
   little more room for a wire-to-wire winner at the bigger tables, not less.

   Run: node audit_beginner.js [games] [seats...]
        node audit_beginner.js 200 4
        node audit_beginner.js 200 2 3 4
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { logText, quarterOf } = require("./logtext.js");

const GAMES = parseInt(process.argv[2] || "120", 10);
const seedArg = process.argv.find((a) => a.startsWith("--seeds="));
const SEED0 = seedArg ? parseInt(seedArg.slice(8), 10) : 1;
const SEATS = process.argv.slice(3).filter((a) => !a.startsWith("--")).map(Number).filter(Boolean);
/* The beginner game seats four, so sweeping five and six would compare a table
   it allows against one it does not - the engine clamps them back to four and
   the rows would be duplicates wearing the wrong label. */
const TABLES = SEATS.length ? SEATS : [2, 3, 4];

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const base = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");

/* The mode is a shipped variant, so this probe does not splice rules - it only
   needs a snapshot at each quarter to answer "does anything compound?". That
   anchor is asserted so a moved one stops the run rather than silently
   measuring a game with no snapshots in it. */
const NEEDLES = {
  quarterEnd: "function finishQuarterAfterLH(state, log, rng) {\n  runClosingRest(state, log);",
  beginner: 'const isBeginner = (state) => hasVariant(state, "beginner");',
};
for (const [k, v] of Object.entries(NEEDLES)) {
  if (!base.includes(v)) {
    console.error(`the engine changed shape around ${k} - update this probe`);
    process.exit(2);
  }
}

function engine() {
  const logic = base.replace(NEEDLES.quarterEnd, NEEDLES.quarterEnd + "\n  box.snap(state);");
  const box = {
    snaps: [],
    snap(state) {
      box.snaps.push({
        q: state.quarter,
        ep: state.players.map((p) => box.ep(p)),
        biz: state.players.map((p) => box.active(p).length),
      });
    },
  };
  const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.ep = epTotal;
    box.active = activeBiz;
    box.exports = { initGame, mulberry32, advancePlanning, advanceDraft, startPlanning,
      epTotal, activeBiz, plotCount, districtCount, discsUsed, VARIANT_KEYS };
  `, sandbox);
  return { E: box.exports, box };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (n, d) => (d ? (100 * n) / d : 0);
const LAND_LABELS = ["The Real-Estate Mogul", "The Omnipresent"];
const epFrom = (p, match) => (p.epLog || []).filter(match).reduce((s, e) => s + e.amount, 0);

function run(beginner, seats, n) {
  const { E, box } = engine();
  const variants = beginner ? { beginner: true } : undefined;
  const o = {
    games: 0, lastQ: [],
    winEP: [], margin: [], spread: [], cashEnd: [],
    bizEnd: [], plotsEnd: [], districtsEnd: [], discsEnd: [],
    /* 1. compounding */
    firstHalfShare: [], lastTwoShare: [], bizAtHalf: [], bizAtEnd: [],
    /* 2. a bad start */
    seats: 0, endedEmpty: 0, wentEmpty: 0, lastAtHalfRecovered: 0, lastAtHalf: 0,
    /* 3. one line? */
    builtByLevel: [0, 0, 0], winnerLevels: [], tableLevels: [],
    /* the score mix that survives */
    mixCompany: [], mixDebut: [], mixLand: [], mixCash: [],
    /* tension, the honest way */
    changes: [], wireToWire: 0,
  };
  for (let seed = SEED0; o.games < n && seed < SEED0 + n * 5; seed++) {
    let st;
    box.snaps.length = 0;
    try {
      st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, variants);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    } catch (e) { continue; }
    if (!st || st.phase !== "gameover") continue;
    o.games++;
    o.lastQ.push(st.quarter);

    const eps = st.players.map((p) => E.epTotal(p));
    const order = st.players.map((p, i) => [i, eps[i]]).sort((a, b) => b[1] - a[1]);
    const wIdx = order[0][0];
    const winner = st.players[wIdx];
    o.winEP.push(order[0][1]);
    o.margin.push(order[0][1] - order[1][1]);
    o.spread.push(order[0][1] - order[order.length - 1][1]);
    o.cashEnd.push(mean(st.players.map((p) => p.cash)));
    o.bizEnd.push(mean(st.players.map((p) => E.activeBiz(p).length)));
    o.plotsEnd.push(mean(st.players.map((p) => E.plotCount(st, p))));
    o.districtsEnd.push(mean(st.players.map((p) => E.districtCount(st, p))));
    o.discsEnd.push(mean(st.players.map((p) => E.discsUsed(st, p))));

    /* --- 1. does anything compound? --------------------------------------- */
    const marks = box.snaps.filter((s) => s.ep.length === st.players.length);
    const half = Math.ceil(st.quarter / 2);
    const atHalf = marks.filter((m) => m.q <= half).pop();
    const twoBefore = marks.filter((m) => m.q <= st.quarter - 2).pop();
    const finalEP = order[0][1];
    if (atHalf && finalEP > 0) o.firstHalfShare.push(pct(atHalf.ep[wIdx], finalEP));
    if (twoBefore && finalEP > 0) o.lastTwoShare.push(pct(finalEP - twoBefore.ep[wIdx], finalEP));
    if (atHalf) o.bizAtHalf.push(mean(atHalf.biz));
    o.bizAtEnd.push(mean(st.players.map((p) => E.activeBiz(p).length)));

    /* --- 2. is a bad start fatal? ----------------------------------------- */
    st.players.forEach((p, i) => {
      o.seats++;
      if (!E.activeBiz(p).length) o.endedEmpty++;
      if (marks.some((m) => m.biz[i] === 0 && m.q > 2)) o.wentEmpty++;
    });
    if (atHalf) {
      const low = Math.min(...atHalf.ep);
      const lastIdxs = atHalf.ep.map((e, i) => [e, i]).filter(([e]) => e === low).map(([, i]) => i);
      if (lastIdxs.length === 1) {
        o.lastAtHalf++;
        const rank = order.findIndex(([i]) => i === lastIdxs[0]);
        if (rank < Math.ceil(seats / 2)) o.lastAtHalfRecovered++;   // climbed into the top half
      }
    }

    /* --- 3. is there one line? -------------------------------------------- */
    const levelsOf = (p) => E.activeBiz(p).map((b) => b.level);
    st.players.forEach((p) => levelsOf(p).forEach((L) => { if (L >= 1 && L <= 3) o.builtByLevel[L - 1]++; }));
    const wl = levelsOf(winner);
    if (wl.length) o.winnerLevels.push(mean(wl));
    const all = st.players.flatMap(levelsOf);
    if (all.length) o.tableLevels.push(mean(all));

    /* --- the mix that survives -------------------------------------------- */
    if (finalEP > 0) {
      o.mixCompany.push(pct(epFrom(winner, (e) => /^Company: /.test(String(e.label && e.label.k || e.label))), finalEP));
      o.mixDebut.push(pct(epFrom(winner, (e) => /^Entered /.test(String(e.label && e.label.k || e.label))), finalEP));
      o.mixLand.push(pct(epFrom(winner, (e) => LAND_LABELS.includes(e.label)), finalEP));
      /* EP that came from money, under either rule: the old flat "Cash on hand"
         line at final scoring, and the year-end purchase that replaced it. */
      o.mixCash.push(pct(epFrom(winner, (e) => /[Cc]ash|^Bought \d+ EP/.test(String(e.label && e.label.k || e.label))), finalEP));
    }

    /* --- tension: lead changes, not "the leader won" ---------------------- */
    const track = marks.map((m) => m.ep).concat([eps]);
    let leader = null, changes = 0;
    for (const ep of track) {
      const top = Math.max(...ep);
      if (top <= 0) continue;
      const tied = ep.map((e, i) => [e, i]).filter(([e]) => e === top).map(([, i]) => i);
      if (leader === null || !tied.includes(leader)) {
        if (leader !== null) changes++;
        leader = tied[0];
      }
    }
    o.changes.push(changes);
    if (changes === 0) o.wireToWire++;
  }
  return o;
}

/* -------------------------------------------------------------------- report */
console.log(`\n${GAMES} games per arm per table, seeds from ${SEED0}\n`);

for (const seats of TABLES) {
  const B = run(true, seats, GAMES);
  const F = run(false, seats, GAMES);
  console.log(`${"=".repeat(74)}\n${seats} PLAYERS   (beginner / full game, same seeds)\n`);

  const row = (label, f) => console.log(`  ${label.padEnd(34)} ${f(B).padStart(10)}   ${f(F).padStart(10)}`);
  console.log(`  ${"".padEnd(34)} ${"beginner".padStart(10)}   ${"full".padStart(10)}`);
  row("quarters played", (o) => mean(o.lastQ).toFixed(1));
  row("winning score", (o) => mean(o.winEP).toFixed(1));
  row("margin over second", (o) => mean(o.margin).toFixed(1));
  row("first-to-last spread", (o) => mean(o.spread).toFixed(1));
  row("companies standing at the end", (o) => mean(o.bizEnd).toFixed(2));
  row("districts held", (o) => mean(o.districtsEnd).toFixed(2));
  row("discs committed", (o) => mean(o.discsEnd).toFixed(2));
  row("cash at the end", (o) => mean(o.cashEnd).toFixed(0));

  console.log(`\n  1. DOES ANYTHING COMPOUND?`);
  row("winner's score by the halfway mark", (o) => mean(o.firstHalfShare).toFixed(1) + "%");
  row("...earned in the last two quarters", (o) => mean(o.lastTwoShare).toFixed(1) + "%");
  row("companies standing at halfway", (o) => mean(o.bizAtHalf).toFixed(2));

  console.log(`\n  2. IS A BAD START FATAL?`);
  row("seats ending with nothing standing", (o) => pct(o.endedEmpty, o.seats).toFixed(1) + "%");
  row("seats emptied at some point", (o) => pct(o.wentEmpty, o.seats).toFixed(1) + "%");
  row("last at halfway reaching top half", (o) => pct(o.lastAtHalfRecovered, o.lastAtHalf).toFixed(1) + "%");

  console.log(`\n  3. IS THERE ONE LINE?`);
  row("companies built at level 1", (o) => pct(o.builtByLevel[0], o.builtByLevel.reduce((a, b) => a + b, 0)).toFixed(1) + "%");
  row("...at level 2", (o) => pct(o.builtByLevel[1], o.builtByLevel.reduce((a, b) => a + b, 0)).toFixed(1) + "%");
  row("...at level 3", (o) => pct(o.builtByLevel[2], o.builtByLevel.reduce((a, b) => a + b, 0)).toFixed(1) + "%");
  row("winner's average company level", (o) => mean(o.winnerLevels).toFixed(2));
  row("the table's average", (o) => mean(o.tableLevels).toFixed(2));

  console.log(`\n  WHERE THE WINNER'S POINTS COME FROM`);
  row("companies", (o) => mean(o.mixCompany).toFixed(1) + "%");
  row("industry debuts", (o) => mean(o.mixDebut).toFixed(1) + "%");
  row("land awards", (o) => mean(o.mixLand).toFixed(1) + "%");
  row("cash", (o) => mean(o.mixCash).toFixed(1) + "%");

  console.log(`\n  TENSION`);
  row("lead changes per game", (o) => mean(o.changes).toFixed(2));
  row("never headed all game", (o) => pct(o.wireToWire, o.games).toFixed(1) + "%");
  console.log("");
}
