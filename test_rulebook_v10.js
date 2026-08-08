/* Pins the engine to Rulebook v10 on every point where the two had drifted apart.
   Each check names the clause it is enforcing, so a future rules change that breaks
   one of these tells you which sentence it just contradicted.

   Run: node test_rulebook_v10.js
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
      runMegacorpSyphon, claimMegacorp, canGoPublic, bestMegacorpMatch, activeBiz,
      companySlotsUsed, canLaunchMore, discsUsed, discsFree, finalRank, unitPrice,
      byId, BP_DATA, MEGACORP_TILES, STARTING, INDUSTRIES, BASE_PRICE, SCALING,
      LOAN_REPAY_RATE, BP_SELL_PRICE, DISCS_PER_PLAYER, COMPANY_SLOTS };
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
  UT: { base: 2, scale: "H", lv: [[15, 4, 4], [20, 7, 8], [30, 10, 16]] },
  RE: { base: 2, scale: "V", lv: [[10, 5, 4], [15, 9, 8], [25, 14, 16]] },
  HO: { base: 3, scale: "V", lv: [[10, 6, 3], [15, 10, 6], [25, 16, 12]] },
  MA: { base: 3, scale: "H", lv: [[20, 4, 3], [35, 7, 6], [60, 10, 12]] },
  HC: { base: 4, scale: "V", lv: [[20, 5, 2], [35, 9, 4], [60, 14, 8]] },
  TE: { base: 4, scale: "H", lv: [[15, 6, 2], [25, 10, 4], [40, 16, 8]] },
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
section("Prices - two steps in either direction move the price by $1");
{
  const pm = E.makePriceMatrix();
  const p0 = E.price(pm, "HO");
  pm.demand.HO += 1;
  const p1 = E.price(pm, "HO");
  pm.demand.HO += 1;
  const p2 = E.price(pm, "HO");
  check("one step of demand does not move the price", p1 === p0, `${p0} -> ${p1}`);
  check("two steps of demand move it $1", p2 === p0 + 1, `${p0} -> ${p2}`);
  const pm2 = E.makePriceMatrix();
  pm2.offer.HO += 1;
  const q1 = E.price(pm2, "HO");
  pm2.offer.HO += 1;
  const q2 = E.price(pm2, "HO");
  check("one step of supply does not move the price", q1 === p0, `${p0} -> ${q1}`);
  check("two steps of supply move it $1", q2 === p0 - 1, `${p0} -> ${q2}`);
  const pm3 = E.makePriceMatrix();
  pm3.offer.UT += 40;
  check("no price ever falls below $1", E.price(pm3, "UT") === 1);
}

/* -------------------------------------------------------------------- B2B */
section("B2B - one equal share each, remainder rides forward");
{
  const st = E.initGame(0, 7, ["A", "B"], undefined, false);
  const [a, b] = st.players;
  const mk = (owner, ind, level) => {
    const bp = E.BP_DATA.find((x) => x.ind === ind && x.lvl === 1);
    const biz = { id: 900 + owner.businesses.length + owner.id * 10, bp, footprint: [], level, upgraded: false, distressed: false, scored: false, epOnCard: 0, quarterBuilt: 1 };
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
  for (let i = 0; i < 3; i++) a.businesses.push({ id: 800 + i, bp, footprint: [], level: 1, upgraded: false, distressed: false, scored: false, epOnCard: 0, quarterBuilt: 1 });
  st.megacorpPool = [E.MEGACORP_TILES.find((t) => t[0] === "Local Syndicate")];
  check("now they can", E.canGoPublic(st, a) === true);
  const ok = E.claimMegacorp(st, a, () => {});
  check("the merge happens", ok === true);
  check("the first Megacorp of the game also takes the IPO tile (+5 EP)",
    st.ipoTileClaimed === true && a.epBank === 8 + 5, `banked ${a.epBank} EP`);
  check("one company survives as the headquarters", a.businesses.filter((x) => x.isHQ).length === 1);
  check("the rest go distressed", a.businesses.filter((x) => x.distressed).length === 2);
  check("the headquarters stops trading", E.activeBiz(a).length === 0);
  check("but it still locks a company slot", E.companySlotsUsed(a) === 1);
  check("and it still holds its disc", E.discsUsed(st, a) === 1);
}

/* --------------------------------------------------------- Megacorp siphon */
section("Megacorp - $5 from every industry it touches, not every neighbour");
{
  const st = E.initGame(0, 13, ["A", "B"], undefined, false);
  const [a, b] = st.players;
  const plots = Object.keys(st.board.graph);
  // find a plot with two neighbours, and put two RE companies on them
  const hub = plots.find((k) => [...st.board.graph[k]].length >= 2);
  const [n1, n2] = [...st.board.graph[hub]];
  const reBp = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 1);
  const hq = { id: 700, bp: reBp, footprint: [hub], level: 1, isHQ: true, megacorpName: "T", distressed: false, epOnCard: 0, quarterBuilt: 1 };
  a.businesses.push(hq);
  [n1, n2].forEach((pk, i) => {
    const biz = { id: 710 + i, bp: reBp, footprint: [pk], level: 1, upgraded: false, distressed: false, scored: false, epOnCard: 0, quarterBuilt: 1 };
    b.businesses.push(biz);
    st.board.occupiedBy[pk] = biz.id;
  });
  st.board.occupiedBy[hub] = hq.id;
  st.pots = Object.fromEntries(E.INDUSTRIES.map((i) => [i, 0]));
  st.pots.RE = 20;
  a.cash = 0;
  E.runMegacorpSyphon(st, () => {});
  check("two Retail neighbours are still one Retail pot, tapped once", a.cash === 5, `took $${a.cash}`);
  check("the pot loses exactly $5", st.pots.RE === 15);
}

/* ------------------------------------------------------------- persona: UT */
section("Personas - Government Relationship");
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
  const biz = { id: 600, bp: utBp, footprint: [mine], level: 1, upgraded: false, distressed: false, scored: false, epOnCard: 0, quarterBuilt: 1 };
  a.businesses.push(biz);
  const mineTile = (() => { const c = st.board.cellOf[mine]; return `${c.r},${c.c}`; })();
  const theirTile = (() => { const c = st.board.cellOf[theirs]; return `${c.r},${c.c}`; })();
  const base = E.price(st.pm, "UT");
  check("+$1 in a district where it owns land", E.unitPrice(st, a, biz, null, mineTile) === base + 1);
  check("+$2 in a district where it owns none", E.unitPrice(st, a, biz, null, theirTile) === base + 2);
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
check("10 discs each", E.DISCS_PER_PLAYER === 10);
check("5 company slots", E.COMPANY_SLOTS === 5);
check("loan buy-back $30 / $35 / $40 at year ends",
  E.LOAN_REPAY_RATE[4] === 30 && E.LOAN_REPAY_RATE[8] === 35 && E.LOAN_REPAY_RATE[12] === 40);
check("Blueprint sale $4 / $8 / $12", E.BP_SELL_PRICE[1] === 4 && E.BP_SELL_PRICE[2] === 8 && E.BP_SELL_PRICE[3] === 12);
check("16 Megacorp tiles, 8 to 25 EP",
  E.MEGACORP_TILES.length === 16 && Math.min(...E.MEGACORP_TILES.map((t) => t[2])) === 8
  && Math.max(...E.MEGACORP_TILES.map((t) => t[2])) === 25);

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed - the engine matches Rulebook v10\n");
process.exit(fails ? 1 : 0);
