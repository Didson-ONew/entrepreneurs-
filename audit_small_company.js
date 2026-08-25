/* ============================================================================
   Making a small company worth running: four ways, measured together.

   audit_deepest_first.js established the problem precisely. A level-1 company
   has about 2.4 own-industry icons in reach, worth 2.4 units of capacity, and
   3.1 units of production - so it wastes output even with no competition. A
   level-3 company has roughly 27 units of capacity in reach for 12.9 units of
   output. The small company is short of somewhere to sell; the big one is not.

   Four rulesets, all measured against the same seeds:

     SHIPPED          the game as it stands.

     FLOOR 2          the level-1 COLUMN absorbs two units instead of one, so
                      the absorption ladder reads 2/2/3/4 rather than 1/2/3/4.
                      This is the only change that touches the one column a
                      level-1 company can ever reach.

     DEEPEST + PROD   deliver into the deepest reachable icon first, AND every
                      industry's level-1 production drops by one, doubling per
                      level from there. Production is already an exact doubling
                      (4/8/16 for Utilities and Retail, 3/6/12 for Hospitality
                      and Manufacturing, 2/4/8 for Healthcare and Technology),
                      so this rebases it to 3/6/12, 2/4/8 and 1/2/4.

     + CHEAPER SETUP  as above, and the level-1 setup tiers move from
                      $10/$15/$20 to $5/$10/$20. Retail and Hospitality fall to
                      $5, Utilities and Technology to $10, Manufacturing and
                      Healthcare stay at $20.

   ONE THING TO WATCH IN THE FOURTH: only the LEVEL-1 setup moves, which is what
   "on their base form" asks for. Upgrading pays the new level's printed setup,
   so cheapening only the bottom rung makes the CLIMB relatively more expensive
   than it is now. That may work against the intent, and the upgrade counts
   below are where it would show.

   WHAT DECIDES IT is not total waste - it is whether the small company is worth
   running. So the report leads with waste at level 1 specifically, the mix of
   company levels standing at the end, and the catch-up measures from
   audit_runaway.js: whether the Q6 leader still wins, whether the bottom half
   recovers, and the winner's margin over second.

   WHAT IT FOUND. Nothing shipped; all three have real costs, and one of them
   fails the same way every production cut in this repo has failed.

   FLOOR 2 IS THE ONLY CLEAN WIN, AND IT IS NARROW. Level-1 production recycled
   falls 67% to 57% at two seats, 70% to 61% at four, 72% to 63% at six - about
   ten points, exactly where it was aimed - and it costs NOTHING in
   profitability: companies covering their OPEX go 91% to 93% at four seats.
   But it is not a catch-up rule. The Q6 leader's win rate does not move (41% to
   39% at four seats), the winner's lead over second widens slightly (20.0 to
   21.2), and it makes the economy richer again on top of the demand-depth
   change - trade income $271 to $325, winning score 105 to 114. It also
   disturbs the industry balance: the spread in the winner's portfolio goes from
   24 points to 34, with Hospitality up to 72% and Technology down to 38%,
   against a two-standard-error band of 8. Floor 2 fixes the level-1 company's
   selling problem and buys nothing else.

   PROD-1 IS A GENUINE CATCH-UP RULE THAT BREAKS THE ECONOMY. It does what was
   wanted: companies still standing at level 1 rise from 31% to 40% at four
   seats, the winner's lead over second narrows 20.0 to 18.0, and the bottom
   half at Q6 wins more often (31% to 34%). But companies covering their OPEX
   collapse from 91% to 45% at four seats and 87% to 35% at two, loan discs
   nearly triple, and the winning score drops from 105 to 84.

   SCALING OPEX WITH IT RESCUES MOST OF THAT AND NOT ALL - a separate run puts
   coverage at 69% instead of 45%, income $231 instead of $185. The residue is
   structural and worth writing down: GROUND RENT IS $3 PER LEVEL AND DOES NOT
   SCALE WITH PRODUCTION. Shrink the output and rent becomes a proportionally
   larger fixed cost, so a Healthcare level-1 card rebased to 1 unit earns $4 at
   market against $3 of scaled OPEX plus $3 of rent. No proportional rewrite of
   the cards can fix that, because rent is not on the cards.

   CHEAPER SETUP CHANGES ALMOST NOTHING, and the reason is worth keeping. Setup
   is a CAPITAL cost paid once; the thing killing small companies is a RECURRING
   one. Moving the level-1 tiers from $10/$15/$20 to $5/$10/$20 moves OPEX
   coverage by a single point (45% to 44% at four seats). It does soften the
   edges - loan discs 0.39 to 0.25, winning score 84 to 87, upgrades 1.02 to
   1.17 - but it is not addressing the problem. Note also that cheapening only
   the base rung makes the CLIMB relatively dearer, since upgrading pays the new
   level's printed setup, and upgrades stay well below the shipped 1.64 either
   way.

   THE HONEST SUMMARY: making small companies SELL better (floor 2) is cheap and
   does not make the game closer. Making them COMPETITIVE (prod-1) does make the
   game closer and costs a third of the board's ability to pay its bills. They
   are different goals and the two levers are not interchangeable.

   Run: node audit_small_company.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "150", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const DELIVER_NEEDLE = `  return cross ? 1 : (levelIdx + 1) * exchangeRate(state, biz);`;
const PLACEABLE_NEEDLE = `  const direct = slots.filter((s) => !s.cross)
    .reduce((n, s) => n + (s.levelIdx + 1), 0) * exchangeRate(state, biz);`;
const SORT_NEEDLE = "  })).sort((a, b) => b.pay - a.pay);";
const SALE_NEEDLE = "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;";
for (const [n, w] of [[DELIVER_NEEDLE, "deliverToSlot"], [PLACEABLE_NEEDLE, "placeableFor"],
                      [SORT_NEEDLE, "autoDeliver's order"], [SALE_NEEDLE, "autoDeliver's tail"]]) {
  if (!BASE.includes(n)) { console.error(`the engine changed shape around ${w} - update this probe`); process.exit(2); }
}

const econ = { prod: 0, left: 0, earned: 0, byLevel: {}, byInd: {} };

function loadEngine(opt) {
  let logic = BASE;

  if (opt.floor2) {
    logic = logic.replace(DELIVER_NEEDLE,
      "  return cross ? 1 : Math.max(2, levelIdx + 1) * exchangeRate(state, biz);");
    logic = logic.replace(PLACEABLE_NEEDLE,
      `  const direct = slots.filter((s) => !s.cross)
    .reduce((n, s) => n + Math.max(2, s.levelIdx + 1), 0) * exchangeRate(state, biz);`);
  }
  if (opt.deepest) {
    logic = logic.replace(SORT_NEEDLE,
      "  })).sort((a, b) => b.levelIdx - a.levelIdx || b.pay - a.pay);");
  }

  /* Card rewrites happen at module scope, after BP_DATA exists and before any
     game is dealt. The level-1 base is READ for every industry before anything
     is written, so the rebase cannot feed on its own output. */
  let patch = "";
  if (opt.prodMinus1) {
    patch += `
      {
        const __l1 = {};
        for (const b of BP_DATA) if (b.lvl === 1) __l1[b.ind] = Math.min(__l1[b.ind] === undefined ? 99 : __l1[b.ind], b.prod);
        for (const b of BP_DATA) b.prod = Math.max(1, __l1[b.ind] - 1) * Math.pow(2, b.lvl - 1);
      }`;
  }
  if (opt.cheapSetup) {
    patch += `
      {
        const __map = { 10: 5, 15: 10, 20: 20 };
        for (const b of BP_DATA) if (b.lvl === 1 && __map[b.setup] !== undefined) b.setup = __map[b.setup];
      }`;
  }

  logic = logic.replace(SALE_NEEDLE,
    "  const leftover = Math.max(0, remaining);\n" +
    "  __econ.sale(earned, leftover, bizProd(biz), bizInd(biz), biz.level);\n" +
    "  p.cash += earned + leftover * 1;");

  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box, __econ: {
    sale: (earned, left, prod, ind, lvl) => {
      econ.earned += earned; econ.left += left; econ.prod += prod;
      const L = econ.byLevel[lvl] || (econ.byLevel[lvl] = { prod: 0, left: 0 });
      L.prod += prod; L.left += left;
      const I = econ.byInd[ind] || (econ.byInd[ind] = { prod: 0, left: 0 });
      I.prod += prod; I.left += left;
    },
  } };
  vm.createContext(sandbox);
  vm.runInContext(logic + patch + `
    box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
      epTotal, finalRank, activeBiz, megacorpHQs, bizInd, bizProd, bizOpex, bizSetup,
      price, plotCount, INDUSTRIES, BP_DATA, RENT_PER_LEVEL };
  `, sandbox);
  return box.exports;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const noise = (p, n) => 100 * 2 * Math.sqrt((p * (1 - p)) / Math.max(1, n));

const MODES = [
  ["ship", "shipped", {}],
  ["floor", "floor 2", { floor2: true }],
  ["deep", "deepest + prod-1", { deepest: true, prodMinus1: true }],
  ["cheap", "+ cheaper setup", { deepest: true, prodMinus1: true, cheapSetup: true }],
];
const SEATS = [2, 4, 6];
const results = {};

for (const [mode, label, opt] of MODES) {
  for (const seats of SEATS) {
    econ.prod = econ.left = econ.earned = 0; econ.byLevel = {}; econ.byInd = {};
    const E = loadEngine(opt);
    const T = {
      mode, label, seats, games: 0, players: 0,
      winnerEP: 0, gapSecond: 0, spread: 0, endQ: 0,
      companies: 0, upgrades: 0, cash: 0, plots: 0, loans: 0,
      profitable: 0, cq: 0, levelMix: { 1: 0, 2: 0, 3: 0, 4: 0 },
      q6Games: 0, ledAt6Won: 0, bottomHalfWon: 0,
      indWin: {},
      l1setup: [...new Set(E.BP_DATA.filter((b) => b.lvl === 1).map((b) => b.setup))].sort((a, b) => a - b).join("/"),
      l1prod: [...new Set(E.BP_DATA.filter((b) => b.lvl === 1).map((b) => b.prod))].sort((a, b) => a - b).join("/"),
    };
    for (const i of E.INDUSTRIES) T.indWin[i] = 0;

    for (let seed = 1; seed <= SEEDS; seed++) {
      const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
      if (st.phase !== "gameover") continue;
      T.games++;
      T.endQ += st.quarter;

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
        T.cash += p.cash; T.plots += E.plotCount(st, p); T.loans += p.discsInBank;
        for (const b of E.activeBiz(p)) T.levelMix[Math.min(4, b.level)]++;
        for (const b of [...E.activeBiz(p), ...E.megacorpHQs(p)]) {
          T.cq++;
          if (E.bizProd(b) * E.price(st.pm, E.bizInd(b)) >= E.bizOpex(b) + E.RENT_PER_LEVEL * b.level) T.profitable++;
        }
      }
    }
    T.prod = econ.prod; T.left = econ.left; T.earned = econ.earned;
    T.byLevel = JSON.parse(JSON.stringify(econ.byLevel));
    T.byInd = JSON.parse(JSON.stringify(econ.byInd));
    results[`${mode}|${seats}`] = T;
  }
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - four ways to make a small company worth running");
console.log(`${SEEDS} games per ruleset per table size, personas on.\n`);

const W = 19;
const cols = MODES.map(([m]) => m);
const head = (seats) => console.log(pad(`  ${seats} players`, 34) + MODES.map(([, l]) => rp(l, W)).join(""));
const line = (seats, name, fn, dp = 1) =>
  console.log(pad(name, 34) + cols.map((m) => rp(fn(results[`${m}|${seats}`]).toFixed(dp), W)).join(""));
const lpct = (seats, name, fn) =>
  console.log(pad(name, 34) + cols.map((m) => rp(`${(100 * fn(results[`${m}|${seats}`])).toFixed(0)}%`, W)).join(""));
const lcash = (seats, name, fn) =>
  console.log(pad(name, 34) + cols.map((m) => rp(`$${Math.round(fn(results[`${m}|${seats}`]))}`, W)).join(""));

console.log("THE CARDS EACH RULESET DEALS");
console.log(pad("  level-1 production values", 34) + cols.map((m) => rp(results[`${m}|4`].l1prod, W)).join(""));
console.log(pad("  level-1 setup costs", 34) + cols.map((m) => rp(`$${results[`${m}|4`].l1setup}`, W)).join(""));

for (const seats of SEATS) {
  console.log("\n" + "=".repeat(34 + W * 4));
  head(seats);
  console.log("=".repeat(34 + W * 4));
  console.log("  IS THE SMALL COMPANY WORTH RUNNING?");
  for (const lv of [1, 2, 3, 4]) {
    console.log(pad(`    level ${lv} production recycled`, 34) + cols.map((m) => {
      const d = results[`${m}|${seats}`].byLevel[lv];
      return rp(d && d.prod ? `${(100 * d.left / d.prod).toFixed(0)}%` : "-", W);
    }).join(""));
  }
  console.log("");
  for (const lv of [1, 2, 3]) {
    lpct(seats, `    companies standing at level ${lv}`,
      (T) => T.levelMix[lv] / Math.max(1, T.levelMix[1] + T.levelMix[2] + T.levelMix[3] + T.levelMix[4]));
  }
  console.log("");
  console.log("  IS IT A CATCH-UP RULE?");
  lpct(seats, "    Q6 leader went on to win", (T) => T.ledAt6Won / Math.max(1, T.q6Games));
  lpct(seats, "    chance at this table size", () => 1 / seats);
  lpct(seats, "    bottom half at Q6 won", (T) => T.bottomHalfWon / Math.max(1, T.q6Games));
  line(seats, "    winner's lead over 2nd", (T) => T.gapSecond / Math.max(1, T.games));
  console.log("");
  console.log("  IS THE GAME STILL INTACT?");
  lpct(seats, "    all production recycled", (T) => T.left / Math.max(1, T.prod));
  lcash(seats, "    trade income per seat", (T) => T.earned / Math.max(1, T.players));
  lpct(seats, "    companies covering OPEX", (T) => T.profitable / Math.max(1, T.cq));
  line(seats, "    winning score", (T) => T.winnerEP / Math.max(1, T.games), 0);
  line(seats, "    companies per seat", (T) => T.companies / Math.max(1, T.players), 2);
  line(seats, "    of them upgraded", (T) => T.upgrades / Math.max(1, T.players), 2);
  line(seats, "    unpaid loan discs per seat", (T) => T.loans / Math.max(1, T.players), 2);
  lcash(seats, "    cash a seat ends with", (T) => T.cash / Math.max(1, T.players));
}

console.log("\n\nINDUSTRY BALANCE at 4 seats (share of games in the winner's portfolio)");
{
  const E0 = loadEngine({});
  console.log(pad("", 34) + MODES.map(([, l]) => rp(l, W)).join(""));
  for (const ind of E0.INDUSTRIES) {
    console.log(pad(`  ${ind}`, 34) + cols.map((m) => {
      const T = results[`${m}|4`];
      return rp(`${(100 * T.indWin[ind] / Math.max(1, T.games)).toFixed(0)}%`, W);
    }).join(""));
  }
  console.log(pad("  spread, best minus worst", 34) + cols.map((m) => {
    const T = results[`${m}|4`];
    const v = E0.INDUSTRIES.map((i) => 100 * T.indWin[i] / Math.max(1, T.games));
    return rp(`${(Math.max(...v) - Math.min(...v)).toFixed(0)} pts`, W);
  }).join(""));
  console.log(`\n  two standard errors on each share is about ±${noise(0.5, results["ship|4"].games).toFixed(1)} points.`);
}
console.log("");
