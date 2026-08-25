/* ============================================================================
   Deliver to the deepest icon you can reach first.

   THE PROPOSAL, and the reason it is a catch-up rule rather than a nerf. Since
   icons absorb their own column, a big company can currently spend its output
   wherever it likes - including on the shallow level-1 and level-2 icons that a
   small company is ALSO competing for, and which a small company is the only
   kind of company that depends on. Forcing the deepest reachable icon first
   means a level-3 company empties the level-3 slots (which nobody below level 3
   can touch at all) before it ever competes for the shallow ones.

   The partial-fill rule the proposal describes is ALREADY how the engine works,
   and this probe does not change it: deliverToSlot marks the icon filled and
   returns its full absorption, and autoDeliver then takes min(got, remaining) -
   so two units delivered into a level-3 Technology icon that could have taken
   six lock the icon and forfeit the other four. That was already true; it is
   just never been load-bearing before, because nothing forced a company to
   start at the deep end where the forfeiture happens.

   WHAT THIS DOES AND DOES NOT CHANGE, worked through before measuring:

     THE UNITS A COMPANY SELLS SHOULD BARELY MOVE. Whatever the order, a unit
     finds a home as long as any reachable icon is open, so total sales stay
     near min(production, capacity). What changes is WHICH ICONS GET LOCKED and
     how much icon capacity is thrown away.

     SO THE EFFECT IS CONTENTION, NOT INCOME. Big companies consume the same
     units out of fewer, deeper icons, leaving the shallow ones on the board.
     If the proposal works, level-1 companies waste LESS while level-3 companies
     waste MORE, and the winner's margin narrows.

     FORFEITURE IS A REAL COST TO THE BIG COMPANY. A level-3 company with two
     units left must dump them into a six-unit icon. That is the price of the
     rule, and it should show up as higher waste at the top end.

   Sorting is by column descending, then by pay, so Manufacturing's cross-sell
   still prefers the better-paying row among slots of equal depth.

   WHAT IT FOUND: IT DOES THE OPPOSITE. DO NOT SHIP AS A CATCH-UP RULE.

   Forcing the deepest icon first is a straight BUFF TO THE BIG COMPANY. The
   recycled share by company level, at four seats:

     level   best-paying first   deepest first
       1                   70%             68%
       2                   50%             45%
       3                   39%             33%
       4                   42%             34%

   The level-1 company gains two points. The level-3 and level-4 companies gain
   six and eight. At two seats it is starker still: level 3 goes from 46% to
   35% while level 1 moves 67% to 66%, the Q6 leader's win rate rises from 60%
   to 65%, and the winner's lead over second widens from 27.9 to 32.7.

   THE REASON IS THAT FORFEITURE HAPPENS AT THE END OF A DELIVERY, NOT THE
   START. Icon capacity thrown away per game FALLS - 13.9 to 8.4 at four seats,
   17.0 to 9.8 at six - because going deepest-first puts the bulk of production
   against the high-capacity icons while it is still bulk, and leaves only a
   dribble to meet the shallow icons, which only wanted a dribble anyway. The
   old order sometimes spent a cheap icon early and then stranded a large
   remainder. So the rule that was meant to tax the big company for its
   leftovers actually stops it having awkward leftovers at all.

   AND THE PREMISE UNDERNEATH IT DOES NOT HOLD EITHER. The idea was that big
   companies eat the shallow icons small companies depend on. Measured at the
   moment each company delivers, at four seats:

     level   own-industry icons in reach   already taken   units it had
       1                            2.4             56%            3.1
       2                            6.4             51%            6.4
       3                           13.8             49%           12.9
       4                           25.6             54%           27.2

   Contention is real - about half of every company's reachable icons are gone
   before it arrives - but it is IDENTICAL at every level, so reordering who
   takes what cannot shift it. The small company's problem is the first column,
   not the third: a level-1 company has 2.4 icons in reach worth 2.4 units of
   capacity, against 3.1 units of production, and half of those icons are
   already filled. It would waste output with no competition at all. A level-3
   company has roughly 27 units of capacity in reach for 12.9 units of output.

   SO THE LEVER FOR SMALL COMPANIES IS CAPACITY AT THE SHALLOW END, NOT
   PRIORITY. Something like a floor - the level-1 column absorbing 2 rather
   than 1 - would raise the only capacity a level-1 company can ever touch,
   where a delivery-order rule cannot. Untested here.

   ONE THING THE RULE IS GOOD AT, if it is ever wanted for its own sake: it
   lowers total waste (48% to 43% at four seats) and leaves industry balance
   untouched (24 against 25 points of spread, inside a band of 8). It just is
   not a catch-up mechanism, and it makes the leader stronger.

   Run: node audit_deepest_first.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "150", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const SORT_NEEDLE = "  })).sort((a, b) => b.pay - a.pay);";
const SALE_NEEDLE = "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;";
for (const [n, w] of [[SORT_NEEDLE, "autoDeliver's slot order"], [SALE_NEEDLE, "autoDeliver's tail"]]) {
  if (!BASE.includes(n)) { console.error(`the engine changed shape around ${w} - update this probe`); process.exit(2); }
}

const econ = { prod: 0, left: 0, earned: 0, byLevel: {}, byInd: {}, iconsUsed: 0, forfeit: 0 };

function loadEngine(deepestFirst) {
  let logic = BASE;
  if (deepestFirst) {
    logic = logic.replace(SORT_NEEDLE,
      "  })).sort((a, b) => b.levelIdx - a.levelIdx || b.pay - a.pay);");
  }
  /* count icons consumed and capacity thrown away, inside the delivery loop */
  logic = logic.replace(
    "    const n = Math.min(got, remaining);\n    earned += n * s.pay;",
    "    const n = Math.min(got, remaining);\n    __econ.icon(got, n);\n    earned += n * s.pay;");
  logic = logic.replace(SALE_NEEDLE,
    "  const leftover = Math.max(0, remaining);\n" +
    "  __econ.sale(earned, leftover, bizProd(biz), bizInd(biz), biz.level);\n" +
    "  p.cash += earned + leftover * 1;");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box, __econ: {
    icon: (got, used) => { econ.iconsUsed++; econ.forfeit += Math.max(0, got - used); },
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

const MODES = [["off", "best-paying first"], ["deep", "deepest icon first"]];
const SEATS = [2, 4, 6];
const results = {};

for (const [mode, label] of MODES) {
  for (const seats of SEATS) {
    econ.prod = econ.left = econ.earned = 0; econ.byLevel = {}; econ.byInd = {};
    econ.iconsUsed = 0; econ.forfeit = 0;
    const E = loadEngine(mode === "deep");
    const T = {
      mode, label, seats, games: 0, players: 0,
      winnerEP: 0, gapSecond: 0, spread: 0, endQ: 0,
      companies: 0, upgrades: 0, cash: 0, plots: 0,
      profitable: 0, cq: 0,
      ledAt6: 0, ledAt6Won: 0, bottomHalfWon: 0, q6Games: 0,
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
      T.endQ += st.quarter;

      const ranked = [...st.players].sort(E.finalRank);
      const winner = ranked[0];
      T.winnerEP += E.epTotal(winner);
      T.gapSecond += E.epTotal(ranked[0]) - E.epTotal(ranked[1]);
      T.spread += E.epTotal(ranked[0]) - E.epTotal(ranked[ranked.length - 1]);
      for (const i of new Set([...E.activeBiz(winner), ...E.megacorpHQs(winner)].map(E.bizInd))) T.indWin[i]++;

      /* the catch-up question: is the halfway leader still the winner? */
      if (st.quarter >= 6) {
        const at6 = st.players
          .map((p) => ({ p, ep: (p.epLog || []).filter((e) => e.quarter <= 6).reduce((s, e) => s + e.amount, 0) }))
          .sort((a, b) => b.ep - a.ep);
        if (at6.length > 1 && at6[0].ep > at6[1].ep) {
          T.q6Games++;
          T.ledAt6++;
          if (at6[0].p === winner) T.ledAt6Won++;
          const bottom = at6.slice(Math.ceil(at6.length / 2)).map((x) => x.p);
          if (bottom.includes(winner)) T.bottomHalfWon++;
        }
      }

      for (const p of st.players) {
        T.players++;
        T.companies += E.activeBiz(p).length;
        T.upgrades += p.businesses.filter((b) => b.upgraded).length;
        T.cash += p.cash;
        T.plots += E.plotCount(st, p);
        for (const b of [...E.activeBiz(p), ...E.megacorpHQs(p)]) {
          T.cq++;
          if (E.bizProd(b) * E.price(st.pm, E.bizInd(b)) >= E.bizOpex(b) + E.RENT_PER_LEVEL * b.level) T.profitable++;
        }
      }
    }
    T.prod = econ.prod; T.left = econ.left; T.earned = econ.earned;
    T.iconsUsed = econ.iconsUsed; T.forfeit = econ.forfeit;
    T.byLevel = JSON.parse(JSON.stringify(econ.byLevel));
    T.byInd = JSON.parse(JSON.stringify(econ.byInd));
    results[`${mode}|${seats}`] = T;
  }
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - forcing delivery into the deepest reachable icon first");
console.log(`${SEEDS} games per mode per table size, personas on.`);
console.log("Partial fills already lock the icon and forfeit the rest - that is unchanged.\n");

const W = 20;
const cols = MODES.map(([m]) => m);
const head = (seats) => console.log(pad(`  ${seats} players`, 36) + MODES.map(([, l]) => rp(l, W)).join(""));
const line = (seats, name, fn, dp = 1) =>
  console.log(pad(name, 36) + cols.map((m) => rp(fn(results[`${m}|${seats}`]).toFixed(dp), W)).join(""));
const lpct = (seats, name, fn) =>
  console.log(pad(name, 36) + cols.map((m) => rp(`${(100 * fn(results[`${m}|${seats}`])).toFixed(0)}%`, W)).join(""));
const lcash = (seats, name, fn) =>
  console.log(pad(name, 36) + cols.map((m) => rp(`$${Math.round(fn(results[`${m}|${seats}`]))}`, W)).join(""));

for (const seats of SEATS) {
  console.log("\n" + "=".repeat(36 + W * 2));
  head(seats);
  console.log("=".repeat(36 + W * 2));
  console.log("  DOES IT HELP THE SMALL COMPANY?  (recycled share by level)");
  for (const lv of [1, 2, 3, 4]) {
    console.log(pad(`    level ${lv}`, 36) + cols.map((m) => {
      const d = results[`${m}|${seats}`].byLevel[lv];
      return rp(d && d.prod ? `${(100 * d.left / d.prod).toFixed(0)}%` : "-", W);
    }).join(""));
  }
  console.log("");
  lpct(seats, "  all production recycled", (T) => T.left / Math.max(1, T.prod));
  line(seats, "  icons consumed per game", (T) => T.iconsUsed / Math.max(1, T.games), 0);
  line(seats, "  icon capacity forfeited/game", (T) => T.forfeit / Math.max(1, T.games), 1);
  console.log("");
  console.log("  IS IT A CATCH-UP RULE?");
  lpct(seats, "    Q6 leader went on to win", (T) => T.ledAt6Won / Math.max(1, T.q6Games));
  lpct(seats, "    chance at this table size", () => 1 / seats);
  lpct(seats, "    bottom half at Q6 won", (T) => T.bottomHalfWon / Math.max(1, T.q6Games));
  line(seats, "    winner's lead over 2nd", (T) => T.gapSecond / Math.max(1, T.games));
  line(seats, "    winner's lead over last", (T) => T.spread / Math.max(1, T.games));
  console.log("");
  console.log("  WHAT IT COSTS");
  lcash(seats, "    trade income per seat", (T) => T.earned / Math.max(1, T.players));
  lpct(seats, "    companies covering OPEX", (T) => T.profitable / Math.max(1, T.cq));
  line(seats, "    winning score", (T) => T.winnerEP / Math.max(1, T.games), 0);
  line(seats, "    companies per seat", (T) => T.companies / Math.max(1, T.players), 2);
  line(seats, "    of them upgraded", (T) => T.upgrades / Math.max(1, T.players), 2);
}

console.log("\n\nINDUSTRY BALANCE at 4 seats (share of games in the winner's portfolio)");
{
  const E0 = loadEngine(false);
  console.log(pad("", 36) + MODES.map(([, l]) => rp(l, W)).join(""));
  for (const ind of E0.INDUSTRIES) {
    console.log(pad(`  ${ind}`, 36) + cols.map((m) => {
      const T = results[`${m}|4`];
      return rp(`${(100 * T.indWin[ind] / Math.max(1, T.games)).toFixed(0)}%`, W);
    }).join(""));
  }
  console.log(pad("  spread, best minus worst", 36) + cols.map((m) => {
    const T = results[`${m}|4`];
    const v = E0.INDUSTRIES.map((i) => 100 * T.indWin[i] / Math.max(1, T.games));
    return rp(`${(Math.max(...v) - Math.min(...v)).toFixed(0)} pts`, W);
  }).join(""));
  console.log(`\n  two standard errors on each share is about ±${noise(0.5, results["off|4"].games).toFixed(1)} points.`);

  console.log("\nWASTE BY INDUSTRY at 4 seats");
  console.log(pad("", 36) + MODES.map(([, l]) => rp(l, W)).join(""));
  for (const ind of E0.INDUSTRIES) {
    console.log(pad(`  ${ind}`, 36) + cols.map((m) => {
      const d = results[`${m}|4`].byInd[ind];
      return rp(d && d.prod ? `${(100 * d.left / d.prod).toFixed(0)}%` : "-", W);
    }).join(""));
  }
}
console.log("");
