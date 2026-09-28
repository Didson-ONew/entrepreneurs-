/* A company you sold is not gone - it stands in the city as a Distressed Asset, and
   anyone may take it over. Including you.

   Two ways in: buy it as it stands for exactly what the bank paid its last owner,
   keeping its Blueprint and level, or renovate it with a card from your hand for half
   THAT card's setup - the two prices answer different questions, which is why they are
   worked out differently. Buying
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
      scoreCompanyOnCompletion, levelEP, reclaimCost, price, INDUSTRIES,
      epTotal, INDUSTRY_DEBUT_EP };
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
  /* It used to score again here. It does not any more - see the section below. */
  check("but it does NOT score again: one build, one payment",
    (me.epLog || []).filter((e) => String(e.label).startsWith("Company:")).length === 1,
    (me.epLog || []).filter((e) => String(e.label).startsWith("Company:")).map((e) => `+${e.amount}`).join(" "));
}

/* THE ROUND TRIP MUST NET ZERO.

   Reclaim used to cost half the structure's setup however it went distressed,
   while selling an UPGRADED company pays its full setup. That made a company you
   had upgraded into a money printer: sell it for the full setup, buy the same
   building straight back for half, keep the building and half the setup, repeat.
   Reclaim now charges exactly what the bank paid out, so the only thing a round
   trip costs is the actions it took. */
section("Selling and buying straight back is not a money printer");
{
  const { st, me, biz } = tableWith("HC", 1);
  me.hand = [];
  const setup = E.bizSetup(biz);

  // an UPGRADED company: the bank pays its full setup for it
  biz.upgraded = true;
  const cash0 = me.cash;
  E.doSellCompany(me, biz, quiet);
  check("selling an upgraded company pays its full setup",
    me.cash - cash0 === setup, `paid $${me.cash - cash0}, setup $${setup}`);

  const cash1 = me.cash;
  check("and buying it back is quoted at that same figure",
    E.reclaimCost(biz) === setup, `quoted $${E.reclaimCost(biz)}`);
  E.doReclaim(st, me, biz, quiet);
  check("which is what it actually charges",
    cash1 - me.cash === setup, `paid $${cash1 - me.cash}`);
  check("so the whole round trip nets nothing", me.cash === cash0,
    `started $${cash0}, ended $${me.cash}`);
  check("and the company is trading again, same Blueprint and level",
    biz.distressed === false && biz.bp.ind === "HC" && biz.level === 1);
  check("the payout record is cleared, so a later sale sets a fresh one",
    biz.distressPayout === undefined);
}

section("A forced sale is cheaper to undo, because it paid less");
{
  const { st, me, biz } = tableWith("HC", 1);
  me.hand = [];
  const setup = E.bizSetup(biz);
  const cash0 = me.cash;
  E.doSellCompany(me, biz, quiet, true);            // solvency: a quarter of setup
  const got = me.cash - cash0;
  check("a forced sale of an un-upgraded company pays a quarter",
    got === Math.floor(setup / 4), `paid $${got}, setup $${setup}`);
  check("and buying it back costs that quarter, not half",
    E.reclaimCost(biz) === got, `quoted $${E.reclaimCost(biz)}`);
  const cash1 = me.cash;
  E.doReclaim(st, me, biz, quiet);
  check("round trip still nets nothing", me.cash === cash0,
    `started $${cash0}, ended $${me.cash}`);
  check("charged exactly the payout", cash1 - me.cash === got);
}

section("A company a Megacorp ate was never paid for");
{
  const { st, me, biz } = tableWith("HC", 1);
  me.hand = [];
  // a merger sets `distressed` directly and hands over no cash at all
  biz.distressed = true;
  check("with no payout on record it is priced as if it had been sold",
    E.reclaimCost(biz) === Math.floor(E.bizSetup(biz) / 2),
    `quoted $${E.reclaimCost(biz)}, setup $${E.bizSetup(biz)}`);
  biz.upgraded = true;
  check("and an upgraded one at its full setup, so merging does not leave "
    + "free buildings on the board",
    E.reclaimCost(biz) === E.bizSetup(biz), `quoted $${E.reclaimCost(biz)}`);
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

/* A renovation is a new company entering the market; a reclaim is not. */
section("Renovating moves the price markers, reclaiming does not");
{
  const { st, me, biz } = tableWith("HC", 1);
  E.doSellCompany(me, biz, quiet);
  const before = {};
  E.INDUSTRIES.forEach((i) => (before[i] = E.price(st.pm, i)));
  E.doReclaim(st, me, biz, quiet);
  const same = E.INDUSTRIES.every((i) => E.price(st.pm, i) === before[i]);
  check("buying the same company back as it stands moves nothing", same,
    E.INDUSTRIES.map((i) => `${i}$${E.price(st.pm, i)}`).join(" "));
}
{
  const { st, me, biz } = tableWith("HC", 1);
  E.doSellCompany(me, biz, quiet);
  const card = E.BP_DATA.find((x) => x.lvl === 1 && x.ind !== "HC" && E.renovationEligible(biz, x));
  me.hand = [card];
  const before = {};
  E.INDUSTRIES.forEach((i) => (before[i] = E.price(st.pm, i)));
  E.doRenovate(st, me, biz, card, quiet);
  check("renovating into another industry pushes that industry's price down",
    E.price(st.pm, card.ind) <= before[card.ind],
    `${card.ind} $${before[card.ind]} -> $${E.price(st.pm, card.ind)}`);
  const deps = card.deps.map((d) => d.ind);
  check("and lifts every supplier it now buys from",
    deps.length === 0 || deps.every((d) => E.price(st.pm, d) >= before[d]),
    deps.map((d) => `${d} $${before[d]}->$${E.price(st.pm, d)}`).join(" "));
  check("something actually moved",
    E.INDUSTRIES.some((i) => E.price(st.pm, i) !== before[i]));
}

/* ONE BUILD, ONE PAYMENT.

   A reclaim buys the same company exactly as it stands - same Blueprint, same
   level, same output, same suppliers - so it scores nothing, for anybody. Its
   levels were paid for when they were built. This is the same reasoning that
   already stopped a reclaim moving the price markers: nothing about the city has
   changed, so nothing is owed for it. Scoring it again made a sale and a buy-back
   a points pump - the cash nets to zero, so the EP was pure profit for the price
   of two actions.

   A RENOVATION is the opposite case and still scores, because a different
   Blueprint goes into the shell: a genuinely new business opens, in a new
   industry, buying from new suppliers. It moves the market like a launch and it
   scores its levels like one. */
section("A reclaim scores nothing, for anybody");
{
  const { st, me, biz } = tableWith("HC", 1);
  const built = E.epTotal(me);
  E.doSellCompany(me, biz, quiet);
  check("selling banks no EP either way", E.epTotal(me) === built, `${built} -> ${E.epTotal(me)}`);
  E.doReclaim(st, me, biz, quiet);
  check("and buying your own back banks none", E.epTotal(me) === built,
    `${built} -> ${E.epTotal(me)}`);
  check("the company is trading again all the same",
    biz.distressed === false && E.activeBiz(me).includes(biz));
}

section("Nor for a rival who simply buys it");
{
  const { st, me, rival, biz } = tableWith("HC", 1);
  E.doSellCompany(me, biz, quiet);
  /* Give the rival the industry already, so the entry bonus cannot be mistaken
     for the company scoring. */
  rival.industriesScored = ["HC"];
  const before = E.epTotal(rival);
  rival.hand = [];
  E.doReclaim(st, rival, biz, quiet);
  check("it is theirs now", rival.businesses.includes(biz));
  check("and they banked nothing for it", E.epTotal(rival) === before,
    `${before} -> ${E.epTotal(rival)}`);
  check("no Company: line was written for them",
    (rival.epLog || []).every((e) => !String(e.label).startsWith("Company:")),
    (rival.epLog || []).map((e) => e.label).join(" | "));
}

section("But a first company in an industry still pays the entry bonus");
{
  const { st, me, rival, biz } = tableWith("HC", 1);
  E.doSellCompany(me, biz, quiet);
  rival.industriesScored = [];            // never been in Healthcare
  const before = E.epTotal(rival);
  rival.hand = [];
  E.doReclaim(st, rival, biz, quiet);
  check("they bank the entry bonus and nothing else",
    E.epTotal(rival) - before === E.INDUSTRY_DEBUT_EP,
    `+${E.epTotal(rival) - before}, expected +${E.INDUSTRY_DEBUT_EP}`);
  check("and it is labelled as entering the industry",
    (rival.epLog || []).some((e) => String(e.label) === "Entered HC"),
    (rival.epLog || []).map((e) => e.label).join(" | "));
}

section("A renovation does score, because it is a new business");
{
  const { st, me, biz } = tableWith("HC", 1);
  E.doSellCompany(me, biz, quiet);
  const card = E.BP_DATA.find((x) => x.lvl === 1 && x.ind !== "HC" && E.renovationEligible(biz, x));
  me.hand = [card];
  me.industriesScored = [card.ind];       // exclude the entry bonus from the sum
  const before = E.epTotal(me);
  E.doRenovate(st, me, biz, card, quiet);
  check("it banks the new company's levels",
    E.epTotal(me) - before === card.lvl * E.levelEP(st),
    `+${E.epTotal(me) - before}, expected +${card.lvl * E.levelEP(st)}`);
}

section("And the Blueprint it displaced goes back to the bottom of its deck");
{
  const { st, me, biz } = tableWith("HC", 1);
  const oldBp = biz.bp;
  /* tableWith hands the launch card over without drawing it, so the same object is
     still sitting in its deck. Real play cannot do that - a card reaches a hand
     only by being shifted off a deck or drafted, both of which remove it - so take
     it out here, otherwise "it came back exactly once" cannot mean anything. */
  const hcDeck = st.decks[oldBp.ind];
  if (hcDeck.includes(oldBp)) hcDeck.splice(hcDeck.indexOf(oldBp), 1);
  E.doSellCompany(me, biz, quiet);
  const card = E.BP_DATA.find((x) => x.lvl === 1 && x.ind !== "HC" && E.renovationEligible(biz, x));
  /* Take the card out of its deck the way a draw would, rather than conjuring a
     second reference to it. Decks hold the same BP_DATA objects the hand does, so
     a hand assembled out of thin air leaves a copy still sitting in the deck and
     nothing below could be told apart. */
  const drawnFrom = st.decks[card.ind];
  drawnFrom.splice(drawnFrom.indexOf(card), 1);
  me.hand = [card];

  const oldDeckBefore = st.decks[oldBp.ind].length;
  const newDeckBefore = st.decks[card.ind].length;
  E.doRenovate(st, me, biz, card, quiet);

  check("the displaced Blueprint's own deck grew by one",
    st.decks[oldBp.ind].length === oldDeckBefore + 1,
    `${oldDeckBefore} -> ${st.decks[oldBp.ind].length}`);
  check("and it went to the bottom, not the public top",
    st.decks[oldBp.ind][st.decks[oldBp.ind].length - 1] === oldBp
    && st.decks[oldBp.ind][0] !== oldBp,
    `top is ${st.decks[oldBp.ind][0] && st.decks[oldBp.ind][0].name}`);
  check("it is in that deck exactly once, not duplicated",
    st.decks[oldBp.ind].filter((x) => x === oldBp).length === 1);
  check("the card played from hand is spent",
    !me.hand.includes(card) && st.decks[card.ind].length === newDeckBefore,
    `hand ${me.hand.length}, ${card.ind} deck ${newDeckBefore} -> ${st.decks[card.ind].length}`);
  check("and the structure is running it now", biz.bp === card);
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
