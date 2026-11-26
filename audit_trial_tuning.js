/* ============================================================================
   Tuning options for the trial economy (the playtest sheet of 23 November 2026),
   measured against the rules as they ship and against v23 as printed.

   WHY THIS EXISTS. The trial rules pay every company a round supplier bill and
   three earning tiers that sit a few dollars either side of that bill. Bots under
   them end the game poorer, smaller and more in debt than under v23 as printed,
   and Level 3 and Level 4 companies are rarer. This probe asks which lever fixes
   that, without guessing. Every arm is a splice into a sandboxed copy of the
   engine; the repository is not touched.

     shipped     the trial rules as they ship
     reserve     bots keep a full quarter's bill in hand, not 40% of it
     shift       every margin one step kinder: Easy -1/0/+2, Medium 0/+1/+3, Hard +1/+2/+4
     netFirst    Closing pays every company its tier BEFORE bills and rent are charged
     +gate       the top tier's price $1 easier at every level (base +1, then base)
     +dbl        the margin step doubles with each level like the bill: $5, $10, $20, $40
     +rePrice    Retail's top tier asks $1 less below Level 3
     +reHard     Retail graded Hard instead of Medium
     printed     the variant "Bills and revenue as printed in v23"

   WHAT IT FOUND - 1000 games an arm at every table size, paired seeds. Four
   players quoted; the other sizes move the same way.

                                shipped  reserve  shift  netFirst  +gate  +dbl  printed
     winning score                 43.6     44.8   47.5      57.7   59.1  58.3     55.9
     cash a seat at the end         $50      $76    $84      $121   $137  $132     $144
     companies standing a seat     1.29     1.83   1.37      2.12   2.13  2.16     2.06
     games with Level 3 trading     49%      58%    59%       87%    88%   88%      95%
     games with Level 4 trading      4%       4%     8%       22%    23%   24%      42%
     forced sales a seat           1.39     0.18   1.54      0.07   0.06  0.07     0.60
     loans unpaid a seat           1.02     0.65   0.66      0.45   0.39  0.42     0.36
     kept a quarter at L1/L2/L3   -3/-3/0  0/2/3  1/5/13    0/3/7  1/6/7 0/3/12   4/13/28
     Retail's share of wins        6.4%     8.9%  11.0%     16.6%  16.2% 16.5%    11.0%
     lead changes                  2.23     1.77   2.25      2.14   2.10  2.16     2.33
     Megacorps a game              0.34     0.66   0.44      1.32   1.43  1.32     0.86

   1. THE ORDER OF CLOSING IS THE PROBLEM, NOT THE SIZE OF THE MARGINS. Bills are
      charged before revenue is paid, and the bank sells a company whose owner
      cannot cover its bill. Under the trial rules a tier is only a few dollars
      over the bill, so a seat lives quarter to quarter on its revenue - and is
      asked to pay before it has it. Bots lose 1.4 companies a game each to forced
      sales, against 0.6 under v23. Kinder margins alone (shift) do not touch it:
      forced sales stay at 1.5. Paying first (netFirst) takes them to 0.07 and
      everything else follows - companies, Level 3 and Megacorps back to v23 or
      above, cash and score close behind, Retail no longer the weakest industry.
   2. HOLDING MORE CASH IS THE WRONG FIX. reserve stops the forced sales too, but
      bots stop building: Level 3 in 58% of games and lead changes down to 1.77,
      with one game in seven led wire to wire.
   3. RETAIL NEEDS NO RULE OF ITS OWN. Its weakness was cash flow - the High bill
      on a Medium card - and netFirst lifts it from 6.4% of wins to 16.6% with no
      Retail splice. rePrice and reHard add nothing at four players that netFirst
      has not, and reHard pushes Retail to 18-20% at two and three.
   4. THE LEVEL 4 GAP STAYS. Under netFirst, Level 4 trades in 22% of games
      against 42% printed, and a Level 3 company keeps $7 a quarter against $28.
      dbl is the lever that reaches it: $12 a quarter at Level 3, Level 4 in 24%.
      gate moves the top tier instead: paid in 30% of company-quarters, not 21%.
   5. MEGACORPS COME OFTEN UNDER netFirst: 1.3 a game at four, 2.5 at five, 3.6 at
      six, against 0.9, 1.7 and 2.3 printed. Pot shares are paid by the company,
      and thin margins make a second company in a pot-rich industry the best
      build there is. Worth watching at the table if netFirst is adopted.

   Run: node audit_trial_tuning.js [games a table size] [seats...] [--arms=a,b]
        node audit_trial_tuning.js 1000 4
        node audit_trial_tuning.js 300 2 3 4 5 6 --arms=shipped,netFirst,printed
   ========================================================================== */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ARGV = process.argv.slice(2);
const GAMES = parseInt(ARGV.find((a) => /^\d+$/.test(a)) || "300", 10);
const SEATS = ARGV.filter((a) => /^\d+$/.test(a)).slice(1).map(Number);
const armArg = ARGV.find((a) => a.startsWith("--arms="));

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const S = {
  dbl: [["bill = supplierBill(ind, L), u = TIER_STEP * L;", "bill = supplierBill(ind, L), u = TIER_STEP * Math.pow(2, L - 1);"]],
  rePrice: [["price: [0, base - 1, base + topPriceOver(L)]", "price: [0, base - 1, base + topPriceOver(L) - (ind === \"RE\" && L < 3 ? 1 : 0)]"]],
  shift: [["const TIER_MARGIN = [[-2, -1, 1], [-1, 0, 2], [0, 1, 3]];", "const TIER_MARGIN = [[-1, 0, 2], [0, 1, 3], [1, 2, 4]];"]],
  gate: [["const topPriceOver = (level) => 2 - Math.min(2, levelRow(level) - 1);", "const topPriceOver = (level) => 1 - Math.min(1, levelRow(level) - 1);"]],
  reserve: [["  return p.cash - spend >= (committedOpex(p, state) + addedOpex) * buffer;", "  return p.cash - spend >= (committedOpex(p, state) + addedOpex) * (state && trialOn(state) ? Math.max(1, buffer) : buffer);"]],
  netFirst: [
    ["  state.phase = \"production\";\n  runProduction(state, log);", "  state.phase = \"production\";\n  if (!unitRevenueOn(state)) runBandRevenue(state, log);\n  runProduction(state, log);"],
    ["  if (!unitRevenueOn(state)) { runBandRevenue(state, log); finishQuarter(state, log, rng); return; }", "  if (!unitRevenueOn(state)) { finishQuarter(state, log, rng); return; }"],
  ],
  reHard: [["const ENTRY_GRADE = { HO: 0, UT: 0, RE: 1, TE: 1, MA: 2, HC: 2 };", "const ENTRY_GRADE = { HO: 0, UT: 0, RE: 2, TE: 1, MA: 2, HC: 2 };"]],
};
const ARMS = {
  shipped: { s: [], v: undefined },
  reserve: { s: ["reserve"], v: undefined },
  shift: { s: ["shift"], v: undefined },
  netFirst: { s: ["netFirst"], v: undefined },
  "netFirst+gate": { s: ["netFirst", "gate"], v: undefined },
  "netFirst+dbl": { s: ["netFirst", "dbl"], v: undefined },
  "netFirst+rePrice": { s: ["netFirst", "rePrice"], v: undefined },
  "netFirst+reHard": { s: ["netFirst", "reHard"], v: undefined },
  printed: { s: [], v: { printedV23: true } },
};
const want = armArg ? armArg.slice(7).split(",") : Object.keys(ARMS);
for (const k of want) if (!ARMS[k]) { console.error(`no such arm: ${k} - try ${Object.keys(ARMS).join(", ")}`); process.exit(2); }

const HOOKS = [
  ["      const r = bandRevenue(state, p, b);\n      noteTierReached(state, bizInd(b), r.band);", "\n      __P.pay(state, p, b, r);"],
  ["      const supplierBill = bizPotBill(state, b);\n      const rentBill = bizGroundRent(state, p, b);", "\n      __P.bill(p, b, supplierBill, rentBill);"],
  ["function finishQuarterAfterLH(state, log, rng) {\n  runClosingRest(state, log);", "\n  __P.snap(state);"],
  ["  p.cash += 20; p.discsInBank += 1;", "\n  __P.loan(state, p);"],
  ["function sellCompany(state, p, b, solvency = false) {", "\n  if (solvency) __P.forced();"],
  ["function runB2B(state, log) {", ""],
];
/* Every anchor is checked before a game is played, so a moved line fails at once. */
for (const [k, list] of Object.entries(S)) for (const [a] of list) if (!BASE.includes(a)) { console.error(`anchor moved: ${k}: ${a.slice(0, 70)}`); process.exit(2); }
for (const [a] of HOOKS) if (!BASE.includes(a)) { console.error(`hook moved: ${a.slice(0, 70)}`); process.exit(2); }

const P = { cur: null };
function engine(splices) {
  let L = BASE;
  for (const k of splices) for (const [a, b] of S[k]) L = L.replace(a, b);
  for (const [a, add] of HOOKS.slice(0, -1)) L = L.replace(a, a + add);
  L = L.replace("function runB2B(state, log) {", "function runB2B(state, log) { const __c = state.players.map((x) => x.cash); __runB2B(state, log); state.players.forEach((x, i) => __P.pot(x, x.cash - __c[i])); }\nfunction __runB2B(state, log) {");
  const box = {};
  const sb = { console, Math, Set, Map, Object, Array, JSON, String, Number, box, __P: P };
  vm.createContext(sb);
  vm.runInContext(L + ";box.E = { initGame, advanceDraft, startPlanning, advancePlanning, mulberry32, epTotal, activeBiz, bizInd, INDUSTRIES };", sb);
  return box.E;
}
P.pay = (state, p, b, r) => { if (P.cur) P.cur.pays.push({ lvl: Math.min(4, b.level), rev: r.revenue, band: r.band, t: r.tiers, icons: r.icons, px: r.px, key: p.id + ":" + b.id }); };
P.bill = (p, b, sb, rb) => { if (P.cur) P.cur.bills.push({ key: p.id + ":" + b.id, lvl: Math.min(4, b.level), c: sb + rb }); };
P.snap = (state) => { if (P.cur) P.cur.snaps.push(state.players.map((x) => P.ep(x))); };
P.loan = (state) => { if (P.cur) P.cur.loans.push(state.quarter); };
P.forced = () => { if (P.cur) P.cur.forced++; };
P.pot = (p, d) => { if (P.cur && d > 0) P.cur.pot += d; };

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (n, d) => (d ? (100 * n) / d : 0);
const lk = (e) => String(e.label && e.label.k !== undefined ? e.label.k : e.label);

function run(name, seats) {
  const arm = ARMS[name];
  const E = engine(arm.s);
  P.ep = E.epTotal;
  const o = { n: 0, win: [], cash: [], comps: [], l3: 0, l4: 0, megas: [], unpaid: [], keep: { 1: [], 2: [], 3: [] }, forced: [], indWin: {}, changes: [], wire: 0, topMet: 0, tierN: 0 };
  for (let s = 1; o.n < GAMES && s < GAMES * 3; s++) {
    const g = { pays: [], bills: [], snaps: [], loans: [], pot: 0, forced: 0 };
    P.cur = g;
    let st;
    try {
      st = E.initGame(seats - 1, s, ["S"], undefined, true, arm.v);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(s + 777), () => {});
    } catch (e) { P.cur = null; continue; }
    P.cur = null;
    if (!st || st.phase !== "gameover") continue;
    o.n++;
    const eps = st.players.map((p) => E.epTotal(p));
    const w = st.players[eps.indexOf(Math.max(...eps))];
    o.win.push(Math.max(...eps));
    o.cash.push(mean(st.players.map((p) => p.cash)));
    o.comps.push(mean(st.players.map((p) => E.activeBiz(p).length)));
    if (g.pays.some((x) => x.lvl >= 3)) o.l3++;
    if (g.pays.some((x) => x.lvl >= 4)) o.l4++;
    o.megas.push(st.players.reduce((n, p) => n + (p.epLog || []).filter((e) => /^Megacorp: /.test(lk(e))).length, 0));
    o.unpaid.push(mean(st.players.map((p) => p.discsInBank || 0)));
    const k = {};
    for (const x of g.pays) { const kk = x.key + ":" + x.lvl; (k[kk] = k[kk] || { r: 0, c: 0, n: 0, lvl: x.lvl }).r += x.rev; k[kk].n++; }
    for (const x of g.bills) { const kk = x.key + ":" + x.lvl; if (k[kk]) k[kk].c += x.c; }
    for (const v of Object.values(k)) if (v.lvl <= 3) o.keep[v.lvl].push((v.r - v.c) / v.n);
    o.forced.push(g.forced / st.players.length);
    const lv = {}; E.activeBiz(w).forEach((b) => { lv[E.bizInd(b)] = (lv[E.bizInd(b)] || 0) + b.level; });
    const top = Object.entries(lv).sort((a, b) => b[1] - a[1])[0];
    if (top) o.indWin[top[0]] = (o.indWin[top[0]] || 0) + 1;
    let leader = null, ch = 0;
    for (const ep of g.snaps.concat([eps])) { const t = Math.max(...ep); if (t <= 0) continue; const tied = ep.map((e, i) => [e, i]).filter(([e]) => e === t).map(([, i]) => i); if (leader === null || !tied.includes(leader)) { if (leader !== null) ch++; leader = tied[0]; } }
    o.changes.push(ch); if (ch === 0) o.wire++;
    for (const x of g.pays) if (x.t) { o.tierN++; if (x.band === 2) o.topMet++; }
  }
  const iw = E.INDUSTRIES.map((i) => [i, pct(o.indWin[i] || 0, o.n)]).sort((a, b) => a[1] - b[1]);
  return { games: o.n, win: mean(o.win), cash: mean(o.cash), comps: mean(o.comps), l3: pct(o.l3, o.n), l4: pct(o.l4, o.n), megas: mean(o.megas),
    unpaid: mean(o.unpaid), forced: mean(o.forced), keep: [1, 2, 3].map((l) => mean(o.keep[l])), re: pct(o.indWin.RE || 0, o.n), weakest: iw[0],
    changes: mean(o.changes), wire: pct(o.wire, o.n), topMet: pct(o.topMet, o.tierN) };
}

const f = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "-");
for (const seats of SEATS.length ? SEATS : [4]) {
  const R = want.map((k) => [k, run(k, seats)]);
  console.log(`\n${seats} players, ${GAMES} games an arm, paired seeds`);
  const W = 17;
  const row = (label, fn) => console.log(`  ${label.padEnd(32)}${R.map(([, r]) => String(fn(r)).padStart(W)).join("")}`);
  console.log(`  ${"".padEnd(32)}${R.map(([k]) => k.padStart(W)).join("")}`);
  row("games", (r) => r.games);
  row("winning score", (r) => f(r.win));
  row("cash a seat at the end", (r) => `$${f(r.cash, 0)}`);
  row("companies standing a seat", (r) => f(r.comps, 2));
  row("games with Level 3 trading", (r) => `${f(r.l3, 0)}%`);
  row("games with Level 4 trading", (r) => `${f(r.l4, 0)}%`);
  row("forced sales a seat", (r) => f(r.forced, 2));
  row("loans unpaid a seat", (r) => f(r.unpaid, 2));
  row("kept a quarter at L1/L2/L3", (r) => r.keep.map((x) => f(x, 0)).join("/"));
  row("Retail's share of wins", (r) => `${f(r.re)}%`);
  row("weakest industry", (r) => `${r.weakest[0]} ${f(r.weakest[1])}%`);
  row("lead changes / wire to wire", (r) => `${f(r.changes, 2)} / ${f(r.wire, 0)}%`);
  row("top tier paid", (r) => `${f(r.topMet, 0)}%`);
  row("Megacorps a game", (r) => f(r.megas, 2));
}
