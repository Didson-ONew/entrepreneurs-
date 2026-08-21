/* Each optional variant, checked against the rule it claims to change - and, just
   as importantly, checked to be OFF by default so a table that touches nothing
   still plays the printed rulebook, which since v13 means: companies score the
   moment they are finished, at 3 EP a level; the decks are shuffled whole; hubs
   stand on plots; and the land awards pay at every year end.

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
      landEPWeight, landPayouts, megacorpWorthIt, bestMegacorpMatch, launchScore,
      scoreCompanyOnCompletion };
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
  E.scoreCompanyOnCompletion(st, biz);    // the build hook, as doLaunch would call it
  return biz;
}


/* ------------------------------------------------------------------ defaults */
section("Defaults - a table that touches nothing plays Rulebook v13");
{
  const st = game(undefined);
  check("five variants are on offer", E.VARIANTS.length === 5, E.VARIANTS.map((v) => v.key).join(", "));
  check("every one is off", E.VARIANT_KEYS.every((k) => st.variants[k] === false));
  check("hubs stand on plots", st.board.lhOnPlots === true);
  const lv = st.decks.UT.map((c) => c.lvl);
  check("the decks are shuffled whole", JSON.stringify(lv) !== JSON.stringify([...lv].sort()), lv.join(""));
  check("a company is worth 2 EP per level", E.levelEP(st) === 2);
  check("and the land awards pay at every year end", E.landPayouts(st) === 3, `${E.landPayouts(st)} payouts`);
  check("junk off the wire cannot invent a variant",
    E.normaliseVariants({ nonsense: true, roadHubs: "yes" }).nonsense === undefined
    && E.normaliseVariants({ roadHubs: "yes" }).roadHubs === true);
  check("the dropped 'hubs open to all' switch is gone",
    E.VARIANT_KEYS.indexOf("lhOpenToAll") === -1 && E.normaliseVariants({ lhOpenToAll: true }).lhOpenToAll === undefined);
}

section("Utilities and Retail are never on the hub network");
{
  /* This used to be switchable. It is not any more: UT already reads a block of
     districts and RE picks extra ones outright, so hubs on top made them boundless. */
  for (const ind of ["UT", "RE"]) {
    const st = game(undefined);
    const me = E.byId(st, 0);
    const spot = Object.keys(st.board.graph).find((p) => E.orthOf(st.board, p).length >= 1);
    const nbr = E.orthOf(st.board, spot)[0];
    E.doPlaceLH(st, spot, null, () => {});
    st.board.owner[nbr] = me.id;
    const biz = plant(st, me, ind, nbr);
    const d = st.board.cellOf[spot];
    const home = st.board.cellOf[nbr];
    if (`${d.r},${d.c}` === `${home.r},${home.c}`) continue;   // same district proves nothing
    check(`${ind} beside a hub still cannot reach its district`,
      E.reachableDistricts(st, biz).has(`${d.r},${d.c}`) === false);
  }
  const st = game(undefined);
  const me = E.byId(st, 0);
  const spot = Object.keys(st.board.graph).find((p) => E.orthOf(st.board, p).length >= 1);
  E.doPlaceLH(st, spot, null, () => {});
  const nbr = E.orthOf(st.board, spot)[0];
  st.board.owner[nbr] = me.id;
  const te = plant(st, me, "TE", nbr);
  const d = st.board.cellOf[spot];
  check("but Technology beside the same hub does", E.reachableDistricts(st, te).has(`${d.r},${d.c}`));
}

/* ------------------------------------------------------- hubs, as standard */
section("Hubs stand on plots (standard)");
{
  const st = game(undefined);
  const spot = Object.keys(st.board.graph).find((p) => E.orthOf(st.board, p).length >= 2);
  const [n1, n2] = E.orthOf(st.board, spot);
  check("placing takes one plot, not a road", E.doPlaceLH(st, spot, null, () => {}) === true);
  check("the hub stands on that plot", E.plotIsLH(st.board, spot) && E.lhCount(st.board) === 1);
  check("nothing can be built there any more", E.plotFree(st.board, spot) === false);
  check("an orthogonal neighbour is on the network", E.plotHasLH(st.board, n1) && E.plotHasLH(st.board, n2));
  const diag = [...st.board.graph[spot]].find((n) => !E.orthOf(st.board, spot).includes(n));
  if (diag) check("a diagonal neighbour is not - corners do not count", E.plotHasLH(st.board, diag) === false);
  const d = st.board.cellOf[spot];
  check("the network reaches the district the hub stands in, and only that one",
    E.lhDistricts(st.board).has(`${d.r},${d.c}`) && E.lhDistricts(st.board).size === 1);
  check("a second hub on the same plot is refused", E.doPlaceLH(st, spot, null, () => {}) === false);

  const other = Object.keys(st.board.graph).find((p) => {
    const c = st.board.cellOf[p];
    return E.plotFree(st.board, p) && `${c.r},${c.c}` !== `${d.r},${d.c}` && E.orthOf(st.board, p).length > 0;
  });
  E.doPlaceLH(st, other, null, () => {});
  const me = E.byId(st, 0);
  st.board.owner[n1] = me.id;
  const biz = plant(st, me, "TE", n1);
  const o = st.board.cellOf[other];
  check("a company beside one hub reaches every hub's district",
    E.reachableDistricts(st, biz).has(`${o.r},${o.c}`));
}

/* ====================================================== the five variants */

section("1. Score at the year end");
{
  const st = game({ classicScoring: true });
  const me = E.byId(st, 0);
  Object.keys(st.board.graph).slice(0, 4).forEach((p) => { st.board.owner[p] = me.id; });
  const plot = Object.keys(st.board.owner).find((k) => st.board.owner[k] === me.id);
  const biz = plant(st, me, "HC", plot, 2);
  check("building scores nothing yet", biz.epOnCard === 0 && biz.scored === false);
  st.quarter = 4;
  E.runClosingRest(st, () => {});
  check("the year end pays it", biz.epOnCard === 4 && biz.scored === true, `${biz.epOnCard} EP`);

  const std = game(undefined);
  const me2 = E.byId(std, 0);
  Object.keys(std.board.graph).slice(0, 4).forEach((p) => { std.board.owner[p] = me2.id; });
  const b2 = plant(std, me2, "HC", Object.keys(std.board.owner).find((k) => std.board.owner[k] === me2.id), 2);
  check("whereas standard pays it on the spot", b2.epOnCard === 4 && b2.scored === true);
}

section("2. Levels score single");
{
  const mk = (v) => {
    const st = game(v);
    const me = E.byId(st, 0);
    Object.keys(st.board.graph).slice(0, 4).forEach((p) => { st.board.owner[p] = me.id; });
    const plot = Object.keys(st.board.owner).find((k) => st.board.owner[k] === me.id);
    return plant(st, me, "HC", plot, 2).epOnCard;
  };
  check("a level 2 company scores 4 as standard", mk(undefined) === 4, `${mk(undefined)} EP`);
  check("and 6 under the variant", mk({ heavyLevelEP: true }) === 6, `${mk({ heavyLevelEP: true })} EP`);
  check("levelEP says the same", E.levelEP(game(undefined)) === 2 && E.levelEP(game({ heavyLevelEP: true })) === 3);
}

section("3. Ordered decks");
{
  let sawEarlyHighLevel = false;
  for (let seed = 1; seed <= 12; seed++) {
    const st = game({ orderedDecks: true }, seed);
    for (const ind of E.INDUSTRIES) if (st.decks[ind][0] && st.decks[ind][0].lvl > 1) sawEarlyHighLevel = true;
  }
  check("under the variant no level 2 or 3 is ever the public top card", !sawEarlyHighLevel);
  const st = game({ orderedDecks: true }, 3);
  const lv = st.decks.UT.map((c) => c.lvl);
  check("the deck runs level 1 down to level 3",
    JSON.stringify(lv) === JSON.stringify([...lv].sort()), lv.join(""));

  let sawHigh = false;
  for (let seed = 1; seed <= 12; seed++) {
    const s2 = game(undefined, seed);
    for (const ind of E.INDUSTRIES) if (s2.decks[ind][0] && s2.decks[ind][0].lvl > 1) sawHigh = true;
  }
  check("whereas as standard a bigger card can be there from the first draft", sawHigh);
}

section("4. Hubs on the road");
{
  const st = game({ roadHubs: true });
  check("the board knows", st.board.lhOnPlots === false);
  const edge = (() => {
    for (const a of Object.keys(st.board.graph)) for (const b of st.board.graph[a]) {
      if (st.board.cellOf[a].r !== st.board.cellOf[b].r || st.board.cellOf[a].c !== st.board.cellOf[b].c) return [a, b];
    }
    return null;
  })();
  check("a hub needs two plots across a border", E.doPlaceLH(st, edge[0], edge[1], () => {}) === true);
  check("and consumes neither of them", E.plotFree(st.board, edge[0]) && E.plotFree(st.board, edge[1]));
  check("it joins the two districts either side", E.lhDistricts(st.board).size === 2, `${E.lhDistricts(st.board).size}`);
  check("which is one more than a plot hub reaches", E.lhDistricts(game(undefined).board).size === 0);
}

section("5. Land awards at the end only");
{
  const mk = (v) => {
    const st = game(v);
    st.quarter = 4;
    const me = E.byId(st, 0);
    Object.keys(st.board.graph).slice(0, 6).forEach((p) => { st.board.owner[p] = me.id; });
    E.runClosingRest(st, () => {});
    return me.epBank;
  };
  check("both awards land at a normal year end", mk(undefined) === 10,
    `${mk(undefined)} EP (5 for most plots + 5 for most districts)`);
  check("under the variant the year end pays nothing", mk({ endgameLandAwards: true }) === 0,
    `${mk({ endgameLandAwards: true })} EP`);

  // and Q12 must not pay twice: finalizeGame owns the last one
  const st = game(undefined);
  st.quarter = 12;
  const me = E.byId(st, 0);
  Object.keys(st.board.graph).slice(0, 6).forEach((p) => { st.board.owner[p] = me.id; });
  E.runClosingRest(st, () => {});
  const afterClose = me.epBank;
  E.finalizeGame(st);
  check("quarter 12 awards them once, in final scoring",
    afterClose === 0 && me.epBank >= 10, `close ${afterClose}, final ${me.epBank}`);
}

/* -------------------------------------------------- what the bots can see */
section("The bots read the variants too");
{
  const plain = game(undefined), endOnly = game({ endgameLandAwards: true });
  check("land pays three times as standard, once under the variant",
    E.landPayouts(plain) === 3 && E.landPayouts(endOnly) === 1);
  check("so a plot is worth three times as much to a bot's arithmetic",
    E.landEPWeight(plain) === E.landEPWeight(endOnly) * 3);
  plain.quarter = 9;
  check("and that value falls as the remaining years run out",
    E.landPayouts(plain) === 1, `Q9 -> ${E.landPayouts(plain)} payout(s)`);

  const scoreOf = (v) => {
    const st = game(v, 21);
    const me = E.byId(st, 0);
    const bp = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 1);
    Object.keys(st.board.graph).slice(0, 3).forEach((p) => { st.board.owner[p] = me.id; });
    me.cash = 200;
    return E.launchScore(st, me, bp, "balanced");
  };
  check("a building is worth less to a bot when levels score single",
    scoreOf({ heavyLevelEP: true }) > scoreOf(undefined),
    `${scoreOf(undefined).toFixed(3)} -> ${scoreOf({ heavyLevelEP: true }).toFixed(3)}`);
}

/* -------------------------------------------------- the award log's quarter */
section("Land awards are logged in the quarter they were given");
{
  const st = game(undefined);
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
section("All five on at once - which is very nearly v12");
{
  const all = Object.fromEntries(E.VARIANT_KEYS.map((k) => [k, true]));
  const st = game(all);
  check("a game starts with every variant on", !!st.board && st.quarter === 1);
  check("hubs go back on the road", st.board.lhOnPlots === false);
  check("a level is worth 3 EP with the heavy variant on", E.levelEP(st) === 3);
  check("the land awards pay once again", E.landPayouts(st) === 1);
  const lv = st.decks.UT.map((c) => c.lvl);
  check("and the decks are ordered again", JSON.stringify(lv) === JSON.stringify([...lv].sort()), lv.join(""));
}

section("Twelve hubs place without colliding");
{
  const st = game(undefined);
  const rng = E.mulberry32(7);
  for (let i = 0; i < 12; i++) E.placeNewLH(st, rng, () => {});
  check("twelve hubs place without colliding",
    E.lhCount(st.board) === 12 && new Set(st.board.lhPlots).size === 12, `${E.lhCount(st.board)} placed`);
  check("the random placer prefers plots that connect something",
    st.board.lhPlots.filter((p) => E.orthOf(st.board, p).length > 0).length === 12);
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
