/* ============================================================================
   THE DEMAND TABLE IS NOT A FREE PARAMETER.

   Every balance conversation about the six industries eventually reaches the
   demand board, because two of the eight attributes we compare industries on
   live there: DEMAND VOLUME - how many icon-rows of that industry exist across
   the city - and DEMAND SPREAD - how many separate districts hold at least one
   of its rows. Today those two attributes rank the industries identically:

     volume   UT 14.50  RE 14.50  HO 11.25  MA 11.25  HC 6.25  TE 6.25
     spread   UT 10.75  RE 10.75  HO  8.00  MA  8.00  HC 5.25  TE 5.25

   Two of the eight axes voting together is a real problem for the comparison,
   because it double-counts. The obvious fix is to re-pair them: leave the row
   totals alone and scatter the small industries' rows more widely than the big
   ones'. This audit was written to find that arrangement.

   IT DOES NOT EXIST. Not "we could not find it" - it is not reachable.

   The board is 8 district families (R, C, A, I and the four fixed centres),
   each printing a 4x4 demand grid, so each family contributes 4 rows. A family
   that holds an industry contributes its whole weight to that industry's
   spread, and 1 or 2 times its weight to the volume. So spread <= volume, and
   - with the present cap of two rows of one industry per family - volume <= 2 x
   spread. That alone says UT and RE can never fall below 7.25 while HC and TE
   can never rise above 6.25: the ordering cannot be inverted.

   The exhaustive enumeration is far more restrictive than that bound, because
   the family weights are lumpy (R and C weigh 3.75 each, A and I 2.25, the four
   centres 1). Holding all six row totals exactly, and keeping today's family
   shape - 4 rows, three distinct industries, one of them doubled - there are
   only 79 reachable spread vectors in the whole space, and the three bands do
   not touch:

     UT, RE   10.25 .. 12.25        (today 10.75)
     HO, MA    7.50 ..  9.00        (today  8.00)
     HC, TE    4.25 ..  6.25        (today  5.25)

   Loosen the family shape completely - any four rows, still capped at two of
   one industry - and the HC/TE band does not move at all. Across every
   reachable layout, under either shape, there is not ONE in which even a single
   one of HC/TE is wider than a single one of HO/MA. HO/MA can be lifted over
   UT/RE, but only by layouts that make three districts identical and turn two
   of the four unique centres into copies of each other.

   And the most compressed spread that is reachable - UT/RE 10.25, HO/MA 7.50,
   HC/TE 6.25, which narrows the top-to-bottom ratio from 2.05x to 1.64x - costs
   16 of the 32 row slots on the board. Run with --rewrite to see it: R loses
   Utilities entirely, and FC/LM and IA/CC become two pairs of duplicates. Half
   the demand table, and the four landmarks stop being distinct, to buy 0.4x.

   SO THE PAIRING IS STRUCTURAL. Volume and spread rank the industries the same
   way because spread is a weighted sum of the same counts volume is a weighted
   sum of. They are not two attributes that happen to agree; they are one
   attribute read twice.

   WHERE THE ONE REAL LEVER IS. Both numbers are weighted sums of the SUBURB
   POOL - how many of the sixteen suburb tiles belong to each family. Change
   those counts and both move, and unlike the table they can be moved without
   redrawing anything: relabel a tile, keep its four plot positions exactly as
   printed, and the only physical change is which 4x4 grid that tile carries.

     today      R5 C5 A3 I3   volume 2.32x top to bottom, spread 2.05x
     flat       R4 C4 A4 I4   volume 1.86x, spread 1.67x   (2 tiles reprinted)
     over-flat  R3 C3 A5 I5   volume 1.65x, spread 1.37x   (4 tiles reprinted)

   over-flat is the only arrangement found anywhere in this search that makes
   the two axes stop agreeing: it lifts HO/MA's volume above UT/RE's while the
   spread order stays UT/RE > HO/MA > HC/TE. On the eight-axis comparison it
   moves UT from +4 to +3 and RE from +2 to +1.

   AND IT IS WORTH ABOUT A SEVENTH OF THE INDUSTRY GAP. Run
   `audit_industries.js 2000 3 4 --flow --tuned --pool2`. Net cash per dollar of
   setup, over a company's whole life, against the demand-as-a-rate retune:

     3 players   UT 3.34  RE 8.36  HO 4.98  MA 2.45  HC 1.66  TE 1.57   5.32x
       over-flat UT 2.79  RE 7.28  HO 5.21  MA 2.55  HC 1.60  TE 1.68   4.55x
     4 players   UT 3.47  RE 9.19  HO 5.55  MA 2.90  HC 1.86  TE 1.85   4.97x
       over-flat UT 3.20  RE 8.35  HO 5.68  MA 3.03  HC 1.96  TE 1.94   4.30x

   Top to bottom narrows by 14% at both counts, which is real - the same rules on
   a disjoint block of 2000 seeds move Retail by 0.17 and Utilities by 0.35, and
   these are four to six times that. But read WHICH numbers moved. Retail is
   taxed (-1.08 and -0.84) and Utilities with it (-0.55 and -0.27); Healthcare
   and Technology, the two industries the change was meant to help, move by less
   than the noise. The gap closes because the leader comes down, not because the
   floor comes up, and Retail still ends 4.4x clear of the bottom. The cost is
   waste: the share of production recycled at $1 climbs from 33% to 42% for
   Utilities and 19% to 27% for Retail at three players.

   A NOTE ON SAMPLE SIZE, because this nearly went in backwards. At the 200
   games these audits habitually run, none of the above is visible. Three
   disjoint 200-game blocks of the SAME rules put Hospitality's cash per dollar
   at 4.25, 5.93 and 5.43 and the top-to-bottom ratio at 4.79x, 5.57x and 6.24x
   - a wider spread than any arm here produces. A ratio of two extremes inherits
   both tails. Read it at 2000 games with a same-rules control arm, or do not
   read it.

   WHICH LEAVES THE POINT. Two of the eight attributes on the comparison table
   are one attribute read twice, and the one lever that moves it buys a seventh
   of the industry gap by shaving the leader. The dominance is not a demand-board
   problem and cannot be fixed on the demand board.

   Run: node audit_demand_table.js [ignored] [--loose] [--rewrite]
   ========================================================================== */
const fs = require("fs");
const vm = require("vm");

const SRC = fs.readFileSync(require("path").join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
const logic = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* The tripwire. This audit reasons about three tables; if any of them is
   renamed or restructured it must stop rather than reason about nothing. */
for (const needle of ["const DEMAND_ROWS = {", "const SUBURB_POOL = [", "const CENTER_POOL = [", "const TILES = {"])
  if (!logic.includes(needle)) { console.error(`the engine no longer declares \`${needle}\` - re-anchor this audit`); process.exit(2); }

const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, String, box };
vm.createContext(sandbox);
vm.runInContext(logic + `
  box.E = { DEMAND_ROWS, SUBURB_POOL, CENTER_POOL, TILES, INDUSTRIES, districtFamily };
`, sandbox);
const { DEMAND_ROWS, SUBURB_POOL, CENTER_POOL, TILES, INDUSTRIES, districtFamily } = box.E;

const IND = INDUSTRIES.slice();
const FAMS = Object.keys(DEMAND_ROWS);
if (IND.length !== 6) { console.error(`this audit is written for six industries, found ${IND.length}`); process.exit(2); }

/* ---- how much board weight each family carries ----
   The four centres are always in play. Twelve of the sixteen suburb tiles are
   drawn, so a suburb family of n tiles is worth 12n/16 districts. */
const DRAWN_SUBURBS = 12;
function famWeights(pool) {
  const w = {};
  for (const f of CENTER_POOL) w[f] = 1;
  const counts = {};
  for (const t of pool) { const f = districtFamily(t); counts[f] = (counts[f] || 0) + 1; }
  for (const f of Object.keys(counts)) w[f] = DRAWN_SUBURBS * counts[f] / pool.length;
  return w;
}
function volAndSpread(w, rows = DEMAND_ROWS) {
  const vol = {}, spr = {};
  IND.forEach((i) => { vol[i] = 0; spr[i] = 0; });
  for (const f of Object.keys(w)) {
    const seen = new Set();
    for (const i of rows[f]) { vol[i] += w[f]; seen.add(i); }
    seen.forEach((i) => { spr[i] += w[f]; });
  }
  return { vol, spr };
}
const fmt = (o, d = 2) => IND.map((i) => `${i} ${o[i].toFixed(d)}`).join("  ");
const ratio = (o) => { const v = IND.map((i) => o[i]); return (Math.max(...v) / Math.min(...v)).toFixed(2) + "x"; };

const W0 = famWeights(SUBURB_POOL);
const { vol: VOL0, spr: SPR0 } = volAndSpread(W0);
console.log("\nTODAY'S BOARD");
console.log(`  suburb pool   ${SUBURB_POOL.join(" ")}`);
console.log(`  family weight ${Object.keys(W0).map((f) => `${f} ${W0[f].toFixed(2)}`).join("  ")}   (16 districts)`);
console.log(`  demand volume ${fmt(VOL0)}   ${ratio(VOL0)} top to bottom`);
console.log(`  demand spread ${fmt(SPR0)}   ${ratio(SPR0)}`);
const sameOrder = (a, b) => IND.slice().sort((x, y) => b[y] - b[x]).join() === IND.slice().sort((x, y) => a[y] - a[x]).join();
console.log(`  the two axes rank the six industries ${sameOrder(VOL0, SPR0) ? "IDENTICALLY" : "differently"}`);

/* ---- the arithmetic bound ---- */
console.log("\nTHE BOUND, before any search");
console.log("  a family holding an industry adds its weight once to spread and once or");
console.log("  twice to volume, so   volume/2 <= spread <= volume");
for (const i of IND) console.log(`    ${i}   volume ${VOL0[i].toFixed(2).padStart(5)}   spread must lie in ${(VOL0[i] / 2).toFixed(2)} .. ${VOL0[i].toFixed(2)}`);

/* ---- exhaustive: every spread vector reachable while the volumes hold ----
   Integers throughout: weights and totals are multiplied by 4. Meet in the
   middle, because 60^8 layouts is too many to walk. */
const STRICT = !process.argv.includes("--loose");
const ROWS_PER_FAMILY = DEMAND_ROWS[FAMS[0]].length;
const FW = FAMS.map((f) => Math.round(W0[f] * 4));
const TARGET = IND.map((i) => Math.round(VOL0[i] * 4));
const shapeOf = (f) => IND.map((i) => DEMAND_ROWS[f].filter((x) => x === i).length);
const TODAY_SHAPE = FAMS.map(shapeOf);
const DISTINCT_TODAY = new Set(TODAY_SHAPE.map((c) => c.filter((x) => x > 0).length));

const opts = [];
(function gen(i, c) {
  if (i === IND.length) {
    if (c.reduce((a, b) => a + b, 0) !== ROWS_PER_FAMILY) return;
    if (STRICT && !DISTINCT_TODAY.has(c.filter((x) => x > 0).length)) return;
    opts.push(c.slice()); return;
  }
  for (let k = 0; k <= 2; k++) { c[i] = k; gen(i + 1, c); }
  c[i] = 0;
})(0, new Array(IND.length).fill(0));
const O = opts.length;

/* the eight families fall into weight classes; within a class they are
   interchangeable, so enumerate each class unordered. */
const classes = new Map();
FW.forEach((w, k) => { const L = classes.get(w) || []; L.push(k); classes.set(w, L); });
const CLS = [...classes.entries()].sort((a, b) => b[1].length - a[1].length || b[0] - a[0]);
const combos = (n, k, acc = [], start = 0, out = []) => {   // multisets of k options
  if (acc.length === k) { out.push(acc.slice()); return out; }
  for (let i = start; i < n; i++) { acc.push(i); combos(n, k, acc, i, out); acc.pop(); }
  return out;
};
const tally = (idx, w) => {
  const v = new Array(IND.length).fill(0), s = new Array(IND.length).fill(0);
  for (const k of idx) { const c = opts[k]; for (let j = 0; j < IND.length; j++) { v[j] += c[j] * w; if (c[j] > 0) s[j] += w; } }
  return [v, s];
};
const kk = (v) => v.join(",");
/* the largest class goes in the lookup half, the rest are walked */
const [bigW, bigL] = CLS[0];
const Bmap = new Map();
for (const idx of combos(O, bigL.length)) {
  const [v, s] = tally(idx, bigW);
  if (v.some((x, j) => x > TARGET[j])) continue;
  const k = kk(v);
  let m = Bmap.get(k); if (!m) { m = new Map(); Bmap.set(k, m); }
  if (!m.has(kk(s))) m.set(kk(s), { s, idx });
}
const rest = CLS.slice(1);
const found = new Map();
(function walk(ci, vol, spr, pick) {
  if (ci === rest.length) {
    const need = TARGET.map((t, j) => t - vol[j]);
    if (need.some((x) => x < 0)) return;
    const m = Bmap.get(kk(need)); if (!m) return;
    for (const { s, idx } of m.values()) {
      const tot = spr.map((x, j) => x + s[j]);
      const k = kk(tot);
      if (!found.has(k)) found.set(k, { spr: tot, pick: [...pick, { w: bigW, L: bigL, idx }] });
    }
    return;
  }
  const [w, L] = rest[ci];
  for (const idx of combos(O, L.length)) {
    const [v, s] = tally(idx, w);
    const nv = vol.map((x, j) => x + v[j]);
    if (nv.some((x, j) => x > TARGET[j])) continue;
    pick.push({ w, L, idx });
    walk(ci + 1, nv, spr.map((x, j) => x + s[j]), pick);
    pick.pop();
  }
})(0, new Array(IND.length).fill(0), new Array(IND.length).fill(0), []);

const vecs = [...found.values()].map((x) => x.spr);
console.log(`\nEXHAUSTIVE SEARCH  -  ${STRICT ? `today's family shape (${ROWS_PER_FAMILY} rows, ${[...DISTINCT_TODAY].join(" or ")} distinct industries)` : "any family shape, still capped at two rows of one industry"}`);
console.log(`  ${O} legal row-multisets per family; every one of the six volumes held exactly`);
console.log(`  distinct demand-spread vectors reachable in the whole space: ${vecs.length}`);
const show = (v) => IND.map((i, j) => `${i} ${(v[j] / 4).toFixed(2)}`).join("  ");
console.log("\n  the band each industry's spread can reach:");
IND.forEach((i, j) => {
  const lo = Math.min(...vecs.map((v) => v[j])), hi = Math.max(...vecs.map((v) => v[j]));
  console.log(`    ${i}   ${(lo / 4).toFixed(2)} .. ${(hi / 4).toFixed(2)}     today ${SPR0[i].toFixed(2)}   arithmetic bound ${(TARGET[j] / 8).toFixed(2)} .. ${(TARGET[j] / 4).toFixed(2)}`);
});

/* the bands are marginals; ask the ordering questions jointly */
const rank = IND.map((i, j) => [i, j]).sort((a, b) => VOL0[b[0]] - VOL0[a[0]]);
const tiers = [];
for (const [i, j] of rank) {
  const last = tiers[tiers.length - 1];
  if (last && Math.abs(VOL0[last[0][0]] - VOL0[i]) < 1e-9) last.push([i, j]); else tiers.push([[i, j]]);
}
console.log("\n  ORDER, asked jointly over every reachable layout (not band by band):");
for (let a = 0; a < tiers.length - 1; a++) for (let b = a + 1; b < tiers.length; b++) {
  const hi = tiers[a].map((x) => x[1]), lo = tiers[b].map((x) => x[1]);
  const names = (t) => t.map((x) => x[0]).join("/");
  const all$ = vecs.filter((v) => Math.min(...lo.map((j) => v[j])) >= Math.max(...hi.map((j) => v[j])));
  const any$ = vecs.filter((v) => Math.max(...lo.map((j) => v[j])) > Math.min(...hi.map((j) => v[j])));
  console.log(`    ${names(tiers[b])} lifted above ${names(tiers[a])}:  all of them ${all$.length} layouts, even one of them ${any$.length}`);
  if (all$.length) console.log(`        e.g. ${show(all$[0])}`);
}

/* ---- the most compressed spread, and what it costs ---- */
const sym = [...found.values()].filter((x) => tiers.every((t) => t.every(([, j]) => x.spr[j] === x.spr[t[0][1]])));
const TODAY_VEC = IND.map((i) => Math.round(SPR0[i] * 4)).join(",");
console.log(`\n  layouts that keep the three pairs level with each other: ${sym.length}`);
const spreadOf = (v) => Math.max(...v) / Math.min(...v);
sym.sort((a, b) => spreadOf(a.spr) - spreadOf(b.spr));
for (const x of sym)
  console.log(`    ${show(x.spr)}   ${spreadOf(x.spr).toFixed(2)}x${x.spr.join() === TODAY_VEC ? "   <- today" : ""}`);

if (process.argv.includes("--rewrite") && sym.length) {
  const goal = sym[0].spr;
  console.log(`\nWHAT THE MOST COMPRESSED SPREAD COSTS  (${show(goal)})`);
  /* every assignment of the chosen multisets to named families, scored by how
     many of the 32 row slots have to change */
  const need = (c, old) => c.reduce((e, x, j) => e + Math.max(0, old[j] - x), 0);
  const slots = [];
  for (const { w, L, idx } of sym[0].pick) slots.push({ L, idx });
  let best = null;
  (function assign(si, used, acc) {
    if (si === slots.length) {
      let e = 0; for (const [k, oi] of acc) e += need(opts[oi], TODAY_SHAPE[k]);
      if (!best || e < best.e) best = { e, acc: acc.slice() };
      return;
    }
    const { L, idx } = slots[si];
    const perms = [];
    (function p(rem, out) { if (!rem.length) { perms.push(out.slice()); return; }
      rem.forEach((x, n) => { out.push(x); p(rem.filter((_, m) => m !== n), out); out.pop(); }); })(idx, []);
    const seen = new Set();
    for (const pm of perms) {
      const k = pm.join(); if (seen.has(k)) continue; seen.add(k);
      assign(si + 1, used, acc.concat(L.map((famIdx, n) => [famIdx, pm[n]])));
    }
  })(0, null, []);
  const byFam = Object.fromEntries(best.acc);
  console.log(`  fewest row slots that must change: ${best.e} of ${FAMS.length * ROWS_PER_FAMILY}`);
  FAMS.forEach((f, k) => {
    const c = opts[byFam[k]], rows = [];
    IND.forEach((i, j) => { for (let n = 0; n < c[j]; n++) rows.push(i); });
    const was = DEMAND_ROWS[f].slice().sort().join(), now = rows.slice().sort().join();
    console.log(`    ${f.padEnd(3)} ${DEMAND_ROWS[f].join(" ").padEnd(16)} ->  ${rows.join(" ").padEnd(16)}${was === now ? "  (unchanged)" : ""}`);
  });
  const dup = {};
  FAMS.forEach((f, k) => { const key = opts[byFam[k]].join(); (dup[key] = dup[key] || []).push(f); });
  const pairs = Object.values(dup).filter((g) => g.length > 1);
  if (pairs.length) console.log(`  districts that become copies of each other: ${pairs.map((g) => g.join("=")).join(", ")}`);
}

/* ---- the suburb pool: the one lever that moves both ---- */
console.log("\nTHE SUBURB POOL, which is the one lever that moves either number");
const subFams = [...new Set(SUBURB_POOL.map(districtFamily))];
const base = Object.fromEntries(subFams.map((f) => [f, SUBURB_POOL.filter((t) => districtFamily(t) === f).length]));
const CANDS = [["today    ", base], ["flat     ", { R: 4, C: 4, A: 4, I: 4 }], ["over-flat", { R: 3, C: 3, A: 5, I: 5 }]];
for (const [label, counts] of CANDS) {
  if (Object.keys(counts).some((f) => !subFams.includes(f))) { console.log(`\n  ${label}  (not comparable: this board's suburb families are ${subFams.join(" ")})`); continue; }
  const pool = [];
  for (const f of subFams) for (let n = 1; n <= counts[f]; n++) pool.push(f + n);
  if (pool.length !== SUBURB_POOL.length) { console.log(`\n  ${label}  (needs ${pool.length} suburb tiles, the board has ${SUBURB_POOL.length})`); continue; }
  const { vol, spr } = volAndSpread(famWeights(pool));
  console.log(`\n  ${label.trim()}   pool ${subFams.map((f) => `${f}${counts[f]}`).join(" ")}` +
    `${sameOrder(vol, spr) ? "" : "   <- the only one where the two axes stop agreeing"}`);
  console.log(`    volume  ${fmt(vol)}   ${ratio(vol)}`);
  console.log(`    spread  ${fmt(spr)}   ${ratio(spr)}`);
}
console.log("\n  a tile keeps its four plot positions when it changes family, so the only");
console.log("  physical change is which 4x4 demand grid is printed on it:");
for (const [label, counts] of CANDS.slice(1)) {
  const moves = [];
  for (const f of subFams) { const now = base[f], then = counts[f];
    for (let n = then + 1; n <= now; n++) moves.push(f + n); }
  const into = [];
  for (const f of subFams) { const now = base[f], then = counts[f];
    for (let n = now + 1; n <= then; n++) into.push(f + n); }
  console.log(`    ${label}  ${moves.map((m, n) => `${m} -> ${into[n]}`).join(",  ")}   (${moves.length} tiles)`);
}
console.log("");
