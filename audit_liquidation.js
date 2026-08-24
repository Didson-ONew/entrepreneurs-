/* ============================================================================
   Selling the company on the way out: is the endgame fire-sale a real strategy?

   Cash scores 1 EP per $10 at the end. Selling a company pays half its setup
   cost, or the FULL setup cost if it was ever upgraded. So the question is what
   selling actually costs you, and reading sellCompany() the answer looks like
   very little:

     the EP is already banked. Companies score the moment they are built and
     scoring was made immediate when vesting was dropped, so nothing is clawed
     back when the company goes.

     THE LAND STAYS YOURS. sellCompany() sets distressed = true and touches
     nothing else - board.owner is untouched, so plotCount is unchanged, and
     districtCount still counts the district through the plot you kept.

     the OPEX and the rent stop. Selling actually saves you money.

   Which leaves one quarter of trade as the whole price. If that is worth less
   than the sale, then every player should empty their portfolio in the last
   quarter, and a game about building companies ends with everybody dismantling
   them - the exact opposite of what the last four quarters are supposed to be.

   Two things are counted here.

     ONE. Do the bots already do it? Every sale is tallied by quarter and by the
     reason the bot gave, so "no" can be told apart from "yes, but only under
     duress".

     TWO. Would it work if they did? Each finished game is replayed as a
     what-if: for every seat, what the score would have been had it liquidated
     everything in the final quarter, priced exactly as doSellCompany() prices
     it, less one quarter of that company's net trade. Then the standings are
     re-ranked to see whether it flips games.

   Nothing is patched in the engine. The what-if is arithmetic over finished
   games, which is an UPPER BOUND: a real liquidator needs a worker on Raise
   Capital and gets one action per worker, so it could not dump an entire
   portfolio in one quarter. The bound is the point - if even the bound is
   small, the exploit is not there.

   Run: node audit_liquidation.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "400", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, box };
vm.createContext(sandbox);
vm.runInContext(BASE + `
  box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
    epTotal, finalRank, megacorpHQs, activeBiz, bizSetup, bizProd, bizOpex, bizInd,
    price, plotCount, districtCount, CASH_PER_EP, LAND_AWARD };
`, sandbox);
const E = box.exports;

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);

const SIZES = [2, 3, 4, 5, 6];
const runs = [];

/* What one company would fetch, priced exactly as doSellCompany prices a planned
   sale through Raise Capital: full setup if it was ever upgraded, half otherwise. */
const saleValue = (b) => (b.upgraded ? E.bizSetup(b) : Math.floor(E.bizSetup(b) / 2));

/* What that company would have earned in the quarter you sold it out from under.
   Production sold at the industry's price, less OPEX, less the rent on its
   footprint. This is generous to the company - it assumes every unit finds a
   buyer, which is the best case, so the exploit is being measured against the
   strongest possible reason not to do it. */
const quarterTrade = (st, b) =>
  E.bizProd(b) * E.price(st.pm, E.bizInd(b)) - E.bizOpex(b) - 3 * b.level;

for (const seats of SIZES) {
  const T = {
    seats, games: 0, players: 0,
    sellsByQuarter: {}, sellsLate: 0, sellsTotal: 0,
    gain: 0, gainWinner: 0, bestGain: 0, anyGain: 0,
    flips: 0, wouldWin: 0,
    cashShare: 0, winnerEP: 0,
  };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }

    /* every line the engine logs, so sales can be counted by quarter */
    const sold = [];
    let q = 1;
    E.advancePlanning(st, E.mulberry32(seed + 777), (msg) => {
      const m = /^▶ Year \d+, Quarter (\d+)/.exec(String(msg));
      if (m) { q = parseInt(m[1], 10); return; }
      if (/ sells .* for \$| sells .*: .* has collapsed| cuts loose | sells .* — it sits on land/.test(String(msg))) {
        sold.push({ q, msg: String(msg) });
      }
    });
    if (st.phase !== "gameover") continue;
    T.games++;

    for (const s of sold) {
      T.sellsTotal++;
      T.sellsByQuarter[s.q] = (T.sellsByQuarter[s.q] || 0) + 1;
      if (s.q >= st.quarter - 1) T.sellsLate++;
    }

    const ranked = [...st.players].sort(E.finalRank);
    const winner = ranked[0];
    T.winnerEP += E.epTotal(winner);
    T.cashShare += Math.floor(winner.cash / E.CASH_PER_EP);

    /* the what-if: everybody liquidates in the closing quarter */
    const gainOf = (p) => {
      let cash = 0;
      for (const b of E.activeBiz(p)) cash += saleValue(b) - Math.max(0, quarterTrade(st, b));
      /* EP is banked on the $10 line, and only whole tens pay */
      return Math.floor((p.cash + cash) / E.CASH_PER_EP) - Math.floor(p.cash / E.CASH_PER_EP);
    };
    const gains = st.players.map(gainOf);
    st.players.forEach((p, i) => { T.players++; T.gain += gains[i]; if (gains[i] > 0) T.anyGain++; });
    T.gainWinner += gainOf(winner);
    T.bestGain += Math.max(...gains);

    /* would liquidating have changed who won? Re-rank on EP with the gain added,
       keeping the same tie-breaks the engine uses. */
    const after = st.players.map((p, i) => ({ p, ep: E.epTotal(p) + gains[i] }))
      .sort((a, b) => (b.ep - a.ep) || (b.p.cash - a.p.cash));
    if (after[0].p !== winner) T.flips++;

    /* and could a SINGLE seat have stolen it by liquidating alone? */
    for (let i = 0; i < st.players.length; i++) {
      const p = st.players[i];
      if (p === winner) continue;
      if (E.epTotal(p) + gains[i] > E.epTotal(winner)) { T.wouldWin++; break; }
    }
  }
  runs.push(T);
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - the endgame fire-sale");
console.log(`${SEEDS} games per table size, personas on, rules as they stand.\n`);

const W = 16;
const head = () => console.log(pad("", 38) + runs.map((T) => rp(`${T.seats} players`, W)).join(""));
const row = (name, fn, dp = 1) =>
  console.log(pad(name, 38) + runs.map((T) => rp(fn(T).toFixed(dp), W)).join(""));
const pct = (name, fn) =>
  console.log(pad(name, 38) + runs.map((T) => rp(`${(100 * fn(T)).toFixed(0)}%`, W)).join(""));

console.log("DO THE BOTS ALREADY DO IT?");
head();
console.log("─".repeat(38 + W * runs.length));
row("company sales per game, all causes", (T) => T.sellsTotal / Math.max(1, T.games), 2);
row("  of them in the last two quarters", (T) => T.sellsLate / Math.max(1, T.games), 2);
console.log("");
console.log("Sales by quarter (share of all sales)");
head();
for (let q = 1; q <= 12; q++) {
  if (!runs.some((T) => T.sellsByQuarter[q])) continue;
  console.log(pad(`  Q${q}`, 38) + runs.map((T) =>
    rp(`${(100 * (T.sellsByQuarter[q] || 0) / Math.max(1, T.sellsTotal)).toFixed(0)}%`, W)).join(""));
}

console.log("\n\nWOULD IT WORK IF THEY DID?");
console.log("(upper bound: everything dumped in the closing quarter, one quarter of trade forgone)");
head();
console.log("─".repeat(38 + W * runs.length));
row("EP a seat would gain by liquidating", (T) => T.gain / Math.max(1, T.players), 2);
row("  the best-placed seat's gain", (T) => T.bestGain / Math.max(1, T.games), 2);
row("  the winner's gain", (T) => T.gainWinner / Math.max(1, T.games), 2);
pct("seats that would gain anything", (T) => T.anyGain / Math.max(1, T.players));
console.log("");
pct("games where the winner changes", (T) => T.flips / Math.max(1, T.games));
pct("  a loser could have stolen it alone", (T) => T.wouldWin / Math.max(1, T.games));
console.log("");
row("winner's cash EP, for comparison", (T) => T.cashShare / Math.max(1, T.games), 1);
row("winner's total EP", (T) => T.winnerEP / Math.max(1, T.games), 0);
console.log("");
