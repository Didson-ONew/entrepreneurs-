/* What a plot will and will not take.

   Three separate questions that used to be asked in several places, with the board's
   own picker keeping a copy that had drifted - it offered ground the engine would
   refuse, and marked hub plots as free land.

     a hub's plot   never for sale, never built on, never takes a second hub
     an HQ's plot   IS for sale, but nothing may be launched on it and no hub placed
     owned land     may be built on, but a new hub may not be dropped onto it

   Run: node test_plots.js
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
    box.exports = { initGame, BP_DATA, byId, activeBiz, mulberry32, doLaunch, doBuyPlot,
      doPlaceLH, lhPlotOptions, plotFree, plotBuildable, plotBuyable, lhPlaceable,
      plotIsLH, orthOf, claimMegacorp, MEGACORP_TILES, plotValue, placeNewLH };
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

/* A game with hubs on plots, which is the standard rule. */
function game(seed) {
  const st = E.initGame(2, seed, ["You"], undefined, false, undefined);
  if (!st.board.lhOnPlots) throw new Error("this test assumes hubs stand on plots");
  return st;
}

/* ================================================================ a hub's plot */
section("A hub's plot is the hub now");
{
  const st = game(3);
  const me = E.byId(st, 0);
  const plot = Object.keys(st.board.graph).find((k) => E.orthOf(st.board, k).length > 0);
  check("the plot starts out free, unowned and buyable",
    E.plotFree(st.board, plot) && E.plotBuyable(st.board, plot) && E.lhPlaceable(st.board, plot));

  const placed = E.doPlaceLH(st, plot, null, quiet);
  check("a hub opens there", placed === true && E.plotIsLH(st.board, plot) === true);

  check("it is no longer free ground", E.plotFree(st.board, plot) === false);
  check("it is not for sale", E.plotBuyable(st.board, plot) === false);
  check("nothing may be launched on it", E.plotBuildable(st.board, plot) === false);
  check("and no second hub may open there", E.lhPlaceable(st.board, plot) === false);

  me.cash = 500;
  check("buying it is refused outright", E.doBuyPlot(st, me, plot, quiet) === false);
  check("so the plot still has no owner", !(plot in st.board.owner));
  check("placing another hub there is refused", E.doPlaceLH(st, plot, null, quiet) === false);
  check("and the hub list did not grow", st.board.lhPlots.length === 1, `${st.board.lhPlots.length}`);
}

/* ============================================================== owned land */
section("A new hub cannot be dropped onto land somebody paid for");
{
  const st = game(5);
  const me = E.byId(st, 0);
  const plot = Object.keys(st.board.graph).find((k) => E.orthOf(st.board, k).length > 0);
  me.cash = 500;
  check("the plot is bought", E.doBuyPlot(st, me, plot, quiet) === true);

  check("it is still empty ground", E.plotFree(st.board, plot) === true);
  check("and may be built on", E.plotBuildable(st.board, plot) === true);
  check("but no hub may open there", E.lhPlaceable(st.board, plot) === false);
  check("it is not for sale either - somebody owns it", E.plotBuyable(st.board, plot) === false);

  check("placing a hub on it is refused", E.doPlaceLH(st, plot, null, quiet) === false);
  check("and the options the game offers leave it out",
    E.lhPlotOptions(st).includes(plot) === false);
}

section("The quarterly hub only ever lands on unowned, empty ground");
{
  const st = game(7);
  /* Buy up a good part of the board, then open hubs for the rest of the game and check
     every one of them landed somewhere legal. */
  const me = E.byId(st, 0);
  me.cash = 100000;
  const all = Object.keys(st.board.graph);
  all.slice(0, 30).forEach((k) => { st.board.owner[k] = me.id; });

  let placed = 0, illegal = 0;
  for (let i = 0; i < 12; i++) {
    const before = st.board.lhPlots.length;
    E.placeNewLH(st, E.mulberry32(100 + i), quiet);
    if (st.board.lhPlots.length === before) continue;
    placed++;
    const plot = st.board.lhPlots[st.board.lhPlots.length - 1];
    if (plot in st.board.owner) illegal++;
  }
  check(`${placed} hubs opened over the game`, placed > 0, `${placed}`);
  check("not one of them landed on owned land", illegal === 0, `${illegal} did`);
}

/* ========================================================= a headquarters' plot */
section("A headquarters holds its ground, but the ground is still for sale");
{
  const st = game(11);
  const me = E.byId(st, 0);
  const rival = st.players[1];
  const spots = Object.keys(st.board.graph);

  /* Stand three level-1 companies up and merge them, so one becomes a headquarters. */
  const bp = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 1);
  const used = [];
  me.cash = 100000;
  for (let i = 0; i < 3; i++) {
    const plot = spots.find((k) => !used.includes(k) && !(k in st.board.owner));
    st.board.owner[plot] = me.id;
    used.push(plot);
    me.hand = [bp];
    E.doLaunch(st, me, bp, E.mulberry32(i + 1), quiet, [plot]);
  }
  check("three companies are standing", E.activeBiz(me).length === 3, `${E.activeBiz(me).length}`);

  st.megacorpPool = [E.MEGACORP_TILES.find((t) => t[0] === "Local Syndicate")];
  const merged = E.claimMegacorp(st, me, quiet);
  check("they merge into a Megacorp", merged === true);
  const hq = me.businesses.find((b) => b.isHQ);
  check("one of them is the headquarters", !!hq);

  const hqPlot = hq.footprint[0];
  check("its plot is not free ground", E.plotFree(st.board, hqPlot) === false);
  check("nothing may be launched on it", E.plotBuildable(st.board, hqPlot) === false);
  check("and no hub may open there", E.lhPlaceable(st.board, hqPlot) === false);
  check("the hub options leave it out", E.lhPlotOptions(st).includes(hqPlot) === false);
  check("placing a hub on it is refused", E.doPlaceLH(st, hqPlot, null, quiet) === false);

  /* Selling the ground out from under a headquarters is a real move, so once it is
     sold the plot has to be buyable again - by anybody. */
  delete st.board.owner[hqPlot];
  check("with the ground sold, it IS for sale", E.plotBuyable(st.board, hqPlot) === true);
  rival.cash = 500;
  check("and a rival can buy it", E.doBuyPlot(st, rival, hqPlot, quiet) === true,
    `owner is now ${st.board.owner[hqPlot]}`);
  check("the building is still standing on it", E.plotFree(st.board, hqPlot) === false);
  check("so still nothing may be launched there", E.plotBuildable(st.board, hqPlot) === false);
}

/* ============================================== a distressed shell is still a building */
section("A distressed shell is in the way too");
{
  const st = game(13);
  const me = E.byId(st, 0);
  const plot = Object.keys(st.board.graph)[0];
  st.board.owner[plot] = me.id;
  const bp = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 1);
  me.hand = [bp]; me.cash = 500;
  E.doLaunch(st, me, bp, E.mulberry32(1), quiet, [plot]);
  const biz = E.activeBiz(me)[0];
  biz.distressed = true;
  check("a shell nobody runs is still not free ground", E.plotFree(st.board, plot) === false);
  check("nothing may be launched over it", E.plotBuildable(st.board, plot) === false);
  check("and no hub may open on it", E.lhPlaceable(st.board, plot) === false);
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
