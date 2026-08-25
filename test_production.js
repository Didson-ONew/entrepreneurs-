/* A company sells exactly what it produces. No more.

   Manufacturing's cross-sell and Hospitality's neighbour trade are ROUTES for that
   production, not extra output. Cross-selling used to run on a budget of its own, so a
   level-2 Manufacturing with 6 production really sold 8; Hospitality's neighbour trade
   was taken off the top before the demand board was even looked at, which spent
   contested icons' worth of goods on uncontested neighbours.

   Run: node test_production.js
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
    box.exports = { initGame, BP_DATA, byId, activeBiz, mulberry32, doLaunch, autoDeliver,
      bizProd, bizInd, price, eligibleSlotsFor, hoBonusUnits, placeableFor, orthOf,
      slotIndustry, deliverToSlot, footprintDistricts, exchangeRate, INDUSTRIES };
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

/* A run of orthogonally connected plots, so horizontal builds are possible. */
function connectedRun(st, n) {
  for (const start of Object.keys(st.board.cellOf)) {
    const run = [start];
    let ok = true;
    while (run.length < n) {
      const next = E.orthOf(st.board, run[run.length - 1]).find((k) => !run.includes(k));
      if (!next) { ok = false; break; }
      run.push(next);
    }
    if (ok && run.length === n) return run;
  }
  return null;
}

/* Count how many demand slots the whole board has open for this company right now. */
/* `own` is counted in UNITS, not icons: an icon absorbs its own column, so a level-3
   company facing a clean row of its industry takes 1 + 2 + 3 = 6 units from it.
   `ownIcons` keeps the raw cell count for the tests that are about icons being
   consumed rather than units being sold. Cross-sell still moves one unit per icon. */
function openSlots(st, biz, owner) {
  const all = E.eligibleSlotsFor(st, biz, owner);
  const own = all.filter((s) => !s.cross);
  return {
    own: own.reduce((n, s) => n + (s.levelIdx + 1), 0),
    ownIcons: own.length,
    cross: all.filter((s) => s.cross).length,
  };
}

/* Build one company of a given industry and level on land the player owns, and return
   what it earned from a single delivery round. */
function buildOne(seed, ind, lvl, persona, neighbour) {
  const st = E.initGame(2, seed, ["You"], undefined, false, undefined);
  const me = E.byId(st, 0);
  if (persona) me.persona = persona;
  /* A connected run of plots to build on. Not the whole board: owning a plot costs a
     disc, and the disc limit is the whole point of the disc rule. */
  const run = connectedRun(st, 3);
  if (!run) return null;
  run.forEach((k) => { st.board.owner[k] = me.id; });
  const bp = E.BP_DATA.find((x) => x.ind === ind && x.lvl === lvl);
  me.hand = [bp]; me.cash = 1000;
  if (!E.doLaunch(st, me, bp, E.mulberry32(seed), quiet)) return null;
  const biz = E.activeBiz(me)[0];
  /* Hospitality only has neighbours to sell to if somebody built one. Plant a rival's
     company on the next plot along, by hand, so the ability has something to reach. */
  if (neighbour) {
    const spare = run.find((k) => !biz.footprint.includes(k));
    if (!spare) return null;
    const rival = st.players[1];
    const nbp = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 1);
    const nb = { id: 9000 + seed, bp: nbp, footprint: [spare], levels: { [spare]: 1 }, level: 1,
      upgraded: false, distressed: false, scored: true, epOnCard: 0, quarterBuilt: 1 };
    rival.businesses.push(nb);
    st.board.owner[spare] = rival.id;
    st.board.occupiedBy[spare] = nb.id;
  }
  return { st, me, biz, prod: E.bizProd(biz), px: E.price(st.pm, ind) };
}
/* The same, delivered. Inspect the board through buildOne first if you need to see the
   demand slots BEFORE they are taken. */
function earnFrom(seed, ind, lvl, persona) {
  const r = buildOne(seed, ind, lvl, persona);
  if (!r) return null;
  const before = r.me.cash;
  E.autoDeliver(r.st, r.me, r.biz);
  return { ...r, earned: r.me.cash - before };
}

/* ================================================ nothing sells more than it makes */
section("No company can earn more than its production is worth");
{
  let checked = 0, worst = null;
  for (let seed = 1; seed <= 40; seed++) {
    for (const ind of E.INDUSTRIES) {
      for (const lvl of [1, 2, 3]) {
        const r = earnFrom(seed, ind, lvl);
        if (!r) continue;
        checked++;
        /* Every unit is worth at most the best price on the board, and Technology
           doubles what a single icon takes - so the ceiling is production x best price. */
        const bestPx = Math.max(...E.INDUSTRIES.map((i) => E.price(r.st.pm, i)));
        const ceiling = r.prod * bestPx;
        if (r.earned > ceiling && (!worst || r.earned - ceiling > worst.over)) {
          worst = { seed, ind, lvl, earned: r.earned, ceiling, over: r.earned - ceiling, prod: r.prod };
        }
      }
    }
  }
  check(`checked ${checked} companies across 40 boards`, checked > 400, `${checked}`);
  check("not one sold more than it produced",
    worst === null,
    worst && `${worst.ind} L${worst.lvl} seed ${worst.seed}: made ${worst.prod} units, earned $${worst.earned}, ceiling $${worst.ceiling}`);
}

/* ============================================================== Manufacturing */
/* How many demand icons are filled anywhere on the board right now. */
function filledIcons(st) {
  let n = 0;
  Object.values(st.demand.tiles).forEach((t) => t.filled.forEach((row) => row.forEach((v) => { if (v) n++; })));
  return n;
}

section("Manufacturing's cross-sell spends production, it does not add any");
{
  /* Demand is genuinely scarce - a company almost always outruns its reach - so the
     test is not "give it more places than goods", it is "count what left the factory". */
  let found = null, checked = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const b = buildOne(seed, "MA", 2);
    if (!b) continue;
    const s = openSlots(b.st, b.biz, b.me);
    if (!s.cross) continue;
    checked++;
    const before = b.me.cash, iconsBefore = filledIcons(b.st);
    E.autoDeliver(b.st, b.me, b.biz);
    const iconsFilled = filledIcons(b.st) - iconsBefore;
    const earned = b.me.cash - before;
    if (iconsFilled > b.prod || earned > b.prod * Math.max(...E.INDUSTRIES.map((i) => E.price(b.st.pm, i)))) {
      found = { seed, iconsFilled, earned, prod: b.prod };
      break;
    }
  }
  check(`checked ${checked} Manufacturing companies that had a cross-sell row open`, checked > 20, `${checked}`);
  check("none of them filled more icons than it had units, or earned more than they were worth",
    found === null,
    found && `seed ${found.seed}: ${found.prod} units, filled ${found.iconsFilled} icons, earned $${found.earned}`);
}

section("A White-Label Supplier is paid the better price, not a bigger pile");
{
  let bad = null, compared = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const plain = earnFrom(seed, "MA", 2);
    const wls = earnFrom(seed, "MA", 2, "product_mgr");
    if (!plain || !wls) continue;
    compared++;
    const bestPx = Math.max(...E.INDUSTRIES.map((i) => E.price(wls.st.pm, i)));
    if (wls.prod !== plain.prod || wls.earned > wls.prod * bestPx) {
      bad = { seed, earned: wls.earned, ceiling: wls.prod * bestPx, prod: wls.prod };
      break;
    }
  }
  check(`compared ${compared} boards with and without the persona`, compared > 30, `${compared}`);
  check("it only ever changed the price, never the number of units", bad === null,
    bad && `seed ${bad.seed}: ${bad.prod} units earned $${bad.earned}, ceiling $${bad.ceiling}`);
}

/* ================================================================ Hospitality */
section("Hospitality sells to its neighbours out of the same production");
{
  let bad = null, checked = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const b = buildOne(seed, "HO", 2, null, true);
    if (!b) continue;
    const bonus = E.hoBonusUnits(b.st, b.biz, b.me);
    if (bonus <= 0) continue;
    checked++;
    const s = openSlots(b.st, b.biz, b.me);
    const before = b.me.cash;
    E.autoDeliver(b.st, b.me, b.biz);
    const earned = b.me.cash - before;
    /* Before the fix this company would have sold `bonus` units to its neighbours AND
       its full production to icons. The ceiling is production, at the market price. */
    if (earned > b.prod * b.px) bad = { seed, earned, prod: b.prod, px: b.px, bonus, own: s.own };
    if (bad) break;
  }
  check(`checked ${checked} Hospitality companies with neighbours to sell to`, checked > 20, `${checked}`);
  check("none earned more than its production at the market price", bad === null,
    bad && `seed ${bad.seed}: ${bad.prod} units at $${bad.px} plus ${bad.bonus} neighbours -> earned $${bad.earned}`);
}

section("And it takes the contested demand icons first");
{
  /* Icons are first come first served; the businesses around a Hospitality company are
     not going anywhere. So every icon it can reach should be filled before a single unit
     goes to a neighbour. */
  let bad = null, checked = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const b = buildOne(seed, "HO", 2, null, true);
    if (!b) continue;
    const bonus = E.hoBonusUnits(b.st, b.biz, b.me);
    const s = openSlots(b.st, b.biz, b.me);
    if (bonus <= 0 || s.ownIcons <= 0) continue;
    checked++;
    /* Icons now cost different amounts - an icon absorbs its own column - so "it should
       have filled every icon it could reach" is no longer the right assertion: a level-3
       icon wants three units and the company may not have three left. The rule that DOES
       still hold is the one this test is about: no unit goes to a neighbour while a
       reachable icon is still open AND still affordable. That is checked exactly, by
       looking at what was left open afterwards rather than by re-deriving the delivery
       order the engine uses. */
    const before = E.eligibleSlotsFor(b.st, b.biz, b.me).filter((x) => !x.cross);
    E.autoDeliver(b.st, b.me, b.biz);
    const after = E.eligibleSlotsFor(b.st, b.biz, b.me).filter((x) => !x.cross);
    const key = (x) => `${x.tileKey}|${x.rowIdx}|${x.levelIdx}`;
    const stillOpen = new Set(after.map(key));
    const unitsToIcons = before.filter((x) => !stillOpen.has(key(x)))
      .reduce((n, x) => n + (x.levelIdx + 1) * E.exchangeRate(b.st, b.biz), 0);
    const spare = b.prod - unitsToIcons;             // what neighbours could have had
    if (spare > 0) {
      const affordable = after.some((x) => (x.levelIdx + 1) * E.exchangeRate(b.st, b.biz) <= spare);
      if (affordable) {
        bad = { seed, unitsToIcons, spare, bonus, prod: b.prod };
        break;
      }
    }
  }
  check(`checked ${checked} boards with both icons and neighbours available`, checked > 20, `${checked}`);
  check("every icon it could reach was taken before any unit went to a neighbour",
    bad === null,
    bad && `seed ${bad.seed}: ${bad.unitsToIcons} units to icons, ${bad.spare} spare, and an affordable icon was left open`);
}

/* =========================================================== the bot's estimate */
section("What the bot thinks a company can place matches the rule");
{
  let mismatch = null, checked = 0;
  for (let seed = 1; seed <= 60 && !mismatch; seed++) {
    for (const ind of E.INDUSTRIES) {
      const r = buildOne(seed, ind, 2);
      if (!r) continue;
      checked++;
      /* placeableFor is what the bot judges a card by. It must never claim a company
         can place more than the delivery loop would actually let it. */
      const claim = E.placeableFor(r.st, r.me, r.biz);
      const s = openSlots(r.st, r.biz, r.me);
      const real = s.own * E.exchangeRate(r.st, r.biz)
        + (ind === "MA" ? Math.min(r.biz.level, s.cross) : 0)
        + (ind === "HO" ? E.hoBonusUnits(r.st, r.biz, r.me) : 0);
      if (claim !== real) mismatch = { seed, ind, claim, real };
    }
  }
  check(`checked ${checked} companies`, checked > 200, `${checked}`);
  check("the estimate is the rule, not a copy of it", mismatch === null,
    mismatch && `${mismatch.ind} seed ${mismatch.seed}: claimed ${mismatch.claim}, rule says ${mismatch.real}`);
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
