/* ============================================================================
   How many ownership discs should a player get?

   Every disc is committed somewhere: on a plot, on an active company, or in the
   bank against a loan. Ten is a hard ceiling on how much city one player can
   hold, and it binds hardest on the three industries that scale sideways - a
   level-3 Manufacturing company alone spends four discs, three of them on land.

   This plays the same seeds at 10, 12 and 15 discs and reports what changes:
   what gets built, how far it gets upgraded, how much land is held, how the
   score is made up, and how often a disc was the thing standing in the way.

   Run: node audit_discs.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "150", 10);
const COUNTS = [10, 12, 15];

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const base = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");
if (!base.includes("const DISCS_PER_PLAYER = 10;")) {
  console.error("the disc count is not where this probe expects it");
  process.exit(2);
}

function engineWith(discs) {
  let logic = base.replace("const DISCS_PER_PLAYER = 10;", `const DISCS_PER_PLAYER = ${discs};`);
  /* Watch the R&D track ask whether a company can grow, so we can see what stopped it. */
  const needle = "    const candidates = starved ? [] : activeBiz(p).filter((b) => !b.upgraded";
  if (!logic.includes(needle)) { console.error("the R&D track changed shape"); process.exit(2); }
  logic = logic.replace(needle, "    __probe(state, p, starved);\n" + needle);
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box, __probe: (...a) => probe(...a) };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advancePlanning, advanceDraft, startPlanning,
      activeBiz, epTotal, bizInd, upgradeScaling, adjacentOwnedFreePlots, orthOf,
      plotValue, bizSetup, discsFree, plotCount, districtCount, finalRank, INDUSTRIES,
      DISCS_PER_PLAYER, upgradeBlockedReason };
  `, sandbox);
  return box.exports;
}

let probe = () => {};
let T = null;
const newTally = (E) => ({
  games: 0, seats: 0,
  built: Object.fromEntries(E.INDUSTRIES.map((i) => [i, 0])),
  upgraded: Object.fromEntries(E.INDUSTRIES.map((i) => [i, 0])),
  levels: 0, plots: 0, loans: 0,
  winnerEP: 0, winnerPlots: 0, winnerDistricts: 0, winnerCompanies: 0,
  blocked: {}, looks: 0,
  epByBucket: { companies: 0, land: 0, cash: 0, industries: 0, megacorps: 0, ipo: 0, loans: 0, other: 0 },
});

function bucketOf(label) {
  const l = String(label || "");
  if (l.startsWith("Entered ")) return "industries";
  if (l.startsWith("Vested:")) return "companies";
  if (l.startsWith("Megacorp:")) return "megacorps";
  if (l === "IPO tile") return "ipo";
  if (l === "The Real-Estate Mogul" || l === "The Omnipresent") return "land";
  if (l.startsWith("Cash on hand")) return "cash";
  if (l.startsWith("Unpaid loans")) return "loans";
  return "other";
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);

const results = {};
for (const discs of COUNTS) {
  const E = engineWith(discs);
  T = newTally(E);
  /* Why can this horizontal company not grow right now? Asked every time the bot
     considers upgrading, which is the moment the answer matters. */
  probe = (state, p, starved) => {
    if (!T || starved) return;
    for (const b of E.activeBiz(p)) {
      if (b.upgraded || b.isHQ) continue;
      if (E.upgradeScaling(p, b) !== "H") continue;
      T.looks++;
      const bump = (k) => { T.blocked[k] = (T.blocked[k] || 0) + 1; };
      if (E.adjacentOwnedFreePlots(state.board, b.footprint).length) { bump("ready to grow"); continue; }
      const nb = new Set();
      b.footprint.forEach((pk) => E.orthOf(state.board, pk).forEach((n) => { if (!b.footprint.includes(n)) nb.add(n); }));
      const unowned = [...nb].filter((k) => !(k in state.board.owner));
      if (!unowned.length) { bump("boxed in by other buildings"); continue; }
      if (E.discsFree(state, p) <= 0) { bump("out of discs"); continue; }
      const need = Math.min(...unowned.map((k) => E.plotValue(state, k))) + E.bizSetup(b);
      if (p.cash < need) { bump("out of money"); continue; }
      bump("could buy the plot right now");
    }
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
      T.loans += p.discsInBank;
      for (const b of p.businesses) {
        T.built[E.bizInd(b)] += 1;
        if (b.upgraded) T.upgraded[E.bizInd(b)] += 1;
        T.levels += b.level;
      }
      for (const e of p.epLog || []) T.epByBucket[bucketOf(e.label)] += e.amount;
    }
    const winner = [...st.players].sort(E.finalRank)[0];
    T.winnerEP += E.epTotal(winner);
    T.winnerPlots += E.plotCount(st, winner);
    T.winnerDistricts += E.districtCount(st, winner);
    T.winnerCompanies += E.activeBiz(winner).length;
  }
  results[discs] = { T, IND: E.INDUSTRIES };
  probe = () => {};
  T = null;
}

/* ---------------------------------------------------------------- report */
const any = results[COUNTS[0]];
const IND = any.IND;
console.log(`Entrepreneurs - what changes if a player gets more discs`);
console.log(`${any.T.games} games each at ${COUNTS.join(", ")} discs, 4 seats, personas on\n`);

const row = (label, fn, dp = 1) => {
  console.log(pad(label, 34) + COUNTS.map((d) => rp(fn(results[d].T).toFixed(dp), 10)).join(""));
};
console.log(pad("", 34) + COUNTS.map((d) => rp(`${d} discs`, 10)).join(""));
console.log("─".repeat(34 + 10 * COUNTS.length));
row("companies built per game", (T) => IND.reduce((n, i) => n + T.built[i], 0) / T.games);
row("of those, upgraded", (T) => IND.reduce((n, i) => n + T.upgraded[i], 0) / T.games);
row("total company levels standing", (T) => T.levels / T.games);
row("plots owned at the end", (T) => T.plots / T.games);
row("loan discs still in the bank", (T) => T.loans / T.games);
console.log("");
row("winning score", (T) => T.winnerEP / T.games, 0);
row("winner's companies", (T) => T.winnerCompanies / T.games);
row("winner's plots", (T) => T.winnerPlots / T.games);
row("winner's districts", (T) => T.winnerDistricts / T.games);

console.log("\nUpgrades per game, by industry");
console.log(pad("", 34) + COUNTS.map((d) => rp(`${d} discs`, 10)).join(""));
for (const i of IND) {
  console.log(pad(`  ${i}`, 34) + COUNTS.map((d) =>
    rp((results[d].T.upgraded[i] / results[d].T.games).toFixed(2), 10)).join(""));
}

console.log("\nCompanies built per game, by industry");
for (const i of IND) {
  console.log(pad(`  ${i}`, 34) + COUNTS.map((d) =>
    rp((results[d].T.built[i] / results[d].T.games).toFixed(2), 10)).join(""));
}

console.log("\nWhere every seat's points came from (average seat)");
const buckets = ["companies", "land", "cash", "industries", "megacorps", "ipo", "loans"];
for (const k of buckets) {
  console.log(pad(`  ${k}`, 34) + COUNTS.map((d) =>
    rp((results[d].T.epByBucket[k] / results[d].T.seats).toFixed(1), 10)).join(""));
}

console.log("\nWhy a sideways company could not grow, each time the bot looked");
const keys = [...new Set(COUNTS.flatMap((d) => Object.keys(results[d].T.blocked)))];
for (const k of keys) {
  console.log(pad(`  ${k}`, 34) + COUNTS.map((d) => {
    const T = results[d].T;
    return rp(`${(100 * (T.blocked[k] || 0) / Math.max(1, T.looks)).toFixed(0)}%`, 10);
  }).join(""));
}
console.log("");
