/* How well do the bots actually play?

   audit.js checks the data is well formed and audit_bots.js checks the bots build
   things. This one asks a narrower question: are they competing for the points that
   are actually on the table, and does turning a variant on change how they play?

   Every number here is per seat per game unless it says otherwise, averaged over a
   fixed set of seeds so two runs are comparable. Run it before and after touching a
   bot heuristic and diff the output.

   Run: node audit_strategy.js  [seeds]
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "40", 10);

function loadEngine() {
  const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
  const cut = src.indexOf("/* ============================== REACT UI ============================== */");
  const logic = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advancePlanning, advanceResolution, startPlanning,
      activeBiz, epTotal, discsFree, plotCount, districtCount, ARCHETYPE_LABEL };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

/* An all-bot table: seat 0 is created human, then handed straight to a bot, which is
   what the server does when someone walks away. */
function play(seed, variants) {
  const st = E.initGame(3, seed, ["Seat 1"], undefined, false, variants);
  st.players[0].isHuman = false;
  const rng = E.mulberry32(seed + 777);
  let idle = 0, idleLate = 0;
  const log = (msg) => {
    if (/finds nothing worth building/.test(msg)) { idle++; if (st.quarter >= 9) idleLate++; }
  };
  if (st.phase === "drafting") {
    const need = (st.draftCounts || {})[0] || 0;
    for (let k = 0; k < need; k++) {
      const ind = Object.keys(st.decks).find((i) => st.decks[i].length);
      if (!ind) break;
      st.players[0].hand.push(st.decks[ind].shift());
    }
    st.draftQueue = []; st.awaitingPlayerId = null;
    E.startPlanning(st); E.advancePlanning(st, rng, log);
  }
  for (let g = 0; g < 6000 && st.phase !== "gameover"; g++) {
    if (st.phase === "planning") E.advancePlanning(st, rng, log);
    else if (st.phase === "resolving" || st.phase === "production") E.advanceResolution(st, rng, log);
    else break;
  }
  return { st, idle, idleLate };
}

const BUCKETS = ["industries", "companies", "megacorps", "ipo", "land", "rent", "cash", "loans"];
function bucketOf(label) {
  const l = String(label || "");
  if (l.startsWith("Entered ")) return "industries";
  if (l.startsWith("Company:")) return "companies";
  if (l.startsWith("Megacorp:")) return "megacorps";
  if (l === "IPO tile") return "ipo";
  if (l === "The Real-Estate Mogul" || l === "The Omnipresent") return "land";
  if (l.startsWith("Cash on hand")) return "cash";
  if (l.startsWith("Ground rent")) return "rent";
  if (l.startsWith("Unpaid loans")) return "loans";
  return "other";
}

function run(label, variants) {
  const acc = {
    games: 0, seats: 0, idle: 0, idleLate: 0,
    cash: 0, plots: 0, districts: 0, companies: 0, ep: 0, top: 0, freeDiscs: 0,
    cashRich: 0, landless: 0,
    ep_from: Object.fromEntries(BUCKETS.map((b) => [b, 0])),
  };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const { st, idle, idleLate } = play(seed, variants);
    if (st.phase !== "gameover") continue;
    acc.games++; acc.idle += idle; acc.idleLate += idleLate;
    acc.top += Math.max(...st.players.map((p) => E.epTotal(p)));
    for (const p of st.players) {
      acc.seats++;
      acc.cash += p.cash;
      acc.plots += E.plotCount(st, p);
      acc.districts += E.districtCount(st, p);
      acc.companies += E.activeBiz(p).length;
      acc.freeDiscs += E.discsFree(st, p);
      acc.ep += E.epTotal(p);
      if (p.cash > 60) acc.cashRich++;
      if (E.plotCount(st, p) === 0) acc.landless++;
      (p.epLog || []).forEach((e) => {
        const b = bucketOf(e.label);
        if (b in acc.ep_from) acc.ep_from[b] += e.amount;
      });
    }
  }
  const g = acc.games || 1, s = acc.seats || 1;
  return {
    label,
    games: acc.games,
    idlePerGame: +(acc.idle / g).toFixed(1),
    idleLatePerGame: +(acc.idleLate / g).toFixed(1),
    cash: Math.round(acc.cash / s),
    cashRichPct: Math.round((acc.cashRich / s) * 100),
    plots: +(acc.plots / s).toFixed(1),
    districts: +(acc.districts / s).toFixed(1),
    landlessPct: Math.round((acc.landless / s) * 100),
    companies: +(acc.companies / s).toFixed(1),
    freeDiscs: +(acc.freeDiscs / s).toFixed(1),
    ep: Math.round(acc.ep / s),
    topEP: Math.round(acc.top / g),
    epFrom: Object.fromEntries(BUCKETS.map((b) => [b, +(acc.ep_from[b] / s).toFixed(1)])),
  };
}

/* The first row is the printed game. The rest turn v13's rules back off one at a
   time, so the diff shows what each of them is actually doing to the table. */
const SCENARIOS = [
  ["v13 standard", undefined],
  ["...levels score single", { singleLevelEP: true }],
  ["...land awards at the end", { endgameLandAwards: true }],
  ["everything off (~v12)", { classicScoring: true, singleLevelEP: true, orderedDecks: true, roadHubs: true, endgameLandAwards: true }],
];

console.log(`Bot strategy audit - ${SEEDS} seeds per scenario, 4 bots per table\n`);
const rows = SCENARIOS.map(([label, v]) => run(label, v));

const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);
console.log(pad("scenario", 34) + rpad("idle", 6) + rpad("late", 6) + rpad("cash", 6)
  + rpad(">$60", 6) + rpad("plots", 7) + rpad("dist", 6) + rpad("discs", 7) + rpad("biz", 5) + rpad("EP", 5) + rpad("top", 5));
console.log("-".repeat(93));
for (const r of rows) {
  console.log(pad(r.label, 34) + rpad(r.idlePerGame, 6) + rpad(r.idleLatePerGame, 6)
    + rpad("$" + r.cash, 6) + rpad(r.cashRichPct + "%", 6) + rpad(r.plots, 7)
    + rpad(r.districts, 6) + rpad(r.freeDiscs, 7) + rpad(r.companies, 5) + rpad(r.ep, 5) + rpad(r.topEP, 5));
}
console.log("\nidle = wasted M&A actions per game   late = of those, in Year 3");
console.log("cash = held at the end (10:1 to EP)   >$60 = seats ending cash-rich");
console.log("plots/dist/biz/EP = per seat at the end   discs = free discs left (spare capacity)   top = winning score\n");

console.log("Where each seat's EP came from (per seat, per game)");
console.log(pad("scenario", 34) + BUCKETS.map((b) => rpad(b.slice(0, 7), 9)).join(""));
console.log("-".repeat(34 + 9 * BUCKETS.length));
for (const r of rows) {
  console.log(pad(r.label, 34) + BUCKETS.map((b) => rpad(r.epFrom[b], 9)).join(""));
}

/* The headline question: does turning a variant on change how the bots play at all?
   If two scenarios produce identical behaviour, the bots are blind to that rule. */
console.log("\nDoes the bot notice the rule change?");
const base = rows[0];
for (const r of rows.slice(1)) {
  const same = r.idlePerGame === base.idlePerGame && r.plots === base.plots
    && r.cash === base.cash && r.companies === base.companies;
  console.log(`  ${pad(r.label, 34)} ${same ? "NO  - plays an identical game" : "yes - behaviour differs"}`);
}
console.log();
