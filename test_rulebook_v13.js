/* Pins the engine to Rulebook v13 on every point where the two had drifted apart.
   Each check names the clause it is enforcing, so a future rules change that breaks
   one of these tells you which sentence it just contradicted.

   Run: node test_rulebook_v13.js
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
    box.exports = { initGame, mulberry32, makePriceMatrix, price, onLaunch, runB2B,
      claimMegacorp, canGoPublic, bestMegacorpMatch, activeBiz, megacorpHQs, companySlotsFor,
      runMegacorpDividend, price, businessCanProduce, payHqRent, hqRentDue,
      plotHasLH, lhDistricts, hqNetworkPlots,
      hqNeighbours, MEGACORP_NEIGHBOUR_EP, runB2B, finalizeGame, epTotal, orthOf,
      companySlotsUsed, canLaunchMore, discsUsed, discsFree, finalRank, unitPrice,
      renovationEligible, bizInd, PRICE_MIN, PRICE_MAX, BASE_PRICE,
      byId, BP_DATA, MEGACORP_TILES, STARTING, INDUSTRIES, BASE_PRICE, SCALING,
      LOAN_REPAY_RATE, BP_SELL_PRICE, DISCS_PER_PLAYER, COMPANY_SLOTS, PERSONAS,
      levelEP, landPayouts, VARIANT_KEYS, scoreCompanyOnCompletion, runClosingRest,
      INDUSTRY_DEBUT_EP, LAND_AWARD, awardRanked, claimIndustryBonus, finalizeGame };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

let fails = 0;
const check = (clause, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${clause}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n${t}`);

/* ---------------------------------------------------------------- setup */
section("Setup - starting capital by seat");
check("2p: $20+2BP each", JSON.stringify(E.STARTING[2]) === JSON.stringify([[20, 2], [20, 2]]));
check("3p: 25/1, 25/2, 20/3", JSON.stringify(E.STARTING[3]) === JSON.stringify([[25, 1], [25, 2], [20, 3]]));
check("4p: 25/1, 25/2, 20/2, 20/3", JSON.stringify(E.STARTING[4]) === JSON.stringify([[25, 1], [25, 2], [20, 2], [20, 3]]));

/* --------------------------------------------------------- the six industries */
section("The six industries - setup / OPEX / production per level");
const V10 = {
  UT: { base: 4, scale: "H", lv: [[15, 4, 4], [20, 7, 8], [30, 10, 16]] },
  RE: { base: 4, scale: "V", lv: [[10, 5, 4], [15, 9, 8], [25, 14, 16]] },
  HO: { base: 5, scale: "V", lv: [[10, 6, 3], [15, 10, 6], [25, 16, 12]] },
  MA: { base: 5, scale: "H", lv: [[20, 4, 3], [35, 7, 6], [60, 10, 12]] },
  HC: { base: 6, scale: "V", lv: [[20, 5, 2], [35, 9, 4], [60, 14, 8]] },
  TE: { base: 6, scale: "H", lv: [[15, 6, 2], [25, 10, 4], [40, 16, 8]] },
};
for (const [ind, want] of Object.entries(V10)) {
  check(`${ind} base $${want.base}, ${want.scale === "H" ? "horizontal" : "vertical"}`,
    E.BASE_PRICE[ind] === want.base && E.SCALING[ind] === want.scale);
  let ok = true, bad = "";
  for (let lvl = 1; lvl <= 3; lvl++) {
    const cards = E.BP_DATA.filter((b) => b.ind === ind && b.lvl === lvl);
    const [s, o, p] = want.lv[lvl - 1];
    for (const c of cards) {
      if (c.setup !== s || c.opex !== o || c.prod !== p) { ok = false; bad = `${c.code} ${c.setup}/${c.opex}/${c.prod} != ${s}/${o}/${p}`; }
    }
    if (cards.length !== (lvl === 1 ? 5 : lvl === 2 ? 3 : 2)) { ok = false; bad = `L${lvl} has ${cards.length} cards`; }
  }
  check(`${ind} cards match the table (5 L1, 3 L2, 2 L3)`, ok, bad);
}

/* ------------------------------------------------------------------ prices */
section("Prices - a track from $1 to $10, half a dollar a cell");
{
  /* One marker per industry on a 19-cell track: $1, blank, $2, blank ... $10.
     Appearing as a supplier moves it UP two cells - a whole dollar. Being built
     moves it DOWN one, so it takes two companies to knock a dollar off. */
  const pm = E.makePriceMatrix();
  const p0 = E.price(pm, "HO");
  check("an untouched industry sits at its base price", p0 === E.BASE_PRICE.HO, `HO is $${p0}`);

  /* Supply and demand push equally, and each is worth a WHOLE DOLLAR: one
     supplier appearance lifts a price a dollar, one company built takes a dollar
     off. The blank cells the track used to carry are gone with the half-dollar
     step that needed them. */
  E.onLaunch(pm, "ZZ", ["HO"]);                       // HO appears as a supplier once
  check("one supplier appearance is worth $1", E.price(pm, "HO") === p0 + 1,
    `$${p0} -> $${E.price(pm, "HO")}`);
  E.onLaunch(pm, "ZZ", ["HO"]);                       // and a second time
  check("and the second is worth another", E.price(pm, "HO") === p0 + 2,
    `$${p0} -> $${E.price(pm, "HO")}`);

  const pm2 = E.makePriceMatrix();
  E.onLaunch(pm2, "HO", []);                          // one HO company built
  check("one company built takes $1 off", E.price(pm2, "HO") === p0 - 1,
    `$${p0} -> $${E.price(pm2, "HO")}`);
  E.onLaunch(pm2, "HO", []);
  check("two take $2 off", E.price(pm2, "HO") === p0 - 2,
    `$${p0} -> $${E.price(pm2, "HO")}`);

  /* The two pressures being equal is the point: an industry built as often as it
     is needed should not drift. */
  const pm2b = E.makePriceMatrix();
  E.onLaunch(pm2b, "HO", []);           // built once
  E.onLaunch(pm2b, "ZZ", ["HO"]);       // needed once
  check("built as often as needed, the price sits still", E.price(pm2b, "HO") === p0,
    `$${p0} -> $${E.price(pm2b, "HO")}`);

  /* The ends are hard stops, and the marker must come straight back off them -
     that is the whole reason this is one clamped position and not two tallies. */
  const hi = E.makePriceMatrix();
  for (let n = 0; n < 40; n++) E.onLaunch(hi, "ZZ", ["UT"]);
  check(`no price ever climbs above $${E.PRICE_MAX}`, E.price(hi, "UT") === E.PRICE_MAX,
    `$${E.price(hi, "UT")}`);
  E.onLaunch(hi, "UT", []);
  check(`and it comes straight back off $${E.PRICE_MAX} when built`,
    E.price(hi, "UT") === E.PRICE_MAX - 1,
    `$${E.price(hi, "UT")} - a marker parked past the end would not have moved`);

  const lo = E.makePriceMatrix();
  for (let n = 0; n < 40; n++) E.onLaunch(lo, "UT", []);
  check(`no price ever falls below $${E.PRICE_MIN}`, E.price(lo, "UT") === E.PRICE_MIN,
    `$${E.price(lo, "UT")}`);
  E.onLaunch(lo, "ZZ", ["UT"]);
  check(`and it comes straight back off $${E.PRICE_MIN} when needed`,
    E.price(lo, "UT") === E.PRICE_MIN + 1, `$${E.price(lo, "UT")}`);

  /* THE FLOOR IS NO LONGER THE RECYCLING RATE. Production the demand board
     cannot absorb is still binned for $1, and the market now stops a dollar
     above that - so a flooded good is worth twice what scrapping it is worth,
     which was not true when the track bottomed out at $1. */
  check("the floor sits above the recycling rate", E.PRICE_MIN > 1,
    `floor $${E.PRICE_MIN}, recycling $1`);

  /* A game saved before the track existed carries demand/offer instead. It is
     read on TODAY'S base prices, so the expected figure comes from the engine
     rather than being typed. */
  const old = { demand: { HO: 4 }, offer: { HO: 0 } };
  check("a game saved on the old model still prices",
    E.price(old, "HO") === Math.min(E.PRICE_MAX, E.BASE_PRICE.HO + 2),
    `$${E.price(old, "HO")}`);
}

/* -------------------------------------------------------------------- B2B */
section("B2B - one equal share each, remainder rides forward");
{
  const st = E.initGame(0, 7, ["A", "B"], undefined, false);
  const [a, b] = st.players;
  const mk = (owner, ind, level) => {
    const bp = E.BP_DATA.find((x) => x.ind === ind && x.lvl === 1);
    const biz = { id: 900 + owner.businesses.length + owner.id * 10, bp, footprint: [], level, upgraded: false, distressed: false, scored: false, quarterBuilt: 1 };
    owner.businesses.push(biz);
    return biz;
  };
  mk(a, "HC", 3); mk(b, "HC", 1); mk(b, "HC", 1);      // one big, two small
  st.pots = Object.fromEntries(E.INDUSTRIES.map((i) => [i, 0]));
  st.pots.HC = 10;
  a.cash = 0; b.cash = 0;
  E.runB2B(st, () => {});
  check("a $10 pot between three companies pays $3 each", a.cash === 3 && b.cash === 6, `A $${a.cash}, B $${b.cash}`);
  check("the level-3 company draws no more than the level-1s", a.cash === 3);
  check("$1 carries into next quarter", Math.round(st.pots.HC) === 1, `pot $${st.pots.HC}`);

  const st2 = E.initGame(1, 7, ["A"], undefined, false);   // a 1-player table is not a legal game
  st2.pots = Object.fromEntries(E.INDUSTRIES.map((i) => [i, 0]));
  st2.pots.TE = 40;
  E.runB2B(st2, () => {});
  check("a pot with nobody to pay carries over in full", st2.pots.TE === 40);
}

/* ------------------------------------------------------- going public / IPO */
section("Board Meeting - going public always forms a Megacorp");
{
  const st = E.initGame(0, 11, ["A", "B"], undefined, false);
  const a = st.players[0];
  check("a player holding no matching combination cannot go public", E.canGoPublic(st, a) === false);
  const before = a.epBank;
  const formed = E.claimMegacorp(st, a, () => {});
  check("go public is refused outright, and takes no IPO tile", formed === false && a.epBank === before && st.ipoTileClaimed === false);

  // give them the cheapest tile's combination: Local Syndicate, 3 x L1
  const bp = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 1);
  for (let i = 0; i < 3; i++) a.businesses.push({ id: 800 + i, bp, footprint: [], level: 1, upgraded: false, distressed: false, scored: false, quarterBuilt: 1 });
  st.megacorpPool = [E.MEGACORP_TILES.find((t) => t[0] === "Local Syndicate")];
  check("now they can", E.canGoPublic(st, a) === true);
  const ok = E.claimMegacorp(st, a, () => {});
  check("the merge happens", ok === true);
  check("the first Megacorp of the game also takes the IPO tile",
    st.ipoTileClaimed === true && st.ipoOwner === a.id);
  check("which is a sixth company bay, not points",
    a.ipoTile === true && a.epBank === 8, `banked ${a.epBank} EP`);
  check("so going public first does not narrow how wide they can operate",
    E.companySlotsFor(a) === 6, `${E.companySlotsFor(a)} bays`);
  check("one company survives as the headquarters", a.businesses.filter((x) => x.isHQ).length === 1);
  check("the rest go distressed", a.businesses.filter((x) => x.distressed).length === 2);
  check("the headquarters stops trading", E.activeBiz(a).length === 0);
  check("but it still locks a company slot", E.companySlotsUsed(a) === 1);
  check("and it still holds its disc", E.discsUsed(st, a) === 1);
}

/* ------------------------------------------------------- Megacorp headquarters */
section("A headquarters keeps its share of its industry's pot");
{
  const st = E.initGame(0, 13, ["A", "B"], undefined, false);
  const [a, b] = st.players;
  const plots = Object.keys(st.board.graph);
  const reBp = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 1);
  const hq = { id: 700, bp: reBp, footprint: [plots[0]], levels: { [plots[0]]: 1 }, level: 1,
    isHQ: true, megacorpName: "T", distressed: false, upgraded: false, scored: true, quarterBuilt: 1 };
  a.businesses.push(hq);
  st.board.owner[plots[0]] = a.id;          // a monument still needs its ground
  st.board.occupiedBy[plots[0]] = hq.id;
  const rival = { id: 710, bp: reBp, footprint: [plots[9]], levels: { [plots[9]]: 1 }, level: 1,
    upgraded: false, distressed: false, scored: true, quarterBuilt: 1 };
  b.businesses.push(rival);
  st.board.owner[plots[9]] = b.id;
  st.board.occupiedBy[plots[9]] = rival.id;

  st.pots = Object.fromEntries(E.INDUSTRIES.map((i) => [i, 0]));
  st.pots.RE = 20;
  a.cash = 0; b.cash = 0;
  E.runB2B(st, () => {});
  check("the headquarters draws an equal share even though it trades nothing",
    a.cash === 10, `HQ took $${a.cash}`);
  check("and the company that is still trading draws the same", b.cash === 10, `$${b.cash}`);
  check("the pot is emptied cleanly", st.pots.RE === 0, `$${st.pots.RE} left`);
}

section("What the scoreboard pays");
{
  const st = E.initGame(0, 51, ["A", "B", "C"], undefined, false);
  check("a company level is worth 2 EP", E.levelEP(st) === 2);
  check("entering an industry is worth 3 EP", E.INDUSTRY_DEBUT_EP === 3,
    `${E.INDUSTRY_DEBUT_EP} EP`);
  check("so breadth is worth about a level-2 company, not five levels",
    E.INDUSTRY_DEBUT_EP < 2 * E.levelEP(st) + 1);

  const [a] = st.players;
  const before = a.epBank;
  E.claimIndustryBonus(st, a, "TE", () => {});
  check("and it is banked at once", a.epBank - before === 3, `+${a.epBank - before} EP`);
  E.claimIndustryBonus(st, a, "TE", () => {});
  check("once per industry, ever", a.epBank - before === 3, `+${a.epBank - before} EP`);
}

section("A land award goes to the leader alone, and a draw pays badly");
{
  const st = E.initGame(0, 53, ["A", "B", "C"], undefined, false);
  const [a, b, c] = st.players;
  check("5 EP outright, 2 each for two, 1 each for three or more",
    E.LAND_AWARD.sole === 5 && E.LAND_AWARD.two === 2 && E.LAND_AWARD.many === 1);

  const holdings = new Map();
  const run = (label) => {
    st.players.forEach((p) => { p.epBank = 0; p.epLog = []; });
    E.awardRanked(st, (p) => holdings.get(p.id) || 0, label, null);
    return st.players.map((p) => p.epBank);
  };

  holdings.set(a.id, 5); holdings.set(b.id, 3); holdings.set(c.id, 1);
  check("an outright leader takes 5, and second takes nothing",
    JSON.stringify(run("The Real-Estate Mogul")) === JSON.stringify([5, 0, 0]),
    run("The Real-Estate Mogul").join(","));

  holdings.set(b.id, 5);
  check("two tied for the lead take 2 each",
    JSON.stringify(run("The Real-Estate Mogul")) === JSON.stringify([2, 2, 0]),
    run("The Real-Estate Mogul").join(","));

  holdings.set(c.id, 5);
  check("three or more take 1 each",
    JSON.stringify(run("The Real-Estate Mogul")) === JSON.stringify([1, 1, 1]),
    run("The Real-Estate Mogul").join(","));

  holdings.set(a.id, 0); holdings.set(b.id, 0); holdings.set(c.id, 0);
  check("nobody holding anything is awarded nothing",
    JSON.stringify(run("The Real-Estate Mogul")) === JSON.stringify([0, 0, 0]));
}

section("A headquarters is public infrastructure");
{
  const st = E.initGame(0, 41, ["A", "B"], undefined, false);
  const [a, b] = st.players;
  st.board.lhOnPlots = true;                     // hubs stand on plots under v13
  const plots = Object.keys(st.board.graph);
  const hub = plots.find((k) => E.orthOf(st.board, k).length >= 1);
  const beside = E.orthOf(st.board, hub)[0];
  const reBp = E.BP_DATA.find((x) => x.ind === "MA" && x.lvl === 1);
  const hq = { id: 920, bp: reBp, footprint: [hub], levels: { [hub]: 1 }, level: 1, isHQ: true,
    megacorpName: "T", distressed: false, upgraded: false, scored: true, quarterBuilt: 1 };
  a.businesses.push(hq);
  st.board.owner[hub] = a.id;
  st.board.occupiedBy[hub] = hq.id;

  check("nothing is on the network before the headquarters counts",
    E.plotHasLH(st.board, beside) === false);
  st.board.hqFootprints = [[hub]];
  check("a plot beside a headquarters is on the network",
    E.plotHasLH(st.board, beside) === true);
  check("and the district it stands in is reachable from the network",
    E.lhDistricts(st.board).size > 0, `${E.lhDistricts(st.board).size} district(s)`);

  delete st.board.owner[hub];
  check("sell the ground and it stops being a hub too",
    E.plotHasLH(st.board, beside) === false);
}

section("A headquarters banks its industry's price every quarter");
{
  const st = E.initGame(0, 31, ["A", "B"], undefined, false);
  const a = st.players[0];
  const plots = Object.keys(st.board.graph);
  const teBp = E.BP_DATA.find((x) => x.ind === "TE" && x.lvl === 1);
  const hq = { id: 900, bp: teBp, footprint: [plots[0]], levels: { [plots[0]]: 1 }, level: 1,
    isHQ: true, megacorpName: "T", distressed: false, upgraded: false, scored: true, quarterBuilt: 1 };
  a.businesses.push(hq);
  st.board.owner[plots[0]] = a.id;
  st.board.occupiedBy[plots[0]] = hq.id;

  const px = E.price(st.pm, "TE");
  const before = a.epBank;
  E.runMegacorpDividend(st, () => {});
  check(`it banks ${px} EP, which is what a unit of Technology sells for`,
    a.epBank - before === px, `+${a.epBank - before} EP at $${px}`);

  /* Sell the ground and the monument goes quiet. */
  delete st.board.owner[plots[0]];
  const before2 = a.epBank;
  E.runMegacorpDividend(st, () => {});
  check("with the land sold out from under it, it banks nothing",
    a.epBank === before2, `+${a.epBank - before2} EP`);
  check("and it draws no pot share either",
    E.businessCanProduce(st, hq) === false);
}

section("Its owner pays the ground rent out of pocket");
{
  const st = E.initGame(0, 33, ["A", "B"], undefined, false);
  const [a, b] = st.players;
  const plots = Object.keys(st.board.graph);
  const reBp = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 2);
  const hq = { id: 910, bp: reBp, footprint: [plots[0]], levels: { [plots[0]]: 2 }, level: 2,
    isHQ: true, megacorpName: "T", distressed: false, upgraded: false, scored: true, quarterBuilt: 1 };
  a.businesses.push(hq);
  st.board.owner[plots[0]] = b.id;               // standing on somebody else's land
  st.board.occupiedBy[plots[0]] = hq.id;

  check("the bill is $2 for every level standing there", E.hqRentDue(st, a) === 4, `$${E.hqRentDue(st, a)}`);
  a.cash = 50; b.cash = 0;
  E.payHqRent(st, a, () => {});
  check("the owner pays it and the landlord collects it",
    a.cash === 46 && b.cash === 4, `owner $${a.cash}, landlord $${b.cash}`);

  st.board.owner[plots[0]] = a.id;               // now it is their own land
  check("on your own land nothing moves", E.hqRentDue(st, a) === 0);
  a.cash = 50;
  E.payHqRent(st, a, () => {});
  check("and no money changes hands", a.cash === 50, `$${a.cash}`);
}

section("A headquarters scores for the district that grew around it");
{
  const st = E.initGame(0, 21, ["A", "B"], undefined, false);
  const [a, b] = st.players;
  const plots = Object.keys(st.board.graph);
  const reBp = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 1);
  /* a plot with at least two ORTHOGONAL neighbours, so we can build beside it */
  const hub = plots.find((k) => E.orthOf(st.board, k).length >= 2);
  const [n1, n2] = E.orthOf(st.board, hub);
  const hq = { id: 800, bp: reBp, footprint: [hub], levels: { [hub]: 1 }, level: 1, isHQ: true,
    megacorpName: "T", distressed: false, upgraded: false, scored: true, quarterBuilt: 1 };
  a.businesses.push(hq);
  st.board.owner[hub] = a.id;
  st.board.occupiedBy[hub] = hq.id;

  check("an isolated headquarters counts nothing", E.hqNeighbours(st, hq) === 0);

  const mk = (id, pk, distressed) => {
    const biz = { id, bp: reBp, footprint: [pk], levels: { [pk]: 1 }, level: 1, upgraded: false,
      distressed, scored: true, quarterBuilt: 1 };
    b.businesses.push(biz);
    st.board.owner[pk] = b.id;
    st.board.occupiedBy[pk] = biz.id;
    return biz;
  };
  mk(810, n1, false);
  check("one company beside it counts one", E.hqNeighbours(st, hq) === 1);
  mk(811, n2, true);
  check("a distressed shell belongs to the bank and does not count",
    E.hqNeighbours(st, hq) === 1, `counted ${E.hqNeighbours(st, hq)}`);

  const before = E.epTotal(a);
  E.finalizeGame(st);
  const gained = E.epTotal(a) - before;
  const districtEP = (a.epLog || []).filter((e) => String(e.label).startsWith("Megacorp district"))
    .reduce((s2, e) => s2 + e.amount, 0);
  check(`it scores ${E.MEGACORP_NEIGHBOUR_EP} EP for that one neighbour`,
    districtEP === E.MEGACORP_NEIGHBOUR_EP, `${districtEP} EP`);
  check("which is one company level's worth, so the number reads like the rest of the board",
    E.MEGACORP_NEIGHBOUR_EP === 3);
}

/* ------------------------------------------------------------- persona: UT */
section("Personas - Concession Holder");
{
  const st = E.initGame(1, 17, ["A"], undefined, false);
  const a = st.players[0];
  a.persona = "gov_rel";
  const utBp = E.BP_DATA.find((x) => x.ind === "UT" && x.lvl === 1);
  const mine = Object.keys(st.board.graph)[0];
  const theirs = Object.keys(st.board.graph).find((k) => {
    const c = st.board.cellOf[k], m = st.board.cellOf[mine];
    return `${c.r},${c.c}` !== `${m.r},${m.c}`;
  });
  st.board.owner[mine] = a.id;
  const biz = { id: 600, bp: utBp, footprint: [mine], level: 1, upgraded: false, distressed: false, scored: false, quarterBuilt: 1 };
  a.businesses.push(biz);
  const base = E.price(st.pm, "UT");
  check("+$1 above the current price, everywhere", E.unitPrice(st, a, biz) === base + 1);
  check("no extra in a district where it owns no land", E.unitPrice(st, a, biz, null) === base + 1);
}

/* ------------------------------------------------------------- renovation */
section("Renovation - level always, scaling type from level 2 up");
{
  const shell = (ind, level) => ({ level, bp: E.BP_DATA.find((x) => x.ind === ind && x.lvl === level) });
  const card = (ind, lvl) => E.BP_DATA.find((x) => x.ind === ind && x.lvl === lvl);
  // UT/MA/TE are horizontal, RE/HO/HC vertical
  check("a level-1 horizontal shell takes a level-1 vertical card",
    E.renovationEligible(shell("UT", 1), card("RE", 1)) === true);
  check("a level-1 vertical shell takes a level-1 horizontal card",
    E.renovationEligible(shell("HC", 1), card("TE", 1)) === true);
  check("a level-2 horizontal shell REFUSES a level-2 vertical card",
    E.renovationEligible(shell("UT", 2), card("RE", 2)) === false);
  check("a level-2 vertical shell REFUSES a level-2 horizontal card",
    E.renovationEligible(shell("HC", 2), card("MA", 2)) === false);
  check("a level-3 horizontal shell REFUSES a level-3 vertical card",
    E.renovationEligible(shell("MA", 3), card("HO", 3)) === false);
  check("a level-2 horizontal shell accepts another horizontal level-2 card",
    E.renovationEligible(shell("UT", 2), card("TE", 2)) === true);
  check("a level-3 vertical shell accepts another vertical level-3 card",
    E.renovationEligible(shell("HC", 3), card("HO", 3)) === true);
  check("levels must always match", E.renovationEligible(shell("UT", 2), card("TE", 3)) === false);
}

/* ------------------------------------------------------------------ ties */
section("Scoring - tiebreak");
{
  const mk = (ep, cash, discs) => ({ epBank: ep, cash, discsInBank: discs, businesses: [] });
  const a = mk(30, 10, 0), b = mk(30, 40, 1), c = mk(31, 0, 0);
  const order = [a, b, c].sort(E.finalRank);
  check("more EP wins", order[0] === c);
  check("a tie on EP goes to more money", order[1] === b);
  const d = mk(30, 40, 2), e = mk(30, 40, 0);
  check("a tie on EP and money goes to fewer loan discs", [d, e].sort(E.finalRank)[0] === e);
}

/* --------------------------------------------------------------- constants */
section("Other constants");
check("12 discs each", E.DISCS_PER_PLAYER === 12);
check("5 company slots", E.COMPANY_SLOTS === 5);
check("loan buy-back $30 / $35 / $40 at year ends",
  E.LOAN_REPAY_RATE[4] === 30 && E.LOAN_REPAY_RATE[8] === 35 && E.LOAN_REPAY_RATE[12] === 40);
check("Blueprint sale $4 / $8 / $12", E.BP_SELL_PRICE[1] === 4 && E.BP_SELL_PRICE[2] === 8 && E.BP_SELL_PRICE[3] === 12);
check("16 Megacorp tiles, 8 to 22 EP",
  E.MEGACORP_TILES.length === 16 && Math.min(...E.MEGACORP_TILES.map((t) => t[2])) === 8
  && Math.max(...E.MEGACORP_TILES.map((t) => t[2])) === 22);

/* ------------------------------------------------------------ the tiles */
section("Megacorp tiles - the printed table, tile by tile");
{
  // name, {level: count}, EP, and how many companies that combination consumes
  const PRINTED = [
    ["Local Syndicate", { 1: 3 }, 8, 3],
    ["Founders\u2019 Pact", { 1: 2, 2: 1 }, 9, 3],
    ["Continental Holdings", { 1: 4 }, 10, 4],
    ["Twin Ventures", { 1: 1, 2: 2 }, 10, 3],
    ["Silent Merger", { 2: 3 }, 11, 3],
    ["Neighborhood Holdings", { 1: 3, 2: 1 }, 12, 4],
    ["Regional Consolidated", { 2: 2, 3: 1 }, 13, 3],
    ["Crosstown Alliance", { 1: 2, 2: 2 }, 13, 4],
    ["Metro Trust", { 2: 1, 3: 2 }, 14, 3],
    ["Crossroads Deal", { 1: 1, 2: 3 }, 14, 4],
    ["Skyline Consolidated", { 3: 3 }, 15, 3],
    ["Apex Group", { 2: 2, 3: 2 }, 16, 4],
    ["Titan Industries", { 3: 2, 4: 1 }, 17, 3],
    ["Colossus Group", { 3: 4 }, 19, 4],
    ["Empire Holdings", { 2: 1, 3: 2, 4: 1 }, 20, 4],
    ["Omnicorp", { 3: 3, 4: 1 }, 22, 4],
  ];
  check("the same 16 tiles, in the same order", E.MEGACORP_TILES.length === PRINTED.length);
  PRINTED.forEach(([name, combo, ep, n], i) => {
    const t = E.MEGACORP_TILES[i] || [];
    const same = t[0] === name && JSON.stringify(t[1]) === JSON.stringify(combo) && t[2] === ep;
    const consumes = Object.values(combo).reduce((a, b) => a + b, 0);
    check(`${name}: ${ep} EP, ${n} companies`, same && consumes === n,
      same ? "" : `engine has ${t[0]} ${JSON.stringify(t[1])} ${t[2]} EP`);
  });
  const eps = E.MEGACORP_TILES.map((t) => t[2]);
  check("values never step backwards down the table",
    eps.every((v, i) => i === 0 || v >= eps[i - 1]));
}

/* --------------------------------------------------------- persona names */
section("Persona names");
{
  const WANT = {
    tech_savvy: ["TE", "Systems Architect"],
    preventive: ["HC", "Public Health Director"],
    product_mgr: ["MA", "White-Label Supplier"],
    customer_or: ["HO", "Resort Developer"],
    supply_chain: ["RE", "Supply Chain Expert"],
    gov_rel: ["UT", "Concession Holder"],
  };
  check("six personas, one per industry", Object.keys(E.PERSONAS).length === 6
    && new Set(Object.values(E.PERSONAS).map((p) => p.ind)).size === 6);
  for (const [key, [ind, name]] of Object.entries(WANT)) {
    const p = E.PERSONAS[key];
    check(`${ind}: ${name}`, !!p && p.ind === ind && p.name === name, p ? p.name : "missing");
  }
}

/* ---------------- what v13 changed ----------------
   Five rules that were optional in v12 are the printed rules now. Each is pinned
   here against the sentence in the book that states it. */
section("v13: the rules that used to be variants");
{
  const st = E.initGame(3, 5, ["You"], undefined, true, undefined);
  check("every optional rule is off by default", E.VARIANT_KEYS.every((k) => st.variants[k] === false),
    E.VARIANT_KEYS.join(", "));

  // "The moment a company is built it takes 2 EP per level, placed on its card."
  check("a company level is worth 2 EP", E.levelEP(st) === 2);
  const me = E.byId(st, 0);
  Object.keys(st.board.graph).slice(0, 4).forEach((k) => { st.board.owner[k] = me.id; });
  const plot = Object.keys(st.board.owner).find((k) => st.board.owner[k] === me.id);
  const bp = E.BP_DATA.find((x) => x.ind === "HC" && x.lvl === 1);
  const biz = { id: 9001, bp, footprint: [plot], level: 2, upgraded: false, distressed: false,
    isHQ: false, scored: false, quarterBuilt: 1 };
  me.businesses.push(biz);
  st.board.occupiedBy[plot] = biz.id;
  const bankBefore = me.epBank;
  E.scoreCompanyOnCompletion(st, me, biz);
  check("and it scores the moment it is built, straight into the bank",
    me.epBank - bankBefore === 4 && biz.scored === true, `banked ${me.epBank - bankBefore} EP`);

  // "The Real-Estate Mogul and The Omnipresent are awarded [at every year end]"
  check("the land awards pay at every year end", E.landPayouts(st) === 3, `${E.landPayouts(st)} payouts`);

  // "Each industry deck is shuffled whole, so any level can be sitting on top"
  let sawHigh = false;
  for (let seed = 1; seed <= 12; seed++) {
    const s2 = E.initGame(3, seed, ["You"], undefined, false, undefined);
    for (const ind of E.INDUSTRIES) if (s2.decks[ind][0] && s2.decks[ind][0].lvl > 1) sawHigh = true;
  }
  check("the decks are shuffled whole, so a big card can be on top from the first pick", sawHigh);

  // "a new Logistic Hub being built on an empty plot"
  check("hubs stand on plots", st.board.lhOnPlots === true);

  // "Personas are dealt to everyone by default"
  check("personas are dealt when the table asks for them",
    st.players.every((p) => !!p.persona), st.players.map((p) => p.persona).join(", "));
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed - the engine matches Rulebook v13\n");
process.exit(fails ? 1 : 0);
