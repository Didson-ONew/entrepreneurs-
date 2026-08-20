/* ============================================================================
   Where does the money go, and who wins with what?

   audit_strategy.js asks whether the bots compete for the points on the table.
   This one is about the game itself: how much cash actually moves, which
   companies get built, which personas win, what a winner's score is made of,
   how often a Megacorp happens, whether Logistic Hubs matter, and which
   industries make money.

   It instruments the engine inside the sandbox - the repo file is untouched -
   by hooking the six places where money and buildings change hands.

   Run: node audit_economy.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "200", 10);
const ROOT = __dirname;

const src = fs.readFileSync(path.join(ROOT, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
let logic = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");

/* ---------- the hooks ---------- */
function hook(needle, replacement, what) {
  if (!logic.includes(needle)) {
    console.error(`the engine changed shape around ${what} - update this probe`);
    process.exit(2);
  }
  logic = logic.replace(needle, replacement);
}

// 1. every unit a company sells, and everything it could not
hook("  const leftover = Math.max(0, remaining);\n  p.cash += sold + crossPaid + leftover * 1;",
  "  const leftover = Math.max(0, remaining);\n" +
  "  __econ.sale(state, p, biz, sold + crossPaid, leftover, hoBonus);\n" +
  "  p.cash += sold + crossPaid + leftover * 1;", "autoDeliver");

// 1b. every unit, and which district it went to - the real hub question
hook("        const n = Math.min(got, remaining);\n        sold += n * unitPrice(state, p, biz);",
  "        const n = Math.min(got, remaining);\n        __econ.unit(state, biz, s.tileKey, n, unitPrice(state, p, biz));\n        sold += n * unitPrice(state, p, biz);", "autoDeliver slot");

// 2. what each industry pot pays out
hook("    state.pots[ind] = pot - share * recipients.length;",
  "    __econ.pot(state, ind, share, recipients);\n" +
  "    state.pots[ind] = pot - share * recipients.length;", "runB2B");

// 3. every company built
hook("  claimIndustryBonus(state, p, bp.ind, log);\n  return true;",
  "  __econ.build(state, p, bp, footprint);\n  claimIndustryBonus(state, p, bp.ind, log);\n  return true;", "doLaunch");

// 4. every OPEX bill paid
hook("      p.cash -= cost;\n      const rentTotal = 3 * b.level;",
  "      __econ.opex(state, p, b, cost);\n      p.cash -= cost;\n      const rentTotal = 3 * b.level;", "runProduction");

// 5. every Megacorp formed
hook("  b.upgraded = true; b.level += 1;",
  "  __econ.upgrade(state, p, b);\n  b.upgraded = true; b.level += 1;", "doUpgrade");
hook("  state.megacorpPool = state.megacorpPool.filter((t) => t !== match.tile);",
  "  __econ.megacorp(state, p, match);\n  state.megacorpPool = state.megacorpPool.filter((t) => t !== match.tile);", "claimMegacorp");

// 6. rent handed to landlords - the one payment the engine can make fractional
hook("        const perPlot = base + (odd > 0 ? 1 : 0);",
  "        const perPlot = base + (odd > 0 ? 1 : 0);\n        __econ.rent(rentTotal, nPlots, perPlot, b.level);", "rent split");
hook("if (owner) owner.cash += perPlot;",
  "if (owner) { __econ.rentPay(p.id, owner.id, perPlot); owner.cash += perPlot; }", "rent payment");

// 7. a snapshot at the close of every quarter, for the cash curve
hook("function finishQuarterAfterLH(state, log, rng) {\n  runClosingRest(state, log);",
  "function finishQuarterAfterLH(state, log, rng) {\n  runClosingRest(state, log);\n  __econ.quarter(state);", "finishQuarterAfterLH");

const box = {};
const __econ = {};
const sandbox = { console, Math, Set, Object, Array, JSON, box, __econ };
vm.createContext(sandbox);
vm.runInContext(logic + `
  box.exports = { initGame, mulberry32, advancePlanning, startPlanning, activeBiz, epTotal,
    bizProd, bizInd, bizSetup, bizOpex, price, plotCount, districtCount, byId, INDUSTRIES,
    advanceDraft,
    reachableDistricts, footprintDistricts, plotHasLH, lhDistricts, lhCount, PERSONAS,
    BASE_PRICE, MEGACORP_TILES, finalRank, DISCS_PER_PLAYER };
`, sandbox);
const E = box.exports;

/* ---------- tallies ---------- */
const IND = E.INDUSTRIES;
const zero = () => Object.fromEntries(IND.map((i) => [i, 0]));
let T = null;
const newTally = () => ({
  games: 0,
  sales: zero(), pots: zero(), setup: zero(), opex: zero(), recycled: zero(),
  hoBonus: 0,
  built: {}, builtByInd: zero(), upgrades: zero(),
  megacorps: 0, megacorpEP: 0, megacorpBy: {},
  hubSales: 0, homeSales: 0, hubSalesCash: 0,
  cashSamples: [], peakSeat: 0, peakTable: 0,
  payments: [],
  personaWins: {}, personaPlays: {},
  winnerEP: { industries: 0, companies: 0, megacorps: 0, ipo: 0, land: 0, cash: 0, loans: 0, other: 0 },
  winnerTotal: 0, winnerCompanies: 0, winnerPlots: 0, winnerDistricts: 0,
  epByBucket: { industries: 0, companies: 0, megacorps: 0, ipo: 0, land: 0, cash: 0, loans: 0, other: 0 },
  seats: 0, loansTaken: 0, solvency: 0, hubsPlaced: 0,
  unitsHome: 0, unitsAway: 0, cashHome: 0, cashAway: 0, reachWhy: {}, reachCash: {}, awayByInd: {},
  rents: 0, rentsFractional: 0, rentSizes: {}, rentShapes: {},
  hubsFinal: 0, hubsFinalN: 0,
  winsBySeat: {}, seatGames: 0, spread: 0, gapToSecond: 0,
});

__econ.sale = (state, p, biz, cash, leftover, hoBonus) => {
  if (!T) return;
  const ind = E.bizInd(biz);
  T.sales[ind] += cash + (hoBonus || 0) * E.price(state.pm, ind);
  T.recycled[ind] += leftover;
  T.hoBonus += hoBonus || 0;
  if (cash > 0) { T.payments.push(cash); FLOW.push([BANK, p.id, cash]); }
  /* Did this company reach past its own districts? That is what a hub buys. */
  const home = E.footprintDistricts(state.board, biz.footprint);
  const reach = E.reachableDistricts(state, biz);
  let beyond = 0;
  reach.forEach((d) => { if (!home.has(d)) beyond++; });
  if (beyond > 0) { T.hubSales++; T.hubSalesCash += cash; } else T.homeSales++;
};
__econ.unit = (state, biz, tileKey, n, px) => {
  if (!T || n <= 0) return;
  const ind = E.bizInd(biz);
  const home = E.footprintDistricts(state.board, biz.footprint);
  const away = !home.has(tileKey);
  if (away) { T.unitsAway += n; T.cashAway += n * px; } else { T.unitsHome += n; T.cashHome += n * px; }
  /* Reaching out of your own districts has three different causes. Only one of
     them is a Logistic Hub: UT reads an N x N block on its own and RE buys extra
     districts outright, and HC rides the network without touching a hub. */
  const onNetwork = ind !== "UT" && ind !== "RE"
    && (ind === "HC" || biz.footprint.some((plot) => E.plotHasLH(state.board, plot)));
  const bucket = !away ? "home" : (ind === "UT" || ind === "RE") ? "own reach"
    : onNetwork ? (ind === "HC" ? "network (HC, no hub needed)" : "hub") : "adjacent";
  T.reachWhy[bucket] = (T.reachWhy[bucket] || 0) + n;
  T.reachCash[bucket] = (T.reachCash[bucket] || 0) + n * px;
  (T.awayByInd[ind] = T.awayByInd[ind] || { home: 0, away: 0 })[away ? "away" : "home"] += n;
};
__econ.pot = (state, ind, share, recipients) => {
  if (!T) return;
  const n = recipients.length;
  T.pots[ind] += share * n;
  for (const r of recipients) { T.payments.push(share); FLOW.push([BANK, r.p.id, share]); }
};
__econ.build = (state, p, bp) => {
  if (!T) return;
  const key = `${bp.ind}${bp.lvl}`;
  T.built[key] = (T.built[key] || 0) + 1;
  T.builtByInd[bp.ind] += 1;
  T.setup[bp.ind] += bp.setup;
  T.payments.push(bp.setup);
  FLOW.push([p.id, BANK, bp.setup]);
};
__econ.upgrade = (state, p, b) => {
  if (!T) return;
  T.upgrades[E.bizInd(b)] += 1;
  T.setup[E.bizInd(b)] += E.bizSetup(b);
  T.payments.push(E.bizSetup(b));
  FLOW.push([p.id, BANK, E.bizSetup(b)]);
};
__econ.opex = (state, p, b, cost) => {
  if (!T) return;
  T.opex[E.bizInd(b)] += cost;
  T.payments.push(cost);
  FLOW.push([p.id, BANK, cost]);
};
__econ.megacorp = (state, p, match) => {
  if (!T) return;
  T.megacorps += 1;
  T.megacorpEP += match.tile[2];
  T.megacorpBy[match.tile[0]] = (T.megacorpBy[match.tile[0]] || 0) + 1;
};
__econ.rent = (total, nPlots, perPlot, level) => {
  if (!T || !nPlots) return;                      // fires once per plot now
  const shape = `L${level} on ${nPlots} plot${nPlots === 1 ? "" : "s"}`;
  T.rentShapes[shape] = (T.rentShapes[shape] || 0) + 1;
  T.rents++;
  if (Math.abs(perPlot - Math.round(perPlot)) > 1e-9) T.rentsFractional++;
  const k = String(Math.round(perPlot * 100) / 100);
  T.rentSizes[k] = (T.rentSizes[k] || 0) + 1;
  T.payments.push(perPlot);
};
__econ.rentPay = (fromId, toId, amt) => { if (T && amt > 0) FLOW.push([fromId, toId, amt]); };
__econ.quarter = (state) => {
  if (!T) return;
  FLOW.push(["Q", state.players.map((pl) => pl.cash)]);
  let table = 0;
  for (const p of state.players) {
    const c = Math.round(p.cash);
    T.cashSamples.push(c);
    if (c > T.peakSeat) T.peakSeat = c;
    table += c;
  }
  if (table > T.peakTable) T.peakTable = table;
  T.hubsPlaced = Math.max(T.hubsPlaced, E.lhCount(state.board));
  if (state.quarter >= 12) { T.hubsFinal += E.lhCount(state.board); T.hubsFinalN++; }
};


/* ---------- chips ----------------------------------------------------------
   A physical table does not hold "cash", it holds chips. This replays the real
   payment stream of each game with a chip stack per seat and an unlimited bank,
   and records the most chips of each denomination that were ever in players'
   hands at once. That peak is the number the box has to contain: whatever is not
   in a player's hand is sitting in the bank.

   Paying works the way people actually pay: put down your smallest chips until
   they cover the bill, then take change back from the bank. Every quarter end the
   stacks are reconciled against the engine's true cash, so movements this probe
   does not hook (land, loans, IPO) cannot make the sim drift.
   -------------------------------------------------------------------------- */
const BANK = -1;
let FLOW = [];

function makeChange(amount, ladder) {          // what the bank hands you
  const out = {}; let left = Math.round(amount * 100);
  for (const d of ladder) {
    const c = Math.floor(left / Math.round(d * 100));
    if (c) { out[d] = c; left -= c * Math.round(d * 100); }
  }
  return left === 0 ? out : null;              // null: this ladder cannot express it
}

function chipSim(flow, startCash, ladder, peak, stats) {
  const asc = [...ladder].sort((a, b) => a - b);
  const stacks = startCash.map((c) => makeChange(c, ladder) || {});
  const held = () => {
    const t = {};
    for (const st of stacks) for (const d of asc) t[d] = (t[d] || 0) + (st[d] || 0);
    return t;
  };
  const note = () => { const t = held(); for (const d of asc) if ((t[d] || 0) > (peak[d] || 0)) peak[d] = t[d] || 0; };
  const add = (st, ch) => { for (const d in ch) st[d] = (st[d] || 0) + ch[d]; };

  function pay(st, amount) {                   // smallest chips first, change from the bank
    let need = Math.round(amount * 100), put = 0, used = 0;
    for (const d of asc) {
      const unit = Math.round(d * 100);
      let have = st[d] || 0;
      while (have > 0 && put < need) { st[d] = --have; put += unit; used++; }
      if (put >= need) break;
    }
    if (put < need) { stats.short++; return 0; }   // should not happen: they had the cash
    if (put > need) { const ch = makeChange((put - need) / 100, ladder); if (ch) add(st, ch); else stats.impossible++; }
    stats.chips += used; stats.payments++;
    return used;
  }

  for (const ev of flow) {
    if (ev[0] === "Q") {                        // reconcile with the engine
      ev[1].forEach((cash, i) => {
        const ch = makeChange(Math.max(0, cash), ladder);
        stacks[i] = ch || {};
        if (!ch) { stats.impossible++; stats.odd[`reconcile ${cash}`] = (stats.odd[`reconcile ${cash}`] || 0) + 1; }
      });
      note();
      continue;
    }
    const [from, to, amt] = ev;
    if (amt <= 0) continue;
    if (from !== BANK) pay(stacks[from], amt);
    if (to !== BANK) { const ch = makeChange(amt, ladder); if (ch) add(stacks[to], ch); else { stats.impossible++; stats.odd[`pay ${amt}`] = (stats.odd[`pay ${amt}`] || 0) + 1; } }
    note();
  }
}

/* ---------- EP buckets, the same ones the records use ---------- */
function bucketOf(label) {
  const l = String(label || "");
  if (l.startsWith("Entered ")) return "industries";
  if (l.startsWith("Vested:")) return "companies";
  if (l.startsWith("Megacorp:")) return "megacorps";
  if (l === "IPO tile") return "ipo";
  if (l === "The Real-Estate Mogul" || l === "The Omnipresent") return "land";
  if (l.startsWith("Cash on hand")) return "cash";
  if (l.startsWith("Unpaid loans")) return "loans";
  return "other";
}

/* ---------- play one all-bot table ---------- */
function play(seed) {
  FLOW = [];
  const st = E.initGame(3, seed, ["Seat 1"], undefined, true, undefined);   // personas ON
  st.players[0].isHuman = false;
  const rng = E.mulberry32(seed + 777);
  const log = () => {};
  /* initGame parked the draft on seat 0 because it was the human. Seat 0 is a bot
     now, so resume the same walk: it drafts for seat 0 and for everyone still to
     come, in draft order. Doing it by hand here would skip the later seats. */
  if (st.phase === "drafting") {
    E.advanceDraft(st, log);
    if (st.phase !== "planning") throw new Error(`draft stalled on seat ${st.awaitingPlayerId}`);
    E.startPlanning(st);
  }
  const startCash = st.players.map((p) => p.cash);
  E.advancePlanning(st, rng, log);
  return { st, startCash, flow: FLOW };
}

console.log(`Entrepreneurs - economy and balance audit`);
console.log(`${SEEDS} games, 4 seats, personas on, Rulebook v13 standard rules\n`);

T = newTally();
const finals = [];
const LADDERS = {
  "yours      1/2/10/20/50/100/500": [500, 100, 50, 20, 10, 2, 1],
  "with a 5   1/2/5/10/20/50/100":   [100, 50, 20, 10, 5, 2, 1],
  "tight      1/2/5/10/20/50":       [50, 20, 10, 5, 2, 1],
  "no 2s      1/5/10/25/50":         [50, 25, 10, 5, 1],
};
const CHIP = Object.fromEntries(Object.keys(LADDERS).map((k) => [k, { peak: {}, samples: {}, stats: { chips: 0, payments: 0, short: 0, impossible: 0, odd: {} } }]));

for (let s = 1; s <= SEEDS; s++) {
  const R = play(s);
  const st = R.st;
  if (st.phase !== "gameover") continue;
  for (const [name, ladder] of Object.entries(LADDERS)) {
    const gamePeak = {};
    chipSim(R.flow, R.startCash, ladder, gamePeak, CHIP[name].stats);
    const C = CHIP[name];
    for (const d of ladder) {
      const v = gamePeak[d] || 0;
      if (v > (C.peak[d] || 0)) C.peak[d] = v;
      (C.samples[d] = C.samples[d] || []).push(v);
    }
  }
  T.games++;
  const ranked = [...st.players].sort(E.finalRank);
  const winner = ranked[0];
  for (const p of st.players) {
    T.seats++;
    T.loansTaken += p.discsInBank;
    if (p.persona) T.personaPlays[p.persona] = (T.personaPlays[p.persona] || 0) + 1;
    for (const e of p.epLog || []) T.epByBucket[bucketOf(e.label)] += e.amount;
  }
  if (winner.persona) T.personaWins[winner.persona] = (T.personaWins[winner.persona] || 0) + 1;
  T.winnerTotal += E.epTotal(winner);
  T.winnerCompanies += E.activeBiz(winner).length;
  T.winnerPlots += E.plotCount(st, winner);
  T.winnerDistricts += E.districtCount(st, winner);
  for (const e of winner.epLog || []) T.winnerEP[bucketOf(e.label)] += e.amount;
  T.solvency += st.solvencyEvents || 0;
  /* Is going first worth anything? Seat 0 in the opening turn order, and so on. */
  const seatOf = st.turnOrder.indexOf(winner.id);
  if (seatOf >= 0) T.winsBySeat[seatOf] = (T.winsBySeat[seatOf] || 0) + 1;
  T.seatGames++;
  const eps = ranked.map((p) => E.epTotal(p));
  T.spread += eps[0] - eps[eps.length - 1];
  T.gapToSecond += eps[0] - eps[1];
  finals.push({ ep: E.epTotal(winner), cash: st.players.map((p) => Math.round(p.cash)) });
}

/* ---------- report ---------- */
const g = T.games;
const per = (n) => (n / g).toFixed(1);
const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const money = (n) => `$${Math.round(n)}`;

console.log(`Games completed: ${g}\n`);

/* ---- 1. the economy ---- */
console.log("─── THE ECONOMY ───────────────────────────────────────────────────");
const sorted = [...T.cashSamples].sort((a, b) => a - b);
const pct = (q) => sorted[Math.floor((sorted.length - 1) * q)];
console.log(`Cash a seat is holding, sampled at every quarter end (${sorted.length} samples):`);
console.log(`  median ${money(pct(0.5))}   75th ${money(pct(0.75))}   90th ${money(pct(0.9))}   99th ${money(pct(0.99))}   max ${money(T.peakSeat)}`);
console.log(`Most cash one seat ever held:      ${money(T.peakSeat)}`);
console.log(`Most cash on the table at once:    ${money(T.peakTable)}  (all four seats)`);
const totalMoved = IND.reduce((n, i) => n + T.sales[i] + T.pots[i] + T.setup[i] + T.opex[i], 0);
console.log(`Money changing hands per game:     ${money(totalMoved / g)}`);

const pay = [...T.payments].sort((a, b) => a - b);
const ppct = (q) => pay[Math.floor((pay.length - 1) * q)];
console.log(`\nSingle payments (a build, a bill, a pot share, a sale):`);
console.log(`  ${pay.length} of them, median ${money(ppct(0.5))}, 90th ${money(ppct(0.9))}, 99th ${money(ppct(0.99))}, largest ${money(pay[pay.length - 1])}`);
const under10 = pay.filter((x) => x < 10).length;
const under5 = pay.filter((x) => x < 5).length;
console.log(`  ${(100 * under10 / pay.length).toFixed(0)}% are under $10, ${(100 * under5 / pay.length).toFixed(0)}% under $5`);

/* ---- 1b. what the chips have to be able to make ---- */
console.log("\n─── CHIPS ─────────────────────────────────────────────────────────");
console.log(`Rent handed to landlords: ${T.rents} payments, ${T.rentsFractional} of them fractional `
  + `(${(100 * T.rentsFractional / Math.max(1, T.rents)).toFixed(0)}%)`);
const rentRows = Object.entries(T.rentSizes).sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(`  sizes: ${rentRows.map(([k, n]) => `$${k} x${n}`).join("  ")}`);
const shapeRows = Object.entries(T.rentShapes).sort((a, b) => b[1] - a[1]);
console.log(`  company shapes paying it: ${shapeRows.map(([k, n]) => `${k} x${n}`).join("  ")}`);

/* Now the measured part: replay every payment with real chips. "Peak in hand" is
   the most chips of that denomination the four seats ever held at the same time,
   which is the number the box must contain. */
console.log("\nReplaying every payment with chips:");
console.log("  " + pad("ladder", 34) + rp("chips/payment", 15) + rp("unmakeable", 12));
for (const [name, ladder] of Object.entries(LADDERS)) {
  const c = CHIP[name];
  console.log("  " + pad(name, 34) + rp((c.stats.chips / Math.max(1, c.stats.payments)).toFixed(2), 15)
    + rp(c.stats.impossible, 12));
  if (c.stats.impossible) console.log("      " + Object.entries(c.stats.odd).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,n])=>`${k} x${n}`).join("  "));
}
console.log("\nMost chips of each value in players' hands at one time.");
console.log("  Each game has its own peak; here is the 95th-percentile game and the worst seen.");
for (const [name, ladder] of Object.entries(LADDERS)) {
  const C = CHIP[name];
  const asc = [...ladder].sort((a, b) => a - b);
  const at = (d, q) => { const a = [...(C.samples[d] || [0])].sort((x, y) => x - y); return a[Math.floor((a.length - 1) * q)]; };
  const p95 = asc.map((d) => `$${d}x${at(d, 0.95)}`);
  const worst = asc.map((d) => `$${d}x${C.peak[d] || 0}`);
  const w95 = asc.reduce((n, d) => n + d * at(d, 0.95), 0);
  const wMax = asc.reduce((n, d) => n + d * (C.peak[d] || 0), 0);
  console.log(`  ${name}`);
  console.log(`      95th: ${p95.join("  ")}   = $${Math.round(w95)}`);
  console.log(`      worst: ${worst.join("  ")}   = $${Math.round(wMax)}`);
}

/* End-of-game cash is a different animal from mid-game cash: at $10 = 1 EP it is
   inert score, so seats stop spending and sit on it. That hoard is what forces the
   big chips. */
const endCash = finals.flatMap((f) => f.cash).sort((a, b) => a - b);
const ec = (q) => endCash[Math.floor((endCash.length - 1) * q)];
console.log(`\nCash still on the table when the game ends: median ${money(ec(0.5))}, `
  + `90th ${money(ec(0.9))}, max ${money(endCash[endCash.length - 1])}`);
console.log(`  that is ${(endCash.reduce((a, b) => a + b, 0) / endCash.length / 10).toFixed(1)} EP a seat, bought by not spending.`);

/* Size the float: what one seat holds at its peak, and what the whole table holds. */
const seatSorted = sorted;
console.log(`\nA seat's cash: 90th ${money(pct(0.9))}, 99th ${money(pct(0.99))}, ever ${money(T.peakSeat)}.`
  + `  Whole table at once: peak ${money(T.peakTable)}.`);

/* ---- 2. what gets built ---- */
console.log("\n─── WHAT GETS BUILT ───────────────────────────────────────────────");
console.log(pad("industry", 12) + rp("built", 7) + rp("upgraded", 10) + rp("L1", 6) + rp("L2", 6) + rp("L3", 6));
for (const i of IND) {
  const l = [1, 2, 3].map((lv) => T.built[`${i}${lv}`] || 0);
  console.log(pad(i, 12) + rp(per(T.builtByInd[i]), 7) + rp(per(T.upgrades[i]), 10)
    + rp(per(l[0]), 6) + rp(per(l[1]), 6) + rp(per(l[2]), 6));
}
const totalBuilt = IND.reduce((n, i) => n + T.builtByInd[i], 0);
console.log(`${pad("all", 12)}${rp(per(totalBuilt), 7)}${rp(per(IND.reduce((n, i) => n + T.upgrades[i], 0)), 10)}`);

/* ---- 3. industry economics ---- */
console.log("\n─── WHERE THE MONEY IS MADE (per game) ────────────────────────────");
console.log(pad("industry", 12) + rp("sales", 9) + rp("pots", 8) + rp("setup", 8) + rp("opex", 8) + rp("net", 9) + rp("net/co", 8));
const rows = IND.map((i) => {
  const net = T.sales[i] + T.pots[i] - T.setup[i] - T.opex[i];
  return { i, sales: T.sales[i], pots: T.pots[i], setup: T.setup[i], opex: T.opex[i], net,
    perCo: T.builtByInd[i] ? net / T.builtByInd[i] : 0 };
}).sort((a, b) => b.net - a.net);
for (const r of rows) {
  console.log(pad(r.i, 12) + rp(money(r.sales / g), 9) + rp(money(r.pots / g), 8)
    + rp(money(r.setup / g), 8) + rp(money(r.opex / g), 8)
    + rp(money(r.net / g), 9) + rp(money(r.perCo), 8));
}
console.log(`\nRecycled at $1 (production nobody could place): ${IND.map((i) => `${i} ${Math.round(T.recycled[i] / g)}`).join("  ")}`);
console.log(`Hospitality's neighbour bonus moved ${per(T.hoBonus)} units a game with no demand icon needed.`);

/* ---- 4. hubs ---- */
console.log("\n─── LOGISTIC HUBS ─────────────────────────────────────────────────");
const totalSaleEvents = T.hubSales + T.homeSales;
console.log(`Hubs on the board: ${(T.hubsFinal / Math.max(1, T.hubsFinalN)).toFixed(1)} on average at the last quarter, most ever ${T.hubsPlaced}`);
console.log(`Companies that could reach past their own districts: ${T.hubSales} of ${totalSaleEvents} delivery turns (${(100 * T.hubSales / totalSaleEvents).toFixed(0)}%)`);
const unitsAll = T.unitsHome + T.unitsAway;
console.log(`Units actually delivered outside the company's own districts:`);
console.log(`  ${T.unitsAway} of ${unitsAll}  (${(100 * T.unitsAway / Math.max(1, unitsAll)).toFixed(0)}%), worth ${money(T.cashAway / g)} a game`);
console.log(`  sold at home instead: ${T.unitsHome} units, ${money(T.cashHome / g)} a game`);
console.log("\nWhy a unit could be sold where it was sold:");
const whyTotal = Object.values(T.reachWhy).reduce((a, b) => a + b, 0) || 1;
for (const [k, n] of Object.entries(T.reachWhy).sort((a, b) => b[1] - a[1])) {
  console.log("  " + pad(k, 30) + rp(`${(100 * n / whyTotal).toFixed(0)}%`, 6)
    + rp(money((T.reachCash[k] || 0) / g), 8) + " a game");
}
console.log("\nHow far each industry sells (units):");
console.log("  " + pad("industry", 12) + rp("home", 8) + rp("away", 8) + rp("away %", 9));
for (const i of IND) {
  const a = T.awayByInd[i] || { home: 0, away: 0 };
  console.log("  " + pad(i, 12) + rp(a.home, 8) + rp(a.away, 8)
    + rp(`${(100 * a.away / Math.max(1, a.home + a.away)).toFixed(0)}%`, 9));
}

/* ---- 5. megacorps ---- */
console.log("\n─── MEGACORPS ─────────────────────────────────────────────────────");
console.log(`Formed: ${T.megacorps} in all, ${per(T.megacorps)} per game, worth ${(T.megacorpEP / Math.max(1, T.megacorps)).toFixed(1)} EP each on average`);
console.log(`So roughly one seat in ${(4 * g / Math.max(1, T.megacorps)).toFixed(1)} completes one.`);
const megaList = Object.entries(T.megacorpBy).sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log(`Most claimed: ${megaList.map(([n, c]) => `${n} x${c}`).join(", ") || "none"}`);

/* ---- 6. personas ---- */
console.log("\n─── PERSONAS ──────────────────────────────────────────────────────");
console.log(pad("persona", 26) + rp("dealt", 7) + rp("wins", 7) + rp("win rate", 10) + rp("vs 25%", 9));
const pRows = Object.keys(E.PERSONAS).map((k) => {
  const dealt = T.personaPlays[k] || 0;
  const wins = T.personaWins[k] || 0;
  return { k, name: E.PERSONAS[k].name, ind: E.PERSONAS[k].ind, dealt, wins,
    rate: dealt ? wins / dealt : 0 };
}).sort((a, b) => b.rate - a.rate);
for (const r of pRows) {
  const delta = (r.rate - 0.25) * 100;
  console.log(pad(`${r.name} (${r.ind})`, 26) + rp(r.dealt, 7) + rp(r.wins, 7)
    + rp(`${(r.rate * 100).toFixed(1)}%`, 10) + rp(`${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`, 9));
}

/* ---- 7. winners ---- */
console.log("\n─── WHAT WINS ─────────────────────────────────────────────────────");
console.log(`Average winning score: ${(T.winnerTotal / g).toFixed(0)} EP`);
console.log(`A winner finishes with ${per(T.winnerCompanies)} companies, ${per(T.winnerPlots)} plots, in ${per(T.winnerDistricts)} districts.\n`);
const order = ["companies", "land", "industries", "cash", "megacorps", "ipo", "loans", "other"];
console.log(pad("source", 14) + rp("winner", 9) + rp("share", 8) + rp("all seats", 11) + rp("share", 8));
const wTot = order.reduce((n, k) => n + Math.max(0, T.winnerEP[k]), 0);
const aTot = order.reduce((n, k) => n + Math.max(0, T.epByBucket[k]), 0);
for (const k of order) {
  if (!T.winnerEP[k] && !T.epByBucket[k]) continue;
  console.log(pad(k, 14) + rp((T.winnerEP[k] / g).toFixed(1), 9)
    + rp(`${(100 * T.winnerEP[k] / wTot).toFixed(0)}%`, 8)
    + rp((T.epByBucket[k] / T.seats).toFixed(1), 11)
    + rp(`${(100 * T.epByBucket[k] / aTot).toFixed(0)}%`, 8));
}
console.log(`\nA winner beats the last seat by ${per(T.spread)} EP, and second place by ${per(T.gapToSecond)} EP.`);
const seatRow = [0, 1, 2, 3].map((i) => `${i === 0 ? "first" : i === 1 ? "second" : i === 2 ? "third" : "fourth"} ${(100 * (T.winsBySeat[i] || 0) / Math.max(1, T.seatGames)).toFixed(0)}%`).join("   ");
console.log(`Wins by opening turn order:   ${seatRow}`);
console.log(`\nLoans taken and never repaid: ${per(T.loansTaken)} discs a game. Solvency events: ${per(T.solvency)}.`);
