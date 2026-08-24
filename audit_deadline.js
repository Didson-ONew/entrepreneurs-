/* ============================================================================
   The second Megacorp as a deadline: who pulls it, and does pulling it pay?

   The rule is that the game ends at the close of the quarter in which any player
   launches their SECOND Megacorp, if that comes before Quarter 12. It was added
   to put a clock on a runaway leader. Whether it does that or the opposite is an
   empirical question, and there are two ways it can go wrong:

     IT REWARDS THE LEADER. If the player who pulls the trigger almost always
     wins, the rule is not a deadline at all - it is a second prize for the
     person already ahead, and it takes away the quarters the table needed to
     catch up.

     THE BOTS DO NOT KNOW IT EXISTS. Nothing in the bot's merge decision looks at
     how many headquarters it already has, so a bot with one Megacorp will take a
     second one on the same reasoning it took the first: is this tile worth more
     than the companies it eats. If that ends the game while the bot is behind,
     the rule is firing on somebody it hurts, which is worth knowing before any
     human is asked to play against it.

   What is counted here, per table size:

     how often the deadline fires at all, and in which quarter
     whether the player who pulled it won, against the chance line for that table
     what the standings looked like at the moment it fired - was the trigger the
       leader, or someone reaching from behind
     how much of the game the rule actually cut off

   Nothing is patched. This measures the rules as they stand.

   Run: node audit_deadline.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "400", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, box };
vm.createContext(sandbox);
vm.runInContext(BASE + `
  box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
    epTotal, finalRank, megacorpHQs, endgameRushers, MEGACORPS_TO_END, activeBiz };
`, sandbox);
const E = box.exports;

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const noise = (p, n) => 100 * 2 * Math.sqrt((p * (1 - p)) / Math.max(1, n));

const SIZES = [2, 3, 4, 5, 6];
const runs = [];

for (const seats of SIZES) {
  const T = {
    seats, games: 0, fired: 0, quarters: 0, cutShort: 0,
    triggerWon: 0, triggerWasLeader: 0, triggerRank: 0,
    leadAtFire: 0, finalLeadFired: 0, finalLeadFull: 0, fullGames: 0,
    byQuarter: {},
  };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;
    T.games++;

    const ranked = [...st.players].sort(E.finalRank);
    const finalLead = E.epTotal(ranked[0]) - E.epTotal(ranked[ranked.length - 1]);
    const rushers = E.endgameRushers(st);

    if (st.quarter >= 12 || !rushers.length) {
      T.fullGames++;
      T.finalLeadFull += finalLead;
      continue;
    }

    T.fired++;
    T.quarters += st.quarter;
    T.cutShort += 12 - st.quarter;
    T.byQuarter[st.quarter] = (T.byQuarter[st.quarter] || 0) + 1;
    T.finalLeadFired += finalLead;

    /* Whoever holds two headquarters at the close is the trigger. If more than one
       does, the game had two of them in the same quarter; count them all, which is
       the honest thing to do and is rare enough not to distort the rate. */
    const won = rushers.some((p) => p === ranked[0]);
    if (won) T.triggerWon++;
    T.triggerRank += rushers.reduce((best, p) => Math.min(best, ranked.indexOf(p) + 1), 99);

    /* Where the trigger stood at the moment it fired, reconstructed from the EP log:
       everything scored in the closing quarter is stripped off, and the standings are
       read from what was banked before it. */
    const beforeThisQuarter = (p) => (p.epLog || [])
      .filter((e) => e.quarter < st.quarter)
      .reduce((s, e) => s + e.amount, 0);
    const board = st.players.map((p) => ({ p, ep: beforeThisQuarter(p) })).sort((a, b) => b.ep - a.ep);
    if (rushers.some((p) => p === board[0].p)) T.triggerWasLeader++;
    T.leadAtFire += board[0].ep - board[board.length - 1].ep;
  }
  runs.push(T);
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - the second-Megacorp deadline");
console.log(`${SEEDS} games per table size, personas on, rules as they stand.\n`);

const W = 16;
const head = () => console.log(pad("", 36) + runs.map((T) => rp(`${T.seats} players`, W)).join(""));
const row = (name, fn, dp = 1) =>
  console.log(pad(name, 36) + runs.map((T) => rp(fn(T).toFixed(dp), W)).join(""));
const pct = (name, fn) =>
  console.log(pad(name, 36) + runs.map((T) => rp(`${(100 * fn(T)).toFixed(0)}%`, W)).join(""));

head();
console.log("─".repeat(36 + W * runs.length));
pct("games the deadline ended", (T) => T.fired / Math.max(1, T.games));
row("  the quarter it fired in", (T) => T.quarters / Math.max(1, T.fired));
row("  quarters it cut off", (T) => T.cutShort / Math.max(1, T.fired));
console.log("");
pct("the trigger won that game", (T) => T.triggerWon / Math.max(1, T.fired));
pct("  chance, at this table size", (T) => 1 / T.seats);
row("  where the trigger placed", (T) => T.triggerRank / Math.max(1, T.fired), 2);
pct("the trigger was already leading", (T) => T.triggerWasLeader / Math.max(1, T.fired));
console.log("");
row("lead over last when it fired", (T) => T.leadAtFire / Math.max(1, T.fired));
row("final lead, games it ended", (T) => T.finalLeadFired / Math.max(1, T.fired));
row("final lead, games that ran to Q12", (T) => T.finalLeadFull / Math.max(1, T.fullGames));

console.log("\nWhich quarter it fired in (share of the games it ended)");
head();
for (let q = 5; q <= 11; q++) {
  if (!runs.some((T) => T.byQuarter[q])) continue;
  console.log(pad(`  Q${q}`, 36) + runs.map((T) =>
    rp(`${(100 * (T.byQuarter[q] || 0) / Math.max(1, T.fired)).toFixed(0)}%`, W)).join(""));
}

console.log("\nIs the trigger's win rate telling us anything?");
for (const T of runs) {
  const chance = 1 / T.seats;
  const rate = T.triggerWon / Math.max(1, T.fired);
  const band = noise(chance, T.fired);
  const delta = 100 * (rate - chance);
  console.log(`  ${pad(`${T.seats} players`, 12)}${rp(`${T.fired} games`, 12)}`
    + `${rp(`${(100 * rate).toFixed(1)}%`, 10)}${rp(`${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`, 9)}`
    + `   two standard errors ±${band.toFixed(1)}`
    + (Math.abs(delta) > band ? "   OUTSIDE THE NOISE" : "   inside the noise"));
}
console.log("");
