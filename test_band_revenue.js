/* Revenue by band, eight quarters, and rows open from the first quarter - the v23 rules.

   THREE THINGS CHANGED AT ONCE in v23, all three measured against the way the game
   sold up to v22, and each of them is kept behind a variant that puts the old rule
   back so the two can be played side by side:

     Revenue by band    a company is paid price x a multiplier read from the number of
                        demand icons it reaches, in one go, with nothing delivered and
                        nothing recycled. "Revenue by the unit" sells it the old way.
     Eight quarters     the standard game is two years. "Three-year game" plays twelve.
     Rows open from Q1  rows 3 and 4 of every district are open from the start.
                        "Rows 3-4 open in Year 2" locks them until Quarter 5 again.

   This pins the band table itself (every level has a low and a high threshold and a
   rising multiplier, Technology's in whole icons), the payout (price times multiplier,
   paid to every producing company without a delivery phase), the two personas that
   change the price a band multiplies, the icon count (icons, not units, so Technology's
   doubler is not counted twice), the quarter count under each variant, and the rows.

   Run: node test_band_revenue.js */
const fs = require("fs"), path = require("path"), vm = require("vm");

function loadEngine() {
  const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
  const cut = src.indexOf("/* ============================== REACT UI ============================== */");
  const logic = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, Map, String, Number, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.E = { initGame, byId, BP_DATA, INDUSTRIES, VARIANTS, normaliseVariants, hasVariant, logEntry,
      BAND_TABLE, BAND_LABEL, bandFor, bandIcons, bandPrice, bandRevenue, runBandRevenue, bestBandRevenueFor,
      unitRevenueOn, continueProduction, humanDeliveryQueue, placeableFor, eligibleSlotsFor, slotOpen,
      finalQuarterOf, yearEndsOf, landPayouts, isBeginner, price, moveMarker, setConcession, concessionOn,
      runConcessionErosion, advanceDraft, startPlanning, advancePlanning, mulberry32, activeBiz,
      businessCanProduce, launchScore, endgameRushers };
  `, sandbox);
  return box.E;
}
const E = loadEngine();

let failures = 0;
const check = (label, cond, note = "") => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${note ? `  [${note}]` : ""}`);
  if (!cond) failures++;
};
const section = (t) => console.log(`\n${t}`);
const quiet = () => {};
const game = (variants, seed = 5) => E.initGame(3, seed, ["You"], undefined, false, variants);
const districtOf = (st, plot) => { const c = st.board.cellOf[plot]; return `${c.r},${c.c}`; };

/* Put a company straight onto the board, on a free plot in a district that carries a
   row of its industry - `rowAt` says which row, so a scenario can choose a district
   whose FIRST row is the industry (which makes its last row the same industry, since
   the first and last rows of a district always match). The action economy is not what
   is under test. */
function plant(st, p, ind, level = 1, rowAt = null) {
  const bp = E.BP_DATA.find((x) => x.ind === ind && x.lvl === level) || E.BP_DATA.find((x) => x.ind === ind && x.lvl === 1);
  let plot = null;
  for (const k of Object.keys(st.board.graph)) {
    if (k in st.board.owner || k in st.board.occupiedBy) continue;
    const t = st.demand.tiles[districtOf(st, k)];
    if (!t) continue;
    if (rowAt === null ? t.rows.includes(ind) : t.rows[rowAt] === ind) { plot = k; break; }
  }
  if (!plot) throw new Error(`no free plot in a district with a ${ind} row at ${rowAt}`);
  st.board.owner[plot] = p.id;
  const biz = { id: 7000 + p.businesses.length, bp, footprint: [plot], level, upgraded: false,
    distressed: false, isHQ: false, scored: true, quarterBuilt: st.quarter };
  st.board.occupiedBy[plot] = biz.id;
  p.businesses.push(biz);
  return biz;
}

/* ---------------------------------------------------------------- the table */
section("The band table: two thresholds and a rising multiplier for every level");
{
  let shape = true, rising = true, teWhole = true;
  for (const ind of E.INDUSTRIES) {
    for (let lvl = 1; lvl <= 4; lvl++) {
      const r = E.BAND_TABLE[ind][lvl];
      if (!r || !(r.a >= 1 && r.b > r.a) || r.m.length !== 3) shape = false;
      if (!(r.m[0] <= r.m[1] && r.m[1] <= r.m[2] && r.m[0] >= 1)) rising = false;
      if (ind === "TE" && (r.a % lvl || r.b % lvl)) teWhole = false;
    }
  }
  check("every industry and level has a low threshold, a higher one, and three multipliers", shape);
  check("the multipliers never fall as the band rises, and the lowest band still pays", rising);
  check("Technology's thresholds are whole multiples of its level, so they are counted in icons", teWhole);
  const r = E.BAND_TABLE.HC[1];
  check(`below the low threshold is band $ (HC L1: ${r.a - 1} icons)`, E.bandFor("HC", 1, r.a - 1).band === 0 && E.bandFor("HC", 1, r.a - 1).mult === r.m[0]);
  check(`the low threshold is band $$ (${r.a} icons)`, E.bandFor("HC", 1, r.a).band === 1 && E.bandFor("HC", 1, r.a).mult === r.m[1]);
  check(`the high threshold is band $$$ (${r.b} icons)`, E.bandFor("HC", 1, r.b).band === 2 && E.bandFor("HC", 1, r.b).mult === r.m[2]);
  check("a level above the table is read as level 4", E.bandFor("HC", 7, 100).mult === E.BAND_TABLE.HC[4].m[2]);
  check("the three bands are labelled $, $$ and $$$", E.BAND_LABEL.join("") === "$$$$$$");
}

/* ------------------------------------------------------------- the payout */
section("A company is paid price x band for the icons it reaches, nothing per unit");
{
  const st = game(undefined);
  const me = E.byId(st, 0);
  me.cash = 100;
  const biz = plant(st, me, "HC", 1, 0);   // HC is row 1, so it is row 4 too
  const r = E.bandRevenue(st, me, biz);
  check("a level-1 company in a district whose first and last rows are its industry reaches 2 icons",
    r.icons === 2, `${r.icons} icons`);
  check("two icons is band $$ for Healthcare at level 1", r.band === 1 && r.mult === E.BAND_TABLE.HC[1].m[1]);
  check(`so it is paid ${r.mult} x $${r.px} = $${r.mult * r.px}`, r.revenue === r.mult * E.price(st.pm, "HC"));
  const logs = [];
  const before = me.cash;
  E.runBandRevenue(st, (m, pid) => logs.push(E.logEntry(m, pid)));
  check("runBandRevenue pays exactly that into the owner's cash", me.cash - before === r.revenue, `+$${me.cash - before}`);
  check("and says so in the log", logs.some((l) => /reaches 2 icons: band \$\$ pays \d+ x \$\d+ = \$\d+\./.test(l.msg)),
    logs.map((l) => l.msg).join(" | "));
  check("the printed production is not what is paid", r.revenue !== biz.bp.prod * E.price(st.pm, "HC") || biz.bp.prod === r.mult);
}

section("Closing the quarter never hands a human the board");
{
  const st = game(undefined);
  const me = E.byId(st, 0);
  me.cash = 200;
  plant(st, me, "HC", 1, 0);
  st.quarter = 2;
  const logs = [];
  E.continueProduction(st, (m, pid) => logs.push(E.logEntry(m, pid)), E.mulberry32(9));
  check("under the standard rules there is no delivering phase", st.phase !== "delivering", st.phase);
  check("the band line was logged for the company", logs.some((l) => /band \$+ pays/.test(l.msg)));
  check("revenue by the unit is off", !E.unitRevenueOn(st));
}

section("'Revenue by the unit' puts the delivery back");
{
  const st = game({ unitRevenue: true });
  const me = E.byId(st, 0);
  me.cash = 200;
  const biz = plant(st, me, "HC", 1, 0);
  st.quarter = 2;
  check("the variant is on", E.unitRevenueOn(st));
  check("the human has something to deliver", E.humanDeliveryQueue(st, me).some((b) => b.id === biz.id));
  E.continueProduction(st, quiet, E.mulberry32(9));
  check("so the quarter stops in the delivering phase, on the human", st.phase === "delivering" && st.awaitingPlayerId === me.id,
    `${st.phase} / awaiting ${st.awaitingPlayerId}`);
}

/* ---------------------------------------------------------------- icons */
section("Icons are counted in icons: Technology's doubler is folded into its multipliers");
{
  const st = game(undefined, 7);
  const me = E.byId(st, 0);
  const biz = plant(st, me, "TE", 1, 0);
  const icons = E.eligibleSlotsFor(st, biz, me).filter((s) => !s.cross).length;
  check(`a level-1 Technology company reaching ${icons} icons could place ${icons * 2} units`,
    E.placeableFor(st, me, biz) === icons * 2);
  check("but its band reads the icons, not the units", E.bandIcons(st, me, biz) === icons, `${E.bandIcons(st, me, biz)}`);
}

section("The two personas that change the price a band multiplies");
{
  /* The Concession Holder: Utilities sells a dollar over the market in a quarter the
     concession is on, and the Utilities price falls a step at the end of it. */
  const st = game(undefined, 11);
  const me = E.byId(st, 0);
  me.persona = "gov_rel";
  const biz = plant(st, me, "UT", 1);
  const base = E.price(st.pm, "UT");
  check(`off, Utilities is paid at the market price $${base}`, E.bandRevenue(st, me, biz).px === base);
  E.setConcession(st, me, true);
  check(`on, the band multiplies $${base + 1}`, E.bandRevenue(st, me, biz).px === base + 1);
  E.runBandRevenue(st, null);
  check("being paid at the premium counts as using it", !!(st.concessionUsed && st.concessionUsed[me.id]));
  E.runConcessionErosion(st, quiet);
  check(`so the Utilities price falls to $${base - 1} at the end of the quarter`, E.price(st.pm, "UT") === base - 1);
  check("and the switch resets", !E.concessionOn(st, me));
}
{
  /* The White-Label Supplier: Manufacturing is paid the best price among the rows of its
     own district, its own row included. */
  const st = game(undefined, 13);
  const me = E.byId(st, 0);
  const biz = plant(st, me, "MA", 1);
  const tile = st.demand.tiles[districtOf(st, biz.footprint[0])];
  const other = tile.rows.find((r) => r !== "MA");
  E.moveMarker(st.pm, other, 8);   // +$4 on a neighbouring row's industry
  const ma = E.price(st.pm, "MA"), hi = E.price(st.pm, other);
  check(`without the persona Manufacturing is paid its own price $${ma}`, E.bandPrice(st, me, biz) === ma);
  me.persona = "product_mgr";
  check(`with it, the best price in its district, $${hi} for ${other}`, hi > ma && E.bandPrice(st, me, biz) === hi);
}

/* ---------------------------------------------------------------- rows */
section("Rows 3 and 4 are open from Quarter 1");
{
  const st = game(undefined, 17);
  const me = E.byId(st, 0);
  const biz = plant(st, me, "HC", 1, 0);
  const d = districtOf(st, biz.footprint[0]);
  check("the flag is off on the standard pool", !st.demand.lateRows);
  check("row 4 is open in Q1", E.slotOpen(st.demand, d, 3, 0, 1));
  check("so the company reaches both its rows from the first quarter", E.bandIcons(st, me, biz) === 2);

  const late = game({ lateRows: true }, 17);
  const you = E.byId(late, 0);
  const clinic = plant(late, you, "HC", 1, 0);
  const d2 = districtOf(late, clinic.footprint[0]);
  check("under 'Rows 3-4 open in Year 2' the pool carries the lock", late.demand.lateRows === true);
  check("row 4 is closed in Q1", !E.slotOpen(late.demand, d2, 3, 0, 1));
  check("and open in Q5", E.slotOpen(late.demand, d2, 3, 0, 5));
  check("so the same company reaches one icon in Year 1", E.bandIcons(late, you, clinic) === 1);
  late.quarter = 5;
  check("and two in Year 2", E.bandIcons(late, you, clinic) === 2);
}

/* ------------------------------------------------------------- quarters */
section("The standard game is eight quarters; the three-year game is twelve");
{
  const plain = game(undefined), long = game({ longGame: true }), beg = game({ beginner: true });
  check("eight quarters as standard", E.finalQuarterOf(plain) === 8);
  check("twelve under 'Three-year game'", E.finalQuarterOf(long) === 12);
  check("the beginner game is still eight", E.isBeginner(beg) && E.finalQuarterOf(beg) === 8);
  check("two year ends as standard, three in the long game",
    JSON.stringify(E.yearEndsOf(plain)) === "[4,8]" && JSON.stringify(E.yearEndsOf(long)) === "[4,8,12]");
  check("so the land awards pay twice, or three times", E.landPayouts(plain) === 2 && E.landPayouts(long) === 3);
  check("the three v23 variants are on offer", ["unitRevenue", "longGame", "lateRows"].every((k) => E.VARIANTS.some((v) => v.key === k)));
  check("and normalise like any other", E.normaliseVariants({ longGame: true }).longGame === true && !E.normaliseVariants(null).longGame);
}

section("Full bot games end on the last quarter of their calendar");
{
  const play = (variants, seed) => {
    const st = E.initGame(2, seed, ["Seat 1"], undefined, true, variants);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, quiet); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), quiet);
    return st;
  };
  let okShort = true, okLong = true, reached8 = 0, reached12 = 0, err = null;
  for (let seed = 1; seed <= 6; seed++) {
    try {
      const a = play(undefined, seed);
      if (a.phase !== "gameover" || a.quarter > 8) okShort = false;
      if (a.quarter === 8) reached8++;
      if (a.quarter < 8 && !E.endgameRushers(a).length) okShort = false;
      const b = play({ longGame: true }, seed);
      if (b.phase !== "gameover" || b.quarter > 12) okLong = false;
      if (b.quarter === 12) reached12++;
    } catch (e) { err = err || e; }
  }
  check("six three-seat games finish by Q8, early only when a second Megacorp called it", okShort && !err && reached8 > 0,
    err ? String(err.message) : `${reached8}/6 ran to Q8`);
  check("the same seeds under the three-year game run to Q12", okLong && !err && reached12 > 0, `${reached12}/6 ran to Q12`);
}

/* ---------------------------------------------------------------- bots */
section("The bots price a Blueprint through its band");
{
  const st = game(undefined, 21);
  const me = E.byId(st, 0);
  const bp = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 1);
  const px = E.price(st.pm, "RE");
  check("with no plot to stand on, a Blueprint is valued at its middle band", E.bestBandRevenueFor(st, me, bp, px) === px * E.BAND_TABLE.RE[1].m[1]);
  const plot = Object.keys(st.board.graph).find((k) => !(k in st.board.owner));
  st.board.owner[plot] = me.id;
  const take = E.bestBandRevenueFor(st, me, bp, px);
  check("with one, at what that plot would actually be paid", take >= px * E.BAND_TABLE.RE[1].m[0] && take <= px * E.BAND_TABLE.RE[1].m[2], `$${take}`);
  me.cash = 200;
  check("and launchScore is a finite number for it", Number.isFinite(E.launchScore(st, me, bp, "balanced")));
}

console.log(failures ? `\n${failures} check(s) failed\n` : "\nall checks passed\n");
process.exit(failures ? 1 : 0);
