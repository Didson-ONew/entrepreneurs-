/* ============================================================================
   Scaling the scoreboard back.

   Two dials, swept together so it is clear which one does what:

     LEVEL EP    a company level is worth 1 EP (new) or 3 (what it was).
     LAND        5 EP to the outright leader, 2 each on a two-way tie, 1 each on
                 three or more, nothing for second (new) - against 10 for first
                 and 5 for second, split between ties (what it was).

   Both are patched into the engine inside a sandbox; the repo file is never
   touched, so this measures the alternative without anybody having to switch
   back and forth.

   Run: node audit_scoring.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "300", 10);

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const base = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");

const NEEDLES = {
  level: 'const levelEP = (state) => (hasVariant(state, "tripleLevelEP") ? 3 : 1);',
  land: "const LAND_AWARD = { sole: 5, two: 2, many: 1 };",
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
};
for (const [k, v] of Object.entries(NEEDLES)) {
  if (!base.includes(v)) { console.error(`the engine changed shape around ${k} - update this probe`); process.exit(2); }
}

/* The old award: 10 for first, 5 for second, a tie splitting whatever it covers. */
const OLD_AWARD_BODY = `  scores.sort((a, b) => b.s - a.s);
  const values = [10, 5];
  let i = 0;
  while (i < scores.length && i < values.length) {
    let j = i;
    while (j + 1 < scores.length && scores[j + 1].s === scores[i].s) j++;
    const tiedCount = j - i + 1;
    const pot = values.slice(i, Math.min(j + 1, values.length)).reduce((a, b) => a + b, 0);
    const share = Math.floor(pot / tiedCount);
    if (share <= 0) { i = j + 1; continue; }
    for (let k = i; k <= j; k++) addEP(scores[k].p, share, label, state.quarter);
    i = j + 1;
  }`;

/* All on the new land award. The question left is what a company level is worth, and
   whether the 5 EP for entering an industry has to come down with it. */
const CASES = [
  { name: "3 EP level (now)", level: 3, land: "old", debut: 5 },
  { name: "1 EP + new land", level: 1, land: "new", debut: 5 },
  { name: "2 EP + new land", level: 2, land: "new", debut: 5 },
  { name: "1 EP, debut 3", level: 1, land: "new", debut: 3 },
  { name: "2 EP, debut 3", level: 2, land: "new", debut: 3 },
];

function engineFor(c) {
  let logic = base;
  if (c.level !== 1) logic = logic.replace(NEEDLES.level, `const levelEP = (state) => ${c.level};`);
  if (c.land === "old") logic = logic.replace(NEEDLES.awardBody, OLD_AWARD_BODY);
  if (c.debut !== 5) {
    const n = "  addEP(p, 5, `Entered ${ind}`, state.quarter);";
    if (!logic.includes(n)) { console.error("the industry debut moved - update this probe"); process.exit(2); }
    logic = logic.replace(n, "  addEP(p, " + c.debut + ", `Entered ${ind}`, state.quarter);");
  }
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advancePlanning, advanceDraft, startPlanning,
      activeBiz, megacorpHQs, epTotal, finalRank, plotCount, districtCount, bizInd,
      INDUSTRIES, DISCS_PER_PLAYER };
  `, sandbox);
  return box.exports;
}

function bucketOf(label) {
  const l = String(label || "");
  if (l.startsWith("Entered ")) return "industries";
  if (l.startsWith("Company:")) return "companies";
  if (l.startsWith("Megacorp brand:")) return "hq brand";
  if (l.startsWith("Megacorp district:")) return "hq district";
  if (l.startsWith("Megacorp:")) return "megacorp tiles";
  if (l === "The Real-Estate Mogul" || l === "The Omnipresent") return "land";
  if (l.startsWith("Cash on hand")) return "cash";
  if (l.startsWith("Ground rent")) return "rent";
  if (l.startsWith("Unpaid loans")) return "loans";
  return "other";
}
const BUCKETS = ["companies", "rent", "cash", "industries", "land", "megacorp tiles", "hq brand", "hq district", "loans", "other"];

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const results = [];

for (const c of CASES) {
  const E = engineFor(c);
  const T = {
    games: 0, seats: 0,
    built: Object.fromEntries(E.INDUSTRIES.map((i) => [i, 0])),
    upgraded: 0, companies: 0, levels: 0, plots: 0, hqs: 0,
    winnerEP: 0, secondEP: 0, lastEP: 0, winnerPlots: 0, winnerCompanies: 0,
    endCash: 0, leadWins: 0, leadGames: 0,
    ep: Object.fromEntries(BUCKETS.map((b) => [b, 0])),
    scores: [],
  };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const st = E.initGame(3, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;
    T.games++;
    for (const p of st.players) {
      T.seats++;
      T.plots += E.plotCount(st, p);
      T.endCash += p.cash;
      T.hqs += E.megacorpHQs(p).length;
      for (const b of p.businesses) {
        if (b.distressed) continue;
        T.companies++; T.levels += b.level;
        if (b.upgraded) T.upgraded++;
        T.built[E.bizInd(b)] += 1;
      }
      for (const e of p.epLog || []) T.ep[bucketOf(e.label)] += e.amount;
    }
    const ranked = [...st.players].sort(E.finalRank);
    const eps = ranked.map((p) => E.epTotal(p));
    T.winnerEP += eps[0]; T.secondEP += eps[1]; T.lastEP += eps[eps.length - 1];
    T.winnerPlots += E.plotCount(st, ranked[0]);
    T.winnerCompanies += E.activeBiz(ranked[0]).length;
    T.scores.push(eps);
  }
  results.push({ c, T });
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - what happens when the scoreboard is scaled back");
console.log(`${results[0].T.games} games per case, 4 seats, personas on, 2n Megacorp tiles.\n`);

const cols = results.map((r) => r.c.name);
const W = 18;
const head = () => console.log(pad("", 32) + cols.map((c) => rp(c, W)).join(""));
const row = (name, fn, dp = 1) =>
  console.log(pad(name, 32) + results.map((r) => rp(fn(r.T).toFixed(dp), W)).join(""));
const pctRow = (name, fn) =>
  console.log(pad(name, 32) + results.map((r) => rp(`${(100 * fn(r.T)).toFixed(0)}%`, W)).join(""));

head();
console.log("─".repeat(32 + W * cols.length));
row("winning score", (T) => T.winnerEP / T.games, 0);
row("second place", (T) => T.secondEP / T.games, 0);
row("last place", (T) => T.lastEP / T.games, 0);
row("winner's lead over second", (T) => (T.winnerEP - T.secondEP) / T.games);
row("winner's lead over last", (T) => (T.winnerEP - T.lastEP) / T.games);
pctRow("last place as a share of the winner", (T) => T.lastEP / T.winnerEP);
console.log("");
row("companies standing", (T) => T.companies / T.games);
row("of those, upgraded", (T) => T.upgraded / T.games);
row("company levels standing", (T) => T.levels / T.games);
row("plots owned at the end", (T) => T.plots / T.games);
row("Megacorps formed", (T) => T.hqs / T.games, 2);
row("cash left on the table, a seat", (T) => T.endCash / T.seats, 0);
console.log("");
row("winner's companies", (T) => T.winnerCompanies / T.games);
row("winner's plots", (T) => T.winnerPlots / T.games);

console.log("\nEvery seat's points, by source");
head();
for (const k of BUCKETS) {
  if (!results.some((r) => Math.abs(r.T.ep[k]) > 0.05)) continue;
  console.log(pad(`  ${k}`, 32) + results.map((r) => rp((r.T.ep[k] / r.T.seats).toFixed(1), W)).join(""));
}
console.log("\nAs a share of what a seat scores");
for (const k of BUCKETS) {
  if (!results.some((r) => Math.abs(r.T.ep[k]) > 0.05)) continue;
  console.log(pad(`  ${k}`, 32) + results.map((r) => {
    const total = BUCKETS.reduce((n, b) => n + Math.max(0, r.T.ep[b]), 0) || 1;
    return rp(`${(100 * Math.max(0, r.T.ep[k]) / total).toFixed(0)}%`, W);
  }).join(""));
}

console.log("\nCompanies built per game, by industry");
head();
for (const i of engineFor(CASES[0]).INDUSTRIES) {
  console.log(pad(`  ${i}`, 32) + results.map((r) =>
    rp((r.T.built[i] / r.T.games).toFixed(2), W)).join(""));
}
console.log("");
