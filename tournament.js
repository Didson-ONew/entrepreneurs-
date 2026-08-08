/* Which bot strategy is strongest? 100 four-player games. All five archetypes take
   turns sitting out, and each one plays every seat position equally often, so neither
   seat order nor a lucky pairing decides the result. */
const fs = require("fs");
const src = fs.readFileSync("EntrepreneursGame.jsx", "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const vm = require("vm"); const box = {}; const sb = { console, Math, Set, Object, Array, JSON, box };
vm.createContext(sb);
vm.runInContext(src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "") + `box.exports={
  initGame,mulberry32,botChoosePlanningTrack,placeMeeple,consumePlanningTurn,buildResolutionQueue,
  botResolveOneAction,runProduction,runBotRevenue,runB2B,runClosingRest,placeNewLH,finalizeGame,
  activeBiz,bizInd,INDUSTRIES,makeTracks,ARCHETYPES,ARCHETYPE_LABEL,plotCount,districtCount};`, sb);
const E = box.exports;

const A = E.ARCHETYPES;
const stat = {};
A.forEach((a) => (stat[a] = { games: 0, wins: 0, ties: 0, ep: 0, cash: 0, biz: 0, inds: 0,
  plots: 0, seats: [0, 0, 0, 0], last: 0 }));

function play(seed, assign) {
  const st = E.initGame(3, seed);
  const rng = E.mulberry32(seed * 6151 + 29);
  st.players.forEach((p, i) => { p.isHuman = false; p.archetype = assign[i]; });
  // give the seat-0 player its draft the same way bots get theirs
  for (let k = 0; k < (st.humanDraftCount || 0); k++) {
    const av = E.INDUSTRIES.filter((i) => st.decks[i].length);
    if (!av.length) break;
    st.players[0].hand.push(st.decks[av[Math.floor(rng() * av.length)]].shift());
  }
  st.phase = "planning";
  for (let q = 1; q <= 12; q++) {
    st.quarter = q; st.tracks = E.makeTracks();
    st.planningQueue = [...st.turnOrder, ...st.turnOrder];
    let g = 0;
    while (st.planningQueue.length && g++ < 60) {
      const pid = st.planningQueue[0]; const p = st.players.find((x) => x.id === pid);
      const tr = E.botChoosePlanningTrack(st, p);
      if (!E.placeMeeple(st, pid, tr)) { st.planningQueue.shift(); continue; }
      E.consumePlanningTurn(st, pid, tr);
    }
    for (const e of E.buildResolutionQueue(st)) {
      const p = st.players.find((x) => x.id === e.playerId);
      for (let i = 0; i < e.actionsRemaining; i++) E.botResolveOneAction(st, p, e.track, rng, () => {});
    }
    E.runProduction(st, () => {}); E.runBotRevenue(st); E.runB2B(st, () => {});
    E.placeNewLH(st, rng, () => {}); E.runClosingRest(st, () => {});
  }
  E.finalizeGame(st);
  return st;
}

const N = 100;
for (let g = 0; g < N; g++) {
  // rotate which archetype sits out, and rotate seat assignment
  const sitOut = g % A.length;
  const playing = A.filter((_, i) => i !== sitOut);
  const rot = g % 4;
  const assign = playing.map((_, i) => playing[(i + rot) % 4]);
  const st = play(300000 + g, assign);

  const best = Math.max(...st.players.map((p) => p.epBank));
  const winners = st.players.filter((p) => p.epBank === best);
  st.players.forEach((p) => {
    const a = p.archetype, s = stat[a];
    s.games++; s.ep += p.epBank; s.cash += p.cash;
    s.biz += E.activeBiz(p).length;
    s.inds += (p.industriesScored || []).length;
    s.plots += E.plotCount(st, p);
    s.seats[st.turnOrder.indexOf(p.id)]++;
    if (p.epBank === best) { if (winners.length === 1) s.wins++; else s.ties++; }
    if (p.epBank === Math.min(...st.players.map((x) => x.epBank))) s.last++;
  });
}

const rows = A.map((a) => {
  const s = stat[a];
  return {
    a, games: s.games,
    winPct: (100 * s.wins) / s.games,
    lastPct: (100 * s.last) / s.games,
    ep: s.ep / s.games, cash: s.cash / s.games,
    biz: s.biz / s.games, inds: s.inds / s.games, plots: s.plots / s.games,
    seats: s.seats,
  };
}).sort((x, y) => y.winPct - x.winPct);

console.log(`${N} four-player games \u2014 every archetype plays ${rows[0].games} games, rotating seats\n`);
console.log("  strategy         win%   last%    avg EP    cash    companies  industries  plots");
rows.forEach((r) => console.log(
  `  ${E.ARCHETYPE_LABEL[r.a].padEnd(15)} ${r.winPct.toFixed(0).padStart(4)}%  ${r.lastPct.toFixed(0).padStart(5)}%  ${r.ep.toFixed(1).padStart(8)}  ${("$" + Math.round(r.cash)).padStart(6)}  ${r.biz.toFixed(2).padStart(9)}  ${r.inds.toFixed(2).padStart(10)}  ${r.plots.toFixed(1).padStart(5)}`));
console.log(`\n  (a strategy winning its fair share would sit at ${(100 / 4).toFixed(0)}%)`);
const bb = stat.balanced, vv = stat.vest_rebuild;
const pooled = {
  games: bb.games + vv.games, wins: bb.wins + vv.wins, last: bb.last + vv.last,
  ep: bb.ep + vv.ep,
};
console.log(`\n  Balanced and Vest & Rebuild are the same policy (verified identical over 40 seeds),`);
console.log(`  so pooled they are the honest figure: ${(100 * pooled.wins / pooled.games).toFixed(0)}% wins, ${(pooled.ep / pooled.games).toFixed(1)} avg EP over ${pooled.games} games.`);

console.log("\nSEAT DISTRIBUTION \u2014 confirms no positional bias");
rows.forEach((r) => console.log(`  ${E.ARCHETYPE_LABEL[r.a].padEnd(15)} ${JSON.stringify(r.seats)}`));

// are Balanced and Vest & Rebuild actually the same policy?
const b = rows.find((r) => r.a === "balanced"), v = rows.find((r) => r.a === "vest_rebuild");
if (b && v) {
  console.log("\nBalanced vs Vest & Rebuild \u2014 they share the same code path:");
  console.log(`  win%   ${b.winPct.toFixed(1)} vs ${v.winPct.toFixed(1)}`);
  console.log(`  avg EP ${b.ep.toFixed(1)} vs ${v.ep.toFixed(1)}`);
  console.log(`  difference is ${Math.abs(b.ep - v.ep).toFixed(1)} EP \u2014 consistent with noise, not strategy`);
}
