/* ============================================================================
   Giving the table one quarter's warning before the deadline falls.

   audit_deadline.js found that the second-Megacorp rule inverts its own
   purpose: the player who pulls it was already leading in 54-89% of the games
   it ends and wins 49-79% of them, outside two standard errors at every table
   size. That is selection - assembling two Megacorps takes most of a good game
   - so no bot tuning can break the link.

   What CAN be changed is the response window. As it ships the deadline fires
   and the game ends in the same breath: the second Megacorp IS the last
   quarter. The proposal is to make it CALL the last quarter instead - the game
   ends at the close of the FOLLOWING quarter, capped at Q12 as always. The
   table then gets one full round to answer: cash out, merge, buy the land, sell
   the company they were going to sell anyway.

   Three things are counted, and the middle one is what decides it:

     does the trigger still win? If a warning quarter is worth anything it
     should pull that rate down toward the chance line.

     DOES THE TABLE ACTUALLY USE THE QUARTER? A warning nobody can act on is
     just a longer game. Companies launched, upgrades taken, plots bought and
     Megacorps formed during the warning quarter are counted separately, so
     "they had a round" can be told apart from "they did something with it".

     what it costs in length. The rule exists partly to shorten games; a warning
     quarter gives some of that back.

   WHAT IT FOUND, over 300 games a table size: NOT PROVEN, DO NOT SHIP.

   The direction is right everywhere and the size is nowhere near significance.
   The trigger's win rate falls at every table size - 48.8% to 38.9% at four
   seats, 56.6% to 50.0% at six - but the fired-game samples are small and every
   one of those gaps sits inside two standard errors, by a wide margin (a 6.6
   point move against a +/-34 point band at six seats). On this evidence the
   warning cannot be said to do anything at all.

   Worse, look at WHY the samples shrank. The deadline fires early in 14-18% of
   games as it ships and only 4-8% with a warning, because pushing the end one
   quarter later lands most triggers on Q12, where the game was ending anyway.
   So the warning quarter does not rebalance the rule so much as DEFUSE it: the
   rule simply stops applying to half the games it used to. If that is the
   desired outcome, deleting the rule says it more honestly than adding a
   mechanism that quietly cancels it.

   One row in the report below is a tautology and should be read as one: the
   "same, ends-at-once (baseline)" line is 0.00 everywhere because in the shipped
   rule there IS no quarter after the trigger, so no action can be logged in it.
   It says nothing about whether people would use a warning quarter; it only
   confirms the quarter does not currently exist. The launches, upgrades and
   mergers counted above it are real, but they measure activity in roughly one
   and a half quarters (the rest of the triggering quarter plus the warning one),
   not in the warning quarter alone.

   Tightening these bands to resolve a 6-10 point effect would take a very large
   number of seeds. The cheaper question to settle first is what the deadline is
   FOR - see audit_deadline.js - because if it is a pace rule it is already doing
   its job, and if it is a catch-up rule this is not the repair.

   Run: node audit_deadline_warning.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "400", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const NEEDLE = `  const rushers = endgameRushers(state);
  if (state.quarter >= 12 || rushers.length) {`;
if (!BASE.includes(NEEDLE)) { console.error("the game-over check changed shape - update this probe"); process.exit(2); }

/* The warning version: the second Megacorp names the final quarter rather than
   being it. Capped at 12, so it can only ever shorten the game. */
const PATCHED = `  const rushers = endgameRushers(state);
  if (rushers.length && !state.finalQuarter) state.finalQuarter = Math.min(12, state.quarter + 1);
  if (state.quarter >= 12 || (state.finalQuarter && state.quarter >= state.finalQuarter)) {`;

function loadEngine(warn) {
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext((warn ? BASE.replace(NEEDLE, PATCHED) : BASE) + `
    box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
      epTotal, finalRank, megacorpHQs, endgameRushers, activeBiz, plotCount };
  `, sandbox);
  return box.exports;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const noise = (p, n) => 100 * 2 * Math.sqrt((p * (1 - p)) / Math.max(1, n));

const SIZES = [2, 3, 4, 5, 6];
const MODES = [{ key: "ends at once", warn: false }, { key: "one quarter's warning", warn: true }];
const results = {};

for (const mode of MODES) {
  const E = loadEngine(mode.warn);
  for (const seats of SIZES) {
    const T = {
      games: 0, fired: 0, quarters: 0, cut: 0,
      triggerWon: 0, wasLeader: 0,
      spread: 0, gapToSecond: 0, winnerEP: 0,
      actLaunch: 0, actUpgrade: 0, actPlot: 0, actMega: 0, warnQuarters: 0,
    };
    for (let seed = 1; seed <= SEEDS; seed++) {
      const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }

      /* Watch what happens after the deadline is called. `warned` flips the moment a
         seat holds two headquarters, and every action logged after that is counted. */
      let q = 1, warned = false;
      E.advancePlanning(st, E.mulberry32(seed + 777), (msg) => {
        const s = String(msg);
        const m = /^▶ Year \d+, Quarter (\d+)/.exec(s);
        if (m) {
          q = parseInt(m[1], 10);
          if (warned) T.warnQuarters++;
          return;
        }
        if (!warned && st.players.some((p) => E.megacorpHQs(p).length >= 2)) warned = true;
        if (!warned) return;
        if (/ launches /.test(s)) T.actLaunch++;
        else if (/ upgrades /.test(s)) T.actUpgrade++;
        else if (/ buys .*plot|buys the plot|buys land/i.test(s)) T.actPlot++;
        else if (/ forms Megacorp /.test(s)) T.actMega++;
      });
      if (st.phase !== "gameover") continue;
      T.games++;
      T.quarters += st.quarter;

      const ranked = [...st.players].sort(E.finalRank);
      const winner = ranked[0];
      T.winnerEP += E.epTotal(winner);
      T.spread += E.epTotal(ranked[0]) - E.epTotal(ranked[ranked.length - 1]);
      T.gapToSecond += E.epTotal(ranked[0]) - E.epTotal(ranked[1]);

      const rushers = E.endgameRushers(st);
      if (st.quarter < 12 && rushers.length) {
        T.fired++;
        T.cut += 12 - st.quarter;
        if (rushers.some((p) => p === winner)) T.triggerWon++;
        const before = st.players
          .map((p) => ({ p, ep: (p.epLog || []).filter((e) => e.quarter < st.quarter).reduce((s, e) => s + e.amount, 0) }))
          .sort((a, b) => b.ep - a.ep);
        if (rushers.some((p) => p === before[0].p)) T.wasLeader++;
      }
    }
    results[`${mode.key}|${seats}`] = T;
  }
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - one quarter's warning on the second-Megacorp deadline");
console.log(`${SEEDS} games per mode per table size, personas on.\n`);

const W = 13;
const head = () => console.log(pad("", 40) + SIZES.map((s) => rp(`${s}p`, W)).join(""));
const line = (name, mode, fn, dp = 1) =>
  console.log(pad(name, 40) + SIZES.map((s) => rp(fn(results[`${mode}|${s}`]).toFixed(dp), W)).join(""));
const lpct = (name, mode, fn) =>
  console.log(pad(name, 40) + SIZES.map((s) => rp(`${(100 * fn(results[`${mode}|${s}`])).toFixed(0)}%`, W)).join(""));

head();
console.log("─".repeat(40 + W * SIZES.length));
console.log("Does the trigger still win?  <- decides it");
lpct("  ends at once", "ends at once", (T) => T.triggerWon / Math.max(1, T.fired));
lpct("  one quarter's warning", "one quarter's warning", (T) => T.triggerWon / Math.max(1, T.fired));
lpct("  chance at this table size", "ends at once", (T) => 0);
console.log(pad("  chance at this table size", 40) + SIZES.map((s) => rp(`${(100 / s).toFixed(0)}%`, W)).join(""));
console.log("");
console.log("Was the trigger already leading when it fired?");
lpct("  ends at once", "ends at once", (T) => T.wasLeader / Math.max(1, T.fired));
lpct("  one quarter's warning", "one quarter's warning", (T) => T.wasLeader / Math.max(1, T.fired));
console.log("");
console.log("How often it fires, and what it costs in length");
lpct("  fires, ends at once", "ends at once", (T) => T.fired / Math.max(1, T.games));
lpct("  fires, one quarter's warning", "one quarter's warning", (T) => T.fired / Math.max(1, T.games));
line("  quarters cut, ends at once", "ends at once", (T) => T.cut / Math.max(1, T.fired));
line("  quarters cut, with warning", "one quarter's warning", (T) => T.cut / Math.max(1, T.fired));
console.log("");
console.log("Did the table USE the warning quarter?  (actions after the deadline was called)");
line("  launches per warned game", "one quarter's warning", (T) => T.actLaunch / Math.max(1, T.fired), 2);
line("  upgrades per warned game", "one quarter's warning", (T) => T.actUpgrade / Math.max(1, T.fired), 2);
line("  Megacorps per warned game", "one quarter's warning", (T) => T.actMega / Math.max(1, T.fired), 2);
line("  same, ends-at-once (baseline)", "ends at once", (T) => (T.actLaunch + T.actUpgrade) / Math.max(1, T.fired), 2);
console.log("");
console.log("The shape of the finish");
line("  lead over last, ends at once", "ends at once", (T) => T.spread / Math.max(1, T.games));
line("  lead over last, with warning", "one quarter's warning", (T) => T.spread / Math.max(1, T.games));
line("  winning score, ends at once", "ends at once", (T) => T.winnerEP / Math.max(1, T.games), 0);
line("  winning score, with warning", "one quarter's warning", (T) => T.winnerEP / Math.max(1, T.games), 0);

console.log("\nIs the change in the trigger's win rate real?");
for (const s of SIZES) {
  const a = results[`ends at once|${s}`], b = results[`one quarter's warning|${s}`];
  const ra = a.triggerWon / Math.max(1, a.fired), rb = b.triggerWon / Math.max(1, b.fired);
  const band = noise(ra, a.fired) + noise(rb, b.fired);
  const d = 100 * (rb - ra);
  console.log(`  ${s} players   ${a.fired} vs ${b.fired} fired   `
    + `${(100 * ra).toFixed(1)}% -> ${(100 * rb).toFixed(1)}%   `
    + `${d >= 0 ? "+" : ""}${d.toFixed(1)} points   `
    + `${Math.abs(d) > band ? "OUTSIDE THE NOISE" : `inside the noise (±${band.toFixed(1)})`}`);
}
console.log("");
