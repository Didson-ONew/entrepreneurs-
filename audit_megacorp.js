/* ============================================================================
   Two questions about going public.

   1. The IPO tile. It used to pay 5 EP for forming the first Megacorp of the
      game. It is now a sixth company bay instead, so being first to merge no
      longer narrows how wide you can operate. Does that make more Megacorps
      happen - and does whoever gets there first now win too often?

   2. How many tiles are in play. Only (players + 1) of the sixteen are
      shuffled in, so the good combinations are contested and a table can run
      out. What happens with twice as many?

   Both are patched into the engine inside a sandbox; the repo file is never
   touched.

   Run: node audit_megacorp.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "300", 10);

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const base = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");

const NEEDLES = {
  pool: "const megacorpPool = shuffle(MEGACORP_TILES, rng).slice(0, nPlayers + 1);",
  ipoBay: "    p.ipoTile = true;",
};
for (const [k, v] of Object.entries(NEEDLES)) {
  if (!base.includes(v)) { console.error(`the engine changed shape around ${k} - update this probe`); process.exit(2); }
}

/* tiles: how many are shuffled in.  ipo: "bay" (current) or "ep" (the old 5 EP). */
const CASES = [
  { name: "n+1 tiles, IPO = bay", tiles: "nPlayers + 1", ipo: "bay" },
  { name: "n+1 tiles, IPO = 5 EP", tiles: "nPlayers + 1", ipo: "ep" },
  { name: "2n tiles, IPO = bay", tiles: "nPlayers * 2", ipo: "bay" },
  { name: "2n tiles, IPO = 5 EP", tiles: "nPlayers * 2", ipo: "ep" },
  { name: "all 16 tiles, IPO = bay", tiles: "MEGACORP_TILES.length", ipo: "bay" },
];

function engineFor(c) {
  let logic = base.replace(NEEDLES.pool,
    `const megacorpPool = shuffle(MEGACORP_TILES, rng).slice(0, ${c.tiles});`);
  if (c.ipo === "ep") {
    logic = logic.replace(NEEDLES.ipoBay, '    addEP(p, 5, "IPO tile", state.quarter);');
  }
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advancePlanning, advanceDraft, startPlanning,
      activeBiz, megacorpHQs, epTotal, finalRank, plotCount, districtCount, bizInd,
      hqNeighbours, MEGACORP_TILES, INDUSTRIES };
  `, sandbox);
  return box.exports;
}

function bucketOf(label) {
  const l = String(label || "");
  if (l.startsWith("Entered ")) return "industries";
  if (l.startsWith("Vested:")) return "companies";
  if (l.startsWith("Megacorp brand:")) return "hq brand";
  if (l.startsWith("Megacorp district:")) return "hq district";
  if (l.startsWith("Megacorp:")) return "megacorp tiles";
  if (l === "IPO tile") return "ipo";
  if (l === "The Real-Estate Mogul" || l === "The Omnipresent") return "land";
  if (l.startsWith("Cash on hand")) return "cash";
  if (l.startsWith("Unpaid loans")) return "loans";
  return "other";
}
const BUCKETS = ["companies", "land", "cash", "industries", "megacorp tiles", "hq brand", "hq district", "ipo", "loans", "other"];

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const results = [];

for (const c of CASES) {
  const E = engineFor(c);
  const T = {
    games: 0, seats: 0, hqs: 0, tilesLeft: 0,
    firstClaimGames: 0, firstClaimWins: 0, firstClaimQuarter: 0,
    twoOrMore: 0, seatsWithAny: 0,
    winnerEP: 0, winnerHQs: 0, spread: 0, gapToSecond: 0,
    ep: Object.fromEntries(BUCKETS.map((b) => [b, 0])),
    hqInd: {},
  };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const st = E.initGame(3, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;
    T.games++;
    T.tilesLeft += st.megacorpPool.length;
    const ranked = [...st.players].sort(E.finalRank);
    const winner = ranked[0];
    for (const p of st.players) {
      T.seats++;
      const hqs = E.megacorpHQs(p);
      T.hqs += hqs.length;
      if (hqs.length) T.seatsWithAny++;
      if (hqs.length >= 2) T.twoOrMore++;
      for (const hq of hqs) T.hqInd[E.bizInd(hq)] = (T.hqInd[E.bizInd(hq)] || 0) + 1;
      for (const e of p.epLog || []) T.ep[bucketOf(e.label)] += e.amount;
    }
    /* Who got there first, and did it win? The engine stamps the owner of the IPO tile. */
    if (st.ipoOwner !== undefined) {
      T.firstClaimGames++;
      if (st.ipoOwner === winner.id) T.firstClaimWins++;
      const p = st.players.find((q) => q.id === st.ipoOwner);
      const first = (p.epLog || []).find((e) => String(e.label).startsWith("Megacorp:"));
      if (first) T.firstClaimQuarter += first.quarter;
    }
    T.winnerEP += E.epTotal(winner);
    T.winnerHQs += E.megacorpHQs(winner).length;
    const eps = ranked.map((p) => E.epTotal(p));
    T.spread += eps[0] - eps[eps.length - 1];
    T.gapToSecond += eps[0] - eps[1];
  }
  results.push({ c, T });
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - going public: the IPO tile and how many tiles are in play");
console.log(`${results[0].T.games} games per case, 4 seats, personas on.`);
console.log("A four-seat game shuffles in 5 tiles as it stands, 8 at 2n, 16 for all of them.\n");

const cols = results.map((r) => r.c.name);
const W = 22;
const head = () => console.log(pad("", 34) + cols.map((c) => rp(c.replace(", IPO = ", " / "), W)).join(""));
const row = (name, fn, dp = 2) =>
  console.log(pad(name, 34) + results.map((r) => rp(fn(r.T).toFixed(dp), W)).join(""));
const pct = (name, fn) =>
  console.log(pad(name, 34) + results.map((r) => rp(`${(100 * fn(r.T)).toFixed(0)}%`, W)).join(""));

head();
console.log("─".repeat(34 + W * cols.length));
row("Megacorps formed per game", (T) => T.hqs / T.games);
pct("seats that formed one", (T) => T.seatsWithAny / T.seats);
pct("seats that formed two or more", (T) => T.twoOrMore / T.seats);
row("tiles left unclaimed at the end", (T) => T.tilesLeft / T.games, 1);
row("quarter the first one was formed", (T) => T.firstClaimQuarter / Math.max(1, T.firstClaimGames), 1);
console.log("");
pct("games where anybody went public", (T) => T.firstClaimGames / T.games);
pct("first to go public then won", (T) => T.firstClaimWins / Math.max(1, T.firstClaimGames));
console.log(pad("  (a seat wins 25% by chance)", 34));
console.log("");
row("winning score", (T) => T.winnerEP / T.games, 0);
row("winner's headquarters", (T) => T.winnerHQs / T.games);
row("winner's lead over second", (T) => T.gapToSecond / T.games, 1);
row("winner's lead over last", (T) => T.spread / T.games, 1);

console.log("\nEvery seat's points, by source");
head();
for (const k of BUCKETS) {
  const any = results.some((r) => Math.abs(r.T.ep[k]) > 0.05);
  if (!any) continue;
  console.log(pad(`  ${k}`, 34) + results.map((r) => rp((r.T.ep[k] / r.T.seats).toFixed(1), W)).join(""));
}

console.log("\nWhich industry the headquarters ended up in");
const IND = engineFor(CASES[0]).INDUSTRIES;
for (const i of IND) {
  console.log(pad(`  ${i}`, 34) + results.map((r) =>
    rp(`${(100 * (r.T.hqInd[i] || 0) / Math.max(1, r.T.hqs)).toFixed(0)}%`, W)).join(""));
}
console.log("");
