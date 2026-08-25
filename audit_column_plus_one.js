/* ============================================================================
   Icons that absorb their column PLUS ONE, and filling the deepest one first.

   THE PROPOSAL, and why it is a better shape than the floor. audit_small_company
   tested a FLOOR of two on the first column - a ladder of 2/2/3/4 - which fixed
   the level-1 company's selling problem but broke the rule's own sentence: "an
   icon takes its column" stopped being true of the first column. Adding one to
   every column instead gives 2/3/4/5 and keeps a single sentence: an icon takes
   its column plus one. Every column moves by the same amount, so nothing about
   the ladder is special-cased.

   It should also help the small company MORE than the floor did in relative
   terms. A level-1 company's only reachable capacity goes from 1 to 2 - it
   doubles - while a level-3 company's goes from 1+2+3 = 6 to 2+3+4 = 9, which
   is half again. The proportional gain is largest at the bottom.

   PAIRED WITH DEEPEST-FIRST DELIVERY, which is the second half of the proposal.
   On its own, deepest-first was measured (audit_deepest_first.js) as a BUFF to
   big companies: forfeiture happens at the end of a delivery, so starting deep
   leaves only a dribble to meet the shallow icons and stops big companies having
   awkward leftovers. The question here is whether that still holds when every
   icon is hungrier. With a +1 ladder the deep icons are big enough that a
   level-3 company may genuinely strand production in them.

   THE BASELINE HAS MOVED since these were last measured: ground rent is now $2 a
   level, not $3. Everything below is re-run against the current engine, so the
   "shipped" column is not the same shipped column as in earlier probes.

   FOUR RULESETS:

     shipped          column absorbs its own level, best-paying order
     +1               column plus one, best-paying order
     +1 deepest       column plus one, deepest reachable icon first
     deepest only     the current ladder, deepest first - to isolate the order

   WATCH TECHNOLOGY. Its doubler multiplies the absorption, so a level-3
   Technology on a +1 ladder takes (2+3+4) x 2 = 18 units out of a single row.
   That may simply be too much, and it is the industry most likely to break here.

   WHAT IT FOUND: IT HELPS THE SMALL COMPANY AND HANDS THE GAME TO THE LEADER.
   DO NOT SHIP.

   The +1 ladder does what it was asked to do. Level-1 production recycled falls
   70% to 60% at four seats, 71% to 62% at six - about the same ten points the
   floor bought, and without the floor's special case. The rule stays one
   sentence. The industry spread even improves, 23 points to 19.

   BUT THE GAME BECOMES MUCH MORE DECIDED, which is the opposite of the intent:

     Q6 leader went on to win   shipped   +1     +1 deepest   chance
       2 players                   67%    74%          73%      50%
       4 players                   36%    47%          44%      25%
       6 players                   28%    37%          36%      17%

   Eleven points at four seats and nine at six. The winner's lead over second
   widens too, 20.2 to 23.4 at four seats and 16.4 to 18.9 at six, and the
   bottom half at Q6 wins less often at every size.

   THE REASON IS THAT RELATIVE GAIN AT THE BOTTOM IS NOT COMPETITIVE HELP. A
   level-1 company's reachable capacity per row doubles, 1 to 2, which sounds
   like the biggest proportional win on the board. A level-3 company's goes 6 to
   9 - only half again. But the standings are kept in absolute EP, not in
   ratios, and the level-3 company gains THREE units per row against the level-1
   company's ONE, across roughly six times as many rows in reach (13.8 against
   2.4, measured in audit_deepest_first.js). The leader's absolute gain is
   something like eighteen times larger. Every uniform increase in absorption
   is, arithmetically, a bigger gift to whoever produces most.

   That is now true of every capacity change measured in this repo. Demand depth
   (shipped) widened the winner's margin. The floor of two widened it. This
   widens it more. The ONLY change that made the game less decided was cutting a
   FIXED COST - rent from $3 to $2 - because a fixed cost is proportionally
   heaviest on the smallest company and cutting it is worth the same to everyone
   in absolute terms.

   DEEPEST-FIRST DOES NOT RESCUE IT, and on the current baseline it repeats its
   own earlier finding: on the shipped ladder it takes the Q6 leader from 36% to
   40% at four seats. Paired with +1 it gives the best small-company number
   measured anywhere (level-1 waste 56%) and the best industry spread (15
   points), and still leaves the leader winning 44% of four-seat games.

   ONE PRACTICAL PROBLEM ON TOP: forfeited icon capacity balloons from 15 units
   a game to 40 with +1 at four seats, and 50 at six. Every one of those is a
   player locking an icon they could not fill. That is a lot of visible waste at
   a table, whatever the balance says.

   Run: node audit_column_plus_one.js [seeds]
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

const econ = { prod: 0, left: 0, earned: 0, byLevel: {}, byInd: {}, icons: 0, forfeit: 0 };

function loadEngine(opt) {
  let logic = BASE;

  if (opt.plusOne) {
    logic = logic.replace(DELIVER_NEEDLE,
      "  return cross ? 1 : (levelIdx + 2) * exchangeRate(state, biz);");
    logic = logic.replace(PLACEABLE_NEEDLE,
      `  const direct = slots.filter((s) => !s.cross)
    .reduce((n, s) => n + (s.levelIdx + 2), 0) * exchangeRate(state, biz);`);
  }
  if (opt.deepest) {
    logic = logic.replace(SORT_NEEDLE,
      "  })).sort((a, b) => b.levelIdx - a.levelIdx || b.pay - a.pay);");
  }

  /* icons consumed and capacity thrown away, counted inside the delivery loop */
  logic = logic.replace(
    "    const n = Math.min(got, remaining);\n    earned += n * s.pay;",
    "    const n = Math.min(got, remaining);\n    __econ.icon(got, n);\n    earned += n * s.pay;");
  logic = logic.replace(SALE_NEEDLE,
    "  const leftover = Math.max(0, remaining);\n" +
    "  __econ.sale(earned, leftover, bizProd(biz), bizInd(biz), biz.level);\n" +
    "  p.cash += earned + leftover * 1;");

  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box, __econ: {
    icon: (got, used) => { econ.icons++; econ.forfeit += Math.max(0, got - used); },
    sale: (earned, left, prod, ind, lvl) => {
      econ.earned += earned; econ.left += left; econ.prod += prod;
      const L = econ.byLevel[lvl] || (econ.byLevel[lvl] = { prod: 0, left: 0 });
      L.prod += prod; L.left += left;
      const I = econ.byInd[ind] || (econ.byInd[ind] = { prod: 0, left: 0 });
      I.prod += prod; I.left += left;
    },
  } };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
      epTotal, finalRank, activeBiz, megacorpHQs, bizInd, bizProd, bizOpex, price,
      plotCount, INDUSTRIES, RENT_PER_LEVEL };
  `, sandbox);
  return box.exports;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const noise = (p, n) => 100 * 2 * Math.sqrt((p * (1 - p)) / Math.max(1, n));

const MODES = [
  ["ship", "shipped (1/2/3/4)", {}],
  ["plus", "+1 (2/3/4/5)", { plusOne: true }],
  ["plusd", "+1, deepest first", { plusOne: true, deepest: true }],
  ["deep", "deepest first only", { deepest: true }],
];
const SEATS = [2, 4, 6];
const results = {};

for (const [mode, label, opt] of MODES) {
  for (const seats of SEATS) {
    econ.prod = econ.left = econ.earned = 0; econ.byLevel = {}; econ.byInd = {};
    econ.icons = 0; econ.forfeit = 0;
    const E = loadEngine(opt);
    const T = {
      mode, label, seats, games: 0, players: 0,
      winnerEP: 0, gapSecond: 0, spread: 0,
      companies: 0, upgrades: 0, cash: 0, loans: 0,
      profitable: 0, cq: 0, levelMix: { 1: 0, 2: 0, 3: 0, 4: 0 },
      q6Games: 0, ledAt6Won: 0, bottomHalfWon: 0,
      indWin: {},
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
          if (E.bizProd(b) * E.price(st.pm, E.bizInd(b)) >= E.bizOpex(b) + E.RENT_PER_LEVEL * b.level) T.profitable++;
        }
      }
    }
    T.prod = econ.prod; T.left = econ.left; T.earned = econ.earned;
    T.icons = econ.icons; T.forfeit = econ.forfeit;
    T.byLevel = JSON.parse(JSON.stringify(econ.byLevel));
    T.byInd = JSON.parse(JSON.stringify(econ.byInd));
    results[`${mode}|${seats}`] = T;
  }
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - demand icons that absorb their column plus one");
console.log(`${SEEDS} games per ruleset per table size, personas on, rent at $2.\n`);

const W = 20;
const cols = MODES.map(([m]) => m);
const head = (seats) => console.log(pad(`  ${seats} players`, 32) + MODES.map(([, l]) => rp(l, W)).join(""));
const line = (seats, name, fn, dp = 1) =>
  console.log(pad(name, 32) + cols.map((m) => rp(fn(results[`${m}|${seats}`]).toFixed(dp), W)).join(""));
const lpct = (seats, name, fn) =>
  console.log(pad(name, 32) + cols.map((m) => rp(`${(100 * fn(results[`${m}|${seats}`])).toFixed(0)}%`, W)).join(""));
const lcash = (seats, name, fn) =>
  console.log(pad(name, 32) + cols.map((m) => rp(`$${Math.round(fn(results[`${m}|${seats}`]))}`, W)).join(""));

for (const seats of SEATS) {
  console.log("\n" + "=".repeat(32 + W * 4));
  head(seats);
  console.log("=".repeat(32 + W * 4));
  console.log("  DOES THE SMALL COMPANY GET BETTER?");
  for (const lv of [1, 2, 3, 4]) {
    console.log(pad(`    level ${lv} recycled`, 32) + cols.map((m) => {
      const d = results[`${m}|${seats}`].byLevel[lv];
      return rp(d && d.prod ? `${(100 * d.left / d.prod).toFixed(0)}%` : "-", W);
    }).join(""));
  }
  lpct(seats, "    companies left at level 1",
    (T) => T.levelMix[1] / Math.max(1, T.levelMix[1] + T.levelMix[2] + T.levelMix[3] + T.levelMix[4]));
  console.log("");
  console.log("  IS IT A CATCH-UP RULE?");
  lpct(seats, "    Q6 leader went on to win", (T) => T.ledAt6Won / Math.max(1, T.q6Games));
  lpct(seats, "    chance at this table size", () => 1 / seats);
  lpct(seats, "    bottom half at Q6 won", (T) => T.bottomHalfWon / Math.max(1, T.q6Games));
  line(seats, "    winner's lead over 2nd", (T) => T.gapSecond / Math.max(1, T.games));
  console.log("");
  console.log("  WHAT IT COSTS");
  lpct(seats, "    all production recycled", (T) => T.left / Math.max(1, T.prod));
  lcash(seats, "    trade income per seat", (T) => T.earned / Math.max(1, T.players));
  lpct(seats, "    companies covering costs", (T) => T.profitable / Math.max(1, T.cq));
  line(seats, "    winning score", (T) => T.winnerEP / Math.max(1, T.games), 0);
  line(seats, "    of them upgraded", (T) => T.upgrades / Math.max(1, T.players), 2);
  line(seats, "    icon capacity forfeited/game", (T) => T.forfeit / Math.max(1, T.games), 1);
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

  console.log("\nWASTE BY INDUSTRY at 4 seats - watch Technology");
  console.log(pad("", 32) + MODES.map(([, l]) => rp(l, W)).join(""));
  for (const ind of E0.INDUSTRIES) {
    console.log(pad(`  ${ind}`, 32) + cols.map((m) => {
      const d = results[`${m}|4`].byInd[ind];
      return rp(d && d.prod ? `${(100 * d.left / d.prod).toFixed(0)}%` : "-", W);
    }).join(""));
  }
}
console.log("");
