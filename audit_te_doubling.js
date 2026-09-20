/* ============================================================================
   Does Technology's doubling actually fire, and why does it still recycle?

   The rule: a demand icon absorbs its level in goods, and a Technology company
   sells TWO per icon-level - so a clean row of three icons takes 12 of its units
   where it takes 6 of anybody else's. That lives in deliverToSlot, not in any bot
   heuristic, so a bot cannot "forget" it. What a bot can do is have nothing to
   sell into: icons already filled, no Technology row in reach, or a production
   figure that the doubling never binds on (a level-3 Technology makes 8, and a
   row would take 12 - the doubling is slack, not sales).

   So every delivery by every company is watched: what it made, what the open
   icons in its reach could absorb, what it sold, and - when units were left
   over - which of three things happened:

     NO ICON       nothing open in its industry anywhere it could reach
     ICONS SHORT   open icons, but their capacity was below the production
     CAPACITY OK   enough capacity in reach and STILL units left over - which
                   would be a bug in the delivery, not in the demand

   Run: node audit_te_doubling.js [games] [seats]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const GAMES = parseInt(process.argv[2] || "200", 10);
const SEATS = parseInt(process.argv[3] || "4", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
let logic = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");
const HOOK_AT = "function autoDeliver(state, p, biz) {\n  let remaining = bizProd(biz);";
if (!logic.includes(HOOK_AT)) { console.error("autoDeliver changed shape - update this probe"); process.exit(2); }
/* Before the company sells: what could it have sold into? Own-industry icons only -
   Manufacturing's cross-sell is a separate allowance and is not what is under test. */
logic = logic.replace(HOOK_AT, HOOK_AT + `
  {
    const __slots = eligibleSlotsFor(state, biz, p).filter((s) => !s.cross);
    const __cap = __slots.reduce((a, s) => a + (s.levelIdx + 1) * exchangeRate(state, biz), 0);
    __probe.before(state, biz, bizProd(biz), __slots.length, __cap);
  }`);
/* --freeze pins a bot's Retail extra-district pick for the whole delivery, the way a
   human's pick is pinned, instead of letting reachableDistricts re-choose on every
   slot as icons fill. If the "capacity was enough" bucket for Retail comes from that
   drift, this makes it vanish. */
if (process.argv.includes("--freeze")) {
  console.log("(--freeze is now what the engine does; the flag is kept so the old behaviour can be compared with --drift)");
}
if (process.argv.includes("--drift")) {
  /* Put the drift back: forget the pin so reachableDistricts re-chooses on every slot. */
  logic = logic.replace(HOOK_AT, HOOK_AT + `
  if (bizInd(biz) === "RE" && state.reChoices) delete state.reChoices[biz.id];`);
}
if (false) {
  logic = logic.replace(HOOK_AT, HOOK_AT + `
  if (bizInd(biz) === "RE" && !(state.reChoices && state.reChoices[biz.id])) {
    state.reChoices = state.reChoices || {};
    state.reChoices[biz.id] = bestExtraDistrictsForRE(state, biz, reAllowance(state, biz, p), footprintDistricts(state.board, biz.footprint));
  }`);
}
const AFTER = "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;";
if (!logic.includes(AFTER)) { console.error("autoDeliver's end changed - update this probe"); process.exit(2); }
logic = logic.replace(AFTER, "  const leftover = Math.max(0, remaining);\n  __probe.after(state, biz, earned, leftover);\n  p.cash += earned + leftover * 1;");

const S = {};
const stat = (ind) => S[ind] || (S[ind] = { deliveries: 0, prod: 0, sold: 0, left: 0, earned: 0, cap: 0, icons: 0,
  leftNoIcon: 0, leftShort: 0, leftCapOk: 0, unitsNoIcon: 0, unitsShort: 0, unitsCapOk: 0, perLevel: {} });
let pending = null;
const probe = {
  before: (state, biz, prod, nIcons, cap) => { pending = { ind: biz.bp.ind, level: biz.level, prod, nIcons, cap }; },
  after: (state, biz, earned, leftover) => {
    const p = pending; pending = null; if (!p) return;
    const t = stat(p.ind); t.deliveries++; t.prod += p.prod; t.left += leftover; t.sold += p.prod - leftover; t.earned += earned; t.cap += p.cap; t.icons += p.nIcons;
    const L = t.perLevel[p.level] || (t.perLevel[p.level] = { n: 0, prod: 0, left: 0, cap: 0 });
    L.n++; L.prod += p.prod; L.left += leftover; L.cap += p.cap;
    if (leftover > 0) {
      if (p.nIcons === 0) { t.leftNoIcon++; t.unitsNoIcon += leftover; }
      else if (p.cap < p.prod) { t.leftShort++; t.unitsShort += leftover; }
      else { t.leftCapOk++; t.unitsCapOk += leftover; }
    }
  },
};
const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, String, box, __probe: probe };
vm.createContext(sandbox);
vm.runInContext(logic + `box.E = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning, INDUSTRIES, SCALING, BASE_PRICE };`, sandbox);
const E = box.E;
for (let seed = 1; seed <= GAMES; seed++) {
  const st = E.initGame(SEATS - 1, seed, ["Seat 1"], undefined, true, undefined);
  st.players[0].isHuman = false;
  if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
  E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
}
const pad = (s, w) => String(s).padEnd(w), rp = (s, w) => String(s).padStart(w);
const pc = (a, b) => (b > 0 ? (100 * a / b).toFixed(0) + "%" : "-");
console.log(`\n${GAMES} games at ${SEATS} players - every delivery by every company\n`);
const row = (label, fn) => console.log("  " + pad(label, 40) + E.INDUSTRIES.map((i) => rp(fn(stat(i)), 9)).join(""));
console.log("  " + pad("", 40) + E.INDUSTRIES.map((i) => rp(i, 9)).join(""));
row("deliveries", (t) => t.deliveries);
row("units made per delivery", (t) => (t.prod / Math.max(1, t.deliveries)).toFixed(1));
row("open icons in reach, per delivery", (t) => (t.icons / Math.max(1, t.deliveries)).toFixed(1));
row("...their capacity in units", (t) => (t.cap / Math.max(1, t.deliveries)).toFixed(1));
row("units sold per delivery", (t) => (t.sold / Math.max(1, t.deliveries)).toFixed(1));
row("SOLD share of production", (t) => pc(t.sold, t.prod));
row("cash per unit sold", (t) => "$" + (t.earned / Math.max(1, t.sold)).toFixed(2));
console.log("  " + pad("WHY UNITS WERE LEFT OVER (share of leftover units)", 40));
row("  no open icon of its industry in reach", (t) => pc(t.unitsNoIcon, t.left));
row("  icons open but short of production", (t) => pc(t.unitsShort, t.left));
row("  capacity was enough - a delivery bug", (t) => pc(t.unitsCapOk, t.left));
console.log("  " + pad("BY COMPANY LEVEL: sold share (capacity per delivery)", 40));
for (const lvl of [1, 2, 3]) row(`  level ${lvl}`, (t) => { const L = t.perLevel[lvl]; return L ? `${pc(L.prod - L.left, L.prod)} (${(L.cap / L.n).toFixed(1)})` : "-"; });
console.log("");
