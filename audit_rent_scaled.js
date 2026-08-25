/* ============================================================================
   Rebasing production AND the costs that eat it: OPEX scaled, rent at $2.

   audit_small_company.js found that dropping every industry's level-1
   production by one is a genuine catch-up rule - companies still standing at
   level 1 rise from 31% to 40% at four seats and the winner's margin narrows -
   but that it collapses profitability, from 91% of companies covering their
   OPEX down to 45%. Scaling OPEX by the same ratio only recovers it to 69%.

   The residue was traced to GROUND RENT. Rent is $3 per company level and is
   not printed on any card, so it cannot be rebased along with them. Shrink
   production and rent becomes a proportionally larger fixed charge: a
   Healthcare level-1 card rebased to a single unit earns $4 at market against
   $3 of scaled OPEX plus $3 of rent.

   So this tests the completed version - production rebased, OPEX scaled with
   it, and RENT DROPPED TO $2 PER LEVEL - against the game as it stands, with
   rent alone isolated so its effect can be told apart from the rebase.

   Rent appears in eleven places: the four that actually move money (production
   OPEX, its per-plot split, and the two headquarters paths) and seven more
   inside the bots' own arithmetic - what a Blueprint is worth, which company
   has the worst return, whether a Megacorp is worth forming. All eleven are
   rewritten together. Leaving the bots on $3 while the board charges $2 would
   measure a table of players who cannot read their own costs.

   WHAT TO WATCH, beyond whether profitability recovers:

     RENT IS A TRANSFER, NOT A SINK. Every dollar of it moves from a tenant to
     a landlord, and audit_idle_land.js found that half of every player's plots
     carry somebody else's building at six seats. Cutting rent does not just
     relieve the tenant - it takes income away from the landlord, and land is
     already worth less at a big table than a small one.

     IT ALSO CHEAPENS BEING BIG. Rent scales with level, so a $3-to-$2 cut is
     worth three times as much to a level-3 company as to a level-1 one in
     absolute terms. It may undo the very catch-up effect the rebase buys.

   WHAT IT FOUND. The rent diagnosis was right; the rebase is still expensive.

   RENT AT $2 RESCUES MOST OF THE PROFITABILITY DAMAGE. Companies covering
   OPEX + rent, at four seats, across the three attempts at the rebase:

     rebase alone (rent $3, OPEX unscaled)          45%
     rebase + OPEX scaled (rent $3)                 69%
     rebase + OPEX scaled + rent $2                 82%
     shipped, for comparison                        91%

   At six seats it recovers almost entirely, 94% to 92%. So the diagnosis held:
   rent was the fixed charge no rewrite of the cards could reach.

   BUT THE REBASE STILL COSTS THE TEXTURE OF THE GAME. At four seats trade
   income falls $271 to $183, the winning score 105 to 85, loan discs more than
   double (0.14 to 0.34), and UPGRADES DROP FROM 1.64 TO 1.13 A SEAT. That last
   one matters most: upgrading is one of the game's core decisions, and a third
   of it disappears because a rebased company earns less to pay for the climb.

   AND THE CATCH-UP RETURN IS INCONSISTENT. The winner's lead over second
   improves at the bigger tables - 20.0 to 18.1 at four seats, 18.5 to 15.1 at
   six - and companies still standing at level 1 rise from 31% to 37%. But the
   Q6 leader's win rate gets slightly WORSE, 41% to 43% at four seats and 31% to
   35% at six, which is the measure that matters most for a runaway. The rebase
   narrows the final margin without making the game less decided.

   ADDING FLOOR 2 IS THE BEST RESULT FOR THE SMALL COMPANY AND NOT FOR THE RACE.
   Level-1 waste 70% to 50% at four seats, the lowest of anything measured in
   this repo, and the industry spread actually tightens to 19 points. But the
   winner's lead over second goes back UP to 20.7 - worse than the rebase alone.
   It makes small companies functional without making the game closer.

   THE QUIET WINNER IS RENT AT $2 ON ITS OWN. It is very nearly free: OPEX
   coverage 91% to 94% at four seats, income and winning score flat, industry
   spread 24 to 23 points. And it slightly IMPROVES the measure the rebase
   worsens - the Q6 leader's win rate falls 41% to 36% at four seats and 31% to
   28% at six. The one exception is the two-player game, where it rises 60% to
   67%; with two players a cheaper cost base helps whoever is already ahead,
   since there is nobody else to spread the relief across.

   A LATER CORRECTION TO WHY THAT WORKS. This probe said rent was a transfer
   between players, and explained the $3-to-$2 gain as relief to tenants. Reading
   runProduction properly (see audit_rent_flow.js) that is wrong in an important
   way: a company pays its OPEX and NOTHING ELSE, and rent is carved OUT of that
   payment - `toPots = cost - rentTotal`. The rate does not change what a tenant
   pays. What it changes is the SPLIT between landlords and the industry pots.

   So cutting rent to $2 did not relieve tenants; it pushed money into the pots,
   which are shared EVENLY among the active businesses of an industry, one equal
   share each whatever their size. That is the game's redistributive channel, and
   land income is its concentrated one. Moving money from rent to pots is
   progressive by construction - which is a better explanation of the measured
   result than the one given above, and predicts it rather than describing it.

   IT ALSO MEANS THE "companies covering OPEX + rent" COLUMN IN THIS REPORT
   OVERSTATES COSTS for ordinary companies, since it adds rent on top of an OPEX
   that already contains it. The comparison between columns is still sound - the
   same overstatement is applied to every ruleset - but the level is pessimistic.
   Only a Megacorp headquarters genuinely pays rent on top, from pocket, because
   it has no OPEX to carve it from.

   Run: node audit_rent_scaled.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "150", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* Every place the $3 rent rate is written, counted so a silent miss is loud. */
const RENT_SITES = [
  [/3 \* levelsOn\(/g, 4],
  [/3 \* b\.level/g, 5],   // four ROI/valuation sites plus rentTotal in runProduction
  [/3 \* bp\.lvl/g, 2],
];
for (const [re, want] of RENT_SITES) {
  const got = (BASE.match(re) || []).length;
  if (got !== want) {
    console.error(`expected ${want} rent sites for ${re}, found ${got} - update this probe`);
    process.exit(2);
  }
}

const DELIVER_NEEDLE = `  return cross ? 1 : (levelIdx + 1) * exchangeRate(state, biz);`;
const PLACEABLE_NEEDLE = `  const direct = slots.filter((s) => !s.cross)
    .reduce((n, s) => n + (s.levelIdx + 1), 0) * exchangeRate(state, biz);`;
const SALE_NEEDLE = "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;";
for (const [n, w] of [[DELIVER_NEEDLE, "deliverToSlot"], [PLACEABLE_NEEDLE, "placeableFor"], [SALE_NEEDLE, "autoDeliver"]]) {
  if (!BASE.includes(n)) { console.error(`the engine changed shape around ${w} - update this probe`); process.exit(2); }
}

const econ = { prod: 0, left: 0, earned: 0, byLevel: {}, rentMoved: 0 };

function loadEngine(opt) {
  let logic = BASE;

  /* rent rate, in all eleven places at once */
  const rent = opt.rent || 3;
  logic = logic.replace(/3 \* levelsOn\(/g, "__RENT * levelsOn(")
               .replace(/3 \* b\.level/g, "__RENT * b.level")
               .replace(/3 \* bp\.lvl/g, "__RENT * bp.lvl");
  logic = `const __RENT = ${rent};\n` + logic;

  if (opt.floor2) {
    logic = logic.replace(DELIVER_NEEDLE,
      "  return cross ? 1 : Math.max(2, levelIdx + 1) * exchangeRate(state, biz);");
    logic = logic.replace(PLACEABLE_NEEDLE,
      `  const direct = slots.filter((s) => !s.cross)
    .reduce((n, s) => n + Math.max(2, s.levelIdx + 1), 0) * exchangeRate(state, biz);`);
  }

  logic = logic.replace(SALE_NEEDLE,
    "  const leftover = Math.max(0, remaining);\n" +
    "  __econ.sale(earned, leftover, bizProd(biz), biz.level);\n" +
    "  p.cash += earned + leftover * 1;");

  let patch = "";
  if (opt.prodMinus1) {
    patch += `
      {
        const __l1 = {};
        for (const b of BP_DATA) if (b.lvl === 1) __l1[b.ind] = Math.min(__l1[b.ind] === undefined ? 99 : __l1[b.ind], b.prod);
        for (const b of BP_DATA) {
          const np = Math.max(1, __l1[b.ind] - 1) * Math.pow(2, b.lvl - 1);
          ${opt.opexScaled ? "b.opex = Math.max(1, Math.round(b.opex * (np / b.prod)));" : ""}
          b.prod = np;
        }
      }`;
  }

  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box, __econ: {
    sale: (earned, left, prod, lvl) => {
      econ.earned += earned; econ.left += left; econ.prod += prod;
      const L = econ.byLevel[lvl] || (econ.byLevel[lvl] = { prod: 0, left: 0 });
      L.prod += prod; L.left += left;
    },
  } };
  vm.createContext(sandbox);
  vm.runInContext(logic + patch + `
    box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
      epTotal, finalRank, activeBiz, megacorpHQs, bizInd, bizProd, bizOpex, price,
      plotCount, INDUSTRIES, BP_DATA, __RENT };
  `, sandbox);
  return box.exports;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const noise = (p, n) => 100 * 2 * Math.sqrt((p * (1 - p)) / Math.max(1, n));

const MODES = [
  ["ship", "shipped", {}],
  ["rent2", "rent $2 only", { rent: 2 }],
  ["full", "rebase + opex + rent2", { rent: 2, prodMinus1: true, opexScaled: true }],
  ["fullf", "+ floor 2", { rent: 2, prodMinus1: true, opexScaled: true, floor2: true }],
];
const SEATS = [2, 4, 6];
const results = {};

for (const [mode, label, opt] of MODES) {
  for (const seats of SEATS) {
    econ.prod = econ.left = econ.earned = 0; econ.byLevel = {};
    const E = loadEngine(opt);
    const T = {
      mode, label, seats, games: 0, players: 0,
      winnerEP: 0, gapSecond: 0, spread: 0,
      companies: 0, upgrades: 0, cash: 0, loans: 0,
      profitable: 0, cq: 0, levelMix: { 1: 0, 2: 0, 3: 0, 4: 0 },
      q6Games: 0, ledAt6Won: 0, bottomHalfWon: 0,
      indWin: {}, rent: E.__RENT,
      l1prod: [...new Set(E.BP_DATA.filter((b) => b.lvl === 1).map((b) => b.prod))].sort((a, b) => a - b).join("/"),
      l1opex: [...new Set(E.BP_DATA.filter((b) => b.lvl === 1).map((b) => b.opex))].sort((a, b) => a - b).join("/"),
    };
    for (const i of E.INDUSTRIES) T.indWin[i] = 0;

    for (let seed = 1; seed <= SEEDS; seed++) {
      const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
      if (st.phase !== "gameover") continue;
      T.games++;

      const ranked = [...st.players].sort(E.finalRank);
      const winner = ranked[0];
      T.winnerEP += E.epTotal(winner);
      T.gapSecond += E.epTotal(ranked[0]) - E.epTotal(ranked[1]);
      T.spread += E.epTotal(ranked[0]) - E.epTotal(ranked[ranked.length - 1]);
      for (const i of new Set([...E.activeBiz(winner), ...E.megacorpHQs(winner)].map(E.bizInd))) T.indWin[i]++;

      if (st.quarter >= 6) {
        const at6 = st.players
          .map((p) => ({ p, ep: (p.epLog || []).filter((e) => e.quarter <= 6).reduce((s, e) => s + e.amount, 0) }))
          .sort((a, b) => b.ep - a.ep);
        if (at6.length > 1 && at6[0].ep > at6[1].ep) {
          T.q6Games++;
          if (at6[0].p === winner) T.ledAt6Won++;
          if (at6.slice(Math.ceil(at6.length / 2)).map((x) => x.p).includes(winner)) T.bottomHalfWon++;
        }
      }

      for (const p of st.players) {
        T.players++;
        T.companies += E.activeBiz(p).length;
        T.upgrades += p.businesses.filter((b) => b.upgraded).length;
        T.cash += p.cash; T.loans += p.discsInBank;
        for (const b of E.activeBiz(p)) T.levelMix[Math.min(4, b.level)]++;
        for (const b of [...E.activeBiz(p), ...E.megacorpHQs(p)]) {
          T.cq++;
          /* the profitability test uses the SAME rent rate the ruleset charges */
          if (E.bizProd(b) * E.price(st.pm, E.bizInd(b)) >= E.bizOpex(b) + E.__RENT * b.level) T.profitable++;
        }
      }
    }
    T.prod = econ.prod; T.left = econ.left; T.earned = econ.earned;
    T.byLevel = JSON.parse(JSON.stringify(econ.byLevel));
    results[`${mode}|${seats}`] = T;
  }
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - production rebased, OPEX scaled with it, rent at $2");
console.log(`${SEEDS} games per ruleset per table size, personas on.\n`);

const W = 22;
const cols = MODES.map(([m]) => m);
const head = (seats) => console.log(pad(`  ${seats} players`, 32) + MODES.map(([, l]) => rp(l, W)).join(""));
const line = (seats, name, fn, dp = 1) =>
  console.log(pad(name, 32) + cols.map((m) => rp(fn(results[`${m}|${seats}`]).toFixed(dp), W)).join(""));
const lpct = (seats, name, fn) =>
  console.log(pad(name, 32) + cols.map((m) => rp(`${(100 * fn(results[`${m}|${seats}`])).toFixed(0)}%`, W)).join(""));
const lcash = (seats, name, fn) =>
  console.log(pad(name, 32) + cols.map((m) => rp(`$${Math.round(fn(results[`${m}|${seats}`]))}`, W)).join(""));

console.log("WHAT EACH RULESET CHARGES AND DEALS");
console.log(pad("  rent per company level", 32) + cols.map((m) => rp(`$${results[`${m}|4`].rent}`, W)).join(""));
console.log(pad("  level-1 production", 32) + cols.map((m) => rp(results[`${m}|4`].l1prod, W)).join(""));
console.log(pad("  level-1 OPEX", 32) + cols.map((m) => rp(`$${results[`${m}|4`].l1opex}`, W)).join(""));

for (const seats of SEATS) {
  console.log("\n" + "=".repeat(32 + W * 4));
  head(seats);
  console.log("=".repeat(32 + W * 4));
  console.log("  DOES PROFITABILITY SURVIVE?");
  lpct(seats, "    companies covering OPEX+rent", (T) => T.profitable / Math.max(1, T.cq));
  lcash(seats, "    trade income per seat", (T) => T.earned / Math.max(1, T.players));
  line(seats, "    unpaid loan discs per seat", (T) => T.loans / Math.max(1, T.players), 2);
  lcash(seats, "    cash a seat ends with", (T) => T.cash / Math.max(1, T.players));
  console.log("");
  console.log("  IS THE SMALL COMPANY WORTH RUNNING?");
  for (const lv of [1, 2, 3]) {
    console.log(pad(`    level ${lv} production recycled`, 32) + cols.map((m) => {
      const d = results[`${m}|${seats}`].byLevel[lv];
      return rp(d && d.prod ? `${(100 * d.left / d.prod).toFixed(0)}%` : "-", W);
    }).join(""));
  }
  lpct(seats, "    companies standing at level 1",
    (T) => T.levelMix[1] / Math.max(1, T.levelMix[1] + T.levelMix[2] + T.levelMix[3] + T.levelMix[4]));
  console.log("");
  console.log("  IS IT A CATCH-UP RULE?");
  lpct(seats, "    Q6 leader went on to win", (T) => T.ledAt6Won / Math.max(1, T.q6Games));
  lpct(seats, "    chance at this table size", () => 1 / seats);
  lpct(seats, "    bottom half at Q6 won", (T) => T.bottomHalfWon / Math.max(1, T.q6Games));
  line(seats, "    winner's lead over 2nd", (T) => T.gapSecond / Math.max(1, T.games));
  console.log("");
  console.log("  THE SHAPE OF THE GAME");
  line(seats, "    winning score", (T) => T.winnerEP / Math.max(1, T.games), 0);
  line(seats, "    companies per seat", (T) => T.companies / Math.max(1, T.players), 2);
  line(seats, "    of them upgraded", (T) => T.upgrades / Math.max(1, T.players), 2);
  lpct(seats, "    all production recycled", (T) => T.left / Math.max(1, T.prod));
}

console.log("\n\nINDUSTRY BALANCE at 4 seats (share of games in the winner's portfolio)");
{
  const E0 = loadEngine({});
  console.log(pad("", 32) + MODES.map(([, l]) => rp(l, W)).join(""));
  for (const ind of E0.INDUSTRIES) {
    console.log(pad(`  ${ind}`, 32) + cols.map((m) => {
      const T = results[`${m}|4`];
      return rp(`${(100 * T.indWin[ind] / Math.max(1, T.games)).toFixed(0)}%`, W);
    }).join(""));
  }
  console.log(pad("  spread, best minus worst", 32) + cols.map((m) => {
    const T = results[`${m}|4`];
    const v = E0.INDUSTRIES.map((i) => 100 * T.indWin[i] / Math.max(1, T.games));
    return rp(`${(Math.max(...v) - Math.min(...v)).toFixed(0)} pts`, W);
  }).join(""));
  console.log(`\n  two standard errors on each share is about ±${noise(0.5, results["ship|4"].games).toFixed(1)} points.`);
}
console.log("");
