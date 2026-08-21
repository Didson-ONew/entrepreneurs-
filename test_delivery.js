/* What a company can actually place, and who is owed for it.

   Two routes exist that are not demand icons: Hospitality trades to the businesses and
   hubs around it, and Manufacturing fills another industry's demand inside its own
   footprint. Both come out of the same production, and both have been wrong in a way
   that only shows at a table:

     hoBonusUnits asked plotHasLH of every plot in reach. plotHasLH answers "would a
     company standing HERE be on the network?", which is true of every plot beside a hub
     as well as the hub itself - so one hub was counted once for itself and again for
     each plot around it.

     the cross-sell cap lived only in the demand grid, which stops highlighting cross
     cells once the allowance is spent. The rule held for anyone clicking the grid and
     for nobody reaching the endpoint any other way.

   Run: node test_delivery.js
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadEngine() {
  const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
  const cut = src.indexOf("/* ============================== REACT UI ============================== */");
  const logic = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, BP_DATA, byId, activeBiz, mulberry32, doLaunch, doPlaceLH,
      hoBonusUnits, plotsWithinReach, eligibleSlotsFor, skipDelivery, humanDeliver, bizProd,
      plotIsLH, plotHasLH, orthOf, bizInd, price, unitPrice, claimMegacorp, MEGACORP_TILES,
      slotOpen, deliverToSlot, autoDeliver, SCALING, footprintDistricts };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n${t}`);
const quiet = () => {};

/* A board with hubs on plots, which is the standard rule. */
function table(seed) {
  const st = E.initGame(2, seed, ["You"], undefined, false, undefined);
  if (!st.board.lhOnPlots) throw new Error("this test assumes hubs stand on plots");
  const me = E.byId(st, 0);
  me.cash = 100000;
  return { st, me };
}
/* Stand a company of a given industry and level starting at one plot. Industries that
   scale sideways need a plot per level, so grow the footprint along the road graph. */
function plant(st, p, ind, lvl, plot) {
  const bp = E.BP_DATA.find((x) => x.ind === ind && x.lvl === lvl)
          || E.BP_DATA.filter((x) => x.ind === ind).sort((a, b) => b.lvl - a.lvl)[0];
  const want = E.SCALING[bp.ind] === "H" ? bp.lvl : 1;
  const foot = [plot];
  while (foot.length < want) {
    const next = foot.flatMap((k) => E.orthOf(st.board, k))
      .find((k) => !foot.includes(k) && !(k in st.board.occupiedBy));
    if (!next) break;
    foot.push(next);
  }
  foot.forEach((k) => { st.board.owner[k] = p.id; });
  p.hand = [bp];
  const ok = E.doLaunch(st, p, bp, E.mulberry32(plot.length + lvl), quiet, foot);
  if (!ok) throw new Error(`could not launch ${ind} L${lvl} on ${foot.join(" + ")}`);
  return p.businesses[p.businesses.length - 1];
}

/* ================================================== the count itself */
section("A hub within reach is worth one unit, not one per plot around it");
{
  const { st, me } = table(3);
  const home = Object.keys(st.board.graph).find((k) => E.orthOf(st.board, k).length >= 2 && !(k in st.board.owner));
  const nbrs = E.orthOf(st.board, home).slice(0, 2);
  for (const n of nbrs) { delete st.board.owner[n]; E.doPlaceLH(st, n, null, quiet); }
  check("two hubs are open beside the plot", nbrs.every((n) => E.plotIsLH(st.board, n)));

  const biz = plant(st, me, "HO", 3, home);
  check("a level 3 casino stands there", biz.level === 3, `level ${biz.level}`);

  const bonus = E.hoBonusUnits(st, biz, me);
  const inReach = E.plotsWithinReach(st.board, biz.footprint, biz.level);
  const realHubs = inReach.filter((k) => E.plotIsLH(st.board, k)).length;
  const realBiz = new Set(inReach.map((k) => st.board.occupiedBy[k]).filter((id) => id !== undefined && id !== biz.id));
  check("it counts exactly the hubs and businesses that are there",
    bonus === realHubs + realBiz.size, `${bonus} units for ${realHubs} hub(s) + ${realBiz.size} business(es)`);
  check("which for two hubs and no neighbours is 2, not 5", bonus === 2, `${bonus}`);

  /* The old bug in one line: plots merely NEXT to a hub answer plotHasLH too. */
  const adjacentButEmpty = inReach.filter((k) => !E.plotIsLH(st.board, k) && E.plotHasLH(st.board, k));
  check("plots that merely touch a hub are still in reach, and still not hubs",
    adjacentButEmpty.length > 0 && bonus === 2,
    `${adjacentButEmpty.length} such plot(s) in reach`);
}

section("Reach is measured in plots, and it grows with the level");
{
  const { st, me } = table(5);
  const home = Object.keys(st.board.graph).find((k) => E.orthOf(st.board, k).length >= 2);
  const r1 = E.plotsWithinReach(st.board, [home], 1).length;
  const r2 = E.plotsWithinReach(st.board, [home], 2).length;
  const r3 = E.plotsWithinReach(st.board, [home], 3).length;
  check("one step reaches the orthogonal neighbours", r1 === E.orthOf(st.board, home).length, `${r1}`);
  check("and each further level reaches further", r2 > r1 && r3 > r2, `${r1} / ${r2} / ${r3}`);
  check("the company's own plot is never in its own reach",
    !E.plotsWithinReach(st.board, [home], 3).includes(home));
}

section("A business next door is worth a unit, whoever owns it");
{
  const { st, me } = table(7);
  const rival = st.players[1];
  rival.cash = 100000;
  const home = Object.keys(st.board.graph).find((k) => E.orthOf(st.board, k).length >= 2 && !(k in st.board.owner));
  const next = E.orthOf(st.board, home).find((k) => !(k in st.board.owner));

  const biz = plant(st, me, "HO", 2, home);
  const before = E.hoBonusUnits(st, biz, me);
  plant(st, rival, "RE", 1, next);
  const after = E.hoBonusUnits(st, biz, me);
  check("a rival's shop beside the casino adds exactly one unit", after === before + 1,
    `${before} -> ${after}`);
}

section("A headquarters beside a casino is counted once, not twice");
{
  const { st, me } = table(11);
  const rival = st.players[1];
  rival.cash = 100000;
  const spots = Object.keys(st.board.graph).filter((k) => !(k in st.board.owner));

  /* Three companies for the rival, merged into a Megacorp, next to our casino. */
  const home = spots.find((k) => E.orthOf(st.board, k).length >= 3);
  const around = E.orthOf(st.board, home).filter((k) => !(k in st.board.owner)).slice(0, 3);
  if (around.length < 3) { check("a plot with three free neighbours exists", false); }
  else {
    around.forEach((k, i) => plant(st, rival, "RE", 1, k));
    st.megacorpPool = [E.MEGACORP_TILES.find((t) => t[0] === "Local Syndicate")];
    const merged = E.claimMegacorp(st, rival, quiet);
    const hq = rival.businesses.find((b) => b.isHQ);
    check("the rival has a headquarters beside us", merged === true && !!hq);

    const biz = plant(st, me, "HO", 1, home);
    const bonus = E.hoBonusUnits(st, biz, me);
    /* One step out: the three plots the rival built on. The HQ is a business AND acts as
       a hub for the network - it must still pay for one unit, not two. */
    const inReach = E.plotsWithinReach(st.board, biz.footprint, 1);
    const ids = new Set(inReach.map((k) => st.board.occupiedBy[k]).filter((x) => x !== undefined));
    check("each building beside it is worth one unit, headquarters included",
      bonus === ids.size, `${bonus} units for ${ids.size} building(s)`);
  }
}

/* ================================================== the settlement */
section("Moving on sells to the neighbours before anything is recycled");
{
  const { st, me } = table(3);
  const home = Object.keys(st.board.graph).find((k) => E.orthOf(st.board, k).length >= 2 && !(k in st.board.owner));
  const nbrs = E.orthOf(st.board, home).slice(0, 2);
  for (const n of nbrs) { delete st.board.owner[n]; E.doPlaceLH(st, n, null, quiet); }
  const biz = plant(st, me, "HO", 3, home);

  const prod = E.bizProd(biz);
  const bonus = E.hoBonusUnits(st, biz, me);
  const unit = E.unitPrice(st, me, biz);
  st.deliveryRemaining = { [biz.id]: prod };
  st.crossSellRemaining = { [biz.id]: 0 };
  st.hoBonusPaid = { [biz.id]: 0 };

  const before = me.cash;
  E.skipDelivery(st, me, biz.id, quiet);
  const gained = me.cash - before;
  check("the neighbours are paid at the market price, the rest at $1",
    gained === bonus * unit + (prod - bonus) * 1,
    `$${gained} for ${bonus} at $${unit} + ${prod - bonus} at $1`);
  check("and the game records what the neighbours took", st.hoBonusPaid[biz.id] === bonus,
    `${st.hoBonusPaid[biz.id]}`);
  check("nothing is left owing", (st.deliveryRemaining[biz.id] || 0) === 0);
}

section("Neighbours never take more than the company still has");
{
  const { st, me } = table(3);
  const home = Object.keys(st.board.graph).find((k) => E.orthOf(st.board, k).length >= 2 && !(k in st.board.owner));
  E.orthOf(st.board, home).slice(0, 2).forEach((n) => { delete st.board.owner[n]; E.doPlaceLH(st, n, null, quiet); });
  const biz = plant(st, me, "HO", 3, home);
  st.deliveryRemaining = { [biz.id]: 1 };     // only one unit left after the icons
  st.crossSellRemaining = { [biz.id]: 0 };
  st.hoBonusPaid = { [biz.id]: 0 };
  const before = me.cash;
  E.skipDelivery(st, me, biz.id, quiet);
  check("one unit left means one unit sold, whatever the neighbourhood holds",
    st.hoBonusPaid[biz.id] === 1 && me.cash - before === E.unitPrice(st, me, biz),
    `${st.hoBonusPaid[biz.id]} unit(s), $${me.cash - before}`);
}

/* ================================================== Manufacturing */
section("Manufacturing cross-sells out of its own production, up to its level");
{
  /* Find a table where the plant's own district offers MORE cross slots than its level,
     otherwise the cap is never actually tested. */
  let st = null, me = null, biz = null, cross = [];
  for (let seed = 1; seed <= 80 && cross.length <= 2; seed++) {
    const t = table(seed);
    const home = Object.keys(t.st.board.graph).find((k) => !(k in t.st.board.owner));
    let b;
    try { b = plant(t.st, t.me, "MA", 2, home); } catch (_) { continue; }
    const c = E.eligibleSlotsFor(t.st, b, t.me).filter((s) => s.cross);
    if (c.length > cross.length) { st = t.st; me = t.me; biz = b; cross = c; }
  }
  check("a level 2 plant stands there", !!biz && biz.level === 2, biz && `level ${biz.level}`);
  check("its own district's other industries are offered as cross-sell slots",
    cross.length > 0, `${cross.length} cross slot(s)`);
  check("more slots are open than the plant may use, so the cap is really under test",
    cross.length > biz.level, `${cross.length} slots vs level ${biz.level}`);

  const home = E.footprintDistricts(st.board, biz.footprint);
  check("and every cross-sell slot is inside its own footprint's districts",
    cross.every((s) => home.has(s.tileKey)),
    [...home].join(",") + " vs " + [...new Set(cross.map((s) => s.tileKey))].join(","));

  /* The cap is the company's level, and the endpoint must hold it - not just the grid. */
  st.deliveringBizId = biz.id;
  st.deliveryRemaining = { [biz.id]: E.bizProd(biz) };
  st.crossSellRemaining = { [biz.id]: biz.level };
  st.hoBonusPaid = { [biz.id]: 0 };

  let sold = 0;
  for (const s of cross) {
    if (E.humanDeliver(st, me, s.tileKey, s.rowIdx, s.levelIdx, true, quiet)) sold++;
  }
  check(`only ${biz.level} units may leave the industry, however many slots are open`,
    sold === biz.level, `${sold} of ${cross.length} cross slot(s) accepted`);
  check("and the allowance is spent", (st.crossSellRemaining[biz.id] || 0) === 0);
  check("the units came out of production, they were not conjured",
    (st.deliveryRemaining[biz.id] || 0) === E.bizProd(biz) - sold,
    `${st.deliveryRemaining[biz.id]} left of ${E.bizProd(biz)}`);
}

section("A company can never deliver more than it produced");
{
  const { st, me } = table(19);
  const home = Object.keys(st.board.graph).find((k) => !(k in st.board.owner));
  const biz = plant(st, me, "RE", 1, home);
  st.deliveringBizId = biz.id;
  st.deliveryRemaining = { [biz.id]: 0 };     // everything already delivered
  st.crossSellRemaining = { [biz.id]: 0 };
  st.hoBonusPaid = { [biz.id]: 0 };
  const slots = E.eligibleSlotsFor(st, biz, me);
  const before = me.cash;
  const took = slots.length ? E.humanDeliver(st, me, slots[0].tileKey, slots[0].rowIdx, slots[0].levelIdx, false, quiet) : false;
  check("a company with nothing left delivers nothing", took === false && me.cash === before,
    `$${me.cash - before}`);
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
