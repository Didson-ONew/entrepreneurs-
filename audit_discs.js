/* ============================================================================
   How many ownership discs should a player get - and what happens if an
   upgraded company needs a second one?

   Every disc is committed somewhere: on a plot, on an active company, or in
   the bank against a loan. Ten is a hard ceiling on how much city one player
   can hold, and it binds hardest on the three industries that scale sideways.

   The second question is a component question. On a physical table there is
   nothing on an upgraded company that says it is upgraded, so nobody can tell
   at a glance whether its printed OPEX and production still apply or whether
   they are doubled, or whether it can still be upgraded again. Marking it with
   a second disc solves that - but it also makes every upgrade cost a disc,
   which is a rule change, not just a component change.

   This plays the same seeds under every combination and reports what each one
   actually does to the game.

   Run: node audit_discs.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "150", 10);
/* [disc count, does an upgrade cost a disc] */
const CASES = [
  [10, false], [12, false], [15, false],
  [10, true], [12, true], [15, true], [18, true],
];
const label = ([n, mark]) => `${n}${mark ? "+m" : ""}`;

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const base = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");

const NEEDLES = {
  discs: "const DISCS_PER_PLAYER = 10;",
  used: "function discsUsed(state, p) {\n  return plotsOwned(state, p) + companySlotsUsed(p) + p.discsInBank;\n}",
  blocked: 'function upgradeBlockedReason(state, p, b) {\n  if (b.isHQ) return "is a Megacorp HQ";',
  doUpgrade: "function doUpgrade(state, p, b, rng, log, manualPlot) {\n  if (b.upgraded) return false;",
  rd: "    const candidates = starved ? [] : activeBiz(p).filter((b) => !b.upgraded",
};
for (const [k, v] of Object.entries(NEEDLES)) {
  if (!base.includes(v)) { console.error(`the engine changed shape around ${k} - update this probe`); process.exit(2); }
}

function engineFor(discs, markUpgrades) {
  let logic = base.replace(NEEDLES.discs, `const DISCS_PER_PLAYER = ${discs};`);
  if (markUpgrades) {
    /* A second disc on every upgraded building. It has to be a real cost, not just a
       marker: the disc has to come from the same ten, and the upgrade has to be
       refused when there is none left - otherwise this measures nothing. */
    logic = logic.replace(NEEDLES.used,
      "function discsUsed(state, p) {\n" +
      "  const marked = p.businesses.filter((b) => !b.distressed && b.upgraded).length;\n" +
      "  return plotsOwned(state, p) + companySlotsUsed(p) + p.discsInBank + marked;\n}");
    logic = logic.replace(NEEDLES.blocked,
      NEEDLES.blocked + '\n  if (discsFree(state, p) <= 0) return "no free disc to mark it upgraded";');
    logic = logic.replace(NEEDLES.doUpgrade,
      NEEDLES.doUpgrade + "\n  if (discsFree(state, p) <= 0) return false;");
  }
  logic = logic.replace(NEEDLES.rd, "    __probe(state, p, starved);\n" + NEEDLES.rd);
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box, __probe: (...a) => probe(...a) };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advancePlanning, advanceDraft, startPlanning,
      activeBiz, megacorpHQs, epTotal, bizInd, upgradeScaling, adjacentOwnedFreePlots, orthOf,
      plotValue, bizSetup, discsFree, discsUsed, plotCount, districtCount, finalRank,
      INDUSTRIES, DISCS_PER_PLAYER, hqNeighbours };
  `, sandbox);
  return box.exports;
}

let probe = () => {};
let T = null;

function bucketOf(label) {
  const l = String(label || "");
  if (l.startsWith("Entered ")) return "industries";
  if (l.startsWith("Vested:")) return "companies";
  if (l.startsWith("Megacorp district:")) return "hq district";
  if (l.startsWith("Megacorp:")) return "megacorp tiles";
  if (l === "IPO tile") return "ipo";
  if (l === "The Real-Estate Mogul" || l === "The Omnipresent") return "land";
  if (l.startsWith("Cash on hand")) return "cash";
  if (l.startsWith("Unpaid loans")) return "loans";
  return "other";
}
const BUCKETS = ["companies", "land", "cash", "industries", "megacorp tiles", "hq district", "ipo", "loans"];

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const results = {};

for (const c of CASES) {
  const [discs, mark] = c;
  const E = engineFor(discs, mark);
  T = {
    games: 0, seats: 0,
    built: Object.fromEntries(E.INDUSTRIES.map((i) => [i, 0])),
    upgraded: Object.fromEntries(E.INDUSTRIES.map((i) => [i, 0])),
    levels: 0, plots: 0, hqs: 0, hqNbrs: 0, discsIdle: 0,
    winnerEP: 0, winnerPlots: 0, winnerCompanies: 0, winnerUpgrades: 0,
    blocked: {}, looks: 0,
    ep: Object.fromEntries(BUCKETS.map((b) => [b, 0])),
  };
  /* Why can this sideways company not grow right now? Asked at the moment it matters. */
  probe = (state, p, starved) => {
    if (!T || starved) return;
    for (const b of E.activeBiz(p)) {
      if (b.upgraded || b.isHQ) continue;
      if (E.upgradeScaling(p, b) !== "H") continue;
      T.looks++;
      const bump = (k) => { T.blocked[k] = (T.blocked[k] || 0) + 1; };
      if (mark && E.discsFree(state, p) <= 0) { bump("no disc to mark it upgraded"); continue; }
      if (E.adjacentOwnedFreePlots(state.board, b.footprint).length) { bump("ready to grow"); continue; }
      const nb = new Set();
      b.footprint.forEach((pk) => E.orthOf(state.board, pk).forEach((n) => { if (!b.footprint.includes(n)) nb.add(n); }));
      const unowned = [...nb].filter((k) => !(k in state.board.owner));
      if (!unowned.length) { bump("boxed in by other buildings"); continue; }
      if (E.discsFree(state, p) <= 0) { bump("no disc for the plot"); continue; }
      const need = Math.min(...unowned.map((k) => E.plotValue(state, k))) + E.bizSetup(b);
      if (p.cash < need) { bump("no money for plot + upgrade"); continue; }
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
      T.discsIdle += Math.max(0, E.discsFree(st, p));
      for (const b of p.businesses) {
        if (b.distressed) continue;
        T.built[E.bizInd(b)] += 1;
        if (b.upgraded) T.upgraded[E.bizInd(b)] += 1;
        T.levels += b.level;
      }
      for (const hq of E.megacorpHQs(p)) { T.hqs++; T.hqNbrs += E.hqNeighbours(st, hq); }
      for (const e of p.epLog || []) T.ep[bucketOf(e.label)] += e.amount;
    }
    const winner = [...st.players].sort(E.finalRank)[0];
    T.winnerEP += E.epTotal(winner);
    T.winnerPlots += E.plotCount(st, winner);
    T.winnerCompanies += E.activeBiz(winner).length;
    T.winnerUpgrades += E.activeBiz(winner).filter((b) => b.upgraded).length;
  }
  results[label(c)] = T;
  probe = () => {}; T = null;
}

/* ---------------------------------------------------------------- report */
const cols = CASES.map(label);
const IND = engineFor(10, false).INDUSTRIES;
const g = results[cols[0]].games;
console.log(`Entrepreneurs - discs, and whether an upgrade should cost one`);
console.log(`${g} games per case, 4 seats, personas on. "+m" = an upgraded company is marked with a second disc.\n`);

const head = () => console.log(pad("", 32) + cols.map((c) => rp(c, 8)).join(""));
const row = (name, fn, dp = 1) =>
  console.log(pad(name, 32) + cols.map((c) => rp(fn(results[c]).toFixed(dp), 8)).join(""));

head();
console.log("─".repeat(32 + 8 * cols.length));
row("companies standing at the end", (T) => IND.reduce((n, i) => n + T.built[i], 0) / T.games);
row("of those, upgraded", (T) => IND.reduce((n, i) => n + T.upgraded[i], 0) / T.games);
row("company levels standing", (T) => T.levels / T.games);
row("plots owned at the end", (T) => T.plots / T.games);
row("discs left idle at the end", (T) => T.discsIdle / T.seats, 2);
console.log("");
row("winning score", (T) => T.winnerEP / T.games, 0);
row("winner's companies", (T) => T.winnerCompanies / T.games);
row("winner's upgraded companies", (T) => T.winnerUpgrades / T.games, 2);
row("winner's plots", (T) => T.winnerPlots / T.games);
console.log("");
row("Megacorps formed", (T) => T.hqs / T.games, 2);
row("companies beside each HQ", (T) => T.hqNbrs / Math.max(1, T.hqs), 2);

console.log("\nUpgrades per game, by industry");
head();
for (const i of IND) {
  console.log(pad(`  ${i}${["UT", "MA", "TE"].includes(i) ? " (sideways)" : ""}`, 32)
    + cols.map((c) => rp((results[c].upgraded[i] / results[c].games).toFixed(2), 8)).join(""));
}

console.log("\nEvery seat's points, by source");
head();
for (const k of BUCKETS) {
  console.log(pad(`  ${k}`, 32) + cols.map((c) =>
    rp((results[c].ep[k] / results[c].seats).toFixed(1), 8)).join(""));
}

console.log("\nWhy a sideways company could not grow, each time the bot looked");
head();
const keys = [...new Set(cols.flatMap((c) => Object.keys(results[c].blocked)))];
for (const k of keys) {
  console.log(pad(`  ${k}`, 32) + cols.map((c) => {
    const T = results[c];
    return rp(`${(100 * (T.blocked[k] || 0) / Math.max(1, T.looks)).toFixed(0)}%`, 8);
  }).join(""));
}
console.log("");
