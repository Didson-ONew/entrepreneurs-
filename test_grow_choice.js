/* An upgrade with more than one place to go asks the player, and the map shows
   storeys per plot. Both came from one live report: a Systems Architect upgraded a
   Technology company from level 2 to 3 and the map did not change - the persona
   stacks what the industry spreads, and the board drew storeys by industry - and the
   same player suspected, correctly, that a horizontal upgrade with several eligible
   plots simply picked one. doUpgrade has taken a chosen plot all along and the online
   act carried it; the button never asked. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let fails = 0, n = 0;
const check = (what, ok, note = "") => { n++; if (!ok) fails++; console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`); };

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const engine = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");
const ui = src.slice(cut);
/* Lift a plain function out of the UI half by name - these three have no JSX in them. */
const grab = (name) => {
  const i = ui.indexOf(`function ${name}(`);
  if (i < 0) throw new Error(`${name} not found in the UI half`);
  const j = ui.indexOf("\n}\n", i);
  return ui.slice(i, j + 3);
};
const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, String, box };
vm.createContext(sandbox);
vm.runInContext(engine + "\n" + grab("computeEligiblePlots") + grab("growOptions") + grab("growthFor") + `
  box.E = { initGame, byId, orthOf, plotFree, doUpgrade, upgradeScaling, SCALING, BP_DATA,
    computeEligiblePlots, growOptions, growthFor, adjacentOwnedFreePlots, newBusiness, hasPersona };
`, sandbox);
const E = box.E;

/* A company of a given industry on the given plots, owned by p, with the plots owned. */
function plant(st, p, ind, lvl, plots) {
  const bp = E.BP_DATA.find((x) => x.ind === ind && x.lvl === lvl);
  const biz = E.newBusiness(bp, plots, st.quarter);
  biz.scored = true;
  plots.forEach((pk) => { st.board.owner[pk] = p.id; st.board.occupiedBy[pk] = biz.id; });
  p.businesses.push(biz);
  return biz;
}
/* A plot with at least `k` orthogonal neighbours that are free, for building a
   footprint with room to grow around it. */
function roomyPlot(st, k) {
  return Object.keys(st.board.graph).find((pk) =>
    E.plotFree(st.board, pk) && !(pk in st.board.owner)
    && E.orthOf(st.board, pk).filter((q) => E.plotFree(st.board, q) && !(q in st.board.owner)).length >= k);
}

console.log("\nSpreading: several owned, empty plots beside the building");
{
  const st = E.initGame(3, 11, ["You"], undefined, false);
  const me = E.byId(st, 0);
  me.cash = 500;
  const home = roomyPlot(st, 3);
  check("found a plot with three free neighbours to test on", !!home);
  const around = E.orthOf(st.board, home).filter((q) => E.plotFree(st.board, q) && !(q in st.board.owner));
  const biz = plant(st, me, "UT", 1, [home]);              // Utilities spread
  around.slice(0, 2).forEach((pk) => { st.board.owner[pk] = me.id; });   // own two of them, empty
  const opts = E.growOptions(st, me, biz);
  check("growOptions offers exactly the two owned empty neighbours", opts.length === 2 && opts.every((pk) => around.includes(pk)), opts.join(","));
  check("and agrees with the engine's own adjacency rule",
    JSON.stringify([...opts].sort()) === JSON.stringify([...E.adjacentOwnedFreePlots(st.board, biz.footprint)].sort()));
  const mode = { kind: "grow", biz, dir: "H", options: opts, selected: [] };
  const elig = E.computeEligiblePlots(st.board, mode, { state: st, player: me });
  check("the picker highlights those two and nothing else", elig.size === 2 && opts.every((pk) => elig.has(pk)));
  mode.selected = [opts[1]];
  check("one pick and the highlight clears", E.computeEligiblePlots(st.board, mode, { state: st, player: me }).size === 0);
  const ok = E.doUpgrade(st, me, biz, () => 0.5, () => {}, opts[1]);
  check("the engine grows onto the plot that was chosen, not the first it found",
    ok && biz.footprint.includes(opts[1]) && !biz.footprint.includes(opts[0]), biz.footprint.join(","));
  check("with one storey on the new wing", biz.levels[opts[1]] === 1);
}

console.log("\nStacking: a persona that stacks what its industry spreads");
{
  const st = E.initGame(3, 12, ["You"], undefined, false);
  const me = E.byId(st, 0);
  me.cash = 500;
  me.persona = "tech_savvy";
  if (!E.hasPersona(me, "tech_savvy")) me.personas = ["tech_savvy"];
  check("the persona is on (the engine reads it)", E.hasPersona(me, "tech_savvy"));
  const home = roomyPlot(st, 1);
  const next = E.orthOf(st.board, home).find((q) => E.plotFree(st.board, q) && !(q in st.board.owner));
  const biz = plant(st, me, "TE", 2, [home, next]);        // a level-2 Technology company on two plots
  check("Technology spreads by industry", E.SCALING.TE === "H");
  check("but this player's upgrade stacks", E.upgradeScaling(me, biz) === "V");
  const g = E.growthFor(me, biz.bp);
  check("so the card says vertical, and marks the persona", g.dir === "V" && g.flipped === true);
  check("while a player without the persona reads the industry's habit", E.growthFor({ }, biz.bp).dir === "H" && !E.growthFor({ }, biz.bp).flipped);
  const opts = E.growOptions(st, me, biz);
  check("the storey can go on either plot they own, so the player is asked", opts.length === 2, opts.join(","));
  const ok = E.doUpgrade(st, me, biz, () => 0.5, () => {}, next);
  check("and it lands on the plot they chose", ok && biz.levels[next] === 2 && biz.levels[home] === 1, JSON.stringify(biz.levels));
  check("the footprint did not grow - a stacked upgrade takes no land", biz.footprint.length === 2);
  /* The board draws from levels[plot], so this is the number the map will show. */
  const storeys = (pk) => (biz.levels && biz.levels[pk]) || (biz.footprint.length === 1 ? biz.level : 1);
  check("the map would draw two storeys on the chosen plot and one on the other", storeys(next) === 2 && storeys(home) === 1);
}

console.log("\nOne place to go: no ceremony");
{
  const st = E.initGame(3, 13, ["You"], undefined, false);
  const me = E.byId(st, 0);
  me.cash = 500;
  const home = roomyPlot(st, 2);
  const [a] = E.orthOf(st.board, home).filter((q) => E.plotFree(st.board, q) && !(q in st.board.owner));
  const biz = plant(st, me, "MA", 1, [home]);
  st.board.owner[a] = me.id;
  check("a single candidate is offered, not a choice", E.growOptions(st, me, biz).length === 1);
}

console.log("\nThe wiring in the page");
{
  check("the upgrade button opens the picker when there is a choice", /const opts = growOptions\(state, human, b\);\s*if \(opts\.length > 1\) return onStartGrow\(b, opts\);/.test(ui));
  check("and otherwise passes the one plot through", /type: "upgrade", bizId: b\.id, plot: opts\[0\]/.test(ui));
  check("confirming the pick sends the chosen plot online", /type: "upgrade", bizId: pickMode\.biz\.id, plot: pickMode\.selected\[0\]/.test(ui));
  check("and offline it reaches doUpgrade with it", /doUpgrade\(state, human, pickMode\.biz, rngRef\.current, log, pickMode\.selected\[0\]\)/.test(ui));
  check("the board draws storeys from levels[plot], not from the industry", /foundBiz\.levels\[plotKeyStr\]/.test(ui) && !/SCALING\[bizInd\(foundBiz\)\] === "V"/.test(ui));
  check("the built page carries the grow picker", fs.readFileSync(path.join(__dirname, "online.html"), "utf8").includes("where does the new"));
}

console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
process.exit(fails ? 1 : 0);
