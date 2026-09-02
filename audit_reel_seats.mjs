/* Does a bigger table actually make a fuller city and a livelier chart?

   Same 200 seeds at every table size, scored on the metrics the twelve-quarters
   reel picks its game with. This is where the table in make_instagram.mjs's seed
   search comes from; re-run it after any rules change rather than trusting the
   numbers in that comment.

   Note the arity: initGame's first argument is the number of BOTS, and it adds a
   seat per human name. A table of six is initGame(5, ...) with one name. Passing
   the table size straight through silently plays a game one seat too big - and
   asks for a seven player game at six, which STARTING has no row for.

   Run: node audit_reel_seats.mjs        (about 75 seconds) */
import fs from "fs"; import path from "path"; import vm from "vm";
const SRC = fs.readFileSync("EntrepreneursGame.jsx", "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
const box = {}; const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
vm.createContext(sandbox);
vm.runInContext(SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "") + `
  box.E = { INDUSTRIES }; box.E2 = { initGame, mulberry32, advanceDraft, startPlanning,
  advancePlanning, bizInd, price };`, sandbox);
const E = box.E, E2 = box.E2;

function play(seed, seats) {
  const st = E2.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
  st.players[0].isHuman = false;
  if (st.phase === "drafting") { E2.advanceDraft(st, () => {}); E2.startPlanning(st); }
  const frames = [];
  const snap = (qEnd) => {
    const meta = {};
    for (const p of st.players) for (const b of p.businesses)
      meta[b.id] = { id: b.id, lvl: b.level, hq: !!b.isHQ, sold: !b.isHQ && !!b.distressed };
    const plots = {};
    for (const [pl, id] of Object.entries(st.board.occupiedBy || {})) if (id != null && meta[id]) plots[pl] = meta[id];
    const prices = {}; for (const i of E.INDUSTRIES) prices[i] = E2.price(st.pm, i);
    frames.push({ qEnd, plots, prices });
  };
  E2.advancePlanning(st, E2.mulberry32(seed + 777), (m) => {
    if (/^▶ Year \d+, Quarter \d+/.test(String(m))) snap(st.quarter - 1);
  });
  snap(st.quarter);
  const hq = new Set(), sold = new Set(), built = new Set();
  for (const f of frames) for (const [pl, m] of Object.entries(f.plots)) {
    built.add(pl); if (m.hq) hq.add(pl); if (m.sold) sold.add(pl);
  }
  let dead = 0, deadLate = 0, moves = 0, span = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1], b = frames[i];
    const city = Object.keys(a.plots).length !== Object.keys(b.plots).length
      || Object.keys(b.plots).some((k) => !a.plots[k] || a.plots[k].lvl !== b.plots[k].lvl
        || a.plots[k].hq !== b.plots[k].hq || a.plots[k].sold !== b.plots[k].sold);
    let d = 0; for (const ind of E.INDUSTRIES) d += Math.abs(b.prices[ind] - a.prices[ind]);
    moves += d;
    if (!city && !d) { dead++; if (i >= frames.length - 4) deadLate++; }
  }
  // how wide the price fan opens by the end: max minus min final price
  const fin = E.INDUSTRIES.map((i) => frames[frames.length - 1].prices[i]);
  span = Math.max(...fin) - Math.min(...fin);
  return { built: built.size, hq: hq.size, sold: sold.size, moves, dead, deadLate,
           lastQ: frames[frames.length - 1].qEnd, span };
}

const N = 200;
const avg = (a, k) => (a.reduce((s, x) => s + x[k], 0) / a.length);
console.log("seats   built    HQ   sold  moves  span  lastQ  dead  early-end%   BEST SEED (reel rule)");
for (const seats of [2, 3, 4, 5, 6]) {
  const rows = [];
  for (let s = 1; s <= N; s++) { try { rows.push({ seed: s, ...play(s, seats) }); } catch {} }
  const better = (g, b) => !b || g.deadLate < b.deadLate
    || (g.deadLate === b.deadLate && (g.built > b.built || (g.built === b.built && g.hq > b.hq)));
  let best = null; for (const r of rows) if (better(r, best)) best = r;
  const early = 100 * rows.filter((r) => r.lastQ < 12).length / rows.length;
  console.log(`  ${seats}  ${avg(rows,"built").toFixed(1).padStart(6)} `
    + `${avg(rows,"hq").toFixed(1).padStart(5)} ${avg(rows,"sold").toFixed(1).padStart(6)} `
    + `${avg(rows,"moves").toFixed(1).padStart(6)} ${avg(rows,"span").toFixed(1).padStart(5)} `
    + `${avg(rows,"lastQ").toFixed(1).padStart(6)} ${avg(rows,"dead").toFixed(2).padStart(5)} `
    + `${early.toFixed(1).padStart(9)}%   seed ${best.seed}: ${best.built} built, ${best.hq} HQ, `
    + `${best.sold} sold, ${best.moves} moves, Q${best.lastQ}`);
}
