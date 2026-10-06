/* The first player places the Logistic Hub. Does a bot holding that seat aim it?

   It used to pick uniformly at random, which made the one first-player privilege
   that never expires worth exactly nothing in every simulation in this repository.
   audit_first_player.js carried the warning; nothing enforced the fix.

   A hub is worth something to its placer only under conditions the engine states
   elsewhere, so this checks the picker agrees with them: Utilities and Retail can
   never use hubs, Healthcare is on the network already, and a company that
   already touches a hub gains nothing from touching a second.

   Run: node test_hub_aim.js
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, Map, box };
vm.createContext(sandbox);
vm.runInContext(src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "") + `
  box.e = { initGame, mulberry32, placeNewLH, lhPlacementScore, orthOf, plotHasLH,
            byId, doLaunch, BP_DATA, activeBiz, lhPlotOptions, plotFree, districtOf };
`, sandbox);
const E = box.e;

let fails = 0;
const check = (label, cond, detail) => {
  if (!cond) fails++;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? `  [${detail}]` : ""}`);
};
const section = (t) => console.log(`\n${t}`);
const quiet = () => {};

/* A table with the first player holding one company of `ind`, placed on ground we
   choose so we know exactly which plots touch it. */
function tableWith(ind, seed = 3) {
  const st = E.initGame(2, seed, ["Seat"], undefined, true, undefined);
  st.players.forEach((p) => { p.isHuman = false; });
  const first = E.byId(st, st.turnOrder[0]);
  first.cash = 999;
  const bp = E.BP_DATA.find((b) => b.ind === ind && b.lvl === 1);
  first.hand.push(bp);
  // build somewhere with at least one free orthogonal neighbour to put a hub on
  const spot = Object.keys(st.board.graph).find((k) =>
    E.plotFree(st.board, k) && !(k in st.board.owner)
    && E.orthOf(st.board, k).some((n) => E.plotFree(st.board, n) && !(n in st.board.owner)));
  st.board.owner[spot] = first.id;
  const built = E.doLaunch(st, first, bp, E.mulberry32(seed + 1), quiet, [spot]);
  return { st, first, spot, built };
}

section("a hub beside the first player's company beats one nowhere near it");
{
  const { st, first, spot, built } = tableWith("MA");
  check("a Manufacturing company was built", built === true);
  const near = E.orthOf(st.board, spot).find((n) => E.plotFree(st.board, n) && !(n in st.board.owner));
  const far = Object.keys(st.board.graph).find((k) =>
    E.plotFree(st.board, k) && !(k in st.board.owner) && E.orthOf(st.board, k).length > 0
    && !E.orthOf(st.board, spot).includes(k) && k !== spot);
  const vNear = E.lhPlacementScore(st, first, near);
  const vFar = E.lhPlacementScore(st, first, far);
  check("the adjacent plot scores higher", vNear > vFar, `near ${vNear} vs far ${vFar}`);

  E.placeNewLH(st, E.mulberry32(9), quiet);
  const placed = st.board.lhPlots[st.board.lhPlots.length - 1];
  check("and the hub actually lands on a plot that connects the company",
    E.orthOf(st.board, placed).some((n) => st.board.occupiedBy[n] !== undefined),
    `landed at ${placed}`);
  check("the company is on the network now",
    E.activeBiz(first)[0].footprint.some((pk) => E.plotHasLH(st.board, pk)));
}

section("the industries that cannot use a hub are not counted");
{
  for (const [ind, why] of [["UT", "Utilities never use hubs"], ["RE", "Retail never uses hubs"],
                            ["HC", "Healthcare is on the network already"]]) {
    const { st, first, spot, built } = tableWith(ind);
    if (!built) { check(`${ind}: a company was built`, false); continue; }
    const near = E.orthOf(st.board, spot).find((n) => E.plotFree(st.board, n) && !(n in st.board.owner));
    const far = Object.keys(st.board.graph).find((k) =>
      E.plotFree(st.board, k) && !(k in st.board.owner) && E.orthOf(st.board, k).length > 0
      && !E.orthOf(st.board, spot).includes(k) && k !== spot);
    const vNear = E.lhPlacementScore(st, first, near);
    const vFar = E.lhPlacementScore(st, first, far);
    /* Connecting is worth 10 a company. These three may differ by open icons in
       the district, which is single digits, so what is checked is that no
       connection bonus was paid - not that the two are equal. */
    check(`${ind}: no connection bonus — ${why}`, vNear - vFar < 10,
      `near ${vNear} vs far ${vFar}`);
  }
}

section("a company already on the network gains nothing from a second hub");
{
  const { st, first, spot, built } = tableWith("MA");
  check("built", built === true);
  const near = E.orthOf(st.board, spot).find((n) => E.plotFree(st.board, n) && !(n in st.board.owner));
  const before = E.lhPlacementScore(st, first, near);
  st.board.lhPlots.push(near);                      // connect it
  const other = E.orthOf(st.board, spot).find((n) =>
    n !== near && E.plotFree(st.board, n) && !(n in st.board.owner));
  if (other === undefined) {
    console.log("  --   (no second free neighbour on this board, skipped)");
  } else {
    const after = E.lhPlacementScore(st, first, other);
    check("the second adjacent hub is worth less than the first was",
      after < before, `first ${before}, second ${after}`);
  }
}

section("a plot that touches nothing is never chosen over one that does");
{
  const { st, first } = tableWith("MA");
  const lonely = Object.keys(st.board.graph).find((k) =>
    E.plotFree(st.board, k) && !(k in st.board.owner) && E.orthOf(st.board, k).length === 0);
  if (lonely === undefined) {
    console.log("  --   (every free plot on this board has a neighbour, skipped)");
  } else {
    check("a plot with no orthogonal neighbour scores below zero",
      E.lhPlacementScore(st, first, lonely) < 0, `${E.lhPlacementScore(st, first, lonely)}`);
  }
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
