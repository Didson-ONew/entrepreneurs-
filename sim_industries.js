/* 100 all-bot games, measuring per industry:
     - how often bots DRAW from that deck
     - how often they BUILD it
     - how long they KEEP it (share surviving a full year, 4 quarters)
     - how much INCOME it generates, split into B2C sales, recycling, and B2B pot share

   Income is attributed by instrumenting the engine source in the sandbox only, so the
   real file is untouched: every cash credit is tagged with the industry that earned it. */
const fs = require("fs");
let src = fs.readFileSync("EntrepreneursGame.jsx", "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
let logic = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");

// --- instrument: tag every cash credit with the industry responsible ---
logic = logic.replace(
  "function doDraw(state, p, industry, log) {",
  "function doDraw(state, p, industry, log) {\n  if (!state.decks[industry] || !state.decks[industry].length || p.hand.length >= 5) {} else METER.draws[industry] = (METER.draws[industry]||0)+1;"
);
// B2C: autoDeliver credits cash per delivery
logic = logic.replace(
  /function autoDeliver\(state, p, biz\) \{/,
  "function autoDeliver(state, p, biz) {\n  const __c0 = p.cash, __ind = bizInd(biz);"
);
// close it by tagging the delta at every return point of autoDeliver
logic = logic.replace(
  /(\n)(function humanDeliveryQueue)/,
  "$1$2"
);
fs.writeFileSync("/tmp/_probe.txt", "");

const vm = require("vm");
const METER = { draws: {}, builds: {}, b2c: {}, recycle: {}, b2b: {}, rent: {}, opex: {},
  rentSelf: {}, rentOut: {}, rentLost: {}, landIncome: 0 };
const box = {};
const sb = { console, Math, Set, Object, Array, JSON, box, METER };
vm.createContext(sb);

// wrap autoDeliver by shadowing after definition: capture cash delta per business
logic += `
const __autoDeliver = autoDeliver;
autoDeliver = function (state, p, biz) {
  const before = p.cash;
  const r = __autoDeliver(state, p, biz);
  const ind = bizInd(biz);
  METER.b2c[ind] = (METER.b2c[ind] || 0) + (p.cash - before);
  return r;
};
const __runProduction = runProduction;
runProduction = function (state, log) {
  /* Rent is 3 x level, split evenly across the footprint and paid to whoever owns each
     plot. Standing on your own land therefore returns that share to you, so the real
     cost of a company is OPEX minus the rent it pays itself. Rent collected from other
     players' companies is separate income that belongs to the landlord, not to any
     industry, so it is tracked on its own line. */
  state.players.forEach((p) => activeBiz(p).forEach((b) => {
    if (!businessCanProduce(state, b)) return;
    const ind = bizInd(b);
    const rentTotal = 3 * b.level;
    const perPlot = b.footprint.length ? rentTotal / b.footprint.length : 0;
    let self = 0, toRivals = 0, toNobody = 0;
    b.footprint.forEach((pk) => {
      const owner = state.board.owner[pk];
      if (owner === undefined) toNobody += perPlot;
      else if (owner === p.id) self += perPlot;
      else toRivals += perPlot;
    });
    METER.opex[ind] = (METER.opex[ind] || 0) + bizOpex(b);
    METER.rentSelf[ind] = (METER.rentSelf[ind] || 0) + self;        // comes straight back
    METER.rentOut[ind] = (METER.rentOut[ind] || 0) + toRivals;      // a real cost
    METER.rentLost[ind] = (METER.rentLost[ind] || 0) + toNobody;    // paid to nobody
    METER.landIncome += toRivals;                                   // the landlord's gain
  }));
  return __runProduction(state, log);
};
const __doLaunchCost = doLaunch;
const __runB2B = runB2B;
runB2B = function (state, log) {
  const before = {};
  state.players.forEach((p) => { before[p.id] = p.cash; });
  const potsBefore = { ...(state.pots || {}) };
  const r = __runB2B(state, log);
  // a pot pays out only to that industry's owners, so the drop equals what it paid
  for (const ind of INDUSTRIES) {
    const paid = (potsBefore[ind] || 0) - ((state.pots || {})[ind] || 0);
    if (paid > 0) METER.b2b[ind] = (METER.b2b[ind] || 0) + paid;
  }
  return r;
};
const __doLaunch = doLaunch;
doLaunch = function (state, p, bp, rng, log, fp) {
  const ok = __doLaunch(state, p, bp, rng, log, fp);
  if (ok) {
    METER.builds[bp.ind] = (METER.builds[bp.ind] || 0) + 1;
    METER.setup = METER.setup || {};
    METER.setup[bp.ind] = (METER.setup[bp.ind] || 0) + bp.setup;
  }
  return ok;
};
// --- the three behaviours in question ---
METER.acts = { sellUnderRival: 0, buildOnRival: 0, renovate: 0, reclaim: 0, sellPlotTotal: 0 };
const __doSellPlot = doSellPlot;
doSellPlot = function (state, p, pk, log, solv) {
  const occupant = state.board.occupiedBy[pk];
  let rival = false;
  if (occupant !== undefined) {
    const owner = state.players.find((pl) => pl.businesses.some((b) => b.id === occupant && !b.distressed));
    if (owner && owner.id !== p.id) rival = true;
  }
  const r = __doSellPlot(state, p, pk, log, solv);
  if (r) { METER.acts.sellPlotTotal++; if (rival) METER.acts.sellUnderRival++; }
  return r;
};
const __doLaunch2 = doLaunch;
doLaunch = function (state, p, bp, rng, log, fp) {
  const before = p.businesses.length;
  const ok = __doLaunch2(state, p, bp, rng, log, fp);
  if (ok && p.businesses.length > before) {
    // bots pass no footprint, so read the one the engine actually chose
    const b = p.businesses[p.businesses.length - 1];
    METER.acts.launches = (METER.acts.launches || 0) + 1;
    if (b.footprint.some((pk) => state.board.owner[pk] !== undefined && state.board.owner[pk] !== p.id))
      METER.acts.buildOnRival++;
  }
  return ok;
};
const __doRenovate = doRenovate;
doRenovate = function (state, p, db, bp, log) {
  const r = __doRenovate(state, p, db, bp, log);
  if (r) METER.acts.renovate++;
  return r;
};
const __doReclaim = doReclaim;
doReclaim = function (state, p, db, log) {
  const r = __doReclaim(state, p, db, log);
  if (r) METER.acts.reclaim++;
  return r;
};
box.exports = { initGame, mulberry32, botChoosePlanningTrack, placeMeeple, consumePlanningTurn,
  buildResolutionQueue, botResolveOneAction, runProduction, runBotRevenue, runB2B, runClosingRest,
  placeNewLH, finalizeGame, activeBiz, bizInd, INDUSTRIES, makeTracks, price, bizProd, bizOpex,
  epTotal, BASE_PRICE, SCALING, doSellPlot, doRenovate, doReclaim, businessCanProduce };
`;
vm.runInContext(logic, sb);
const E = box.exports;

// --- retention: track when each business was built and whether it survived a year ---
const life = { built: {}, survived: {}, lifespan: {} };
E.INDUSTRIES.forEach((i) => { life.built[i] = 0; life.survived[i] = 0; life.lifespan[i] = []; });

const held = new Map();   // biz.id -> {ind, q}

const N = 100;
const endPrice = {}, endActive = {};
E.INDUSTRIES.forEach((i) => { endPrice[i] = 0; endActive[i] = 0; });

for (let g = 0; g < N; g++) {
  const st = E.initGame(3, 500000 + g);
  const rng = E.mulberry32(g * 7919 + 13);
  st.players.forEach((p) => { if (p.isHuman) { p.isHuman = false; p.archetype = "balanced"; } });
  for (let k = 0; k < (st.humanDraftCount || 0); k++) {
    const av = E.INDUSTRIES.filter((i) => st.decks[i].length);
    if (!av.length) break;
    st.players[0].hand.push(st.decks[av[Math.floor(rng() * av.length)]].shift());
  }
  st.phase = "planning";
  held.clear();

  for (let q = 1; q <= 12; q++) {
    st.quarter = q; st.tracks = E.makeTracks();
    st.planningQueue = [...st.turnOrder, ...st.turnOrder];
    let guard = 0;
    while (st.planningQueue.length && guard++ < 60) {
      const pid = st.planningQueue[0]; const p = st.players.find((x) => x.id === pid);
      const tr = E.botChoosePlanningTrack(st, p);
      if (!E.placeMeeple(st, pid, tr)) { st.planningQueue.shift(); continue; }
      E.consumePlanningTurn(st, pid, tr);
    }
    for (const e of E.buildResolutionQueue(st)) {
      const p = st.players.find((x) => x.id === e.playerId);
      for (let i = 0; i < e.actionsRemaining; i++) E.botResolveOneAction(st, p, e.track, rng, () => {});
    }

    // note anything newly built, and anything that has vanished
    const alive = new Set();
    st.players.forEach((p) => E.activeBiz(p).forEach((b) => {
      alive.add(b.id);
      if (!held.has(b.id)) { held.set(b.id, { ind: E.bizInd(b), q }); life.built[E.bizInd(b)]++; }
    }));
    for (const [id, rec] of [...held]) {
      if (!alive.has(id)) {
        life.lifespan[rec.ind].push(q - rec.q);
        held.delete(id);
      }
    }

    E.runProduction(st, () => {});
    E.runBotRevenue(st);
    E.runB2B(st, () => {});
    E.placeNewLH(st, rng, () => {});
    E.runClosingRest(st, () => {});
  }
  // whatever is still standing survived to the end
  for (const [, rec] of held) life.lifespan[rec.ind].push(12 - rec.q);
  E.INDUSTRIES.forEach((i) => { endPrice[i] += E.price(st.pm, i); });
  st.players.forEach((p) => E.activeBiz(p).forEach((b) => { endActive[E.bizInd(b)]++; }));
  E.finalizeGame(st);
}

const per = (v) => (v / N).toFixed(2);
const money = (v) => "$" + Math.round(v / N);
const sum = (o) => E.INDUSTRIES.reduce((a, i) => a + (o[i] || 0), 0);
const pct = (v, t) => t ? ((100 * v) / t).toFixed(0) + "%" : "0%";

console.log(`${N} all-bot games (4 bots each)\n`);

console.log("DRAWN FROM  \u2014 how often bots research each deck");
const dT = sum(METER.draws);
E.INDUSTRIES.map((i) => [i, METER.draws[i] || 0]).sort((a, b) => b[1] - a[1])
  .forEach(([i, v]) => console.log(`  ${i}  ${per(v).padStart(6)}/game   ${pct(v, dT).padStart(5)} of all draws`));

console.log("\nBUILT  \u2014 companies actually launched");
const bT = sum(METER.builds);
E.INDUSTRIES.map((i) => [i, METER.builds[i] || 0]).sort((a, b) => b[1] - a[1])
  .forEach(([i, v]) => console.log(`  ${i}  ${per(v).padStart(6)}/game   ${pct(v, bT).padStart(5)} of all builds`));

console.log("\nKEPT  \u2014 average quarters a company of that type stays on the board");
E.INDUSTRIES.map((i) => {
  const l = life.lifespan[i];
  const avg = l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0;
  const year = l.length ? l.filter((x) => x >= 4).length / l.length : 0;
  return [i, avg, year, l.length];
}).sort((a, b) => b[1] - a[1])
  .forEach(([i, avg, year, n]) => console.log(
    `  ${i}  ${avg.toFixed(1).padStart(5)} quarters   ${(100 * year).toFixed(0).padStart(3)}% survive a full year   (${n} built)`));

console.log("\nINCOME  \u2014 cash earned, per game, across all four bots");
const rows = E.INDUSTRIES.map((i) => {
  const b2c = METER.b2c[i] || 0, b2b = METER.b2b[i] || 0;
  return { i, b2c, b2b, tot: b2c + b2b };
}).sort((a, b) => b.tot - a.tot);
const tT = rows.reduce((a, r) => a + r.tot, 0);
console.log("  ind   B2C sales   B2B pot share      total   share   per company built");
rows.forEach((r) => {
  const builds = METER.builds[r.i] || 1;
  console.log(`  ${r.i}  ${money(r.b2c).padStart(10)}  ${money(r.b2b).padStart(14)}  ${money(r.tot).padStart(9)}  ${pct(r.tot, tT).padStart(6)}   ${("$" + Math.round(r.tot / builds)).padStart(8)}`);
});

console.log("\nNET  \u2014 income minus real running costs (rent paid to yourself comes back)");
const nrows = E.INDUSTRIES.map((i) => {
  const inc = (METER.b2c[i] || 0) + (METER.b2b[i] || 0);
  const opex = METER.opex[i] || 0;
  const self = METER.rentSelf[i] || 0;
  const out = (METER.rentOut[i] || 0) + (METER.rentLost[i] || 0);
  const setup = (METER.setup || {})[i] || 0;
  const realCost = opex + out - self;      // OPEX leaves; your own rent returns
  return { i, inc, opex, self, out, setup, run: inc - realCost, net: inc - realCost - setup,
           builds: METER.builds[i] || 1 };
}).sort((a, b) => b.run - a.run);
console.log("  ind    income     OPEX   rent back   rent out    running profit   after setup");
nrows.forEach((r) => console.log(
  `  ${r.i}  ${money(r.inc).padStart(8)}  ${money(r.opex).padStart(7)}  ${("+" + money(r.self)).padStart(10)}  ${("-" + money(r.out)).padStart(9)}  ${(((r.run/N)>=0?"$":"-$")+Math.abs(Math.round(r.run/N))).padStart(16)}  ${(((r.net/N)>=0?"$":"-$")+Math.abs(Math.round(r.net/N))).padStart(12)}`));
console.log(`\n  Rent collected from other players' companies: ${money(METER.landIncome)}/game across the table`);
console.log("  (that is landlord income, not industry income \u2014 it is why owning land under a rival pays)");

console.log("\nCOMPETITIVE PLAYS (per game)");
console.log(`  plots sold from under a rival's business : ${(METER.acts.sellUnderRival/N).toFixed(2)}  (of ${(METER.acts.sellPlotTotal/N).toFixed(2)} plot sales)`);
console.log(`  companies built on a rival's land        : ${(METER.acts.buildOnRival/N).toFixed(2)}  (of ${((METER.acts.launches||0)/N).toFixed(2)} launches)`);
console.log(`  distressed structures renovated          : ${(METER.acts.renovate/N).toFixed(2)}`);
console.log(`  distressed companies bought back as-is   : ${(METER.acts.reclaim/N).toFixed(2)}`);

console.log("\nCONTEXT");
console.log("  ind   avg final price   still active at game end");
E.INDUSTRIES.forEach((i) => console.log(
  `  ${i}   ${("$" + (endPrice[i] / N).toFixed(1)).padStart(13)}   ${per(endActive[i]).padStart(22)}`));
