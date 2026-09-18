/* ============================================================================
   Where the points come from, at every table size, under two land rules.

   THE QUESTION. Land is one of eight things that pay EP. How big a slice is it
   next to companies, industry debuts, Megacorps and cash - and how does that
   slice move if the land awards go back to being RANKED, 10 to the outright
   leader and 5 to second?

   Two arms, the same seeds, the same bots:

     CURRENT   5 EP to the sole leader of each category, 2 each on a two-way tie
     10/5      10 to first, 5 to second, a tie splitting the places it covers -
               and LAND_AWARD.sole moves to 10 as well, so the bots price a plot
               at what it is now worth. Measuring the new payout with bots that
               still think land is worth 5 measures the wrong game; audit_land_
               awards.js keeps the unaware arm as a control and it is small.

   Both arms are run at 2,3,4,5,6 seats. The proposal only applies the ranked
   award from 3 seats up - at 2 a "second place" is the other player, which is
   not a race - but the 2p row is printed anyway so the cost of leaving it alone
   is visible.

   Every EP in this game is stamped with a label when it is banked, so the mix
   below is the game's own accounting, not an inference.

   Run: node audit_ep_mix.js [games a table size]   (default 250)
        node audit_ep_mix.js 400 --seeds=90000
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "250", 10);
const seedArg = process.argv.find((a) => a.startsWith("--seeds="));
const SEED0 = seedArg ? parseInt(seedArg.slice(8), 10) : 1;
const SIZES = [2, 3, 4, 5, 6];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const base = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const NEEDLES = {
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
  epLabel: "p.epLog.push({ label, amount, quarter });",
  mogul: 'awardRanked(state, (p) => plotCount(state, p), "The Real-Estate Mogul", log);',
};
for (const [k, v] of Object.entries(NEEDLES)) {
  if (!base.includes(v)) { console.error(`the engine changed shape around ${k} - update this probe`); process.exit(2); }
}

/* A ranked award: values[0] to first, values[1] to second, and a tie splits whatever
   places it covers, floored. values is written in by engineFor. */
const RANKED_BODY = (values) => `  scores.sort((a, b) => b.s - a.s);
  const values = ${JSON.stringify(values)};
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

function engineFor(arm) {
  let logic = base;
  if (arm.values) {
    logic = logic.replace(NEEDLES.awardBody, RANKED_BODY(arm.values));
    /* The bots price a plot through LAND_AWARD.sole (see worthChasingLand), so the
       constant moves with the payout or the arm measures bots playing the old rule. */
    const [f, sec] = arm.values;
    logic = logic.replace(NEEDLES.landConst,
      `const LAND_AWARD = { sole: ${f}, two: ${Math.max(1, Math.round((f + sec) / 2))}, many: ${Math.max(1, Math.round(f / 3))} };`);
  }
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
      epTotal, finalRank, plotCount, districtCount };
  `, sandbox);
  return box.exports;
}

function bucketOf(label) {
  if (label.startsWith("Company:")) return "Companies & upgrades";
  if (label.startsWith("Entered ")) return "Industry debuts";
  if (label.startsWith("Megacorp brand:")) return "Megacorp brand";
  if (label.startsWith("Megacorp district:")) return "Megacorp districts";
  if (label.startsWith("Megacorp:")) return "Forming a Megacorp";
  if (label === "The Real-Estate Mogul" || label === "The Omnipresent") return "Land awards";
  if (label.startsWith("Cash on hand")) return "Cash on hand";
  if (label.startsWith("Unpaid loans")) return "Unpaid loans";
  return "Other";
}
const BUCKETS = ["Companies & upgrades", "Cash on hand", "Land awards", "Industry debuts",
  "Forming a Megacorp", "Megacorp brand", "Megacorp districts", "Unpaid loans", "Other"];

function run(E, seats) {
  const T = { games: 0, all: {}, win: {}, allTot: 0, winTot: 0,
    winnerEP: 0, landWinner: 0, landTable: 0, landLeaderWon: 0, landLeaderKnown: 0,
    margin: 0, q6Known: 0, q6Won: 0, bottomWon: 0 };
  BUCKETS.forEach((b) => { T.all[b] = 0; T.win[b] = 0; });
  for (let s = SEED0; s < SEED0 + GAMES; s++) {
    const st = E.initGame(seats - 1, s, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    /* Making land pay more could just hand the leader another thing to be ahead at,
       so the runaway numbers are read on the same games rather than assumed. */
    const snap = {};
    E.advancePlanning(st, E.mulberry32(s + 777), (msg) => {
      const m = /^\u25b6 Year \d+, Quarter (\d+)/.exec(String(msg));
      if (m) snap[+m[1]] = st.players.map((x) => ({ id: x.id, ep: E.epTotal(x) }));
    });
    if (st.phase !== "gameover") continue;
    T.games++;
    const winner = [...st.players].sort(E.finalRank)[0];
    T.winnerEP += E.epTotal(winner);
    const eps = st.players.map((x) => E.epTotal(x)).sort((a, b) => b - a);
    T.margin += eps[0] - (eps[1] !== undefined ? eps[1] : eps[0]);
    const s6 = snap[6] && [...snap[6]].sort((a, b) => b.ep - a.ep);
    /* A shared lead is not a lead, so those games are evidence neither way. */
    if (s6 && s6.filter((x) => x.ep === s6[0].ep).length === 1) {
      T.q6Known++;
      if (s6[0].id === winner.id) T.q6Won++;
      const half = Math.floor(s6.length / 2);
      if (new Set(s6.slice(s6.length - half).map((x) => x.id)).has(winner.id)) T.bottomWon++;
    }
    /* Did the seat that ended up holding the most ground also win? A prize nobody
       who chases it ever wins is a trap, whatever it pays. */
    const plots = st.players.map((p) => ({ p, n: E.plotCount(st, p) }));
    const top = Math.max(...plots.map((x) => x.n));
    const lead = plots.filter((x) => x.n === top);
    if (top > 0 && lead.length === 1) {
      T.landLeaderKnown++;
      if (lead[0].p.id === winner.id) T.landLeaderWon++;
    }
    for (const p of st.players) {
      for (const line of (p.epLog || [])) {
        const b = bucketOf(String(line.label));
        T.all[b] += line.amount; T.allTot += line.amount;
        if (b === "Land awards") T.landTable += line.amount;
        if (p.id === winner.id) {
          T.win[b] += line.amount; T.winTot += line.amount;
          if (b === "Land awards") T.landWinner += line.amount;
        }
      }
    }
  }
  return T;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const pc = (x, tot) => (tot > 0 ? (100 * x / tot).toFixed(1) + "%" : "-");

/* The arms. "current" is what ships; the rest are ranked awards at different rates.
   The rate matters more than it looks: both awards pay at THREE moments (the Year 1
   and Year 2 ends, and final scoring), and there are TWO of them, so whatever goes on
   this line is multiplied by six before it reaches the scoresheet. 10/5 is 90 EP put
   on the table over a game; the rule as it ships puts up 30. */
const PRESETS = {
  base: [
    { key: "current", name: "5 to the sole leader (as it ships)" },
    { key: "10/5", name: "10 first / 5 second", values: [10, 5] },
    { key: "7/3", name: "7 first / 3 second", values: [7, 3] },
    { key: "5/2", name: "5 first / 2 second", values: [5, 2] },
  ],
  /* Does paying SECOND place do any of the work? The first sweep said no: 5/2 left
     the plot leader winning no more often than 5/0 does, while 10/5 helped - which
     points at the first-place rate, not the ranking, as the term that matters. These
     arms pair each rate with and without a runner-up prize to settle it. */
  rate: [
    { key: "current", name: "5 to the sole leader (as it ships)" },
    { key: "8/0", name: "8 to first, nothing to second", values: [8] },
    { key: "8/4", name: "8 first / 4 second", values: [8, 4] },
    { key: "10/0", name: "10 to first, nothing to second", values: [10] },
    { key: "10/5", name: "10 first / 5 second", values: [10, 5] },
  ],
  /* The rate sweep put 8/0 under chance from four seats up and 10/0 over it
     everywhere, so the answer is between them. */
  fine: [
    { key: "current", name: "5 to the sole leader (as it ships)" },
    { key: "8/0", name: "8 to the sole leader", values: [8] },
    { key: "9/0", name: "9 to the sole leader", values: [9] },
    { key: "10/0", name: "10 to the sole leader", values: [10] },
  ],
};
const setArg = process.argv.find((a) => a.startsWith("--arms="));
const ARMS = PRESETS[setArg ? setArg.slice(7) : "base"];
if (!ARMS) { console.error(`no such arm set - try ${Object.keys(PRESETS).join(", ")}`); process.exit(2); }

const R = {};
for (const arm of ARMS) {
  const E = engineFor(arm);
  R[arm.key] = {};
  for (const n of SIZES) R[arm.key][n] = run(E, n);
}

console.log(`\n${GAMES} games a table size, seeds ${SEED0}..${SEED0 + GAMES - 1}, all-bot tables.\n`);

for (const arm of ARMS) {
  console.log(`SHARE OF THE WINNER'S SCORE - ${arm.name}`);
  console.log("  " + pad("source", 22) + SIZES.map((n) => rp(n + "p", 8)).join(""));
  for (const b of BUCKETS) {
    if (SIZES.every((n) => R[arm.key][n].win[b] === 0)) continue;
    console.log("  " + pad(b, 22)
      + SIZES.map((n) => rp(pc(R[arm.key][n].win[b], R[arm.key][n].winTot), 8)).join(""));
  }
  console.log("  " + pad("winning score (EP)", 22)
    + SIZES.map((n) => rp((R[arm.key][n].winnerEP / Math.max(1, R[arm.key][n].games)).toFixed(1), 8)).join("") + "\n");
}

console.log("LAND, SIDE BY SIDE");
console.log("  " + pad("", 30) + SIZES.map((n) => rp(n + "p", 8)).join(""));
const block = (title, fn) => {
  console.log("  " + title);
  for (const arm of ARMS) console.log("    " + pad(arm.key, 28) + SIZES.map((n) => rp(fn(R[arm.key][n], n), 8)).join(""));
};
block("land as % of the winner's score", (T) => pc(T.win["Land awards"], T.winTot));
block("land EP banked by the winner", (T) => (T.landWinner / Math.max(1, T.games)).toFixed(1));
block("land EP paid to the whole table", (T) => (T.landTable / Math.max(1, T.games)).toFixed(1));
/* Who ends up holding the most ground, and do they win? A prize the chaser loses is
   a trap however big it is; "chance" is what an indifferent seat would take. */
block("the plot leader wins this often", (T) => pc(T.landLeaderWon, T.landLeaderKnown) + "");
console.log("    " + pad("chance would give", 28) + SIZES.map((n) => rp((100 / n).toFixed(1) + "%", 8)).join(""));
console.log("\nDOES A BIGGER PRIZE FEED THE LEADER?");
block("the Q6 leader goes on to win", (T) => pc(T.q6Won, T.q6Known));
console.log("    " + pad("chance would give", 28) + SIZES.map((n) => rp((100 / n).toFixed(1) + "%", 8)).join(""));
block("a bottom-half seat at Q6 comes back", (T) => pc(T.bottomWon, T.q6Known));
block("the winner's margin over second (EP)", (T) => (T.margin / Math.max(1, T.games)).toFixed(1));
console.log("");
