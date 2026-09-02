/* ============================================================================
   AUDIT - should selling or merging a company push its industry's price UP?

   The proposal: a company leaving service is capacity leaving the market, so
   its own industry's price should rise one cell and each of its suppliers'
   should fall one - the exact mirror of what launching it did.

   It is the economically correct instinct. This measures three things before
   anyone builds it:

     1. WHAT WOULD ACTUALLY TRIGGER IT. The rule is described as being about
        selling. The counts say otherwise.

     2. WHAT IT COSTS TO MAINTAIN. Marker adjustments per game, now and under
        the proposal, and the worst single moment in a turn - which is the
        number that decides whether a rule is playable at a table.

     3. WHAT IT DOES TO PRICES. The same seeds played every way.

   THE BLOCKER, found before any of that: doRenovate and doReclaim bring a
   distressed structure back online WITHOUT calling onLaunch. Only the launch
   path moves markers. So under the naive proposal, sell -> renovate is a free
   pump: the sale lifts the price and putting the company straight back costs
   nothing. This audit therefore measures the proposal in two forms - naive,
   and with renovation re-applying the launch effect so a round trip nets zero.

   Run: node audit_sell_raises_price.js [gamesPerSize]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this script"); process.exit(2); }

/* Every needle is asserted before it is replaced. If any of these move, this
   stops rather than reporting numbers about a game that no longer exists. */
const NEEDLES = {
  sell: `  p.cash += recv; b.distressed = true;
  return recv;`,
  merge: `  match.have.forEach((b) => {
    if (b === hq) return;
    b.distressed = true;
  });`,
  renovate: `  distressedBiz.distressed = false;
  distressedBiz.bp = bp;`,
  reclaim: `  biz.distressed = false;
  biz.scored = false;          // it scores again for its new owner`,
};
for (const [k, v] of Object.entries(NEEDLES)) {
  if (!SRC.includes(v)) { console.error(`the ${k} path has changed shape - update this script`); process.exit(2); }
}

const PATCHES = {
  /* A sale: the company stops trading, so its own good gets scarcer and the
     things it was buying get less wanted. */
  sell: `  p.cash += recv; b.distressed = true;
  if (box.onRetire) box.onRetire(b, "sale");
  return recv;`,
  /* The Megacorp's name is passed through so the audit can tell one merge from
     the next - without it, consecutive merges look like a single enormous
     action and the "worst single action" figure runs away. */
  merge: `  match.have.forEach((b) => {
    if (b === hq) return;
    b.distressed = true;
    if (box.onRetire) box.onRetire(b, "merge", name);
  });`,
  /* Coming back online has to undo the retirement, or sell-then-renovate is a
     ratchet that lifts a price for free, every turn, forever. */
  renovate: `  distressedBiz.distressed = false;
  if (box.onReturn) box.onReturn(distressedBiz, bp);
  distressedBiz.bp = bp;`,
  reclaim: `  biz.distressed = false;
  if (box.onReturn) box.onReturn(biz, biz.bp);
  biz.scored = false;          // it scores again for its new owner`,
};

function buildEngine() {
  let body = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");
  for (const k of Object.keys(NEEDLES)) body = body.replace(NEEDLES[k], PATCHES[k]);
  const box = {};
  const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
  vm.createContext(sandbox);
  vm.runInContext(body + `
    box.E = { INDUSTRIES, IND_NAME, BASE_PRICE, PRICE_MIN, PRICE_MAX };
    box.E2 = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
               bizInd, price, moveMarker, SUPPLIER_CELLS, BUILT_CELLS };
  `, sandbox);
  return box;
}
const box = buildEngine();
const E = box.E, E2 = box.E2;

const GAMES = Number(process.argv[2] || 200);
const SIZES = [3, 4, 5, 6];
const INDS = E.INDUSTRIES;
const se2 = (p, n) => 100 * 2 * Math.sqrt(Math.max(p * (1 - p), 0) / n);

/* MODES
   off      the game as it ships - only launching moves a marker
   naive    retirement moves markets, renovation does not (the proposal as put)
   sound    retirement moves markets AND renovation puts it back
   cheap    MERGERS only, and only the absorbed company's own good moves up.
            No supplier side, so it is 3-4 slides on one action instead of 12,
            and it needs no renovation rule: a merger cannot be farmed the way a
            sale can, because it costs a Megacorp tile and two of those end the
            game.
   demand   MERGERS only, and only the SUPPLIER side: the absorbed companies
            stop buying, so each of their suppliers drops a cell, and their own
            good does not move. Same rarity and the same no-farming argument as
            cheap, aimed at the opposite end - because the industries that drift
            up too far are precisely the ones that get named as suppliers most.  */
function playOne(seed, seats, mode) {
  const st = E2.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
  if (st.players.length !== seats) throw new Error(`wanted ${seats} seats, got ${st.players.length}`);
  st.players[0].isHuman = false;
  if (st.phase === "drafting") { E2.advanceDraft(st, () => {}); E2.startPlanning(st); }

  /* One "slide" is one marker a player has to physically move. Launch slides
     happen in every mode; retire and return slides only in the modes that have
     them, so the three columns are like for like. `worst` is the most slides
     any single game action demanded - the number that decides whether a rule is
     playable at a table, because it is what one person does while five wait. */
  const tally = { sale: 0, merge: 0, returns: 0,
                  launchSlides: 0, retireSlides: 0, returnSlides: 0, worst: 0 };
  const depsOf = (b) => ((b && b.bp && b.bp.deps) || []).map((d) => d.ind);
  let pending = 0, pendingKey = null;   // slides inside the merge being resolved

  box.onRetire = (b, why, key) => {
    tally[why] += 1;
    if (mode === "off") return;
    if ((mode === "cheap" || mode === "demand") && why !== "merge") return;
    const ind = E2.bizInd(b);
    const ownMoves = mode !== "demand";
    const deps = mode === "cheap" ? [] : depsOf(b);
    const n = (ownMoves ? 1 : 0) + deps.length;
    if (!n) return;
    tally.retireSlides += n;
    /* A merge retires three or four companies in ONE action, so their slides
       land on the same player at the same moment and belong to one total. A new
       Megacorp name means a new action, so the running total starts again. */
    if (why === "merge" && key === pendingKey) pending += n;
    else { pending = n; pendingKey = why === "merge" ? key : null; }
    tally.worst = Math.max(tally.worst, pending);
    if (ownMoves) E2.moveMarker(st.pm, ind, -E2.BUILT_CELLS);          // its good gets scarcer
    deps.forEach((d) => E2.moveMarker(st.pm, d, -E2.SUPPLIER_CELLS));    // it buys nothing now
  };
  box.onReturn = (b, bp) => {
    tally.returns += 1;
    if (mode !== "sound") return;
    const ind = (bp && bp.ind) || E2.bizInd(b);
    const deps = ((bp && bp.deps) || []).map((d) => d.ind);
    tally.returnSlides += 1 + deps.length;
    tally.worst = Math.max(tally.worst, 1 + deps.length);
    E2.moveMarker(st.pm, ind, E2.BUILT_CELLS);
    deps.forEach((d) => E2.moveMarker(st.pm, d, E2.SUPPLIER_CELLS));
  };

  const series = {};
  INDS.forEach((i) => (series[i] = []));
  const record = () => INDS.forEach((i) => series[i].push(E2.price(st.pm, i)));
  E2.advancePlanning(st, E2.mulberry32(seed + 777), (msg) => {
    if (/^▶ Year \d+, Quarter \d+/.test(String(msg))) record();
  });
  record();
  box.onRetire = null; box.onReturn = null;

  /* The baseline: every company that ever existed slid 1 + (its suppliers)
     markers when it went up. That is the upkeep the game already asks for. */
  for (const p of st.players) for (const b of p.businesses) {
    const n = 1 + depsOf(b).length;
    tally.launchSlides += n;
    tally.worst = Math.max(tally.worst, n);
  }
  return { series, tally, lastQ: series[INDS[0]].length };
}

console.log(`Entrepreneurs - should retiring a company move the market?`);
console.log(`${GAMES} games at each of ${SIZES.length} table sizes, played five ways\n`);

/* ---------------------------------------------- 1. what would trigger it */
console.log("=".repeat(78));
console.log("1. WHAT ACTUALLY TRIGGERS THIS RULE");
console.log("=".repeat(78));
console.log("            retirements per game        share that are");
console.log("             sales      merges         MERGERS, not sales");
const trig = {};
for (const seats of SIZES) {
  let sale = 0, merge = 0, n = 0;
  for (let s = 1; s <= GAMES; s++) {
    let g; try { g = playOne(s, seats, "off"); } catch { continue; }
    sale += g.tally.sale; merge += g.tally.merge; n += 1;
  }
  trig[seats] = { sale: sale / n, merge: merge / n, n };
  const share = merge / Math.max(1, sale + merge);
  console.log(`${seats} players  ${(sale / n).toFixed(1).padStart(7)}${(merge / n).toFixed(1).padStart(12)}`
    + `${(100 * share).toFixed(0)}%`.padStart(24));
}
console.log(`
  The rule is described as being about SELLING, but selling a company is rare -
  it is mostly what a player does when they cannot pay their bills. Retiring a
  company is overwhelmingly something a MEGACORP does, by eating three or four
  companies at once. So this is not really a rule about the second-hand market.
  It is a rule that fires when somebody merges, and it would land as a price
  shock of three or four cells across several industries in a single action.`);

/* ------------------------------------------------------ 2. the upkeep */
console.log("\n" + "=".repeat(78));
console.log("2. WHAT IT COSTS TO MAINTAIN - marker slides per game");
console.log("=".repeat(78));
console.log("           as ships  naive   sound   cheap  demand    worst single action");
console.log("           (launch)                                    sound / cheap / demand");
for (const seats of SIZES) {
  const a = {}, worst = {};
  for (const mode of ["off", "naive", "sound", "cheap", "demand"]) {
    let slides = 0, w = 0, n = 0;
    for (let s = 1; s <= GAMES; s++) {
      let g; try { g = playOne(s, seats, mode); } catch { continue; }
      const t = g.tally;
      slides += t.launchSlides + t.retireSlides + t.returnSlides;
      w = Math.max(w, t.worst);
      n += 1;
    }
    a[mode] = slides / n; worst[mode] = w;
  }
  console.log(`${seats}p  `
    + ["off", "naive", "sound", "cheap", "demand"].map((m) => a[m].toFixed(0).padStart(8)).join("")
    + `${worst.sound} / ${worst.cheap} / ${worst.demand}`.padStart(24));
}
console.log(`
  "worst single action" is the most markers one player has to slide for one
  thing they did, with everybody else waiting. Launching a company is at most
  four. Forming a Megacorp under this rule retires three or four companies at
  once, and each of those is its own industry plus its suppliers.`);

/* ------------------------------------------------------- 3. the effect */
console.log("\n" + "=".repeat(78));
console.log("3. WHAT IT DOES TO PRICES - same seeds, played five ways, 4 players");
console.log("=".repeat(78));
const REF = 4;
const runs = {};
for (const mode of ["off", "naive", "sound", "cheap", "demand"]) {
  const t = {};
  INDS.forEach((i) => (t[i] = { finalSum: 0, below: 0, floor: 0, ceil: 0, move: 0, n: 0 }));
  for (let s = 1; s <= GAMES; s++) {
    let g; try { g = playOne(s, REF, mode); } catch { continue; }
    for (const i of INDS) {
      const ser = g.series[i], a = t[i];
      a.n += 1;
      a.finalSum += ser[ser.length - 1];
      if (ser.some((v) => v < E.BASE_PRICE[i])) a.below += 1;
      if (ser.some((v) => v === E.PRICE_MIN)) a.floor += 1;
      if (ser.some((v) => v === E.PRICE_MAX)) a.ceil += 1;
      for (let k = 1; k < ser.length; k++) a.move += Math.abs(ser[k] - ser[k - 1]);
    }
  }
  runs[mode] = t;
}
console.log("             base    final price               ever below base            $ moved");
console.log("                 off naiv sund chp dmnd   off naiv sund chp dmnd   off naiv sund chp dmnd");
for (const i of INDS) {
  const f = (m) => runs[m][i].finalSum / runs[m][i].n;
  const b = (m) => 100 * runs[m][i].below / runs[m][i].n;
  const v = (m) => runs[m][i].move / runs[m][i].n;
  console.log(`${E.IND_NAME[i].padEnd(12)}$${E.BASE_PRICE[i]} `
    + ["off", "naive", "sound", "cheap", "demand"].map((m) => f(m).toFixed(1).padStart(5)).join("") + "  "
    + ["off", "naive", "sound", "cheap", "demand"].map((m) => `${b(m).toFixed(0)}%`.padStart(6)).join("") + " "
    + ["off", "naive", "sound", "cheap", "demand"].map((m) => v(m).toFixed(1).padStart(6)).join(""));
}
const ceilAny = (m) => INDS.reduce((s, i) => s + runs[m][i].ceil, 0);
console.log(`\n  times any price reached the $10 ceiling, out of ${GAMES * INDS.length} industry-games:`);
console.log(`    ships ${ceilAny("off")}   naive ${ceilAny("naive")}   sound ${ceilAny("sound")}   cheap ${ceilAny("cheap")}   demand ${ceilAny("demand")}`);
