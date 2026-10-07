/* ============================================================================
   Demand as a STOCK or as a RATE - and what has to be retuned either way.

   SHIPPED, a demand icon is a consumable. It absorbs its own column in goods -
   the level-1 icon takes one unit, the level-4 icon four - and is then gone for
   everybody until the Year 3 refresh. It is first come, first served, which is
   why delivery runs in turn order and most of what REPOSITION buys.

   PROPOSED, an icon is a rate. It absorbs ONE unit, is never consumed, and is
   open to every company every quarter. A company's ceiling becomes the NUMBER of
   icons it can reach instead of the sum of their columns, and that ceiling
   recurs for the rest of the game. Per row of its own industry a level-L company
   takes L(L+1)/2 units once, against L units a quarter forever:

     level 1    1 once    vs   1 a quarter      - identical
     level 2    3 once    vs   2 a quarter
     level 3    6 once    vs   3 a quarter

   The point of it is fiddliness: no cubes on the grid, nothing to track between
   quarters, and - because nobody is racing anybody to an icon - Revenue stops
   being a turn-order walk and can be resolved by everyone at once. That is the
   single largest lever on table downtime this game has.

   WHAT IT COSTS IS THE RACE. Demand stops being contested, so delivery order
   stops mattering, so REPOSITION - already measured at near zero in
   audit_first_player.js - becomes worth nothing at all. The game's thesis is
   untouched: "your customer is also your competitor" lives in the supplier pots,
   where every company still pays its rivals every quarter. What ends is a second
   contest layered on the demand grid.

   THE ARMS. The first two are the design question; the rest are the retune the
   second one needs, which is why they are all in one probe - a tuning constant
   is only meaningful against the rule it is tuning.

     stock      as it ships
     flow       the proposed rule, nothing else changed
     flowCash   flow + cash converts at $65 an EP instead of $50
     teOpex     flowCash + Technology's running costs cut from 6/10/16 to
                5/8/12. NOT a reach change: the doubler already matches TE
                production under a rate - 2 icons x2 = 4 units at level 2
                against 4 produced - so TE is never demand-capped and its
                weakness is margin, not access. An earlier arm that gave it a
                deeper column instead was measured and did nothing, because
                reading deeper is strictly worse than doubling from level 2 up.
     reCost     flowCash + Retail's setup raised from 10/15/25 to 14/20/32.
                Retail returns about two and a half times what the next best
                industry does and is the cheapest thing on the board to start.
     tuned      flowCash + both

   WHAT IT FOUND - 200 games an arm a table size, three and four seats.

   1. THE RULE WORKS, AND IT FIXES THE WORST THING IN THE GAME. The share of all
   production recycled at $1 climbs to 52% by Q12 under the shipped rule and to
   66% at four seats; under the rate it collapses after Q5 and stays there:

     stock   54 47 45 52 | 23 41 50 56 |  8 19 33 52
     flow    62 53 49 45 | 16 14 13 11 | 10  9  8  8

   Nothing structural moves with it. Companies standing, Megacorps formed, game
   length and early endings are all within noise of the shipped game.

   2. IT COSTS EXACTLY ONE CONSTANT. Cash is 13.5% of a winning score at three
   seats and 15.4% at four; under the rate it goes to 18.5 / 18.6, because the
   same board now absorbs three times as much over a game. CASH_PER_EP from $50
   to $65 puts it back to 14.0 / 13.8. That is the whole retune the rule itself
   needs.

   3. IT NEITHER CAUSES NOR FIXES THE INDUSTRY IMBALANCE. Retail returns 6.71 net
   cash per dollar of setup against Healthcare's 0.74 under the shipped rule, a
   spread of 9.1x. Under the rate everything roughly doubles and the spread is
   still 6.8x. That imbalance is in the card economics - what a company costs to
   start, what it costs to run, how much it makes - and it is the same problem
   with either demand rule.

   4. TECHNOLOGY'S WEAKNESS IS MARGIN, NOT ACCESS, and an arm here got that wrong
   before measuring it. Under a rate the doubler already matches TE production -
   two icons at x2 is four units at level 2, against four produced - so TE is
   never demand-capped, and reading one column deeper instead would be STRICTLY
   WORSE from level 2 up (4 units against 6 at level 3). Measured, that arm moved
   TE's build rate by nothing at all. Cutting its running costs from 6/10/16 to
   5/8/12 is the lever that works.

   5. THE TUNED SET NEARLY HALVES THE SPREAD. Rate + $65 an EP + TE opex 5/8/12 +
   RE setup 14/20/32, net cash per dollar of setup at three seats:

     shipped   RE 6.71  HO 3.79  UT 1.89  MA 1.61  TE 1.35  HC 0.74    9.1x
     tuned     RE 6.39  HO 5.07  UT 4.34  MA 2.38  TE 1.40  HC 1.27    5.0x

   Retail also stops being the best EP per dollar, falling from 3.93 to 3.05,
   behind Hospitality and Utilities.

   WHAT IS STILL WRONG. Healthcare ends up last on BOTH axes - lowest cash per
   dollar and lowest EP per dollar - which the shipped game hides by making it
   the joint best EP per COMPANY on a setup cost few can afford. And the opening
   is wastier under a rate: a level-1 company reaches exactly one icon per row
   and so sells one unit while producing two to four, which is 79% of everything
   made being scrapped in Q1 of the tuned arm. The rate fixes the late game and
   leaves the first year alone.

   Run: node audit_demand_flow.js [games a table size] [seats...]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "200", 10);
const SEATS = process.argv.slice(3).map(Number).filter(Boolean);
const SIZES = SEATS.length ? SEATS : [3, 4];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* Every arm is a splice on an exact fragment, and a fragment that has moved stops
   the probe rather than letting it quietly measure the shipped game six times. */
const N = {
  consume: `  state.demand.tiles[tileKey].filled[rowIdx][levelIdx] = 1;
  return cross ? 1 : (levelIdx + 1) * exchangeRate(state, biz);`,
  cashRate: "const CASH_PER_EP = 50;",
  teDouble: `function exchangeRate(state, biz) {
  if (bizInd(biz) === "TE") return 2;   // Technology is the only doubler`,
  colCap: `  return Math.min(biz.level + (isBeginner(state) ? 1 : 0), 4);`,
  reAllow: `  return biz.level + bonus;`,
};
for (const [k, v] of Object.entries(N)) {
  if (!BASE.includes(v)) { console.error(`the engine changed shape around ${k} - update this probe`); process.exit(2); }
}

const ARMS = [
  { key: "stock",    note: "as it ships" },
  { key: "flow",     note: "icons recur, one unit each" },
  { key: "flowCash", note: "+ $65 an EP" },
  { key: "teOpex",   note: "+ TE opex 5/8/12" },
  { key: "reCost",   note: "+ RE setup 14/20/32" },
  { key: "tuned",    note: "cash + both" },
];

function engine(key) {
  let L = BASE;
  if (key !== "stock") L = L.replace(N.consume, "  return cross ? 1 : exchangeRate(state, biz);");
  if (key !== "stock" && key !== "flow") L = L.replace(N.cashRate, "const CASH_PER_EP = 65;");
  /* The card economics live in one JSON literal, so they are retuned by parsing
     it, changing the numbers and putting it back - not by a text substitution
     that would have to match every card individually. */
  if (key === "teOpex" || key === "reCost" || key === "tuned") {
    const m = L.match(/const BP_DATA = (\[.*?\]);/s);
    if (!m) { console.error("BP_DATA moved - update this probe"); process.exit(2); }
    const cards = JSON.parse(m[1]);
    for (const c of cards) {
      if ((key === "teOpex" || key === "tuned") && c.ind === "TE") c.opex = { 1: 5, 2: 8, 3: 12 }[c.lvl];
      if ((key === "reCost" || key === "tuned") && c.ind === "RE") c.setup = { 1: 14, 2: 20, 3: 32 }[c.lvl];
    }
    L = L.replace(m[0], "const BP_DATA = " + JSON.stringify(cards) + ";");
  }
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, Map, box };
  vm.createContext(sandbox);
  vm.runInContext(L + `
    box.e = { initGame, advanceDraft, advancePlanning, startPlanning, mulberry32,
              epTotal, activeBiz, megacorpHQs, bizInd, INDUSTRIES };
  `, sandbox);
  return box.e;
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const lab = (e) => String((e.label && e.label.k) || e.label);
const epFrom = (p, re) => (p.epLog || []).filter((e) => re.test(lab(e))).reduce((s, e) => s + e.amount, 0);

function run(E, seats) {
  const o = { win: [], cash: [], cashPct: [], biz: [], mc: [], q: [], early: 0, games: 0,
              /* How often each industry gets built is the cheapest honest read on
                 balance: bots build what launchScore thinks is worth building, and
                 that function is the delivery rule itself rather than a copy. */
              built: Object.fromEntries(E.INDUSTRIES.map((i) => [i, 0])) };
  for (let seed = 1; o.games < GAMES && seed < GAMES * 5; seed++) {
    let st;
    try {
      st = E.initGame(seats - 1, seed, ["Seat"], undefined, true, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    } catch (e) { continue; }
    if (!st || st.phase !== "gameover") continue;
    o.games++; o.q.push(st.quarter); if (st.quarter < 12) o.early++;
    const eps = st.players.map((p) => E.epTotal(p));
    const best = Math.max(...eps), w = st.players[eps.indexOf(best)];
    o.win.push(best);
    o.cash.push(mean(st.players.map((p) => p.cash)));
    if (best > 0) o.cashPct.push(100 * epFrom(w, /[Cc]ash|^Bought \d+ EP/) / best);
    o.biz.push(mean(st.players.map((p) => E.activeBiz(p).length)));
    o.mc.push(st.players.reduce((n, p) => n + E.megacorpHQs(p).length, 0));
    for (const p of st.players) for (const b of p.businesses) o.built[E.bizInd(b)]++;
  }
  return o;
}

const f = (a, d = 1) => mean(a).toFixed(d);
console.log(`\n${GAMES} games an arm a table size, seeds from 1, all-bot tables.`);
for (const n of SIZES) {
  console.log("\n" + "=".repeat(78));
  console.log(`${n} PLAYERS`);
  console.log("  arm       " + ARMS.map((a) => a.key.padStart(10)).join(""));
  const res = ARMS.map((a) => run(engine(a.key), n));
  const row = (label, fn) => console.log("  " + label.padEnd(10) + res.map((r) => String(fn(r)).padStart(10)).join(""));
  row("score", (r) => f(r.win));
  row("cash $", (r) => f(r.cash, 0));
  row("cash %", (r) => f(r.cashPct) + "%");
  row("companies", (r) => f(r.biz, 2));
  row("megacorps", (r) => f(r.mc, 2));
  row("quarters", (r) => f(r.q));
  row("early", (r) => (100 * r.early / r.games).toFixed(0) + "%");
  console.log("  COMPANIES BUILT A GAME, BY INDUSTRY");
  for (const ind of res[0] && Object.keys(res[0].built)) {
    row("  " + ind, (r) => (r.built[ind] / r.games).toFixed(2));
  }
  row("spread", (r) => {
    const v = Object.values(r.built).map((x) => x / r.games);
    return (Math.max(...v) / Math.max(0.01, Math.min(...v))).toFixed(1) + "x";
  });
  console.log("  " + ARMS.map((a) => `${a.key}: ${a.note}`).join("\n  "));
}
console.log();
