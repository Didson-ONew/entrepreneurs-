/* ============================================================================
   The game from two seats to six - and which way of playing wins.

   Three questions in one probe, because they want the same games.

   ONE. Does the game hold up at every table size? Most of the balance work has
   been measured at four seats, and the Megacorp tiers are the first rule whose
   text changes with the player count: tier 2 only joins at three players and
   tier 1 only at four, so a smaller table plays with a smaller and easier box.
   Five and six seats add a fifth and a sixth slot to each of the three working
   tracks, so the squeeze on worker placement should hold roughly steady while
   the board, the demand and the Blueprint decks do not grow at all.

   THREE. How often does the second Megacorp end the game before Q12, and how
   early? That is the new deadline: three years, OR the first player to launch
   two Megacorps, whichever comes first.

   TWO. Which of the bots' ways of playing wins, and which loses? Every seat is
   dealt an archetype - a standing bias in how it spends its two workers and what
   it reaches for - and they have never been scored against each other under the
   current rules. Read the win rate against the chance line for that table size:
   50% at two seats, 33% at three, 25% at four. Anything inside about two
   standard errors of that line is noise, and the report says what that is rather
   than leaving it to be guessed at.

   The archetypes, in the engine's own words:

     Balanced          no bias; takes whatever scores best
     Rush-Cheap        buys cheap Blueprints early and often
     Upgrade-Focus     leans on growing what it has over building anew
     Tech-Heavy        favours Technology, whose doubler pays on reach
     Harvest & Rebuild tilts toward upgrading in the middle of the game

   Nothing is patched here. This measures the rules as they stand.

   WHAT IT FOUND, over 400 games a table size

   1. EVERY TABLE SIZE PLAYS. Nothing throws, nothing runs out, and the winning
      score climbs gently with the crowd: 87 at two seats, 82 at three, 90 at
      four, 96 at five, 101 at six. The winner's lead over LAST grows faster than
      the lead over SECOND (26 to 59 against 26 to 16), which is what a bigger
      table should look like - the race at the front stays close and the tail
      gets longer.

   2. THE BIG TABLE IS A CASH GAME, NOT A LAND GAME. Land falls from 21% of a
      winning score at two seats to 8% at six, and cash rises from 23% to 28%.
      The board does not grow, but neither does the fight over it: seats own
      about six plots each at every size from three players up, so land stops
      being contested and starts being a formality. If any table size wants a
      second look, it is six - not because it breaks, but because one of the
      game's five scoring routes has quietly gone quiet.

   3. THE MEGACORP TIERS DO WHAT THEY WERE ADDED FOR. Tier 4 is claimed 59% of
      the time at two seats and 43% at six, and tier 1 is claimed at all only
      from four seats up - which is exactly the gradient the draw rule promises.
      Megacorps a game rise from 1.32 to 3.68 across the range and the first one
      arrives earlier as the table grows (Q6.9 down to Q5.4), because more people
      chasing the same eight tiles means hurrying.

   4. TURN ORDER IS NOT WORTH MUCH. No seat is more than about four points off
      the chance line at any table size, and the spread narrows as the table
      grows. Reverse-order drafting and the FILO tracks are between them doing
      their job.

   5. RUSH-CHEAP IS THE BEST WAY TO PLAY, and it is the only archetype that
      clears the noise: +7.3 points at three seats and +5.7 at four. BALANCED IS
      THE WORST - it is below chance at every size and -5.5 at five seats, which
      is outside the noise. The reading is that buying cheap Blueprints early and
      often beats taking whatever scores best right now, and that having no bias
      at all is itself a losing bias. At six seats everything collapses toward
      chance (nothing over ±1.9), because five ways of playing across six seats
      means most of the table is running the same plan as somebody else.

   6. PERSONAS BARELY MOVE THE GAME. On against off, the winning score differs by
      1-3 EP at every table size and the spread by less than 2. They are flavour
      and a small nudge, not a balance lever - which is the right answer for a
      switch that is on by default. Per persona, only Supply Chain Expert at five
      seats clears the noise (+5.0). Systems Architect leans positive at four of
      the five sizes without ever clearing it.

   7. THE SECOND-MEGACORP DEADLINE FIRES IN ABOUT ONE GAME IN SEVEN at every
      table size, and almost always in Q9 to Q11. See audit_deadline.js for who
      pulls it and whether pulling it pays - that question turned out to matter
      more than how often it happens.

   Run: node audit_tables.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "400", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* How the shipped game hands out a bot's way of playing. It is deterministic and it
   is keyed on the SEAT: the first bot is always Balanced, the second always
   Rush-Cheap, and so on down a fixed list. Two consequences, and both of them matter
   to anyone trying to score one way of playing against another:

     Tech-Heavy and Harvest & Rebuild NEVER PLAY. Reaching the fourth and fifth entry
     needs five bots, and the game seats four.

     Way of playing and seat are the same variable. A win rate per archetype would be
     measuring turn order just as much as strategy.

   So the archetype half of this probe deals them at random instead - every archetype
   in every seat, all five of them in play - and says so. The table-size half runs the
   engine exactly as it ships. */
const ARCH_NEEDLES = {
  bot: "      const arch = ARCHETYPES[(i - nHumans) % ARCHETYPES.length];",
  human: "      players.push(newPlayer(i, nm, true, cash, [], null));",
};
const RANDOM_ARCH = `
let __archDeal = null, __archFor_key = null;
function __archFor(rng, i) {
  /* one shuffled deal per game, so every archetype sees every seat */
  if (__archFor_key !== rng) { __archDeal = shuffle(ARCHETYPES, rng); __archFor_key = rng; }
  return __archDeal[i % __archDeal.length];
}
`;

function loadEngine({ randomArchetypes = false } = {}) {
  let logic = BASE;
  if (randomArchetypes) {
    for (const [k, v] of Object.entries(ARCH_NEEDLES)) {
      if (!logic.includes(v)) { console.error(`the engine changed shape around ${k} - update this probe`); process.exit(2); }
    }
    logic = logic.replace(ARCH_NEEDLES.bot, "      const arch = __archFor(rng, i);");
    logic = logic.replace(ARCH_NEEDLES.human,
      "      players.push(newPlayer(i, nm, true, cash, [], __archFor(rng, i)));");
    logic += RANDOM_ARCH;
  }
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advancePlanning, advanceDraft, startPlanning,
      activeBiz, megacorpHQs, epTotal, finalRank, bizInd, plotCount, districtCount,
      MEGACORP_TILES, MEGACORP_TIER, INDUSTRIES, ARCHETYPES, ARCHETYPE_LABEL, PERSONAS };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

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
const round1 = (n) => Math.round(n * 10) / 10;

/* Two standard errors on a proportion, in percentage points - the width inside
   which a win rate is telling you nothing. */
const noise = (p, n) => 100 * 2 * Math.sqrt((p * (1 - p)) / Math.max(1, n));

const SIZES = [2, 3, 4, 5, 6];
const runs = [];

for (const seats of SIZES) {
  const T = {
    seats, games: 0, players: 0,
    winnerEP: 0, spread: 0, gapToSecond: 0, lastEP: 0,
    hqs: 0, seatsWithAny: 0, poolTiles: 0, firstQuarter: 0, firstGames: 0,
    tierClaimed: { 1: 0, 2: 0, 3: 0, 4: 0 },
    endedEarly: 0, endQuarter: 0, forcedPlacements: 0, placementChances: 0,
    companies: 0, upgrades: 0, plots: 0,
    ep: Object.fromEntries(BUCKETS.map((b) => [b, 0])),
    winnerEp: Object.fromEntries(BUCKETS.map((b) => [b, 0])),
    arch: {}, seatWins: [], seatPlays: [],
    persona: {},
    loansUnpaid: 0,
  };
  for (const a of E.ARCHETYPES) T.arch[a] = { played: 0, won: 0, ep: 0, companies: 0, hqs: 0, plots: 0 };
  for (let i = 0; i < seats; i++) { T.seatWins[i] = 0; T.seatPlays[i] = 0; }

  for (let seed = 1; seed <= SEEDS; seed++) {
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;

    T.games++;
    T.endQuarter += st.quarter;
    if (st.quarter < 12) T.endedEarly++;
    T.poolTiles += st.megacorpPool.length;
    const ranked = [...st.players].sort(E.finalRank);
    const winner = ranked[0];
    const eps = ranked.map((p) => E.epTotal(p));
    T.winnerEP += eps[0];
    T.lastEP += eps[eps.length - 1];
    T.spread += eps[0] - eps[eps.length - 1];
    T.gapToSecond += eps[0] - eps[1];

    let firstQ = null;
    for (const p of st.players) {
      T.players++;
      T.seatPlays[p.id]++;
      if (p === winner) T.seatWins[p.id]++;
      const hqs = E.megacorpHQs(p);
      T.hqs += hqs.length;
      if (hqs.length) T.seatsWithAny++;
      T.companies += E.activeBiz(p).length;
      T.upgrades += p.businesses.filter((b) => b.upgraded).length;
      T.plots += E.plotCount(st, p);
      T.loansUnpaid += p.discsInBank;
      for (const hq of hqs) T.tierClaimed[E.MEGACORP_TIER[hq.megacorpName] || 1] += 1;
      for (const e of p.epLog || []) {
        T.ep[bucketOf(e.label)] += e.amount;
        if (String(e.label).startsWith("Megacorp:") && (firstQ === null || e.quarter < firstQ)) firstQ = e.quarter;
      }
      if (p.persona) {
        T.persona[p.persona] = T.persona[p.persona] || { played: 0, won: 0 };
        T.persona[p.persona].played++;
        if (p === winner) T.persona[p.persona].won++;
      }
    }
    if (firstQ !== null) { T.firstGames++; T.firstQuarter += firstQ; }
    for (const e of winner.epLog || []) T.winnerEp[bucketOf(e.label)] += e.amount;
  }
  runs.push(T);
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - the game from two seats to six");
console.log(`${runs[0].games} games per table size, personas on, rules as they stand.\n`);

const W = 16;
const head = () => console.log(pad("", 34) + runs.map((T) => rp(`${T.seats} players`, W)).join(""));
const row = (name, fn, dp = 1) =>
  console.log(pad(name, 34) + runs.map((T) => rp(fn(T).toFixed(dp), W)).join(""));
const pct = (name, fn) =>
  console.log(pad(name, 34) + runs.map((T) => rp(`${(100 * fn(T)).toFixed(0)}%`, W)).join(""));

head();
console.log("─".repeat(34 + W * runs.length));
row("winning score", (T) => T.winnerEP / T.games, 0);
row("last place", (T) => T.lastEP / T.games, 0);
row("winner's lead over second", (T) => T.gapToSecond / T.games);
row("winner's lead over last", (T) => T.spread / T.games);
console.log("");
row("companies standing per seat", (T) => T.companies / T.players, 2);
row("  of them upgraded", (T) => T.upgrades / T.players, 2);
row("plots owned per seat", (T) => T.plots / T.players, 2);
row("unpaid loan discs per seat", (T) => T.loansUnpaid / T.players, 2);
console.log("");
row("quarter the game ended", (T) => T.endQuarter / T.games, 1);
pct("ended early on 2 Megacorps", (T) => T.endedEarly / T.games);
console.log("");
row("Megacorp tiles drawn", (T) => (T.poolTiles + T.hqs) / T.games, 1);
row("  left unclaimed at the end", (T) => T.poolTiles / T.games, 1);
row("Megacorps formed per game", (T) => T.hqs / T.games, 2);
pct("seats that formed one", (T) => T.seatsWithAny / T.players);
row("quarter of the first one", (T) => T.firstQuarter / Math.max(1, T.firstGames));

console.log("\nWhich tier was claimed (share of Megacorps formed)");
head();
for (let tier = 4; tier >= 1; tier--) {
  console.log(pad(`  tier ${tier}${tier === 4 ? " (easiest)" : tier === 1 ? " (hardest)" : ""}`, 34)
    + runs.map((T) => {
      const total = Object.values(T.tierClaimed).reduce((a, b) => a + b, 0) || 1;
      return rp(`${(100 * T.tierClaimed[tier] / total).toFixed(0)}%`, W);
    }).join(""));
}

console.log("\nThe WINNER's points, by source (share of their score)");
head();
for (const k of BUCKETS) {
  if (!runs.some((T) => Math.abs(T.winnerEp[k]) > 0.05)) continue;
  console.log(pad(`  ${k}`, 34) + runs.map((T) =>
    rp(`${(100 * T.winnerEp[k] / Math.max(1, T.winnerEP)).toFixed(0)}%`, W)).join(""));
}

console.log("\nWins by seat at the table");
head();
{
  const most = Math.max(...runs.map((T) => T.seats));
  for (let i = 0; i < most; i++) {
    console.log(pad(`  seat ${i + 1}`, 34) + runs.map((T) =>
      rp(i < T.seats ? `${(100 * T.seatWins[i] / Math.max(1, T.seatPlays[i])).toFixed(0)}%` : "-", W)).join(""));
  }
  console.log(pad("  chance", 34) + runs.map((T) => rp(`${(100 / T.seats).toFixed(0)}%`, W)).join(""));
}

/* ------------------------------------------------------- ways of playing */
/* ------------------------------------------------------- ways of playing
   On a randomised deal, so that a way of playing is not the same variable as a
   seat. In the shipped game it IS the same variable, and two of the five never
   get dealt at all - which is the first thing this section has to report. */
console.log("\n\n=== HOW THE BOTS PLAY, AND WHAT IT IS WORTH ===");
console.log("\nIn the game as it ships, a bot's way of playing is fixed by its seat:");
{
  const order = E.ARCHETYPES.map((a, i) => `${i + 1}. ${E.ARCHETYPE_LABEL[a] || a}`);
  console.log(`  ${order.join("   ")}`);
  console.log("  The first bot is always the first entry, the second always the second, and so on.");
  console.log("  A four-seat game holds three bots, so TECH-HEAVY AND HARVEST & REBUILD only get");
  console.log("  dealt at five and six seats, and never at the four-seat table most people play.");
  console.log("  Below they are dealt at random instead - every archetype in every seat - because");
  console.log("  otherwise a win rate would be measuring turn order as much as strategy.");
}

const AE = loadEngine({ randomArchetypes: true });
for (const seats of SIZES) {
  const arch = {};
  for (const a of AE.ARCHETYPES) arch[a] = { played: 0, won: 0, ep: 0, companies: 0, upgrades: 0, hqs: 0, plots: 0, cash: 0 };
  let games = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const st = AE.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { AE.advanceDraft(st, () => {}); AE.startPlanning(st); }
    AE.advancePlanning(st, AE.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;
    games++;
    const winner = [...st.players].sort(AE.finalRank)[0];
    for (const p of st.players) {
      const a = arch[p.archetype];
      if (!a) continue;
      a.played++; a.ep += AE.epTotal(p);
      a.companies += AE.activeBiz(p).length;
      a.upgrades += p.businesses.filter((b) => b.upgraded).length;
      a.hqs += AE.megacorpHQs(p).length;
      a.plots += AE.plotCount(st, p);
      a.cash += p.cash;
      if (p === winner) a.won++;
    }
  }
  const chance = 1 / seats;
  const per = games * seats / AE.ARCHETYPES.length;
  console.log(`\n${seats} players, ${games} games - chance is ${(100 * chance).toFixed(0)}%, `
    + `two standard errors is about \u00b1${noise(chance, per).toFixed(1)} points`);
  console.log(pad("  way of playing", 24) + rp("dealt", 7) + rp("win rate", 10) + rp("vs chance", 11)
    + rp("avg EP", 8) + rp("companies", 11) + rp("upgraded", 10) + rp("plots", 7)
    + rp("Megacorps", 11) + rp("cash left", 11));
  console.log("  " + "\u2500".repeat(98));
  const rows = AE.ARCHETYPES.map((a) => {
    const x = arch[a];
    return { a, ...x, rate: x.played ? x.won / x.played : 0 };
  }).sort((x, y) => y.rate - x.rate);
  for (const r of rows) {
    const delta = 100 * (r.rate - chance);
    const band = noise(chance, r.played);
    const mark = Math.abs(delta) > band ? (delta > 0 ? "   <- best" : "   <- worst") : "";
    console.log(pad(`  ${AE.ARCHETYPE_LABEL[r.a] || r.a}`, 24)
      + rp(r.played, 7)
      + rp(`${(100 * r.rate).toFixed(1)}%`, 10)
      + rp(`${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`, 11)
      + rp(round1(r.ep / Math.max(1, r.played)), 8)
      + rp(round1(r.companies / Math.max(1, r.played)), 11)
      + rp(round1(r.upgrades / Math.max(1, r.played)), 10)
      + rp(round1(r.plots / Math.max(1, r.played)), 7)
      + rp(round1(r.hqs / Math.max(1, r.played)), 11)
      + rp(`$${Math.round(r.cash / Math.max(1, r.played))}`, 11)
      + mark);
  }
}

/* ------------------------------------------------- personas on vs personas off
   Personas are on by default and every table above has them. The question this
   section answers is whether they are what is holding the bigger tables
   together, or whether they only decorate them: the same seeds, the same seats,
   dealt without powers. */
console.log("\n\n=== WITH PERSONAS AND WITHOUT ===");
{
  const off = [];
  for (const seats of SIZES) {
    const O = { seats, games: 0, winnerEP: 0, spread: 0, hqs: 0, endQuarter: 0, endedEarly: 0 };
    for (let seed = 1; seed <= SEEDS; seed++) {
      const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, false, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
      if (st.phase !== "gameover") continue;
      O.games++;
      O.endQuarter += st.quarter;
      if (st.quarter < 12) O.endedEarly++;
      const ranked = [...st.players].sort(E.finalRank);
      O.winnerEP += E.epTotal(ranked[0]);
      O.spread += E.epTotal(ranked[0]) - E.epTotal(ranked[ranked.length - 1]);
      for (const p of st.players) O.hqs += E.megacorpHQs(p).length;
    }
    off.push(O);
  }
  const line = (name, fn, on, dp = 1) =>
    console.log(pad(name, 34) + on.map((T) => rp(fn(T).toFixed(dp), W)).join(""));
  head();
  console.log("\u2500".repeat(34 + W * runs.length));
  line("winning score, personas on", (T) => T.winnerEP / T.games, runs, 0);
  line("winning score, personas off", (T) => T.winnerEP / T.games, off, 0);
  line("lead over last, personas on", (T) => T.spread / T.games, runs);
  line("lead over last, personas off", (T) => T.spread / T.games, off);
  line("Megacorps a game, personas on", (T) => T.hqs / T.games, runs, 2);
  line("Megacorps a game, personas off", (T) => T.hqs / T.games, off, 2);
  line("last quarter, personas on", (T) => T.endQuarter / T.games, runs);
  line("last quarter, personas off", (T) => T.endQuarter / T.games, off);
}

console.log("\n\n=== EVERY PERSONA AT EVERY TABLE SIZE ===");
for (const T of runs) {
  const chance = 1 / T.seats;
  console.log(`\n${T.seats} players`);
  const rows = Object.entries(T.persona)
    .map(([k, v]) => ({ k, ...v, rate: v.played ? v.won / v.played : 0 }))
    .sort((a, b) => b.rate - a.rate);
  for (const r of rows) {
    const delta = 100 * (r.rate - chance);
    const band = noise(chance, r.played);
    console.log(pad(`  ${(E.PERSONAS[r.k] && E.PERSONAS[r.k].name) || r.k}`, 34)
      + rp(r.played, 8) + rp(`${(100 * r.rate).toFixed(1)}%`, 11)
      + rp(`${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`, 11)
      + (Math.abs(delta) > band ? "  outside the noise" : ""));
  }
}
console.log("");
