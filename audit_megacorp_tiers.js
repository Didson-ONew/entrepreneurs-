/* ============================================================================
   Megacorps in four tiers, and a land award worth racing for.

   THE PROBLEM. A headquarters banks its industry's price in EP every quarter it
   stands, which makes the Megacorp 32% of a winning score - the largest single
   bucket, ahead of companies - and it is the cheapest tiles that pay it. Three
   level-1 companies buy a Local Syndicate, and that Local Syndicate then earns
   exactly as much per quarter as an Omnicorp built out of four level-3s.

   THE PROPOSAL, as put:

     The sixteen tiles split into four tiers of four, easiest first. Tier 4 is
     the four cheapest, tier 1 the four hardest.

     Two tiles are drawn FROM EACH TIER, and which tiers are in play depends on
     how many are at the table:

       2 players   tiers 4 and 3          4 tiles
       3 players   tiers 4, 3 and 2       6 tiles
       4 players   every tier             8 tiles

     The brand dividend is the industry's price DIVIDED BY THE TILE'S TIER,
     rounded down. A headquarters in Manufacturing at $3 pays:

       tier 4   floor(3/4) = 0 EP a quarter, until MA reaches $4
       tier 3   floor(3/3) = 1
       tier 2   floor(3/2) = 1
       tier 1   floor(3/1) = 3

   The tile counts are unchanged - 2n is what the pool already draws - so this
   is purely about WHICH tiles are in the box and what each one earns.

   THE SECOND DIAL, swept alongside it: the land award goes to 10 EP for the
   outright leader, shared and rounded down when tied, paid EVERY QUARTER rather
   than at year ends. Twelve payouts instead of three, and a race that is live
   the whole game rather than three times in it.

   Four cases, so the two changes can be told apart:

     as it stands          the baseline
     tiered Megacorps      the proposal, current land
     land 10 a quarter     current Megacorps, the new land award
     tiers + land 10       both

   The bots are told about both changes - landEPWeight and megacorpWorthIt are
   patched too - because a simulation where the players cannot see a rule is a
   simulation of a different rule.

   WHAT IT FOUND, over 400 games a case at four seats.

   1. THE TIERS WORK. The Megacorp goes from 33% of a winner's score to 17% -
      halved, not deleted. The winning score falls 109 to 95 and the winner's
      lead over last 58.6 to 48.7, so it takes the top off without flattening
      the game. The runaway measure improves too: the player who was already
      leading when the first Megacorp formed wins 49% of the time now and 38%
      under tiers.

   2. AT FOUR PLAYERS THE TIER DRAW DOES NOTHING; the division does all of it.
      Eight random tiles out of sixteen already averages two per tier, which is
      exactly what drawing two from each tier gives - the claimed-tier mix is
      identical to the point in every column. The draw rule earns its keep at a
      SMALLER table, and there it earns it well:

                              2 players          3 players
        hard tiles in box     50% -> 0%          51% -> 33%
        Megacorps formed      1.00 -> 1.26       1.44 -> 1.75

      Taking the unclaimable tiles out of a small box is what makes a Megacorp
      reachable at two players at all.

   3. LAND AT 10 EVERY QUARTER BACKFIRES, and not narrowly. Land becomes 71% of
      a winner's score, the winning score trebles to 232, and the runaway
      measure goes the WRONG WAY: the leader when the first Megacorp forms wins
      76% of the time, against 49% today. The winner's lead over last goes from
      59 to 165. It replaces one dominant bucket with a far more dominant one.

   4. IT IS THE FREQUENCY, NOT THE AMOUNT. Ten at year ends leaves the runaway
      measure at 37% - better than today. Five every quarter puts it at 69%.
      The smaller award paid more often is far more runaway-prone than the
      larger one paid rarely, because a lead in plots pays again every quarter
      it survives, and the player who is ahead is the one who can afford to
      extend it.

   So: the tiers do what they were meant to do, and the land change does the
   opposite of what it was meant to do.

   Everything is patched into the engine inside a sandbox; the repo file is
   never touched.

   Run: node audit_megacorp_tiers.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "400", 10);
const SEATS = 4;

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const base = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");

const NEEDLES = {
  pool: "  const megacorpPool = shuffle(MEGACORP_TILES, rng).slice(0, nPlayers * 2);",
  dividend: "      const ep = price(state.pm, bizInd(hq));",
  botBrand: "  const brandEP = price(state.pm, bizInd(hq)) * qLeft;",
  claimed: "  addEP(p, ep, `Megacorp: ${name}`, state.quarter);",
  landConst: "const LAND_AWARD = { sole: 5, two: 2, many: 1 };",
  landShare: "  const share = leaders.length === 1 ? LAND_AWARD.sole\n"
    + "    : leaders.length === 2 ? LAND_AWARD.two : LAND_AWARD.many;",
  landPayouts: "  return [4, 8, 12].filter((q) => q >= state.quarter).length || 1;",
  landYearEnd: "    if (!hasVariant(state, \"endgameLandAwards\") && quarter !== 12) {\n"
    + "      awardRanked(state, (p) => plotCount(state, p), \"The Real-Estate Mogul\", log);\n"
    + "      awardRanked(state, (p) => districtCount(state, p), \"The Omnipresent\", log);\n"
    + "    }",
  closingHead: "function runClosingRest(state, log) {\n  const { players, quarter } = state;",
  finalLand: "  awardRanked(state, (p) => plotCount(state, p), \"The Real-Estate Mogul\", null);\n"
    + "  awardRanked(state, (p) => districtCount(state, p), \"The Omnipresent\", null);",
};
for (const [k, v] of Object.entries(NEEDLES)) {
  if (!base.includes(v)) { console.error(`the engine changed shape around ${k} - update this probe`); process.exit(2); }
}

/* Tier 4 is the four EASIEST tiles, tier 1 the four hardest. MEGACORP_TILES is
   already written in order of what a tile costs to assemble, so the split is the
   order it is already in. */
const TIER_SRC = `
const MC_PER_TIER = MEGACORP_TILES.length / 4;
const mcTierOfIndex = (i) => 4 - Math.floor(i / MC_PER_TIER);
const MC_TIER_BY_EP = {};
MEGACORP_TILES.forEach((t, i) => { MC_TIER_BY_EP[t[2]] = mcTierOfIndex(i); });
const MC_TIER_BY_NAME = {};
MEGACORP_TILES.forEach((t, i) => { MC_TIER_BY_NAME[t[0]] = mcTierOfIndex(i); });
/* Which tiers are in the box, by how many are at the table. */
const MC_MIN_PLAYERS = { 4: 2, 3: 2, 2: 3, 1: 4 };
function mcTieredPool(nPlayers, rng) {
  const out = [];
  for (let tier = 4; tier >= 1; tier--) {
    if (nPlayers < MC_MIN_PLAYERS[tier]) continue;
    const from = (4 - tier) * MC_PER_TIER;
    out.push(...shuffle(MEGACORP_TILES.slice(from, from + MC_PER_TIER), rng).slice(0, 2));
  }
  return out;
}
`;

/* land: null leaves the award alone. Otherwise { worth, everyQuarter } - worth EP to
   the outright leader, split and rounded down when tied. The last two cases are not
   in the proposal; they are there because a dial needs more than one setting before
   you can tell whether the one you picked is the right one. */
const CASES = [
  { name: "as it stands", tiers: false, land: null },
  { name: "tiered Megacorps", tiers: true, land: null },
  { name: "land 10/quarter", tiers: false, land: { worth: 10, everyQuarter: true } },
  { name: "tiers + 10/quarter", tiers: true, land: { worth: 10, everyQuarter: true } },
  { name: "tiers + 10/year end", tiers: true, land: { worth: 10, everyQuarter: false } },
  { name: "tiers + 5/quarter", tiers: true, land: { worth: 5, everyQuarter: true } },
];

function engineFor(c, collect) {
  let logic = base;

  /* Every case records what was claimed and who was ahead when. */
  logic = logic.replace(NEEDLES.claimed, NEEDLES.claimed
    + "\n  __claimed(state.quarter, p.id, ep, state.players.map((q) => epTotal(q)));");

  if (c.tiers) {
    logic = logic.replace(NEEDLES.pool, "  const megacorpPool = mcTieredPool(nPlayers, rng);");
    logic = logic.replace(NEEDLES.dividend,
      "      const ep = Math.floor(price(state.pm, bizInd(hq)) / (MC_TIER_BY_NAME[hq.megacorpName] || 1));");
    logic = logic.replace(NEEDLES.botBrand,
      "  const brandEP = Math.floor(price(state.pm, bizInd(hq)) / (MC_TIER_BY_EP[match.tile[2]] || 1)) * qLeft;");
  }
  /* The tier tables go at the END, where MEGACORP_TILES already exists and they sit
     at module scope - dropped in beside the pool line they would be local to
     initGame, invisible to the dividend and to the exports. Nothing reads them
     until a game is played, which is long after this has run. */
  logic += TIER_SRC;

  if (c.land) {
    logic = logic.replace(NEEDLES.landConst, `const LAND_AWARD = { sole: ${c.land.worth}, two: 0, many: 0 };`);
    /* The whole award to the leader, split and rounded down when tied: at 10 that is
       5 each for two, 3 for three, 2 for four. */
    logic = logic.replace(NEEDLES.landShare, "  const share = Math.floor(LAND_AWARD.sole / leaders.length);");
    if (c.land.everyQuarter) {
      /* What a plot is worth to a bot is the payouts still to come. */
      logic = logic.replace(NEEDLES.landPayouts, "  return Math.max(1, 13 - state.quarter);");
      /* Off the year ends... */
      logic = logic.replace(NEEDLES.landYearEnd, "    /* land is paid every quarter now */");
      /* ...and onto every quarter, including the twelfth. */
      logic = logic.replace(NEEDLES.closingHead, NEEDLES.closingHead
        + "\n  awardRanked(state, (p) => plotCount(state, p), \"The Real-Estate Mogul\", log);"
        + "\n  awardRanked(state, (p) => districtCount(state, p), \"The Omnipresent\", log);");
      /* Q12 is paid by the line above, so the final scoring must not pay it again. */
      logic = logic.replace(NEEDLES.finalLand, "  /* land was paid in Q12 with every other quarter */");
    }
  }

  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box, __claimed: collect };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advancePlanning, advanceDraft, startPlanning,
      activeBiz, megacorpHQs, epTotal, finalRank, bizInd, MEGACORP_TILES, INDUSTRIES,
      MC_TIER_BY_EP, MC_TIER_BY_NAME };
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
  /* Claims land here as the game makes them. `first` is the state of the table at
     the moment the FIRST Megacorp of the game was formed, which is what the runaway
     question needs: who did it, and who was already ahead. */
  let claims = [], first = null;
  const collect = (quarter, by, ep, eps) => {
    claims.push({ quarter, by, ep });
    if (!first) {
      const leader = eps.indexOf(Math.max(...eps));
      first = { by, quarter, leader };
    }
  };
  const E = engineFor(c, collect);
  const tierOfEp = E.MC_TIER_BY_EP;

  const T = {
    games: 0, seats: 0, hqs: 0, seatsWithAny: 0,
    winnerEP: 0, spread: 0, gapToSecond: 0,
    hqSeatWins: 0, hqSeats: 0,
    firstGames: 0, firstWins: 0, leaderWins: 0, firstQuarter: 0,
    byTier: { 1: 0, 2: 0, 3: 0, 4: 0 },
    ep: Object.fromEntries(BUCKETS.map((b) => [b, 0])),
    winnerEp: Object.fromEntries(BUCKETS.map((b) => [b, 0])),
    poolSize: 0,
  };

  for (let seed = 1; seed <= SEEDS; seed++) {
    claims = []; first = null;
    const st = E.initGame(SEATS - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;

    T.games++;
    T.poolSize += st.megacorpPool.length + claims.length;
    const ranked = [...st.players].sort(E.finalRank);
    const winner = ranked[0];

    for (const cl of claims) T.byTier[tierOfEp[cl.ep] || 1] += 1;
    if (first) {
      T.firstGames++;
      T.firstQuarter += first.quarter;
      if (first.by === winner.id) T.firstWins++;
      if (first.leader === winner.id) T.leaderWins++;
    }

    for (const p of st.players) {
      T.seats++;
      const hqs = E.megacorpHQs(p);
      T.hqs += hqs.length;
      if (hqs.length) { T.seatsWithAny++; T.hqSeats++; if (p === winner) T.hqSeatWins++; }
      for (const e of p.epLog || []) T.ep[bucketOf(e.label)] += e.amount;
    }
    for (const e of winner.epLog || []) T.winnerEp[bucketOf(e.label)] += e.amount;

    T.winnerEP += E.epTotal(winner);
    const eps = ranked.map((p) => E.epTotal(p));
    T.spread += eps[0] - eps[eps.length - 1];
    T.gapToSecond += eps[0] - eps[1];
  }
  results.push({ c, T });
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - Megacorps in four tiers, and a land award every quarter");
console.log(`${results[0].T.games} games per case, ${SEATS} seats, personas on.\n`);
console.log("Tiers, easiest first - 4 tiles each, two of each tier drawn:");
{
  const E = engineFor(CASES[0], () => {});
  for (let tier = 4; tier >= 1; tier--) {
    const from = (4 - tier) * 4;
    const names = E.MEGACORP_TILES.slice(from, from + 4).map((t) => `${t[0]} (${t[2]})`);
    console.log(`  tier ${tier}   ${names.join(", ")}`);
  }
  console.log("  in play at   tier 4,3: 2 players+   tier 2: 3 players+   tier 1: 4 players\n");
}

const cols = results.map((r) => r.c.name);
const W = 19;
const head = () => console.log(pad("", 30) + cols.map((c) => rp(c, W)).join(""));
const row = (name, fn, dp = 1) =>
  console.log(pad(name, 30) + results.map((r) => rp(fn(r.T).toFixed(dp), W)).join(""));
const pct = (name, fn) =>
  console.log(pad(name, 30) + results.map((r) => rp(`${(100 * fn(r.T)).toFixed(0)}%`, W)).join(""));

head();
console.log("─".repeat(30 + W * cols.length));
row("winning score", (T) => T.winnerEP / T.games, 0);
row("winner's lead over second", (T) => T.gapToSecond / T.games);
row("winner's lead over last", (T) => T.spread / T.games);
console.log("");
row("tiles in the box", (T) => T.poolSize / T.games);
row("Megacorps formed per game", (T) => T.hqs / T.games, 2);
pct("seats that formed one", (T) => T.seatsWithAny / T.seats);
row("quarter of the first one", (T) => T.firstQuarter / Math.max(1, T.firstGames));

console.log("\nWhich tier was claimed (share of all Megacorps formed)");
head();
for (let tier = 4; tier >= 1; tier--) {
  console.log(pad(`  tier ${tier}${tier === 4 ? " (easiest)" : tier === 1 ? " (hardest)" : ""}`, 30)
    + results.map((r) => {
      const total = Object.values(r.T.byTier).reduce((a, b) => a + b, 0) || 1;
      return rp(`${(100 * r.T.byTier[tier] / total).toFixed(0)}%`, W);
    }).join(""));
}

console.log("\nDoes it favour a runaway leader?");
head();
pct("a seat with a Megacorp wins", (T) => T.hqSeatWins / Math.max(1, T.hqSeats));
pct("first to go public then won", (T) => T.firstWins / Math.max(1, T.firstGames));
pct("  the leader AT THAT MOMENT won", (T) => T.leaderWins / Math.max(1, T.firstGames));
console.log(pad("  (a seat wins 25% by chance)", 30));
console.log("\n  Read the two together. If 'first to go public' and 'the leader at that");
console.log("  moment' are the same number, going public is what the player who was");
console.log("  already ahead does with a lead - not the reason they have one.");

console.log("\nThe WINNER's points, by source (share of their score)");
head();
for (const k of BUCKETS) {
  if (!results.some((r) => Math.abs(r.T.winnerEp[k]) > 0.05)) continue;
  console.log(pad(`  ${k}`, 30) + results.map((r) =>
    rp(`${(100 * r.T.winnerEp[k] / Math.max(1, r.T.winnerEP)).toFixed(0)}%`, W)).join(""));
}

console.log("\nEvery seat's points, by source (EP per seat)");
head();
for (const k of BUCKETS) {
  if (!results.some((r) => Math.abs(r.T.ep[k]) > 0.05)) continue;
  console.log(pad(`  ${k}`, 30) + results.map((r) => rp((r.T.ep[k] / r.T.seats).toFixed(1), W)).join(""));
}
console.log("");

/* ------------------------------------------------------------- table size
   At four players the tier DRAW is very nearly a no-op: eight random tiles out of
   sixteen already averages two per tier, which is exactly what drawing two from
   each tier gives. The draw rule only bites at a smaller table, where it takes the
   hard tiles out of the box - so that is where it has to be measured. */
console.log("\nWhat the tier draw does at a smaller table");
console.log(pad("", 30) + rp("as it stands", 19) + rp("tiered", 19) + rp("as it stands", 19) + rp("tiered", 19));
console.log(pad("", 30) + rp("2 players", 19) + rp("2 players", 19) + rp("3 players", 19) + rp("3 players", 19));
console.log("\u2500".repeat(30 + 19 * 4));
{
  const SMALL = [[2, false], [2, true], [3, false], [3, true]];
  const runs = SMALL.map(([seats, tiers]) => {
    let claims = [];
    const E = engineFor({ tiers, land: null }, (q, by, ep) => claims.push({ ep }));
    const T = { games: 0, pool: 0, hqs: 0, spread: 0, winnerEP: 0, hard: 0, tiles: 0,
      byTier: { 1: 0, 2: 0, 3: 0, 4: 0 } };
    for (let seed = 1; seed <= Math.min(SEEDS, 250); seed++) {
      claims = [];
      const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
      if (st.phase !== "gameover") continue;
      T.games++;
      T.pool += st.megacorpPool.length + claims.length;
      /* How many of the tiles that were IN the box this game were hard ones. */
      const inBox = [...st.megacorpPool.map((t) => t[2]), ...claims.map((c) => c.ep)];
      for (const ep of inBox) { const t = E.MC_TIER_BY_EP[ep] || 1; T.byTier[t]++; T.tiles++; if (t <= 2) T.hard++; }
      for (const p of st.players) T.hqs += E.megacorpHQs(p).length;
      const eps = [...st.players].sort(E.finalRank).map((p) => E.epTotal(p));
      T.winnerEP += eps[0];
      T.spread += eps[0] - eps[eps.length - 1];
    }
    return T;
  });
  const r4 = (name, fn, dp = 1) =>
    console.log(pad(name, 30) + runs.map((T) => rp(fn(T).toFixed(dp), 19)).join(""));
  r4("tiles in the box", (T) => T.pool / T.games);
  r4("  of them tier 1 or 2 (hard)", (T) => T.hard / T.games, 2);
  r4("  share that are hard", (T) => (100 * T.hard / Math.max(1, T.tiles)), 0);
  r4("Megacorps formed per game", (T) => T.hqs / T.games, 2);
  r4("winning score", (T) => T.winnerEP / T.games, 0);
  r4("winner's lead over last", (T) => T.spread / T.games);
}
console.log("");
