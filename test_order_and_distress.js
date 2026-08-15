/* Two things a player reported from a real game.

   1. Delivery must go in TURN ORDER, everybody in one sequence. Demand icons are
      first come first served, so a bot selling before a human who is seated ahead of
      it takes icons that were the human's to take. It used to run every bot first,
      whatever the seating.

   2. Selling under a bill you cannot pay is a FORCED sale at half rates. Selling the
      same Blueprint by choice through Raise Capital pays $4; being forced to sell it
      must not also pay $4, or waiting to be forced is strictly better than planning.

   Run: node test_order_and_distress.js
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
    box.exports = { initGame, BP_DATA, BP_SELL_PRICE, BP_SOLVENCY_PRICE, doSellBP, doSellCompany,
      doSellPlot, doLaunch, doBuyPlot, plotValue, bizSetup, byId, activeBiz, mulberry32,
      advanceDelivery, humanDeliveryQueue, businessCanProduce, autoDeliver, bizProd,
      startDeliveryFor, finishDelivery, skipDelivery, nextDeliveryTarget };
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

/* ============================================================ forced selling */
section("A forced sale pays half what a planned one does");
{
  const st = E.initGame(2, 3, ["You"], undefined, false, undefined);
  const me = E.byId(st, 0);

  for (const lvl of [1, 2, 3]) {
    const bp = E.BP_DATA.find((x) => x.lvl === lvl);
    me.hand = [bp]; me.cash = 0;
    E.doSellBP(st, me, bp, quiet, false);
    const planned = me.cash;

    me.hand = [bp]; me.cash = 0;
    E.doSellBP(st, me, bp, quiet, true);
    const forced = me.cash;

    check(`a level ${lvl} Blueprint: $${planned} by choice, $${forced} when forced`,
      planned === E.BP_SELL_PRICE[lvl] && forced === E.BP_SOLVENCY_PRICE[lvl]
      && forced === Math.floor(planned / 2), `${planned} -> ${forced}`);
  }
  check("which is the $2 / $4 / $6 the rulebook prints",
    E.BP_SOLVENCY_PRICE[1] === 2 && E.BP_SOLVENCY_PRICE[2] === 4 && E.BP_SOLVENCY_PRICE[3] === 6);
}

section("And so do plots and companies");
{
  const st = E.initGame(2, 5, ["You"], undefined, false, undefined);
  const me = E.byId(st, 0);
  const plots = Object.keys(st.board.graph).slice(0, 4);
  plots.forEach((k) => { st.board.owner[k] = me.id; });

  const worth = E.plotValue(st, plots[0]);
  me.cash = 0;
  E.doSellPlot(st, me, plots[0], quiet, true);
  check("a plot fetches half its value when forced", me.cash === Math.floor(worth / 2),
    `worth $${worth}, got $${me.cash}`);

  st.board.owner[plots[1]] = me.id;
  const bp = E.BP_DATA.find((x) => x.ind === "HC" && x.lvl === 1);
  me.hand = [bp]; me.cash = 500;
  E.doLaunch(st, me, bp, E.mulberry32(2), quiet, [plots[1]]);
  const biz = E.activeBiz(me)[0];
  check("a company is standing to sell", !!biz);

  const voluntary = Math.floor(E.bizSetup(biz) / 2);      // not upgraded
  me.cash = 0;
  E.doSellCompany(me, biz, quiet, true);
  check("a company fetches half a voluntary sale when forced",
    me.cash === Math.floor(voluntary / 2), `voluntary $${voluntary}, forced $${me.cash}`);
}

/* ============================================================ delivery order */
section("Delivery follows turn order, bots included");
{
  /* Give everybody something to sell, then walk the delivery order and record who
     was served in what sequence. */
  function tableReadyToDeliver(seed) {
    const st = E.initGame(2, seed, ["Ana", "Bruno"], undefined, false, undefined);
    const spots = Object.keys(st.board.graph);
    let n = 0;
    for (const p of st.players) {
      const plot = spots[n * 3];
      st.board.owner[plot] = p.id;
      const bp = E.BP_DATA.find((x) => x.ind === "HC" && x.lvl === 1);
      p.hand = [bp]; p.cash = 500;
      E.doLaunch(st, p, bp, E.mulberry32(seed + n), quiet, [plot]);
      n++;
    }
    st.deliveryRemaining = {}; st.crossSellRemaining = {}; st.reChoices = {}; st.hoBonusPaid = {};
    st.deliveryOrder = [...st.turnOrder];
    st.deliveryCursor = 0;
    return st;
  }

  const st = tableReadyToDeliver(6);
  const served = [];
  /* Watch who the engine stops for, and note the bots it resolves on the way past. */
  let guard = 0;
  let cursorBefore = 0;
  while (E.advanceDelivery(st, quiet) && guard++ < 20) {
    for (let i = cursorBefore; i < st.deliveryCursor; i++) served.push(st.deliveryOrder[i]);
    served.push(st.awaitingPlayerId);
    cursorBefore = st.deliveryCursor + 1;
    // that human finishes: skip what is left and move on
    let g2 = 0;
    while (E.nextDeliveryTarget(st) && g2++ < 20) {
      E.skipDelivery(st, E.byId(st, st.awaitingPlayerId), st.deliveringBizId, quiet);
      const nxt = E.nextDeliveryTarget(st);
      if (nxt) st.deliveringBizId = nxt.id; else break;
    }
    st.deliveryCursor += 1;
  }
  for (let i = cursorBefore; i < st.deliveryOrder.length; i++) served.push(st.deliveryOrder[i]);

  check("everybody was served exactly once", served.length === st.players.length,
    `${served.length} of ${st.players.length}`);
  check("and in turn order", JSON.stringify(served) === JSON.stringify(st.turnOrder),
    `served ${served.join(",")} vs order ${st.turnOrder.join(",")}`);

  const humanFirst = st.turnOrder.findIndex((id) => E.byId(st, id).isHuman);
  const botsAhead = st.turnOrder.slice(0, humanFirst).filter((id) => !E.byId(st, id).isHuman).length;
  const botsBehind = st.turnOrder.slice(humanFirst + 1).filter((id) => !E.byId(st, id).isHuman).length;
  console.log(`  ..   this table seats ${botsAhead} bot(s) ahead of the first human and ${botsBehind} behind`);
}

section("A human seated first really does sell first");
{
  /* Find a seeded table where a human holds the front of the turn order, and check
     that when the delivery walk begins it stops on them before any bot has sold. */
  let found = null;
  for (let seed = 1; seed <= 80 && !found; seed++) {
    const st = E.initGame(2, seed, ["Ana", "Bruno"], undefined, false, undefined);
    if (E.byId(st, st.turnOrder[0]).isHuman) found = { seed, st };
  }
  check("found a table with a human as first player", !!found, found && `seed ${found.seed}`);
  if (found) {
    const st = found.st;
    const spots = Object.keys(st.board.graph);
    let n = 0;
    for (const p of st.players) {
      const plot = spots[n * 3];
      st.board.owner[plot] = p.id;
      const bp = E.BP_DATA.find((x) => x.ind === "HC" && x.lvl === 1);
      p.hand = [bp]; p.cash = 500;
      E.doLaunch(st, p, bp, E.mulberry32(n + 1), quiet, [plot]);
      n++;
    }
    const cashBefore = st.players.map((p) => p.cash);
    st.deliveryRemaining = {}; st.crossSellRemaining = {}; st.reChoices = {}; st.hoBonusPaid = {};
    st.deliveryOrder = [...st.turnOrder];
    st.deliveryCursor = 0;

    const stillWaiting = E.advanceDelivery(st, quiet);
    check("the walk stops on that human straight away",
      stillWaiting === true && st.awaitingPlayerId === st.turnOrder[0]);
    const botsSold = st.players.some((p, i) => !p.isHuman && p.cash !== cashBefore[i]);
    check("and not one bot has sold anything yet", botsSold === false,
      st.players.map((p, i) => `${p.name}:${p.cash - cashBefore[i]}`).join(" "));
  }
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
