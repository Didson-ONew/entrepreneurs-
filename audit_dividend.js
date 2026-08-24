/* ============================================================================
   What a Megacorp headquarters should be paid.

   A headquarters produces nothing. Two things pay it: a share of its industry's
   pot, in cash, like any other company standing in that industry; and a brand
   dividend in EP. This sweeps what the dividend should be.

   As it stands the dividend is the industry's CURRENT PRICE in EP, every
   quarter, and the pot share is cash on top. That is now the biggest single
   bucket in a winner's score, which is what prompted the question.

   The alternative: the headquarters does not take the pot money at all - it
   goes back to the bank - and scores what it would have drawn as EP instead.
   That turns a $-denominated stream into a point stream, and the size of the
   pot share becomes the size of the dividend. Three exchange rates are swept,
   because "scores the money in EP" can mean any of them:

     dollar for dollar        $1 drawn -> 1 EP
     half                     $2 drawn -> 1 EP, rounded down
     at the game's own rate   $10 drawn -> 1 EP, the rate cash converts at
                              when the game ends, rounded down

   WHAT IT FOUND. An HQ's pot share averages $4.5, and the price of the goods
   it would otherwise have banked averages about the same - so dollar for
   dollar is not a reduction at all. It pays 9.4 EP a seat against the current
   10.4, and leaves the headquarters at 19% of a winner's score either way.
   The two are the same size because they are measuring nearly the same thing:
   a pot is filled by the industry's own OPEX, so pot-share-per-company tracks
   the price of the goods.

   What it does change is the shape. The dividend now reads how CONTESTED the
   industry is rather than only how dear it is - a crowded industry pays each
   of its companies less - and about $38 a game stops circulating, which costs
   every seat roughly 1 EP of end-of-game cash.

   If the goal is to bring the headquarters down in scale, the rate is the
   dial, not the source: half the pot share puts it at 8% of a winner's score,
   the game's own $10 rate rounds it away to nothing at all.

   Every case keeps the "collects nothing on land it no longer owns" rule: a
   headquarters that has lost its ground is not a recipient at all.

   Everything is patched into the engine inside a sandbox; the repo file is
   never touched.

   Run: node audit_dividend.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "400", 10);

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const base = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");

const NEEDLES = {
  /* the brand dividend, paid before the pots are shared out */
  brand: "      const ep = price(state.pm, bizInd(hq));",
  /* the pot split itself - one line pays every recipient */
  payout: "    recipients.forEach((r) => { r.p.cash += share; });",
  /* where the dividend is run in the quarter, so it can be moved to year ends */
  when: "  runMegacorpDividend(state, log);",
};
for (const [k, v] of Object.entries(NEEDLES)) {
  if (!base.includes(v)) { console.error(`the engine changed shape around ${k} - update this probe`); process.exit(2); }
}

/* brand: is the price-in-EP dividend paid at all, and how often.
   potEp: what an HQ's pot share becomes - null keeps it as cash. */
const CASES = [
  { name: "as it stands", brand: true, potEp: null },
  { name: "pot as EP, $1=1", brand: false, potEp: "share" },
  { name: "half the pot as EP", brand: false, potEp: "Math.floor(share / 2)" },
  { name: "pot as EP, $10=1", brand: false, potEp: "Math.floor(share / 10)" },
  { name: "price, year ends", brand: "years", potEp: null },
  { name: "no dividend", brand: false, potEp: null },
];

function engineFor(c) {
  let logic = base;
  if (c.brand === "years") logic = logic.replace(NEEDLES.when, "  if ([4, 8, 12].includes(state.quarter)) runMegacorpDividend(state, log);");
  else if (!c.brand) logic = logic.replace(NEEDLES.brand, "      const ep = 0; if (!ep) continue;");
  if (c.potEp) {
    logic = logic.replace(NEEDLES.payout, `    recipients.forEach((r) => {
      if (r.b.isHQ) { __hqPot(share); addEP(r.p, ${c.potEp}, \`Megacorp brand: \${r.b.megacorpName}\`, state.quarter); }
      else r.p.cash += share;
    });`);
  } else {
    logic = logic.replace(NEEDLES.payout, `    recipients.forEach((r) => { if (r.b.isHQ) __hqPot(share); r.p.cash += share; });`);
  }
  const box = {};
  const pot = { n: 0, sum: 0 };
  const sandbox = { console, Math, Set, Object, Array, JSON, box,
    __hqPot: (share) => { pot.n++; pot.sum += share; } };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advancePlanning, advanceDraft, startPlanning,
      activeBiz, megacorpHQs, epTotal, finalRank, bizInd, INDUSTRIES };
  `, sandbox);
  return { E: box.exports, pot };
}

function bucketOf(label) {
  const l = String(label || "");
  if (l.startsWith("Entered ")) return "industries";
  if (l.startsWith("Company:")) return "companies";
  if (l.startsWith("Megacorp brand:")) return "hq brand";
  if (l.startsWith("Megacorp district:")) return "hq district";
  if (l.startsWith("Megacorp:")) return "megacorp tiles";
  if (l === "IPO tile") return "ipo";
  if (l === "The Real-Estate Mogul" || l === "The Omnipresent") return "land";
  if (l.startsWith("Cash on hand")) return "cash";
  if (l.startsWith("Ground rent")) return "rent";
  if (l.startsWith("Unpaid loans")) return "loans";
  return "other";
}
const BUCKETS = ["companies", "land", "rent", "cash", "industries", "megacorp tiles", "hq brand", "hq district", "ipo", "loans", "other"];

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const results = [];

for (const c of CASES) {
  const { E, pot } = engineFor(c);
  const T = {
    games: 0, seats: 0, hqs: 0, seatsWithAny: 0,
    winnerEP: 0, winnerHQs: 0, spread: 0, gapToSecond: 0,
    hqSeatWins: 0, hqSeats: 0, firstClaimGames: 0, firstClaimWins: 0,
    ep: Object.fromEntries(BUCKETS.map((b) => [b, 0])),
    winnerEp: Object.fromEntries(BUCKETS.map((b) => [b, 0])),
    brandToHqOwners: 0, hqOwnerSeats: 0,
  };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const st = E.initGame(3, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;
    T.games++;
    const ranked = [...st.players].sort(E.finalRank);
    const winner = ranked[0];
    for (const p of st.players) {
      T.seats++;
      const hqs = E.megacorpHQs(p);
      T.hqs += hqs.length;
      if (hqs.length) {
        T.seatsWithAny++;
        T.hqSeats++;
        if (p === winner) T.hqSeatWins++;
      }
      for (const e of p.epLog || []) T.ep[bucketOf(e.label)] += e.amount;
    }
    for (const e of winner.epLog || []) T.winnerEp[bucketOf(e.label)] += e.amount;
    if (st.ipoOwner !== undefined) {
      T.firstClaimGames++;
      if (st.ipoOwner === winner.id) T.firstClaimWins++;
    }
    T.winnerEP += E.epTotal(winner);
    T.winnerHQs += E.megacorpHQs(winner).length;
    const eps = ranked.map((p) => E.epTotal(p));
    T.spread += eps[0] - eps[eps.length - 1];
    T.gapToSecond += eps[0] - eps[1];
  }
  T.potPays = pot.n;
  T.potSum = pot.sum;
  results.push({ c, T });
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - what a Megacorp headquarters should be paid");
console.log(`${results[0].T.games} games per case, 4 seats, personas on, rules as they now stand.\n`);

const cols = results.map((r) => r.c.name);
const W = 20;
const head = () => console.log(pad("", 28) + cols.map((c) => rp(c.length > W - 1 ? c.slice(0, W - 1) : c, W)).join(""));
const row = (name, fn, dp = 1) =>
  console.log(pad(name, 28) + results.map((r) => rp(fn(r.T).toFixed(dp), W)).join(""));
const pct = (name, fn) =>
  console.log(pad(name, 28) + results.map((r) => rp(`${(100 * fn(r.T)).toFixed(0)}%`, W)).join(""));

head();
console.log("─".repeat(28 + W * cols.length));
row("winning score", (T) => T.winnerEP / T.games, 0);
row("winner's lead over second", (T) => T.gapToSecond / T.games);
row("winner's lead over last", (T) => T.spread / T.games);
console.log("");
row("Megacorps formed per game", (T) => T.hqs / T.games, 2);
pct("seats that formed one", (T) => T.seatsWithAny / T.seats);
pct("a seat with a Megacorp wins", (T) => T.hqSeatWins / Math.max(1, T.hqSeats));
pct("first to go public then won", (T) => T.firstClaimWins / Math.max(1, T.firstClaimGames));
console.log(pad("  (a seat wins 25% by chance)", 28));

console.log("\nWhat the headquarters itself was paid, per game");
row("pot shares drawn by an HQ", (T) => T.potPays / T.games, 2);
row("  average size of one, in $", (T) => T.potSum / Math.max(1, T.potPays));
row("  total drawn per game, in $", (T) => T.potSum / T.games);
row("brand EP per seat, over a game", (T) => T.ep["hq brand"] / T.seats);

console.log("\nThe WINNER's points, by source (share of their score)");
head();
for (const k of BUCKETS) {
  const any = results.some((r) => Math.abs(r.T.winnerEp[k]) > 0.05);
  if (!any) continue;
  console.log(pad(`  ${k}`, 28) + results.map((r) =>
    rp(`${(100 * r.T.winnerEp[k] / Math.max(1, r.T.winnerEP)).toFixed(0)}%`, W)).join(""));
}

console.log("\nEvery seat's points, by source (EP per seat)");
head();
for (const k of BUCKETS) {
  const any = results.some((r) => Math.abs(r.T.ep[k]) > 0.05);
  if (!any) continue;
  console.log(pad(`  ${k}`, 28) + results.map((r) => rp((r.T.ep[k] / r.T.seats).toFixed(1), W)).join(""));
}
console.log("");
