/* Upgrades ask where - and, for a persona that can grow either way, which way. The
   map shows storeys per plot. And every persona is something its holder MAY do.

   All from live reports. A Systems Architect upgraded a Technology company from level
   2 to 3 and the map did not change - the persona stacks what the industry spreads,
   and the board drew storeys by industry. The same player suspected, correctly, that
   a horizontal upgrade with several eligible plots simply picked one: doUpgrade had
   taken a chosen plot all along and the online act carried it, but the button never
   asked. Then: the personas read as things that happen to you, and two of them can
   cut against you - growing the persona's way when the industry's way would suit the
   ground you hold, or lifting a rival industry's price for one district of reach. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let fails = 0, n = 0;
const check = (what, ok, note = "") => { n++; if (!ok) fails++; console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`); };

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const engine = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");
const ui = src.slice(cut);
const grab = (name) => {
  const i = ui.indexOf(`function ${name}(`);
  if (i < 0) throw new Error(`${name} not found in the UI half`);
  return ui.slice(i, ui.indexOf("\n}\n", i) + 3);
};
const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, String, box };
vm.createContext(sandbox);
vm.runInContext(engine + "\n" + grab("computeEligiblePlots") + grab("growOptions") + grab("growthFor") + `
  box.E = { initGame, byId, orthOf, plotFree, doUpgrade, upgradeScaling, upgradeDirs, upgradeBlockedReason,
    SCALING, BP_DATA, INDUSTRIES, computeEligiblePlots, growOptions, growthFor, adjacentOwnedFreePlots,
    newBusiness, hasPersona, unitPrice, price, chooseSupplyChain, supplyChainOptions, PERSONAS, logEntry };
`, sandbox);
const E = box.E;

function plant(st, p, ind, lvl, plots) {
  const bp = E.BP_DATA.find((x) => x.ind === ind && x.lvl === lvl);
  const biz = E.newBusiness(bp, plots, st.quarter);
  biz.scored = true;
  plots.forEach((pk) => { st.board.owner[pk] = p.id; st.board.occupiedBy[pk] = biz.id; });
  p.businesses.push(biz);
  return biz;
}
const freeAround = (st, pk) => E.orthOf(st.board, pk).filter((q) => E.plotFree(st.board, q) && !(q in st.board.owner));
const roomyPlot = (st, k) => Object.keys(st.board.graph).find((pk) =>
  E.plotFree(st.board, pk) && !(pk in st.board.owner) && freeAround(st, pk).length >= k);
const persona = (p, key) => { p.persona = key; if (!E.hasPersona(p, key)) p.personas = [key]; };

console.log("\nSpreading: several owned, empty plots beside the building");
{
  const st = E.initGame(3, 11, ["You"], undefined, false);
  const me = E.byId(st, 0); me.cash = 500;
  const home = roomyPlot(st, 3);
  const around = freeAround(st, home);
  const biz = plant(st, me, "UT", 1, [home]);
  around.slice(0, 2).forEach((pk) => { st.board.owner[pk] = me.id; });
  const opts = E.growOptions(st, me, biz);
  check("growOptions offers exactly the two owned empty neighbours, all as wings",
    opts.length === 2 && opts.every((o) => around.includes(o.plot) && o.dir === "H"), JSON.stringify(opts));
  check("and agrees with the engine's own adjacency rule",
    JSON.stringify(opts.map((o) => o.plot).sort()) === JSON.stringify([...E.adjacentOwnedFreePlots(st.board, biz.footprint)].sort()));
  const mode = { kind: "grow", biz, options: opts, selected: [] };
  const elig = E.computeEligiblePlots(st.board, mode, { state: st, player: me });
  check("the picker highlights those two and nothing else", elig.size === 2 && opts.every((o) => elig.has(o.plot)));
  mode.selected = [opts[1].plot];
  check("one pick and the highlight clears", E.computeEligiblePlots(st.board, mode, { state: st, player: me }).size === 0);
  const ok = E.doUpgrade(st, me, biz, () => 0.5, () => {}, opts[1].plot, opts[1].dir);
  check("the engine grows onto the plot that was chosen, not the first it found",
    ok && biz.footprint.includes(opts[1].plot) && !biz.footprint.includes(opts[0].plot), biz.footprint.join(","));
  check("with one storey on the new wing", biz.levels[opts[1].plot] === 1);
}

console.log("\nA Systems Architect MAY stack - and may spread instead");
{
  const st = E.initGame(3, 12, ["You"], undefined, false);
  const me = E.byId(st, 0); me.cash = 500;
  persona(me, "tech_savvy");
  check("the persona is on (the engine reads it)", E.hasPersona(me, "tech_savvy"));
  const home = roomyPlot(st, 2);
  const [next, spare] = freeAround(st, home);
  const biz = plant(st, me, "TE", 2, [home, next]);
  check("Technology spreads by industry", E.SCALING.TE === "H");
  check("this player's default is to stack", E.upgradeScaling(me, biz) === "V");
  check("but BOTH directions are open to them, stacking first",
    JSON.stringify(E.upgradeDirs(me, biz)) === JSON.stringify(["V", "H"]));
  check("a player without the persona has one", JSON.stringify(E.upgradeDirs({}, biz)) === JSON.stringify(["H"]));
  const g = E.growthFor(me, biz.bp);
  check("so the card says vertical, and marks the persona", g.dir === "V" && g.flipped === true);
  let opts = E.growOptions(st, me, biz);
  check("with no owned ground beside it, the choice is which plot takes the storey",
    opts.length === 2 && opts.every((o) => o.dir === "V"), JSON.stringify(opts));
  st.board.owner[spare] = me.id;            // now there is somewhere to spread to
  opts = E.growOptions(st, me, biz);
  check("owning a plot beside it adds spreading as a third option",
    opts.length === 3 && opts.filter((o) => o.dir === "H").length === 1 && opts.find((o) => o.dir === "H").plot === spare, JSON.stringify(opts));
  check("the picker highlights all three", E.computeEligiblePlots(st.board, { kind: "grow", biz, options: opts, selected: [] }, {}).size === 3);
  check("nothing blocks the upgrade while any direction works", E.upgradeBlockedReason(st, me, biz) === null);
  const ok = E.doUpgrade(st, me, biz, () => 0.5, () => {}, spare, "H");
  check("asked to spread, the engine spreads - a third plot, one storey each",
    ok && biz.footprint.length === 3 && biz.levels[spare] === 1 && biz.levels[home] === 1 && biz.levels[next] === 1, JSON.stringify(biz.levels));
}
{
  const st = E.initGame(3, 12, ["You"], undefined, false);
  const me = E.byId(st, 0); me.cash = 500;
  persona(me, "tech_savvy");
  const home = roomyPlot(st, 1);
  const [next] = freeAround(st, home);
  const biz = plant(st, me, "TE", 2, [home, next]);
  const ok = E.doUpgrade(st, me, biz, () => 0.5, () => {}, next, "V");
  check("asked to stack on a plot, it stacks there", ok && biz.levels[next] === 2 && biz.levels[home] === 1 && biz.footprint.length === 2, JSON.stringify(biz.levels));
  const biz2 = plant(st, me, "TE", 1, [freeAround(st, roomyPlot(st, 1))[0] || roomyPlot(st, 0)]);
  const ok2 = E.doUpgrade(st, me, biz2, () => 0.5, () => {}, undefined, "sideways");
  check("a direction the persona does not allow, or nonsense, falls back to the default", ok2 && biz2.footprint.length === 1 && biz2.level === 2);
  const storeys = (b, pk) => (b.levels && b.levels[pk]) || (b.footprint.length === 1 ? b.level : 1);
  check("the map would draw two storeys on the chosen plot and one on the other", storeys(biz, next) === 2 && storeys(biz, home) === 1);
}

console.log("\nA White-Label Supplier MAY take the row's price - so it takes the better one");
{
  const st = E.initGame(3, 14, ["You"], undefined, false);
  const me = E.byId(st, 0);
  const biz = plant(st, me, "MA", 1, [roomyPlot(st, 0)]);
  const own = E.price(st.pm, "MA");
  const higher = E.INDUSTRIES.find((i) => E.price(st.pm, i) > own);
  const lower = E.INDUSTRIES.find((i) => E.price(st.pm, i) < own);
  check("the opening prices give a row above Manufacturing and a row below", !!higher && !!lower, `MA $${own}`);
  check("without the persona a cross-sell is paid its own price both ways",
    E.unitPrice(st, me, biz, higher) === own && E.unitPrice(st, me, biz, lower) === own);
  persona(me, "product_mgr");
  check("with it, the dearer row's price is taken", E.unitPrice(st, me, biz, higher) === E.price(st.pm, higher));
  check("and a cheaper row can no longer cost the holder money", E.unitPrice(st, me, biz, lower) === own, `$${E.unitPrice(st, me, biz, lower)} vs own $${own}`);
}

console.log("\nA Supply Chain Expert MAY decline");
{
  const st = E.initGame(3, 15, ["You", "Other"], undefined, false);
  const [me, other] = st.players;
  persona(me, "supply_chain");
  plant(st, me, "RE", 1, [roomyPlot(st, 0)]);
  check("they have industries to raise", E.supplyChainOptions(st, me).length > 0);
  st.phase = "supplyChain"; st.scQueue = [me.id, other.id]; st.awaitingPlayerId = me.id;
  const before = JSON.stringify(st.pm);
  const logged = [];
  /* A log line arrives as { k, a } now - the shape and its values - so the test
     renders the English the same way the server stores it. */
  const ok = E.chooseSupplyChain(st, me, "skip", (m) => logged.push(E.logEntry(m, null).msg), () => 0.5);
  check("declining is accepted", ok === true);
  check("and moves no price at all", JSON.stringify(st.pm) === before);
  check("the queue moves on to the next player", st.awaitingPlayerId === other.id && st.scQueue[0] === other.id);
  check("and the log says so", logged.some((m) => /declines/.test(m)), logged.join(" | "));
}

console.log("\nEvery persona reads as something its holder may do");
for (const [key, per] of Object.entries(E.PERSONAS)) {
  check(`${per.name}: "${per.blurb.slice(0, 40)}..."`, /\bmay\b/.test(per.blurb));
}

console.log("\nThe wiring in the page");
{
  check("the upgrade button opens the picker when there is a choice", /const opts = growOptions\(state, human, b\);\s*if \(opts\.length > 1\) return onStartGrow\(b, opts\);/.test(ui));
  check("and otherwise passes the one plot and direction through", /type: "upgrade", bizId: b\.id, plot: one\.plot, dir: one\.dir/.test(ui));
  check("confirming the pick sends the chosen plot and its direction online", /type: "upgrade", bizId: pickMode\.biz\.id, plot: pick\.plot, dir: pick\.dir/.test(ui));
  check("and offline it reaches doUpgrade with both", /doUpgrade\(state, human, pickMode\.biz, rngRef\.current, log, pick\.plot, pick\.dir\)/.test(ui));
  check("the server passes the direction through", /E\.doUpgrade\(st, p, b, rng, lg, d\.plot, d\.dir\)/.test(fs.readFileSync(path.join(__dirname, "server.js"), "utf8")));
  check("the board draws storeys from levels[plot], not from the industry", /foundBiz\.levels\[plotKeyStr\]/.test(ui) && !/SCALING\[bizInd\(foundBiz\)\] === "V"/.test(ui));
  check("only the player placing the hub gets the picker", /whoAwaited\(state\) === online\.seat/.test(ui) && /kind === "lh"\) setPickMode\(null\)/.test(ui));
  check("every plot's hover names its value", /plotValue\(\{ board \}, plotKeyStr\)\} plot value/.test(ui));
  check("and so does the inspector on click", /t\("Value:"\)\} <span className="text-gray-100">\$\{plotValue\(\{ board \}, selectedPlot\)\}/.test(ui));
  check("the Supply Chain prompt can be declined", /handleSupplyChain\("skip"\)/.test(ui));
  const built = fs.readFileSync(path.join(__dirname, "online.html"), "utf8");
  check("the built page carries all of it", built.includes("stack on a plot it stands on") && built.includes("Don't raise anything") && built.includes("plot value"));
}

console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
process.exit(fails ? 1 : 0);
