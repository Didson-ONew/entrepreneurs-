/* Why do bots stall? Reproduce full games and record, at every M&A action they take,
   which precondition actually blocked them from building. */
const fs = require("fs");
const src = fs.readFileSync("EntrepreneursGame.jsx", "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const vm = require("vm");
const box = {}; const sb = { console, Math, Set, Object, Array, JSON, box };
vm.createContext(sb);
vm.runInContext(src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "") + `box.exports={
  initGame,mulberry32,botChoosePlanningTrack,placeMeeple,consumePlanningTurn,buildResolutionQueue,
  botResolveOneAction,runProduction,runBotRevenue,runB2B,runClosingRest,placeNewLH,finalizeGame,
  activeBiz,bizInd,INDUSTRIES,makeTracks,canLaunchMore,discsFree,safeToSpend,pickLaunchCandidate,eligibleSlotsFor,exchangeRate,bizProd,plotHasLH,
  missingIndustries,plotValue,SCALING,committedOpex,bestMegacorpMatch,megacorpWorthIt,epTotal,
  bizSetup,upgradeBlockedReason,price,plotCount,districtCount,BP_DATA};`, sb);
const E = sb.box.exports;

const reasons = {};
const bump = (k) => (reasons[k] = (reasons[k] || 0) + 1);

function diagnose(st, p) {
  // mirror the bot's own M&A preconditions, in order, and name the first blocker
  if (!p.hand.length) return "hand empty";
  if (!E.canLaunchMore(p)) return "at 5-company cap";
  if (E.discsFree(st, p) <= 0) return "no free discs";
  const affordableRaw = p.hand.filter((bp) => p.cash >= bp.setup);
  if (!affordableRaw.length) return "cannot afford any card in hand";
  const affordableSafe = p.hand.filter((bp) => E.safeToSpend(p, bp.setup, bp.opex));
  if (!affordableSafe.length) return "blocked by OPEX safety buffer";
  const owned = Object.entries(st.board.owner).filter(([k, v]) => v === p.id && !(k in st.board.occupiedBy)).map(([k]) => k);
  const need = Math.min(...affordableSafe.map((bp) => (E.SCALING[bp.ind] === "H" ? bp.lvl : 1)));
  if (owned.length < need) return "no free owned plot to build on";
  return "other (scoring rejected every card)";
}

const stats = {
  games: 0, quarters: 0,
  idleActions: 0, totalActions: 0,
  upgrades: 0, megacorps: 0, megacorpMatchesSeen: 0, megacorpDeclined: 0,
  endCash: [], endEP: [], endBiz: [], endInds: [], endPlots: [], endDistricts: [],
  prod: 0, sellable: 0, bizQ: 0, lh: 0,
  builtBy: {}, endPots: {}, endPrice: {}, heldAtFloor: {}, deckLeft: {},
  humanLikeEP: [],
};

function play(seed) {
  const st = E.initGame(3, seed);
  const rng = E.mulberry32(seed * 31 + 7);
  // all four seats played by bots so we measure bot policy alone
  st.players.forEach((p) => { if (p.isHuman) { p.isHuman = false; p.archetype = "balanced"; } });
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
      for (let i = 0; i < e.actionsRemaining; i++) {
        stats.totalActions++;
        const bizBefore = E.activeBiz(p).length;
        const upgBefore = p.businesses.filter((b) => b.upgraded).length;
        const cashBefore = p.cash;
        const plotsBefore = E.plotCount(st, p);
        if (e.track === "ma") {
          const why = diagnose(st, p);
          E.botResolveOneAction(st, p, e.track, rng, () => {});
          const built = E.activeBiz(p).length > bizBefore;
          const boughtLand = E.plotCount(st, p) > plotsBefore;
          if (!built && !boughtLand) { stats.idleActions++; bump(why); }
        } else {
          if (e.track === "board_meeting") {
            const poolPre = st.megacorpPool.length;
            const m = E.bestMegacorpMatch(E.activeBiz(p), st.megacorpPool);
            if (m) {
              stats.megacorpMatchesSeen++;
              if (!E.megacorpWorthIt(st, p, m)) stats.megacorpDeclined++;
            }
          }
          const poolPre2 = st.megacorpPool.length;
          E.botResolveOneAction(st, p, e.track, rng, () => {});
          if (e.track === "board_meeting" && st.megacorpPool.length < poolPre2) stats.megacorps++;
        }
        if (p.businesses.filter((b) => b.upgraded).length > upgBefore) stats.upgrades++;
      }
    }
    const poolBefore = st.megacorpPool.length;
  E.runProduction(st, () => {});
  for (const pl of st.players) for (const b of E.activeBiz(pl)) {
    const pr = E.bizProd(b);
    stats.prod += pr;
    stats.sellable += Math.min(pr, E.eligibleSlotsFor(st, b).length * E.exchangeRate(st, b));
    stats.bizQ++;
    if (b.footprint.some((pk) => E.plotHasLH(st.board, pk))) stats.lh++;
  }
  E.runBotRevenue(st); E.runB2B(st, () => {});
  stats.megacorps += Math.max(0, poolBefore - st.megacorpPool.length);
    E.placeNewLH(st, rng, () => {}); E.runClosingRest(st, () => {});
    stats.quarters++;
  }
  E.finalizeGame(st);
  E.INDUSTRIES.forEach((i) => {
    stats.endPots[i] = (stats.endPots[i] || 0) + (st.pots ? st.pots[i] : 0);
    stats.endPrice[i] = (stats.endPrice[i] || 0) + E.price(st.pm, i);
    stats.deckLeft[i] = (stats.deckLeft[i] || 0) + (st.decks[i] ? st.decks[i].length : 0);
    st.players.forEach((pl) => E.activeBiz(pl).forEach((b) => {
      if (E.bizInd(b) !== i) return;
      stats.builtBy[i] = (stats.builtBy[i] || 0) + 1;
      if (E.price(st.pm, i) <= 1) stats.heldAtFloor[i] = (stats.heldAtFloor[i] || 0) + 1;
    }));
  });
  st.players.forEach((p) => {
    stats.endCash.push(p.cash);
    stats.endEP.push(p.epBank);
    stats.endBiz.push(E.activeBiz(p).length);
    stats.endInds.push((p.industriesScored || []).length);
    stats.endPlots.push(E.plotCount(st, p));
    stats.endDistricts.push(E.districtCount(st, p));
  });
  stats.games++;
  return st;
}

const N = 40;
for (let g = 0; g < N; g++) play(90000 + g);

const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
const max = (a) => Math.max(...a).toFixed(0);
console.log(`${N} all-bot games\n`);
console.log("PER-PLAYER AT GAME END");
console.log(`  EP            avg ${avg(stats.endEP)}   best ${max(stats.endEP)}`);
console.log(`  cash          avg $${avg(stats.endCash)}  (worth ${(avg(stats.endCash) / 10).toFixed(1)} EP)`);
console.log(`  companies     avg ${avg(stats.endBiz)} of 5`);
console.log(`  industries    avg ${avg(stats.endInds)} of 6   (5 EP each, so ${(6 - avg(stats.endInds)).toFixed(1)} x 5 EP left on the table)`);
console.log(`  plots         avg ${avg(stats.endPlots)}`);
console.log(`  districts     avg ${avg(stats.endDistricts)}`);
console.log(`\nPRODUCTION that can find a demand icon: ${(100*stats.sellable/Math.max(1,stats.prod)).toFixed(0)}%  |  companies touching a hub: ${(100*stats.lh/Math.max(1,stats.bizQ)).toFixed(0)}%`);
console.log(`UPGRADES: ${(stats.upgrades / N).toFixed(2)} per game across all four players`);
console.log(`MEGACORPS: formed ${(stats.megacorps / N).toFixed(2)}/game; a valid match existed ${stats.megacorpMatchesSeen} times, declined as "not worth it" ${stats.megacorpDeclined} times`);
console.log(`\nM&A ACTIONS WASTED: ${stats.idleActions} of ${stats.totalActions} total actions (${(100 * stats.idleActions / stats.totalActions).toFixed(0)}%)`);
console.log("\nPER INDUSTRY (averaged per game)");
console.log("  ind   active biz   held at $1   final price   pot left unclaimed   deck cards left");
E.INDUSTRIES.forEach((i) => {
  console.log(`  ${i}  ${((stats.builtBy[i]||0)/N).toFixed(2).padStart(9)}  ${((stats.heldAtFloor[i]||0)/N).toFixed(2).padStart(11)}  ${((stats.endPrice[i]||0)/N).toFixed(1).padStart(12)}  ${('$'+((stats.endPots[i]||0)/N).toFixed(0)).padStart(18)}  ${((stats.deckLeft[i]||0)/N).toFixed(1).padStart(15)}`);
});
console.log("\nWHY THE BOT COULD NOT BUILD:");
Object.entries(reasons).sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
  console.log(`  ${String(v).padStart(5)}  ${k}`));
