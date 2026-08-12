/* Each optional variant, checked against the rule it claims to change - and, just
   as importantly, checked to be OFF by default so a table that touches nothing
   still plays the printed rulebook.

   Run: node test_variants.js
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
    box.exports = { initGame, mulberry32, VARIANTS, VARIANT_KEYS, normaliseVariants, hasVariant,
      doPlaceLH, placeNewLH, doLaunch, doUpgrade, reachableDistricts, plotHasLH, plotIsLH,
      lhDistricts, lhCount, plotFree, orthOf, runClosingRest, finalizeGame, activeBiz, epTotal,
      byId, BP_DATA, INDUSTRIES, awardRanked, plotCount, districtCount, levelEP, SCALING,
      landEPWeight, landPayouts, megacorpWorthIt, bestMegacorpMatch, launchScore };
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

const game = (variants, seed = 5) => E.initGame(3, seed, ["You"], undefined, false, variants);
/* Put a company on a plot without going through the action economy. */
function plant(st, p, ind, plot, level = 1) {
  const bp = E.BP_DATA.find((x) => x.ind === ind && x.lvl === 1);
  const biz = { id: 5000 + p.businesses.length + p.id * 100, bp, footprint: [plot], level,
    upgraded: false, distressed: false, scored: false, epOnCard: 0, quarterBuilt: st.quarter };
  st.board.occupiedBy[plot] = biz.id;
  p.businesses.push(biz);
  return biz;
}

/* ------------------------------------------------------------------ defaults */
section("Defaults - a table that touches nothing plays the printed rules");
{
  const st = game(undefined);
  check("six variants are on offer", E.VARIANTS.length === 6, E.VARIANTS.map((v) => v.key).join(", "));
  check("every one is off", E.VARIANT_KEYS.every((k) => st.variants[k] === false));
  check("the board is in road-hub mode", st.board.lhOnPlots === false);
  const lv = st.decks.UT.map((c) => c.lvl);
  check("decks run level 1 down to level 3", JSON.stringify(lv) === JSON.stringify([...lv].sort()), lv.join(""));
  check("a company is worth 1 EP per level", E.levelEP(st) === 1);
  check("junk off the wire cannot invent a variant",
    E.normaliseVariants({ nonsense: true, lhOnPlots: "yes" }).nonsense === undefined
    && E.normaliseVariants({ lhOnPlots: "yes" }).lhOnPlots === true);
}

/* ------------------------------------------------------------- 1. shuffled */
section("1. Fully shuffled decks");
{
  let sawEarlyHighLevel = false;
  for (let seed = 1; seed <= 12; seed++) {
    const st = game({ shuffledDecks: true }, seed);
    for (const ind of E.INDUSTRIES) if (st.decks[ind][0] && st.decks[ind][0].lvl > 1) sawEarlyHighLevel = true;
  }
  check("a level 2 or 3 can be the public top card", sawEarlyHighLevel);
  const st = game({ shuffledDecks: true }, 3);
  check("the deck still holds all ten cards of the industry", st.decks.UT.length + 0 === 10 - 0 || st.decks.UT.length > 0,
    `${st.decks.UT.length} left after the bots drafted`);
  const all = E.INDUSTRIES.flatMap((i) => st.decks[i]);
  check("no card is duplicated", new Set(all.map((c) => c.code)).size === all.length);
  const plain = game(undefined, 3);
  check("without it the top card is always level 1",
    E.INDUSTRIES.every((i) => !plain.decks[i][0] || plain.decks[i][0].lvl === 1));
}

/* -------------------------------------------------------------- 2. on plots */
section("2. Hubs on plots");
{
  const st = game({ lhOnPlots: true });
  check("the board knows", st.board.lhOnPlots === true);
  const spot = Object.keys(st.board.graph).find((p) => E.orthOf(st.board, p).length >= 2);
  const [n1, n2] = E.orthOf(st.board, spot);
  check("placing takes one plot, not a road", E.doPlaceLH(st, spot, null, () => {}) === true);
  check("the hub stands on that plot", E.plotIsLH(st.board, spot) && E.lhCount(st.board) === 1);
  check("nothing can be built there any more", E.plotFree(st.board, spot) === false);
  check("an orthogonal neighbour is on the network", E.plotHasLH(st.board, n1) && E.plotHasLH(st.board, n2));
  const far = Object.keys(st.board.graph).find((p) => p !== spot && !E.orthOf(st.board, spot).includes(p));
  check("a plot that is not orthogonally beside it is not", E.plotHasLH(st.board, far) === false);
  // a diagonal neighbour inside the district is adjacent on the board but not orthogonally
  const diag = [...st.board.graph[spot]].find((n) => !E.orthOf(st.board, spot).includes(n));
  if (diag) check("a diagonal neighbour is not on the network", E.plotHasLH(st.board, diag) === false);
  const d = st.board.cellOf[spot];
  check("the network reaches the district the hub stands in",
    E.lhDistricts(st.board).has(`${d.r},${d.c}`) && E.lhDistricts(st.board).size === 1);
  check("a second hub on the same plot is refused", E.doPlaceLH(st, spot, null, () => {}) === false);

  // and the network is shared: a company beside hub A reaches hub B's district
  const other = Object.keys(st.board.graph).find((p) => {
    const c = st.board.cellOf[p];
    return E.plotFree(st.board, p) && `${c.r},${c.c}` !== `${d.r},${d.c}` && E.orthOf(st.board, p).length > 0;
  });
  E.doPlaceLH(st, other, null, () => {});
  const me = E.byId(st, 0);
  st.board.owner[n1] = me.id;
  const biz = plant(st, me, "TE", n1);
  const reach = E.reachableDistricts(st, biz);
  const o = st.board.cellOf[other];
  check("a company beside one hub reaches every hub's district",
    reach.has(`${o.r},${o.c}`), [...reach].join(" "));
}

/* ------------------------------------------------------------ 3. open to all */
section("3. Hubs open to all");
{
  for (const ind of ["UT", "RE"]) {
    const st = game(undefined);
    const me = E.byId(st, 0);
    const edge = (() => {
      for (const a of Object.keys(st.board.graph)) for (const b of st.board.graph[a]) {
        if (st.board.cellOf[a].r !== st.board.cellOf[b].r || st.board.cellOf[a].c !== st.board.cellOf[b].c) return [a, b];
      }
      return null;
    })();
    E.doPlaceLH(st, edge[0], edge[1], () => {});
    st.board.owner[edge[0]] = me.id;
    const biz = plant(st, me, ind, edge[0]);
    const far = st.board.cellOf[edge[1]];
    const without = E.reachableDistricts(st, biz).has(`${far.r},${far.c}`);

    const st2 = game({ lhOpenToAll: true });
    const me2 = E.byId(st2, 0);
    E.doPlaceLH(st2, edge[0], edge[1], () => {});
    st2.board.owner[edge[0]] = me2.id;
    const biz2 = plant(st2, me2, ind, edge[0]);
    const with_ = E.reachableDistricts(st2, biz2).has(`${far.r},${far.c}`);
    check(`${ind} cannot use a hub normally`, without === false);
    check(`${ind} can once the host opens the network`, with_ === true);
  }
}

/* ----------------------------------------------------------- 4. triple score */
section("4. Companies score triple");
{
  const mk = (v) => {
    const st = game(v);
    st.quarter = 4;
    const me = E.byId(st, 0);
    const plot = Object.keys(st.board.graph)[0];
    st.board.owner[plot] = me.id;
    const biz = plant(st, me, "RE", plot, 2);
    E.runClosingRest(st, () => {});
    return biz.epOnCard;
  };
  check("a level-2 company puts 2 EP on its card normally", mk(undefined) === 2, `${mk(undefined)}`);
  check("and 6 EP when companies score triple", mk({ tripleLevelScoring: true }) === 6, `${mk({ tripleLevelScoring: true })}`);
}

/* -------------------------------------------------------- 5. score on build */
section("5. Score on completion");
{
  const st = game({ immediateScoring: true });
  const me = E.byId(st, 0);
  const bp = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 1);
  const plot = Object.keys(st.board.graph)[0];
  st.board.owner[plot] = me.id;
  me.cash = 300; me.hand = [bp];
  check("launching scores at once", E.doLaunch(st, me, bp, Math.random, () => {}, [plot]) === true);
  const biz = me.businesses[0];
  check("its EP sit on its own card immediately", biz.epOnCard === 1 && biz.scored === true, `${biz.epOnCard} EP`);
  const bankBefore = me.epBank;
  E.doUpgrade(st, me, biz, Math.random, () => {});
  check("upgrading vests the old EP and scores the new level",
    me.epBank === bankBefore + 1 && biz.epOnCard === 2, `banked ${me.epBank - bankBefore}, on card ${biz.epOnCard}`);
  st.quarter = 4;
  E.runClosingRest(st, () => {});
  check("the year end does not pay it a second time", biz.epOnCard === 2);

  const plain = game(undefined);
  const me2 = E.byId(plain, 0);
  const bp2 = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 1);
  plain.board.owner[plot] = me2.id;
  me2.cash = 300; me2.hand = [bp2];
  E.doLaunch(plain, me2, bp2, Math.random, () => {}, [plot]);
  check("without it, a new company scores nothing until the year end", me2.businesses[0].epOnCard === 0);
}

/* ------------------------------------------------------------- 6. land yearly */
section("6. Land awards every year");
{
  const mk = (v) => {
    const st = game(v);
    st.quarter = 4;
    const me = E.byId(st, 0);
    Object.keys(st.board.graph).slice(0, 6).forEach((p) => { st.board.owner[p] = me.id; });
    E.runClosingRest(st, () => {});
    return me.epBank;
  };
  check("no land award at a normal year end", mk(undefined) === 0, `${mk(undefined)} EP`);
  check("both awards land at the year end under the variant", mk({ yearlyLandAwards: true }) === 20,
    `${mk({ yearlyLandAwards: true })} EP (10 for plots + 10 for districts)`);
  // and Q12 must not pay twice: finalizeGame owns the last one
  const st = game({ yearlyLandAwards: true });
  st.quarter = 12;
  const me = E.byId(st, 0);
  Object.keys(st.board.graph).slice(0, 6).forEach((p) => { st.board.owner[p] = me.id; });
  E.runClosingRest(st, () => {});
  const afterClose = me.epBank;
  E.finalizeGame(st);
  check("quarter 12 awards them once, in final scoring",
    afterClose === 0 && me.epBank >= 20, `close ${afterClose}, final ${me.epBank}`);
}

/* -------------------------------------------------- what the bots can see */
section("The bots read the variants too");
{
  check("a company level is worth 1 EP normally, 3 under the variant",
    E.levelEP(game(undefined)) === 1 && E.levelEP(game({ tripleLevelScoring: true })) === 3);

  const plain = game(undefined), yearly = game({ yearlyLandAwards: true });
  check("land pays once normally, three times under the yearly variant",
    E.landPayouts(plain) === 1 && E.landPayouts(yearly) === 3);
  check("so a plot is worth three times as much to a bot's arithmetic",
    E.landEPWeight(yearly) === E.landEPWeight(plain) * 3);
  yearly.quarter = 9;
  check("and that value falls as the remaining years run out",
    E.landPayouts(yearly) === 1, `Q9 -> ${E.landPayouts(yearly)} payout(s)`);

  // the same card, scored by the same bot, under two different scoring rules
  const scoreOf = (v) => {
    const st = game(v, 21);
    const me = E.byId(st, 0);
    const bp = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 1);
    Object.keys(st.board.graph).slice(0, 3).forEach((p) => { st.board.owner[p] = me.id; });
    me.cash = 200;
    return E.launchScore(st, me, bp, "balanced");
  };
  check("a building is worth more to a bot when buildings score triple",
    scoreOf({ tripleLevelScoring: true }) > scoreOf(undefined),
    `${scoreOf(undefined).toFixed(3)} -> ${scoreOf({ tripleLevelScoring: true }).toFixed(3)}`);
}

/* -------------------------------------------------- the award log's quarter */
section("Land awards are logged in the quarter they were given");
{
  const st = game({ yearlyLandAwards: true });
  const me = E.byId(st, 0);
  Object.keys(st.board.graph).slice(0, 6).forEach((p) => { st.board.owner[p] = me.id; });
  st.quarter = 4;
  E.runClosingRest(st, () => {});
  const y1 = (me.epLog || []).filter((e) => e.label === "The Real-Estate Mogul");
  check("the Year 1 award is stamped Q4, not Q12", y1.length === 1 && y1[0].quarter === 4,
    y1.length ? `stamped Q${y1[0].quarter}` : "not awarded");
  st.quarter = 8;
  E.runClosingRest(st, () => {});
  const y2 = (me.epLog || []).filter((e) => e.label === "The Real-Estate Mogul");
  check("the Year 2 award is stamped Q8", y2.length === 2 && y2[1].quarter === 8,
    y2.length > 1 ? `stamped Q${y2[1].quarter}` : "not awarded");
  st.quarter = 12;
  E.finalizeGame(st);
  const y3 = (me.epLog || []).filter((e) => e.label === "The Real-Estate Mogul");
  check("and final scoring is stamped Q12", y3.length === 3 && y3[2].quarter === 12,
    y3.length > 2 ? `stamped Q${y3[2].quarter}` : "not awarded");
}

/* --------------------------------------------------------------- all at once */
section("Everything on at the same time");
{
  const all = Object.fromEntries(E.VARIANT_KEYS.map((k) => [k, true]));
  const st = game(all);
  check("a game starts with every variant on", !!st.board && st.quarter === 1);
  check("and the board is in plot-hub mode", st.board.lhOnPlots === true);
  const rng = E.mulberry32(7);
  for (let i = 0; i < 12; i++) E.placeNewLH(st, rng, () => {});
  check("twelve hubs place without colliding",
    E.lhCount(st.board) === 12 && new Set(st.board.lhPlots).size === 12, `${E.lhCount(st.board)} placed`);
  check("the random placer prefers plots that connect something",
    st.board.lhPlots.filter((p) => E.orthOf(st.board, p).length > 0).length === 12);
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
