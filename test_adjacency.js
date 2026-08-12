/* Buildings occupy plots that share an EDGE - never a corner.

   A horizontal company (UT, MA, TE) grows sideways, and "sideways" means orthogonally:
   up, down, left or right, within a district or across the border into the next one.
   Two plots that meet only at a corner are not adjacent, and a company may not stand
   on both.

   The city's road network (board.graph) does join diagonals inside a district, and it
   stays that way - it is what hub roads, the Hospitality reach and the adjacency bonus
   are built on. This file is about footprints only.

   Run: node test_adjacency.js
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
    box.exports = { initGame, mulberry32, BP_DATA, SCALING, doLaunch, doUpgrade, activeBiz,
      footprintIsContiguous, findFootprint, adjacentFreePlot, adjacentOwnedFreePlots,
      orthOf, plotFree, upgradeBlockedReason, INDUSTRIES };
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

const game = (seed = 3) => E.initGame(3, seed, ["You"], undefined, false, undefined);

/* Find a pair of plots that the road network joins but that do NOT share an edge -
   the diagonal pair inside a district that started all this. */
function diagonalPair(board) {
  for (const a of Object.keys(board.graph)) {
    for (const b of board.graph[a]) {
      if (!E.orthOf(board, a).includes(b)) return [a, b];
    }
  }
  return null;
}
function orthPair(board) {
  for (const a of Object.keys(board.graph)) {
    const n = E.orthOf(board, a);
    if (n.length) return [a, n[0]];
  }
  return null;
}

section("The board knows the difference");
{
  const st = game();
  const board = st.board;
  const diag = diagonalPair(board);
  check("the road network does join some plots diagonally", !!diag, diag ? diag.join(" / ") : "");
  check("but they do not share an edge", !!diag && !E.orthOf(board, diag[0]).includes(diag[1]));

  const orth = orthPair(board);
  check("and it knows which plots do share one", !!orth, orth ? orth.join(" / ") : "");

  check("a single plot is a valid footprint", E.footprintIsContiguous(board, [orth[0]]));
  check("two edge-sharing plots are", E.footprintIsContiguous(board, orth));
  check("two corner-sharing plots are NOT", !E.footprintIsContiguous(board, diag),
    "this is the bug: a horizontal company could sit on both");

  const far = Object.keys(board.graph).filter((k) => !E.orthOf(board, orth[0]).includes(k) && k !== orth[0]);
  check("two plots on opposite sides of the city are not one building",
    !E.footprintIsContiguous(board, [orth[0], far[far.length - 1]]));
  check("the same plot listed twice is not a two-plot building",
    !E.footprintIsContiguous(board, [orth[0], orth[0]]));
  check("an empty footprint is not a building", !E.footprintIsContiguous(board, []));
}

section("Launching cannot cheat it");
{
  const st = game();
  const p = st.players[0];
  const board = st.board;
  const diag = diagonalPair(board);
  [diag[0], diag[1]].forEach((k) => { board.owner[k] = p.id; });
  p.cash = 500;

  // a level-2 horizontal card needs two plots
  const bp = E.BP_DATA.find((x) => E.SCALING[x.ind] === "H" && x.lvl === 2);
  check("found a level 2 horizontal blueprint to test with", !!bp, bp && bp.name);
  p.hand = [bp];
  const rng = E.mulberry32(9);

  const cheated = E.doLaunch(st, p, bp, rng, quiet, [diag[0], diag[1]]);
  check("a diagonal footprint is refused", cheated === false);
  check("and nothing was built", E.activeBiz(p).length === 0);
  check("nor was the money taken", p.cash === 500);

  // the same card on two plots that share an edge goes up fine
  const orth = orthPair(board);
  [orth[0], orth[1]].forEach((k) => { board.owner[k] = p.id; });
  const ok = E.doLaunch(st, p, bp, rng, quiet, [orth[0], orth[1]]);
  check("an orthogonal footprint is accepted", ok === true);
  check("and it occupies both plots", E.activeBiz(p)[0].footprint.length === 2);
}

section("Nor can a scattered footprint");
{
  const st = game(5);
  const p = st.players[0];
  const all = Object.keys(st.board.graph);
  const a = all[0];
  const away = all.find((k) => k !== a && !E.orthOf(st.board, a).includes(k));
  st.board.owner[a] = p.id;
  st.board.owner[away] = p.id;
  p.cash = 500;
  const bp = E.BP_DATA.find((x) => E.SCALING[x.ind] === "H" && x.lvl === 2);
  p.hand = [bp];
  const built = E.doLaunch(st, p, bp, E.mulberry32(1), quiet, [a, away]);
  check("two unconnected plots are refused as one company", built === false,
    "this was accepted before - the engine never checked the shape at all");
}

section("Upgrading grows sideways, not diagonally");
{
  const st = game(7);
  const p = st.players[0];
  const board = st.board;
  const diag = diagonalPair(board);
  const home = diag[0];
  board.owner[home] = p.id;
  board.owner[diag[1]] = p.id;
  p.cash = 500;
  const bp1 = E.BP_DATA.find((x) => E.SCALING[x.ind] === "H" && x.lvl === 1);
  p.hand = [bp1];
  const launched = E.doLaunch(st, p, bp1, E.mulberry32(2), quiet, [home]);
  check("a level 1 horizontal company is standing", launched === true);
  const biz = E.activeBiz(p)[0];

  const sideways = E.doUpgrade(st, p, biz, E.mulberry32(4), quiet, diag[1]);
  check("it cannot expand onto a corner-sharing plot", sideways === false, "diagonal upgrade refused");
  check("and it is still level 1", biz.level === 1);

  const nbr = E.orthOf(board, home).find((n) => E.plotFree(board, n));
  if (!nbr) {
    console.log("  --   this plot has no orthogonal neighbour, so the positive case is skipped here");
  } else {
    board.owner[nbr] = p.id;
    const good = E.doUpgrade(st, p, biz, E.mulberry32(4), quiet, nbr);
    check("but it can expand onto one that shares an edge", good === true);
    check("and now covers two plots", biz.footprint.length === 2);
  }
}

section("The bots build legal shapes");
{
  /* findFootprint and adjacentFreePlot are what the bots use. Whatever they return
     has to satisfy the same rule the engine enforces, or bots would simply fail to
     build rather than build illegally. */
  let checked = 0, allLegal = true;
  for (let seed = 1; seed <= 25; seed++) {
    const st = game(seed);
    const p = st.players[0];
    // give this player a good spread of land to work with
    Object.keys(st.board.graph).slice(0, 30).forEach((k) => { st.board.owner[k] = p.id; });
    for (const nPlots of [1, 2, 3]) {
      const fp = E.findFootprint(st.board, nPlots, E.mulberry32(seed), st, "UT");
      if (!fp) continue;
      checked++;
      if (fp.length !== nPlots || !E.footprintIsContiguous(st.board, fp)) allLegal = false;
    }
  }
  check("every footprint a bot picks is a legal building", allLegal, `${checked} footprints checked`);
  check("and it found plenty of them", checked > 30, `${checked}`);
}

section("The reason given to the player matches the rule");
{
  const st = game(11);
  const p = st.players[0];
  const board = st.board;
  const diag = diagonalPair(board);
  board.owner[diag[0]] = p.id;
  board.owner[diag[1]] = p.id;
  p.cash = 500;
  const bp1 = E.BP_DATA.find((x) => E.SCALING[x.ind] === "H" && x.lvl === 1);
  p.hand = [bp1];
  E.doLaunch(st, p, bp1, E.mulberry32(2), quiet, [diag[0]]);
  const biz = E.activeBiz(p)[0];
  const opts = E.adjacentOwnedFreePlots(board, biz.footprint);
  check("a corner-sharing plot is not offered as somewhere to grow",
    !opts.includes(diag[1]), opts.join(", ") || "(none)");
  check("everything offered does share an edge",
    opts.every((o) => E.orthOf(board, o).some((n) => biz.footprint.includes(n))));
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
