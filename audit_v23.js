/* ============================================================================
   v23 AGAINST v22, ONE RULE AT A TIME.

   Three rules changed in v23, and every one of them is kept behind a variant that
   puts the old rule back, so the shipped game and each revert can be played on the
   same seeds and compared pairwise:

     v23    as it ships: revenue by band, eight quarters, rows 3-4 open from Q1
     unit   "Revenue by the unit"      - every company delivers one unit an icon and
                                         recycles the rest at $1, as up to v22
     long   "Three-year game"          - twelve quarters, three year ends
     late   "Rows 3-4 open in Year 2"  - the deep rows locked until Quarter 5
     v22    all three reverts at once  - the v22 game, played by the v23 engine

   WHAT IS MEASURED, per arm and table size, over the same seeds:
     the game        quarters played, games called early by a second Megacorp,
                     the winning score, the margin and the spread
     the score       what a winner's EP is made of - companies, industry debuts,
                     land awards, Megacorps (tile, brand and orbit, net of tithe),
                     cash, unpaid loans
     the table       seat win rates; how often the winner's largest industry is a
                     vertical one (RE, HO, HC) against a horizontal one (UT, MA, TE)
     tension         lead changes, wire-to-wire games, the quarter of the last change
     the economy     trade income a game, revenue a company-quarter by level, the
                     share of company-quarters paid in each band (or, under the unit
                     rule, the share of production recycled)
     the load        worker placements a game, and what the revenue step asks of the
                     table: deliveries a game under the unit rule, against nothing at
                     all under the band - every company is paid at once

   Nothing is patched. Every arm is a variant the game already offers, played through
   initGame, so the figures are the game as a table would meet it. The only splices
   are probes: a snapshot at each quarter's close, a tap on each payout, a tap on each
   delivery and on each worker placement.

   The bots know the band rule - their card, upgrade and merger valuations read
   bandRevenue when the band is on - but they do not plan for it: nobody moves to
   climb a band. So the band arms are a floor on what the rule does for a table that
   reads the board, not a ceiling.

   Run: node audit_v23.js [games a table size] [seats...] [--arms v23,unit,long,late,v22]
                          [--seeds=N] [--json out.json]
        node audit_v23.js 1000 3 4
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ARGV = process.argv.slice(2);
const GAMES = parseInt(ARGV.find((a) => /^\d+$/.test(a)) || "200", 10);
const SEATS = ARGV.filter((a) => /^\d+$/.test(a)).slice(1).map(Number).filter((n) => n >= 2 && n <= 6);
const SIZES = SEATS.length ? SEATS : [3, 4];
const seedArg = ARGV.find((a) => a.startsWith("--seeds="));
const SEED0 = seedArg ? parseInt(seedArg.slice(8), 10) : 1;
const armArg = ARGV.find((a) => a.startsWith("--arms="));
const jsonArg = ARGV.find((a) => a.startsWith("--json="));

const ARMS = {
  v23: { label: "v23 as shipped", variants: undefined },
  unit: { label: "revenue by the unit", variants: { unitRevenue: true } },
  long: { label: "three-year game", variants: { longGame: true } },
  late: { label: "rows 3-4 in Year 2", variants: { lateRows: true } },
  v22: { label: "all three (v22)", variants: { unitRevenue: true, longGame: true, lateRows: true } },
};
const ARM_KEYS = (armArg ? armArg.slice(7).split(",") : Object.keys(ARMS)).filter((k) => ARMS[k]);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* Shape guards: every line a probe hangs on. A moved line stops the run rather than
   quietly measuring a game with a probe missing. */
const N = {
  quarterEnd: "function finishQuarterAfterLH(state, log, rng) {\n  runClosingRest(state, log);",
  bandPay: "      p.cash += r.revenue;\n      noteConcessionSale(state, p, b, r.revenue > 0 ? 1 : 0);",
  unitTail: "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;\n}",
  place: "function placeMeeple(state, playerId, track) {",
  variants: 'const unitRevenueOn = (state) => hasVariant(state, "unitRevenue");',
  calendar: "const STANDARD_QUARTERS = 8, LONG_GAME_QUARTERS = 12;",
};
for (const [k, v] of Object.entries(N)) {
  if (!BASE.includes(v)) { console.error(`the engine changed shape around ${k} - update this probe`); process.exit(2); }
}

let logic = BASE;
logic = logic.replace(N.quarterEnd, N.quarterEnd + "\n  __probe.snap(state);");
logic = logic.replace(N.bandPay, "      p.cash += r.revenue;\n      __probe.pay(bizInd(b), b.level, r.icons, r.band, r.revenue, state.quarter);\n      noteConcessionSale(state, p, b, r.revenue > 0 ? 1 : 0);");
logic = logic.replace(N.unitTail, "  const leftover = Math.max(0, remaining);\n  __probe.sale(bizInd(biz), biz.level, earned, leftover, bizProd(biz), state.quarter);\n  p.cash += earned + leftover * 1;\n}");
logic = logic.replace(N.place, N.place + "\n  __probe.place();");

const PROBE = { cur: null,
  snap(state) { if (PROBE.cur) PROBE.cur.snaps.push({ q: state.quarter, ep: state.players.map((p) => PROBE.ep(p)) }); },
  pay(ind, level, icons, band, revenue, q) { if (PROBE.cur) PROBE.cur.pays.push({ ind, level, icons, band, revenue, q }); },
  sale(ind, level, earned, leftover, prod, q) { if (PROBE.cur) PROBE.cur.sales.push({ ind, level, earned, leftover, prod, q }); },
  place() { if (PROBE.cur) PROBE.cur.places++; },
};
const box = {};
const sandbox = { console, Math, Set, Map, Object, Array, JSON, String, Number, box, __probe: PROBE };
vm.createContext(sandbox);
vm.runInContext(logic + `
  box.E = { initGame, advanceDraft, startPlanning, advancePlanning, mulberry32, epTotal, activeBiz, bizInd,
    finalQuarterOf, endgameRushers, SCALING, INDUSTRIES };
`, sandbox);
const E = box.E;
PROBE.ep = E.epTotal;

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (n, d) => (d ? (100 * n) / d : 0);
const labelKey = (e) => String(e.label && e.label.k !== undefined ? e.label.k : e.label);
const epFrom = (p, re) => (p.epLog || []).filter((e) => re.test(labelKey(e))).reduce((s, e) => s + e.amount, 0);
const LAND = /^The Real-Estate Mogul$|^The Omnipresent$/;

function play(seats, seed, variants) {
  const G = { snaps: [], pays: [], sales: [], places: 0 };
  PROBE.cur = G;
  let st;
  try {
    st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, variants);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
  } catch (e) { PROBE.cur = null; return null; }
  PROBE.cur = null;
  if (!st || st.phase !== "gameover") return null;
  return { st, G };
}

function measure(seats, variants) {
  const o = { games: 0, quarters: [], early: 0, winEP: [], margin: [], spread: [], cashEnd: [], bizEnd: [],
    mix: { company: [], debut: [], land: [], mega: [], cash: [], loans: [] },
    seatWins: Array(seats).fill(0), verticalWins: 0, indWins: {},
    changes: [], wire: 0, lastChange: [],
    trade: [], revByLevel: { 1: [], 2: [], 3: [], 4: [] }, bands: { 1: [0, 0, 0], 2: [0, 0, 0], 3: [0, 0, 0], 4: [0, 0, 0] },
    recycled: [], payouts: [], deliveries: [], places: [], paidByQ: {}, megas: [] };
  for (let i = 0; o.games < GAMES && i < GAMES * 3; i++) {
    const r = play(seats, SEED0 + i, variants);
    if (!r) continue;
    const { st, G } = r;
    o.games++;
    o.quarters.push(st.quarter);
    if (st.quarter < E.finalQuarterOf(st)) o.early++;
    const eps = st.players.map((p) => E.epTotal(p));
    const order = st.players.map((p, i) => [i, eps[i]]).sort((a, b) => b[1] - a[1]);
    const wIdx = order[0][0], winner = st.players[wIdx], finalEP = order[0][1];
    o.winEP.push(finalEP);
    o.margin.push(finalEP - order[1][1]);
    o.spread.push(finalEP - order[order.length - 1][1]);
    o.cashEnd.push(mean(st.players.map((p) => p.cash)));
    o.bizEnd.push(mean(st.players.map((p) => E.activeBiz(p).length)));
    o.seatWins[wIdx]++;
    if (finalEP > 0) {
      o.mix.company.push(pct(epFrom(winner, /^Company: /), finalEP));
      o.mix.debut.push(pct(epFrom(winner, /^Entered /), finalEP));
      o.mix.land.push(pct(epFrom(winner, LAND), finalEP));
      o.mix.mega.push(pct(epFrom(winner, /^Megacorp/), finalEP));
      o.mix.cash.push(pct(epFrom(winner, /^Cash on hand/), finalEP));
      o.mix.loans.push(pct(epFrom(winner, /^Unpaid loans/), finalEP));
    }
    /* the winner's largest industry, by levels standing at the end */
    const levels = {};
    E.activeBiz(winner).forEach((b) => { levels[E.bizInd(b)] = (levels[E.bizInd(b)] || 0) + b.level; });
    const top = Object.entries(levels).sort((a, b) => b[1] - a[1])[0];
    if (top) { o.indWins[top[0]] = (o.indWins[top[0]] || 0) + 1; if (E.SCALING[top[0]] === "V") o.verticalWins++; }
    o.megas.push(st.players.reduce((n, p) => n + (p.epLog || []).filter((e) => /^Megacorp: /.test(labelKey(e))).length, 0));
    /* tension */
    const track = G.snaps.map((s) => s.ep).concat([eps]);
    let leader = null, changes = 0, last = 0;
    track.forEach((ep, k) => {
      const t = Math.max(...ep);
      if (t <= 0) return;
      const tied = ep.map((e, i) => [e, i]).filter(([e]) => e === t).map(([, i]) => i);
      if (leader === null || !tied.includes(leader)) {
        if (leader !== null) { changes++; last = k < G.snaps.length ? G.snaps[k].q : st.quarter; }
        leader = tied[0];
      }
    });
    o.changes.push(changes);
    if (changes === 0) o.wire++;
    o.lastChange.push(last);
    /* economy and load */
    const trade = G.pays.reduce((s, x) => s + x.revenue, 0) + G.sales.reduce((s, x) => s + x.earned + x.leftover, 0);
    o.trade.push(trade);
    G.pays.forEach((x) => { const L = Math.min(4, x.level); o.revByLevel[L].push(x.revenue); o.bands[L][x.band]++;
      o.paidByQ[x.q] = (o.paidByQ[x.q] || 0) + 1; });
    G.sales.forEach((x) => { const L = Math.min(4, x.level); o.revByLevel[L].push(x.earned + x.leftover);
      o.paidByQ[x.q] = (o.paidByQ[x.q] || 0) + 1; });
    const prod = G.sales.reduce((s, x) => s + x.prod, 0), left = G.sales.reduce((s, x) => s + x.leftover, 0);
    if (prod) o.recycled.push(pct(left, prod));
    o.payouts.push(G.pays.length);
    o.deliveries.push(G.sales.length);
    o.places.push(G.places);
  }
  return o;
}

const f1 = (x) => x.toFixed(1), f0 = (x) => x.toFixed(0);
function report(seats, results) {
  const keys = Object.keys(results);
  const row = (label, fn) => console.log(`  ${label.padEnd(34)}${keys.map((k) => String(fn(results[k])).padStart(14)).join("")}`);
  console.log(`\n${seats} players, ${GAMES} games an arm, seeds ${SEED0}..${SEED0 + GAMES - 1} paired across arms`);
  console.log(`  ${"".padEnd(34)}${keys.map((k) => k.padStart(14)).join("")}`);
  row("games finished", (o) => o.games);
  row("quarters played (mean)", (o) => f1(mean(o.quarters)));
  row("called early by a 2nd Megacorp", (o) => `${f1(pct(o.early, o.games))}%`);
  row("winning score (EP)", (o) => f1(mean(o.winEP)));
  row("margin 1st-2nd", (o) => f1(mean(o.margin)));
  row("spread 1st-last", (o) => f1(mean(o.spread)));
  row("cash a seat at the end ($)", (o) => f0(mean(o.cashEnd)));
  row("companies a seat at the end", (o) => f1(mean(o.bizEnd)));
  row("Megacorps a game", (o) => f1(mean(o.megas)));
  console.log("  winner's score, by source:");
  row("  companies", (o) => `${f1(mean(o.mix.company))}%`);
  row("  industry debuts", (o) => `${f1(mean(o.mix.debut))}%`);
  row("  land awards", (o) => `${f1(mean(o.mix.land))}%`);
  row("  Megacorps, net", (o) => `${f1(mean(o.mix.mega))}%`);
  row("  cash on hand", (o) => `${f1(mean(o.mix.cash))}%`);
  row("  unpaid loans", (o) => `${f1(mean(o.mix.loans))}%`);
  console.log("  the table:");
  row("  seat win rates", (o) => o.seatWins.map((n) => f0(pct(n, o.games))).join("/"));
  row("  winner's largest industry vertical", (o) => `${f1(pct(o.verticalWins, o.games))}%`);
  row("  most-won industry", (o) => { const e = Object.entries(o.indWins).sort((a, b) => b[1] - a[1])[0]; return e ? `${e[0]} ${f1(pct(e[1], o.games))}%` : "-"; });
  row("  least-won industry", (o) => { const e = E.INDUSTRIES.map((i) => [i, o.indWins[i] || 0]).sort((a, b) => a[1] - b[1])[0]; return e ? `${e[0]} ${f1(pct(e[1], o.games))}%` : "-"; });
  console.log("  tension:");
  row("  lead changes a game", (o) => f1(mean(o.changes)));
  row("  wire to wire", (o) => `${f1(pct(o.wire, o.games))}%`);
  row("  last lead change (quarter)", (o) => f1(mean(o.lastChange)));
  console.log("  the economy:");
  row("  trade income a game ($)", (o) => f0(mean(o.trade)));
  for (const L of [1, 2, 3]) row(`  revenue a company-quarter, L${L} ($)`, (o) => (o.revByLevel[L].length ? f1(mean(o.revByLevel[L])) : "-"));
  for (const L of [1, 2, 3]) row(`  bands $/$$/$$$ at L${L}`, (o) => { const b = o.bands[L], n = b[0] + b[1] + b[2]; return n ? b.map((x) => f0(pct(x, n))).join("/") : "-"; });
  row("  production recycled (unit rule)", (o) => (o.recycled.length ? `${f1(mean(o.recycled))}%` : "-"));
  console.log("  the load, a game:");
  row("  worker placements", (o) => f1(mean(o.places)));
  row("  deliveries (unit rule)", (o) => f1(mean(o.deliveries)));
  row("  band payouts, nobody asked", (o) => f1(mean(o.payouts)));
  const paidIn = (o, n) => f1((o.paidByQ[n] || 0) / (o.games || 1));
  row("  companies paid in Q1", (o) => paidIn(o, 1));
  row("  companies paid in Q4", (o) => paidIn(o, 4));
  row("  companies paid in the last quarter", (o) => paidIn(o, Math.round(mean(o.quarters))));
}

const all = {};
for (const seats of SIZES) {
  const results = {};
  for (const k of ARM_KEYS) results[k] = measure(seats, ARMS[k].variants);
  all[seats] = results;
  report(seats, results);
}
if (jsonArg) {
  const out = {};
  for (const [seats, results] of Object.entries(all)) {
    out[seats] = {};
    for (const [k, o] of Object.entries(results)) {
      out[seats][k] = { games: o.games, quarters: mean(o.quarters), early: pct(o.early, o.games), winEP: mean(o.winEP), margin: mean(o.margin),
        spread: mean(o.spread), cashEnd: mean(o.cashEnd), bizEnd: mean(o.bizEnd), megas: mean(o.megas),
        mix: Object.fromEntries(Object.entries(o.mix).map(([a, b]) => [a, mean(b)])),
        seatWins: o.seatWins.map((n) => pct(n, o.games)), vertical: pct(o.verticalWins, o.games), indWins: o.indWins,
        changes: mean(o.changes), wire: pct(o.wire, o.games), lastChange: mean(o.lastChange), trade: mean(o.trade),
        revByLevel: Object.fromEntries(Object.entries(o.revByLevel).map(([a, b]) => [a, mean(b)])), bands: o.bands,
        recycled: mean(o.recycled), places: mean(o.places), deliveries: mean(o.deliveries), payouts: mean(o.payouts), paidByQ: o.paidByQ };
    }
  }
  fs.writeFileSync(jsonArg.slice(7), JSON.stringify(out, null, 1));
  console.log(`\nwritten ${jsonArg.slice(7)}`);
}
