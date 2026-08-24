/* ============================================================================
   Paying second place for land at five and six seats.

   THE OBSERVATION. Land is 21% of a winning score at two players and 8% at six,
   while cash climbs the other way, 21% to 31%. With six seats on the same
   sixteen districts nobody can assemble a winning plot count, so the land race
   stops being a race and the money that would have bought ground sits in hand
   scoring 1 EP per $10 instead.

   THE PROPOSAL. Put second place back on the podium, but only at the table
   sizes where the race has died - five and six seats. The hope is that a second
   prize makes land worth contesting again, which pulls money back out of the
   cash pile and into the board.

   WHY THIS PROBE PATCHES TWO THINGS AND NOT ONE. Changing awardRanked alone
   would measure nothing: the bots decide what a plot is worth through
   landEPWeight, which returns zero flat for anyone who is not leading or within
   two plots of the lead. Leave that untouched and second place pays out to
   whoever happened to be second anyway, no buying behaviour changes, and the
   probe reports "more points, same game" - which would be an artefact of the
   patch, not a finding. Both the scoring and the valuation are moved together.

   THE RISK BEING TESTED FOR. The land awards used to pay 10 and 5 with ties
   splitting, and that was removed for a reason: almost everybody collected
   something, holding land stopped being a contest, and it was 21% of a score
   for barely a decision. Separately, raising land's frequency was measured
   earlier and BACKFIRED - paying every quarter took leader-then-won from 49% to
   76%, because a player who is ahead is usually ahead on land too. So the
   number that decides this is not "did land's share go up" - it is whether the
   player leading at the halfway mark now wins more often than before.

   Four scenarios, all five- and six-seat:
     1. as it stands          leader alone, 5 / 2 each if two tie / 1 if more
     2. second pays 2         leader 5, runner-up 2
     3. second pays 3         leader 5, runner-up 3
     4. second pays 3, and    as 3, but the awards pay only at the END, so the
        end only                second prize cannot compound four times over

   WHAT IT FOUND

   PAYING SECOND PLACE DOES NOT MAKE ANYBODY BUY LAND. Plots per seat move from
   5.97 to 6.03 at five players and 6.06 to 6.16 at six - noise. Cash left in
   hand does not budge either: $164 to $168, and $184 to $181. Land's share of
   the winning score does rise, 9% to 12%, but that is purely the extra payout
   landing on plots people were buying anyway. More points for the same game.

   THE REASON IS THAT THE INCENTIVE WAS NEVER THE BINDING CONSTRAINT. THE DISCS
   ARE. A seat has twelve discs covering plots owned, active companies and
   unpaid loans, and it finishes the game using 9.4 to 10.4 of them. Between 21%
   and 34% of seats end with ZERO free discs - the worst of it at six players,
   34% - while 28 to 50 plots sit unowned on the board and $164 to $184 sits in
   hand. Nobody is choosing cash over land. They are out of discs.

   RAISING THE DISCS PROVES IT, AND STILL DOES NOT FIX THE CASH (control below).
   Twelve to sixteen discs takes plots per seat from 5.95 to 7.48 at five players
   and 6.02 to 7.59 at six, exactly as the constraint story predicts. But cash in
   hand RISES, $162 to $172 and $181 to $189, land's share barely moves, and the
   winner's lead over last goes from 51.9 to 55.6 and from 56.9 to 64.2. More
   capacity is more runway for whoever is already ahead.

   SO CASH IS NOT A RIVAL TO LAND, IT IS A RESIDUAL. A bigger table circulates
   more money - more OPEX flowing into the industry pots, more B2B paid back out
   - and the surplus has nowhere to go once the discs are spent, so it scores at
   the $10 floor. Confirmed independently in audit_liquidation.js: selling
   companies for cash at the end is a LOSS at six seats, so nobody is farming
   cash. It accumulates because the board is full, not because it is attractive.

   The lever that would actually move cash is therefore the conversion rate or
   the size of the faucet, not the land podium and not the disc count. Neither is
   tested here.

   Run: node audit_land_second.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "300", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* ---- the two needles, both validated before anything is replaced ---- */
const AWARD_NEEDLE = `function awardRanked(state, scoreFn, label, log) {
  const scores = state.players.map((p) => ({ p, s: scoreFn(p) })).filter((x) => x.s > 0);
  if (!scores.length) return;
  const top = Math.max(...scores.map((x) => x.s));
  const leaders = scores.filter((x) => x.s === top);
  const share = leaders.length === 1 ? LAND_AWARD.sole
    : leaders.length === 2 ? LAND_AWARD.two : LAND_AWARD.many;
  for (const { p } of leaders) {`;

const WEIGHT_NEEDLE = `  const mine = plotCount(state, p);
  const best = Math.max(...state.players.map((q) => plotCount(state, q)));
  if (mine >= best) return payouts * LAND_AWARD.sole * 0.6;   // leading, or level with the leader
  if (best - mine <= 2) return payouts * LAND_AWARD.sole * 0.35;  // close enough to take it
  return 0;                                                   // not a race this player is in`;

for (const [name, n] of [["awardRanked", AWARD_NEEDLE], ["landEPWeight", WEIGHT_NEEDLE]]) {
  if (!BASE.includes(n)) { console.error(`the engine changed shape around ${name} - update this probe`); process.exit(2); }
}

const AWARD_PATCHED = `function awardRanked(state, scoreFn, label, log) {
  const scores = state.players.map((p) => ({ p, s: scoreFn(p) })).filter((x) => x.s > 0);
  if (!scores.length) return;
  if (__SECOND_PAYS && state.players.length >= 5) {
    const tiers = [...new Set(scores.map((x) => x.s))].sort((a, b) => b - a).slice(0, 2);
    tiers.forEach((val, rank) => {
      const at = scores.filter((x) => x.s === val);
      const pot = rank === 0 ? LAND_AWARD.sole : __SECOND_PAYS;
      const share = at.length === 1 ? pot : Math.max(1, Math.floor(pot / at.length));
      for (const { p } of at) {
        addEP(p, share, label, state.quarter);
        if (log) log(\`\${p.name} earns \${label} (+\${share} EP).\`, p.id);
      }
    });
    return;
  }
  const top = Math.max(...scores.map((x) => x.s));
  const leaders = scores.filter((x) => x.s === top);
  const share = leaders.length === 1 ? LAND_AWARD.sole
    : leaders.length === 2 ? LAND_AWARD.two : LAND_AWARD.many;
  for (const { p } of leaders) {`;

/* The bot's valuation has to learn the same rule, or nothing it does changes. */
const WEIGHT_PATCHED = `  const mine = plotCount(state, p);
  const counts = state.players.map((q) => plotCount(state, q)).sort((a, b) => b - a);
  const best = counts[0];
  if (__SECOND_PAYS && state.players.length >= 5) {
    const second = counts.length > 1 ? counts[1] : 0;
    if (mine >= best) return payouts * (LAND_AWARD.sole * 0.6);
    if (best - mine <= 2) return payouts * (LAND_AWARD.sole * 0.35 + __SECOND_PAYS * 0.3);
    if (mine >= second || second - mine <= 2) return payouts * (__SECOND_PAYS * 0.4);
    return 0;
  }
  if (mine >= best) return payouts * LAND_AWARD.sole * 0.6;   // leading, or level with the leader
  if (best - mine <= 2) return payouts * LAND_AWARD.sole * 0.35;  // close enough to take it
  return 0;                                                   // not a race this player is in`;

function loadEngine(secondPays, endOnly) {
  let logic = BASE.replace(AWARD_NEEDLE, AWARD_PATCHED).replace(WEIGHT_NEEDLE, WEIGHT_PATCHED);
  logic = `var __SECOND_PAYS = ${secondPays || 0};\n` + logic;
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
      epTotal, finalRank, activeBiz, megacorpHQs, plotCount, districtCount,
      CASH_PER_EP, normaliseVariants };
  `, sandbox);
  const E = box.exports;
  E.__endOnly = endOnly;
  return E;
}

function bucketOf(label) {
  const l = String(label || "");
  if (l === "The Real-Estate Mogul" || l === "The Omnipresent") return "land";
  if (l.startsWith("Cash on hand")) return "cash";
  if (l.startsWith("Company:")) return "companies";
  if (l.startsWith("Megacorp")) return "megacorp";
  if (l.startsWith("Entered ")) return "industries";
  return "other";
}

const SCENARIOS = [
  { key: "as it stands", second: 0, endOnly: false },
  { key: "second pays 2", second: 2, endOnly: false },
  { key: "second pays 3", second: 3, endOnly: false },
  { key: "second pays 3, end only", second: 3, endOnly: true },
];
const SIZES = [5, 6];

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);

const results = {};

for (const sc of SCENARIOS) {
  const E = loadEngine(sc.second, sc.endOnly);
  for (const seats of SIZES) {
    const T = {
      games: 0, players: 0, winnerEP: 0, spread: 0, gapToSecond: 0,
      plots: 0, winnerPlots: 0, cash: 0, companies: 0,
      ep: { land: 0, cash: 0, companies: 0, megacorp: 0, industries: 0, other: 0 },
      winnerEp: { land: 0, cash: 0, companies: 0, megacorp: 0, industries: 0, other: 0 },
      leaderHeld: 0, leaderGames: 0, landLeaderWon: 0, landGames: 0,
    };
    for (let seed = 1; seed <= SEEDS; seed++) {
      const variants = sc.endOnly ? E.normaliseVariants({ endgameLandAwards: true }) : undefined;
      const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, variants);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
      if (st.phase !== "gameover") continue;
      T.games++;

      const ranked = [...st.players].sort(E.finalRank);
      const winner = ranked[0];
      T.winnerEP += E.epTotal(winner);
      T.spread += E.epTotal(ranked[0]) - E.epTotal(ranked[ranked.length - 1]);
      T.gapToSecond += E.epTotal(ranked[0]) - E.epTotal(ranked[1]);
      T.winnerPlots += E.plotCount(st, winner);

      for (const p of st.players) {
        T.players++;
        T.plots += E.plotCount(st, p);
        T.cash += p.cash;
        T.companies += E.activeBiz(p).length;
        for (const e of p.epLog || []) T.ep[bucketOf(e.label)] += e.amount;
      }
      for (const e of winner.epLog || []) T.winnerEp[bucketOf(e.label)] += e.amount;

      /* THE NUMBER THAT DECIDES IT: does being ahead at the half now compound?
         Standings are rebuilt from the EP log at the end of Q6. */
      const atHalf = st.players
        .map((p) => ({ p, ep: (p.epLog || []).filter((e) => e.quarter <= 6).reduce((s, e) => s + e.amount, 0) }))
        .sort((a, b) => b.ep - a.ep);
      if (atHalf.length > 1 && atHalf[0].ep > atHalf[1].ep) {
        T.leaderGames++;
        if (atHalf[0].p === winner) T.leaderHeld++;
      }
      /* and does whoever wins the land race win the game? */
      const byPlots = st.players.map((p) => ({ p, n: E.plotCount(st, p) })).sort((a, b) => b.n - a.n);
      if (byPlots.length > 1 && byPlots[0].n > byPlots[1].n) {
        T.landGames++;
        if (byPlots[0].p === winner) T.landLeaderWon++;
      }
    }
    results[`${sc.key}|${seats}`] = T;
  }
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - paying second place for land at five and six seats");
console.log(`${SEEDS} games per scenario per table size, personas on.`);
console.log("Both the scoring AND the bots' plot valuation are moved together.\n");

const W = 24;
for (const seats of SIZES) {
  console.log(`\n${"=".repeat(38 + W * SCENARIOS.length)}`);
  console.log(`${seats} PLAYERS`);
  console.log("=".repeat(38 + W * SCENARIOS.length));
  const cols = SCENARIOS.map((sc) => results[`${sc.key}|${seats}`]);
  console.log(pad("", 38) + SCENARIOS.map((sc) => rp(sc.key, W)).join(""));
  console.log("─".repeat(38 + W * SCENARIOS.length));
  const row = (name, fn, dp = 1) =>
    console.log(pad(name, 38) + cols.map((T) => rp(fn(T).toFixed(dp), W)).join(""));
  const pct = (name, fn) =>
    console.log(pad(name, 38) + cols.map((T) => rp(`${(100 * fn(T)).toFixed(0)}%`, W)).join(""));

  console.log("Does land get bought?");
  row("  plots owned per seat", (T) => T.plots / Math.max(1, T.players), 2);
  row("  the winner's plots", (T) => T.winnerPlots / Math.max(1, T.games), 2);
  row("  cash left in hand per seat", (T) => T.cash / Math.max(1, T.players), 0);
  row("  companies standing per seat", (T) => T.companies / Math.max(1, T.players), 2);
  console.log("");
  console.log("The winner's score, by source");
  for (const k of ["companies", "land", "cash", "megacorp", "industries"]) {
    console.log(pad(`  ${k}`, 38) + cols.map((T) =>
      rp(`${(100 * T.winnerEp[k] / Math.max(1, T.winnerEP)).toFixed(0)}%`, W)).join(""));
  }
  console.log("");
  console.log("Does it compound a lead?  <- the number that decides it");
  pct("  leader at the half went on to win", (T) => T.leaderHeld / Math.max(1, T.leaderGames));
  pct("  land leader won the game", (T) => T.landLeaderWon / Math.max(1, T.landGames));
  row("  winner's lead over last", (T) => T.spread / Math.max(1, T.games));
  row("  winner's lead over second", (T) => T.gapToSecond / Math.max(1, T.games));
  row("  winning score", (T) => T.winnerEP / Math.max(1, T.games), 0);
}

/* ------------------------------------------------------------------ control
   If the incentive is not what limits land buying, the disc cap should be - and
   moving it should move plots where the podium did not. This is the control that
   makes the null above mean something. */
console.log(`\n\n${"=".repeat(96)}`);
console.log("CONTROL: the same question asked of the DISC CAP instead of the podium");
console.log("=".repeat(96));

const DISC_NEEDLE = "const DISCS_PER_PLAYER = 12;";
if (!BASE.includes(DISC_NEEDLE)) {
  console.log("  (the disc constant changed shape - control skipped)");
} else {
  console.log(pad("  seats / discs", 22) + rp("plots/seat", 13) + rp("cash/seat", 12)
    + rp("companies", 12) + rp("no discs left", 15) + rp("land%", 8) + rp("lead over last", 16));
  console.log("  " + "\u2500".repeat(94));
  for (const seats of SIZES) {
    for (const discs of [12, 14, 16]) {
      const box2 = {};
      const sb2 = { console, Math, Set, Object, Array, JSON, box: box2 };
      vm.createContext(sb2);
      vm.runInContext(BASE.replace(DISC_NEEDLE, `const DISCS_PER_PLAYER = ${discs};`) + `
        box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
          plotCount, activeBiz, epTotal, finalRank, discsFree };
      `, sb2);
      const D = box2.exports;
      let pl = 0, n = 0, cash = 0, co = 0, maxed = 0, wep = 0, g = 0, land = 0, spread = 0;
      for (let seed = 1; seed <= SEEDS; seed++) {
        const st = D.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
        st.players[0].isHuman = false;
        if (st.phase === "drafting") { D.advanceDraft(st, () => {}); D.startPlanning(st); }
        D.advancePlanning(st, D.mulberry32(seed + 777), () => {});
        if (st.phase !== "gameover") continue;
        g++;
        const r = [...st.players].sort(D.finalRank);
        wep += D.epTotal(r[0]);
        spread += D.epTotal(r[0]) - D.epTotal(r[r.length - 1]);
        for (const e of r[0].epLog || []) {
          if (e.label === "The Real-Estate Mogul" || e.label === "The Omnipresent") land += e.amount;
        }
        for (const p of st.players) {
          n++; pl += D.plotCount(st, p); cash += p.cash;
          co += D.activeBiz(p).length;
          if (D.discsFree(st, p) === 0) maxed++;
        }
      }
      console.log(pad(`  ${seats} players, ${discs} discs`, 22)
        + rp((pl / n).toFixed(2), 13)
        + rp(`$${Math.round(cash / n)}`, 12)
        + rp((co / n).toFixed(2), 12)
        + rp(`${(100 * maxed / n).toFixed(0)}%`, 15)
        + rp(`${(100 * land / wep).toFixed(0)}%`, 8)
        + rp((spread / g).toFixed(1), 16));
    }
  }
}
console.log("");
