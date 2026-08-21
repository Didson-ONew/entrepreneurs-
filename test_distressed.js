/* A company you sold is not gone - it stands in the city as a Distressed Asset, and
   anyone may take it over. Including you.

   Two ways in: buy it as it stands for half its own setup, keeping its Blueprint and
   level, or renovate it with a card from your hand for half that card's setup. Buying
   it as it stands needs no card at all, which is the case the M&A panel used to hide:
   it only listed a distressed structure if you happened to hold a matching Blueprint,
   so a player who sold a company and simply wanted it back could never see the button.

   Run: node test_distressed.js
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
    box.exports = { initGame, BP_DATA, SCALING, doLaunch, doSellCompany, doReclaim, canReclaim,
      doRenovate, renovationEligible, findDistressedTargets, activeBiz, discsFree, byId,
      companySlotsUsed, COMPANY_SLOTS, bizSetup, mulberry32, maWouldAchieveSomething,
      scoreCompanyOnCompletion, levelEP };
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

/* Build a table where seat 0 owns some land and has a company standing. */
function tableWith(ind, lvl = 1, seed = 4) {
  const st = E.initGame(2, seed, ["You", "Rival"], undefined, false, undefined);   // 2 humans + 2 bots
  const me = E.byId(st, 0), rival = E.byId(st, 1);
  const plots = Object.keys(st.board.graph).slice(0, 8);
  plots.forEach((k) => { st.board.owner[k] = me.id; });
  me.cash = 500; rival.cash = 500;
  const bp = E.BP_DATA.find((x) => x.ind === ind && x.lvl === lvl);
  me.hand = [bp];
  const ok = E.doLaunch(st, me, bp, E.mulberry32(seed), quiet);
  return { st, me, rival, biz: me.businesses[me.businesses.length - 1], built: ok };
}

section("Selling a company leaves it standing, distressed");
{
  const { st, me, biz, built } = tableWith("HC", 1);
  check("a company was built", built === true && !!biz);
  const slotsBefore = E.companySlotsUsed(me);
  const discsBefore = E.discsFree(st, me);

  E.doSellCompany(me, biz, quiet);
  check("it is distressed now", biz.distressed === true);
  check("and it is in the bank's list for anyone to take", E.findDistressedTargets(st).includes(biz));
  check("its slot is freed", E.companySlotsUsed(me) === slotsBefore - 1);
  check("and so is its disc", E.discsFree(st, me) === discsBefore + 1,
    `${discsBefore} -> ${E.discsFree(st, me)}`);
  check("but it still sits in your ledger, not deleted", me.businesses.includes(biz));
}

section("You may buy your own back, as it stands");
{
  const { st, me, biz } = tableWith("HC", 1);
  E.doSellCompany(me, biz, quiet);
  me.hand = [];                                   // no card in hand at all
  const cashBefore = me.cash;

  check("with an empty hand, the engine still allows it", E.canReclaim(st, me, biz) === true);
  const ok = E.doReclaim(st, me, biz, quiet);
  check("and it goes through", ok === true);
  check("it is trading again", biz.distressed === false && E.activeBiz(me).includes(biz));
  check("it cost half its setup", cashBefore - me.cash === Math.floor(E.bizSetup(biz) / 2),
    `paid $${cashBefore - me.cash}`);
  check("it keeps its Blueprint and level", biz.bp.ind === "HC" && biz.level === 1);
  check("and it scores again for you, as a fresh build",
    (me.epLog || []).some((e) => String(e.label).startsWith("Company:") && e.amount === biz.level * E.levelEP(st)),
    (me.epLog || []).filter((e) => String(e.label).startsWith("Company:")).map((e) => `+${e.amount}`).join(" "));
}

section("Or renovate it into something else");
{
  const { st, me, biz } = tableWith("HC", 1);
  E.doSellCompany(me, biz, quiet);
  const card = E.BP_DATA.find((x) => x.lvl === 1 && x.ind !== "HC" && E.renovationEligible(biz, x));
  check("a level-1 shell takes any level-1 card", !!card, card && card.name);
  me.hand = [card];
  const cashBefore = me.cash;
  const ok = E.doRenovate(st, me, biz, card, quiet);
  check("the renovation goes through", ok === true);
  check("it costs half the new card's setup", cashBefore - me.cash === Math.floor(card.setup / 2),
    `paid $${cashBefore - me.cash}`);
  check("and it is that industry now", biz.bp.ind === card.ind, biz.bp.ind);
}

section("A rival may take it too");
{
  const { st, me, rival, biz } = tableWith("HC", 1);
  E.doSellCompany(me, biz, quiet);
  rival.hand = [];
  check("the rival can buy it as it stands", E.canReclaim(st, rival, biz) === true);
  E.doReclaim(st, rival, biz, quiet);
  check("it moves to their ledger", rival.businesses.includes(biz) && !me.businesses.includes(biz));
  check("and off yours", E.activeBiz(me).includes(biz) === false);
}

section("What still refuses it");
{
  const { st, me, biz } = tableWith("HC", 1);
  E.doSellCompany(me, biz, quiet);
  me.cash = 1;
  check("no money, no takeover", E.canReclaim(st, me, biz) === false);
  me.cash = 500;
  check("with money, yes", E.canReclaim(st, me, biz) === true);

  // fill every company slot and it has nowhere to go
  const { st: st2, me: me2, biz: biz2 } = tableWith("HC", 1, 9);
  E.doSellCompany(me2, biz2, quiet);
  const spare = Object.keys(st2.board.owner).filter((k) => st2.board.owner[k] === me2.id
    && !(k in st2.board.occupiedBy));
  let filled = 0;
  for (const ind of ["RE", "HO", "TE", "MA", "UT"]) {
    if (E.companySlotsUsed(me2) >= E.COMPANY_SLOTS) break;
    const bp = E.BP_DATA.find((x) => x.ind === ind && x.lvl === 1);
    me2.hand = [bp];
    me2.cash = 500;
    if (E.doLaunch(st2, me2, bp, E.mulberry32(3), quiet, [spare[filled]])) filled++;
  }
  if (E.companySlotsUsed(me2) >= E.COMPANY_SLOTS) {
    me2.cash = 500;
    check("a full slate has nowhere to put it", E.canReclaim(st2, me2, biz2) === false,
      `${E.companySlotsUsed(me2)}/${E.COMPANY_SLOTS} slots used`);
  } else {
    console.log(`  --   could not fill all five slots on this board (${E.companySlotsUsed(me2)}), cap not exercised`);
  }
}

section("The bots know it is worth an action");
{
  const { st, me, biz } = tableWith("HC", 1);
  E.doSellCompany(me, biz, quiet);
  me.hand = [];                       // nothing to renovate with, nothing to launch
  me.cash = 500;
  check("M&A is still worth taking, because buying it back is possible",
    E.maWouldAchieveSomething(st, me) === true);
  me.cash = 1;
  check("and not worth it when nothing at all can be done",
    E.maWouldAchieveSomething(st, me) === false);
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
