/* ============================================================================
   THE TRIAL RULES AGAINST THE BOOK THEY SIT ON, ON THE SAME SEEDS.

   Three rules came in with the playtest sheet of 23 November 2026 and the cards
   printed for it, and the engine plays them unless "Bills and revenue as printed
   in v23" puts the book's own back:

     trial     as it ships: every supplier is paid $5/$10/$20/$40 by the company's
               level; a company collects the best tier it fully meets, icons AND
               price; a floor on somebody else's plot owes $1 for every full $5
               the plot is worth
     printed   the rulebook's three rules: the OPEX on the card split among its
               suppliers, the market price times the band, $2 of rent a level

   WHAT IS MEASURED, per arm and table size, over the same seeds:
     the game      quarters played, the winning score and what it is made of
     the money     cash a player is holding when the game ends - the table's own
                   complaint was idle cash - and what a game moves in bills,
                   trade, rent and pot shares
     the company   for each level: what a company-quarter earns in trade, pays its
                   suppliers, pays in rent and draws from its pot, and what is left.
                   This is the sheet's first question - did anyone reach Level 3 or
                   4, and was its bill worth paying?
     the tiers     the share of company-quarters paid in each tier or band
     the rent      what a floor on a rival's plot actually pays, which is the
                   sheet's third question in numbers

   WHAT THIS IS NOT. The bots were tuned on the printed economy. They read the
   trial numbers through the same sums - what a card earns less what it costs -
   but nobody has re-tuned how much of a reserve they keep or how they weigh a
   level 3. A difference here is what the rules do to those bots, which is a
   lower bound on what they do to people who adapt. It is one input, not the
   verdict.

   Run: node audit_trial.js [games=300] [seats=3,4]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2], 10) || 300;
const SEATS = (process.argv[3] || "3,4").split(",").map((x) => parseInt(x, 10)).filter(Boolean);
const SEED0 = 52000;

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
let logic = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* Every probe is spliced onto an exact line, and a line that has moved stops the audit
   rather than letting it measure something else. */
function hook(from, to, what) {
  if (logic.split(from).length !== 2) { console.error(`the engine changed shape around ${what} - update this probe`); process.exit(2); }
  logic = logic.replace(from, to);
}
hook("      p.cash -= cost;",
  "      __t.bill(b.level, supplierBill, rentBill, b.footprint.reduce((n, k) => n + (board.owner[k] !== undefined && board.owner[k] !== p.id ? levelsOn(b, k) : 0), 0));\n      p.cash -= cost;",
  "the bill at Closing");
hook("      p.cash += r.revenue;",
  "      __t.rev(b.level, r.band, r.revenue);\n      p.cash += r.revenue;",
  "revenue at Closing");
hook("    recipients.forEach((r) => { r.p.cash += share; });",
  "    recipients.forEach((r) => { r.p.cash += share; __t.pot(r.b.isHQ ? 0 : r.b.level, share); });",
  "the pot shares");

const T = { cur: null,
  bill(level, sup, rent, floors) { const c = T.cur; if (!c) return; const L = c.lv[level]; L.q++; L.sup += sup; L.rent += rent; c.rentFloors += floors; c.rentPaid += rent; },
  rev(level, band, revenue) { const c = T.cur; if (!c) return; const L = c.lv[level]; L.rev += revenue; L.band[band]++; },
  pot(level, share) { const c = T.cur; if (!c) return; if (level) c.lv[level].pot += share; else c.hqPot += share; },
};
const box = {};
const sandbox = { console, Math, Set, Map, Object, Array, JSON, String, Number, box, __t: T };
vm.createContext(sandbox);
vm.runInContext(logic + `
  box.E = { initGame, advanceDraft, startPlanning, advancePlanning, mulberry32, epTotal, activeBiz, megacorpHQs, finalQuarterOf, INDUSTRIES };
`, sandbox);
const E = box.E;

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const pct = (n, d) => (d ? (100 * n) / d : 0);
const f1 = (x) => x.toFixed(1), f0 = (x) => x.toFixed(0);
const rp = (s, w) => String(s).padStart(w), pad = (s, w) => String(s).padEnd(w);
const labelKey = (e) => String(e.label && e.label.k !== undefined ? e.label.k : e.label);
const epFrom = (p, re) => (p.epLog || []).filter((e) => re.test(labelKey(e))).reduce((s, e) => s + e.amount, 0);

function blank() {
  const lv = {};
  for (let l = 1; l <= 4; l++) lv[l] = { q: 0, rev: 0, sup: 0, rent: 0, pot: 0, band: [0, 0, 0] };
  return { lv, hqPot: 0, rentFloors: 0, rentPaid: 0 };
}
function play(seats, seed, variants) {
  const G = blank();
  T.cur = G;
  let st;
  try {
    st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, variants);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
  } catch (e) { T.cur = null; return null; }
  T.cur = null;
  return st && st.phase === "gameover" ? { st, G } : null;
}

function measure(seats, variants) {
  const o = { games: 0, quarters: [], winEP: [], allEP: [], spread: [], cashAll: [], cashWinner: [], biz: [], top: { 3: 0, 4: 0 },
    mix: { company: [], debut: [], land: [], mega: [], cash: [], loans: [] }, loans: [], solvency: [], potsLeft: [],
    lv: blank().lv, hqPot: 0, rentFloors: 0, rentPaid: 0 };
  for (let i = 0; o.games < GAMES && i < GAMES * 3; i++) {
    const r = play(seats, SEED0 + i, variants);
    if (!r) continue;
    const { st, G } = r;
    o.games++;
    o.quarters.push(st.quarter);
    const eps = st.players.map((p) => E.epTotal(p));
    const order = st.players.map((p, k) => [k, eps[k]]).sort((a, b) => b[1] - a[1]);
    const winner = st.players[order[0][0]], finalEP = order[0][1];
    o.winEP.push(finalEP); eps.forEach((e) => o.allEP.push(e));
    o.spread.push(finalEP - order[order.length - 1][1]);
    st.players.forEach((p) => o.cashAll.push(p.cash));
    o.cashWinner.push(winner.cash);
    o.biz.push(mean(st.players.map((p) => E.activeBiz(p).length + E.megacorpHQs(p).length)));
    o.loans.push(mean(st.players.map((p) => p.discsInBank || 0)));
    o.solvency.push(st.solvencyEvents || 0);
    o.potsLeft.push(E.INDUSTRIES.reduce((s, k) => s + (st.pots[k] || 0), 0));
    if (finalEP > 0) {
      o.mix.company.push(pct(epFrom(winner, /^Company: /), finalEP));
      o.mix.debut.push(pct(epFrom(winner, /^Entered /), finalEP));
      o.mix.land.push(pct(epFrom(winner, /^The Real-Estate Mogul$|^The Omnipresent$/), finalEP));
      o.mix.mega.push(pct(epFrom(winner, /^Megacorp/), finalEP));
      o.mix.cash.push(pct(epFrom(winner, /^Cash on hand/), finalEP));
      o.mix.loans.push(pct(epFrom(winner, /^Unpaid loans/), finalEP));
    }
    for (let l = 1; l <= 4; l++) {
      const a = o.lv[l], b = G.lv[l];
      a.q += b.q; a.rev += b.rev; a.sup += b.sup; a.rent += b.rent; a.pot += b.pot;
      b.band.forEach((v, k) => { a.band[k] += v; });
      if (l >= 3 && b.q > 0) o.top[l]++;
    }
    o.hqPot += G.hqPot; o.rentFloors += G.rentFloors; o.rentPaid += G.rentPaid;
  }
  return o;
}

const ARMS = [["trial", undefined], ["printed", { printedV23: true }]];
console.log(`\n${GAMES} games an arm and table size, same seeds.  arms: ${ARMS.map((a) => a[0]).join(", ")}.`);
for (const seats of SEATS) {
  const R = ARMS.map(([name, v]) => [name, measure(seats, v)]);
  console.log(`\n${"=".repeat(96)}\n${seats} PLAYERS\n${"=".repeat(96)}`);
  const row = (label, fn) => console.log("  " + pad(label, 44) + R.map(([, o]) => rp(fn(o), 16)).join(""));
  console.log("  " + pad("", 44) + R.map(([n]) => rp(n, 16)).join(""));
  row("games played to the end", (o) => o.games);
  row("quarters played", (o) => f1(mean(o.quarters)));
  console.log("\n  THE SCORE");
  row("winning score, EP", (o) => f1(mean(o.winEP)));
  row("average score, EP", (o) => f1(mean(o.allEP)));
  row("first to last, EP", (o) => f1(mean(o.spread)));
  row("  of the winner: company levels", (o) => f0(mean(o.mix.company)) + "%");
  row("  of the winner: entering industries", (o) => f0(mean(o.mix.debut)) + "%");
  row("  of the winner: land awards", (o) => f0(mean(o.mix.land)) + "%");
  row("  of the winner: Megacorps", (o) => f0(mean(o.mix.mega)) + "%");
  row("  of the winner: cash on hand", (o) => f0(mean(o.mix.cash)) + "%");
  console.log("\n  THE MONEY LEFT ON THE TABLE");
  row("cash a player holds at the end, mean", (o) => "$" + f0(mean(o.cashAll)));
  row("cash a player holds at the end, median", (o) => "$" + f0(median(o.cashAll)));
  row("cash the winner holds at the end", (o) => "$" + f0(mean(o.cashWinner)));
  row("players ending with $100 or more", (o) => f0(pct(o.cashAll.filter((c) => c >= 100).length, o.cashAll.length)) + "%");
  row("left in the pots, unclaimed", (o) => "$" + f0(mean(o.potsLeft)));
  row("loan discs unpaid, a player", (o) => mean(o.loans).toFixed(2));
  row("solvency events, a game", (o) => mean(o.solvency).toFixed(2));
  console.log("\n  THE COMPANIES");
  row("companies standing at the end, a player", (o) => f1(mean(o.biz)));
  row("games in which a Level 3 traded", (o) => f0(pct(o.top[3], o.games)) + "%");
  row("games in which a Level 4 traded", (o) => f0(pct(o.top[4], o.games)) + "%");
  for (let l = 1; l <= 4; l++) {
    console.log(`\n  A LEVEL ${l} COMPANY, ONE QUARTER`);
    row("  share of all company-quarters", (o) => f0(pct(o.lv[l].q, [1, 2, 3, 4].reduce((s, k) => s + o.lv[k].q, 0))) + "%");
    row("  earns in trade", (o) => (o.lv[l].q ? "$" + f1(o.lv[l].rev / o.lv[l].q) : "-"));
    row("  pays its suppliers", (o) => (o.lv[l].q ? "$" + f1(o.lv[l].sup / o.lv[l].q) : "-"));
    row("  pays in rent", (o) => (o.lv[l].q ? "$" + f1(o.lv[l].rent / o.lv[l].q) : "-"));
    row("  draws from its pot", (o) => (o.lv[l].q ? "$" + f1(o.lv[l].pot / o.lv[l].q) : "-"));
    row("  left", (o) => (o.lv[l].q ? "$" + f1((o.lv[l].rev + o.lv[l].pot - o.lv[l].sup - o.lv[l].rent) / o.lv[l].q) : "-"));
    row("  paid Minimum / middle / top", (o) => { const b = o.lv[l].band, n = b[0] + b[1] + b[2]; return n ? b.map((v) => f0(pct(v, n))).join("/") + "%" : "-"; });
  }
  console.log("\n  RENT");
  row("rent paid, a game", (o) => "$" + f0(o.rentPaid / o.games));
  row("a floor on a rival's plot pays", (o) => (o.rentFloors ? "$" + (o.rentPaid / o.rentFloors).toFixed(2) : "-"));
}
console.log("");
