/* The tooltip at the mouse and the line under the map must agree about who owns the
   ground a building stands on.

   THE BUG. getBizTooltipInfo built its list of plot owners like this:

       biz.footprint.map((pk) => state.board.owner[pk]).filter((v) => v !== undefined)

   - so a plot that had been SOLD was dropped from the list rather than reported. A
   three-plot company whose owner had sold one of them still read "Plot owner: Ana",
   while PlotInfo under the map correctly said that plot was Unowned. Nothing on the
   tooltip said a plot had gone.

   THE SECOND BUG, found with it. The same helper identified the business by object
   identity - `p.businesses.includes(biz)`. That holds in a local game, where the
   engine mutates one state object in place. It does not hold ONLINE, where every
   server push replaces the whole state: the company the mouse captured on hover is
   then an orphan from the previous snapshot, no player's array includes it, and the
   tooltip reported that nobody owned a perfectly ordinary company. */
const fs = require("fs"), vm = require("vm");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
/* Both halves: the fix lives below the REACT UI marker on purpose, so unlike the
   engine probes this one loads the whole file minus the JSX component bodies. */
const CUT = src.indexOf("/* ============================== REACT UI ============================== */");
const engine = src.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");
/* Pull just the two exported helpers out of the UI half - the rest is JSX and will not
   run under plain node. Anchored on their names, so a rename fails the test loudly. */
const ui = src.slice(CUT);
const grab = (name) => {
  const at = ui.indexOf(`export function ${name}(`);
  if (at < 0) { console.error(`${name} is gone from the UI half - update this test`); process.exit(2); }
  const end = ui.indexOf("\n}", at);
  return ui.slice(at, end + 2).replace(/^export\s+/, "");
};

const box = {}, sb = { console, Math, Set, Object, Array, JSON, box };
vm.createContext(sb);
vm.runInContext(engine + "\n" + grab("liveBiz") + "\n" + grab("bizPlotOwnership") + `
  box.e = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
    doSellPlot, activeBiz, bizPlotOwnership, liveBiz };`, sb);
const E = box.e;

let fails = 0;
function check(label, ok, detail) {
  if (!ok) fails++;
  console.log(` ${ok ? "ok  " : "FAIL"}  ${label}${detail !== undefined && detail !== "" ? "  [" + detail + "]" : ""}`);
}

/* What the line under the map says, lifted from PlotInfo. */
const mapLineOwner = (state, plot) => {
  const id = state.board.owner[plot];
  return id === undefined ? "Unowned" : (state.players.find((p) => p.id === id)?.name || "Unowned");
};

/* A finished game with a company standing on two or more plots its owner holds. */
let st = null, biz = null, owner = null;
for (let seed = 1; seed < 400 && !biz; seed++) {
  const s = E.initGame(3, seed, ["Seat 1"], undefined, true, undefined);
  s.players[0].isHuman = false;
  try {
    if (s.phase === "drafting") { E.advanceDraft(s, () => {}); E.startPlanning(s); }
    E.advancePlanning(s, E.mulberry32(seed + 7), () => {});
  } catch (e) { continue; }
  for (const p of s.players) {
    const b = E.activeBiz(p).find((x) => x.footprint.length >= 2
      && x.footprint.every((k) => s.board.owner[k] === p.id));
    if (b) { st = s; biz = b; owner = p; break; }
  }
}
if (!biz) { console.error("no multi-plot company on owned ground in 400 games"); process.exit(2); }

console.log(`${biz.bp.name}, ${biz.footprint.length} plots, owned by ${owner.name}\n`);

const before = E.bizPlotOwnership(st, biz);
check("every plot is accounted for", before.holders.reduce((n, h) => n + h.plots, 0) + before.unowned === before.total,
  `${before.total} plots`);
check("the owner is named", before.owner && before.owner.name === owner.name);
check("nothing is reported unowned yet", before.unowned === 0);

/* --- the reported bug: sell one plot out from under the building --- */
const sold = biz.footprint[0];
E.doSellPlot(st, owner, sold, () => {});
check("the line under the map now says Unowned", mapLineOwner(st, sold) === "Unowned", mapLineOwner(st, sold));

const after = E.bizPlotOwnership(st, biz);
check("the tooltip reports the sold plot as unowned", after.unowned === 1, `unowned: ${after.unowned}`);
check("and still accounts for every plot",
  after.holders.reduce((n, h) => n + h.plots, 0) + after.unowned === after.total,
  `${after.holders.reduce((n, h) => n + h.plots, 0)} owned + ${after.unowned} unowned = ${after.total}`);
check("the remaining plots are still the owner's",
  after.holders.length === 1 && after.holders[0].player.name === owner.name
  && after.holders[0].plots === after.total - 1);

/* The two views must never disagree: count the map line against the tooltip. */
const unownedByMap = biz.footprint.filter((k) => mapLineOwner(st, k) === "Unowned").length;
check("tooltip and map agree on how much land is unowned", unownedByMap === after.unowned,
  `map ${unownedByMap}, tooltip ${after.unowned}`);

/* --- the online bug: a server push replaces state; the hover still holds the old biz --- */
const pushed = JSON.parse(JSON.stringify(st));   // exactly what arrives from the server
const stale = biz;                                // what setHover captured a moment ago
const online = E.bizPlotOwnership(pushed, stale);
check("after a server push the company still has its owner",
  online.owner && online.owner.name === owner.name, online.owner ? online.owner.name : "nobody");
check("and the ground is still read from the new state",
  online.unowned === after.unowned && online.total === after.total);
check("the business is re-resolved, not the orphan that was hovered",
  E.liveBiz(pushed, stale) !== stale);

/* A company the bank has taken belongs to nobody, and must not be attributed. */
const d = E.activeBiz(owner)[0];
if (d) {
  d.distressed = true;
  check("a distressed company is attributed to nobody", E.bizPlotOwnership(st, d).owner === null);
  d.distressed = false;
}

console.log(fails ? `\n${fails} check(s) failed` : "\nall checks passed");
process.exit(fails);
