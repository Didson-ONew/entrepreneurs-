/* Retail opens branches instead of reaching abstractly.

   Its old ability sorted EVERY district on the board by open demand and took the
   best few - free, nothing placed, re-chosen at every delivery. A branch is that
   reach made physical: one per level, placed once, holding its ground.

   Six rules were decided for it, and each one is checked here, because five of
   them fall out of registering a branch in board.owner and board.occupiedBy and
   would break silently if either stopped being true:

     it holds the ground      a disc each, and nobody may build there
     it is a structure        the land around it is dearer, like any building
     Hospitality counts it    any structure in range is a customer
     districts yes            The Omnipresent is about where you are
     plots no                 The Real-Estate Mogul is about what you hold
     it falls with the chain  sold, the shopfronts come down

   Run: node test_branches.js
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
  box.e = { initGame, mulberry32, doLaunch, sellCompany, BP_DATA, byId, plotCount,
            districtCount, discsFree, discsPerPlayer, plotValue, plotFree, orthOf,
            branchPlotsOf, branchDistricts, branchesWanted, hoBonusUnits,
            reachableDistricts, footprintDistricts, activeBiz, bizInd };
`, sandbox);
const E = box.e;

let fails = 0;
const check = (label, cond, detail) => {
  if (!cond) fails++;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? `  [${detail}]` : ""}`);
};
const section = (t) => console.log(`\n${t}`);
const quiet = () => {};

function retailTable(lvl, seed = 5) {
  const st = E.initGame(2, seed, ["Seat"], undefined, true, undefined);
  st.players.forEach((p) => { p.isHuman = false; });
  const me = E.byId(st, 0);
  me.cash = 999;
  const bp = E.BP_DATA.find((b) => b.ind === "RE" && b.lvl === lvl);
  me.hand.push(bp);
  const spot = Object.keys(st.board.graph).find((k) => E.plotFree(st.board, k) && !(k in st.board.owner));
  st.board.owner[spot] = me.id;
  const built = E.doLaunch(st, me, bp, E.mulberry32(seed + 1), quiet, [spot]);
  return { st, me, spot, built, biz: me.businesses[me.businesses.length - 1] };
}

section("one branch per level, each holding its own ground");
{
  for (const lvl of [1, 2, 3]) {
    const { st, me, built, biz } = retailTable(lvl);
    if (!built) { check(`level ${lvl}: built`, false); continue; }
    const br = E.branchPlotsOf(st.board, biz);
    check(`level ${lvl}: opens ${lvl} branch(es)`, br.length === lvl, `${br.length}`);
    const held = br.every((k) => st.board.owner[k] === me.id);
    check(`level ${lvl}: every branch holds its plot`, held);
    const blocked = br.every((k) => !E.plotFree(st.board, k));
    check(`level ${lvl}: and nobody can build there`, blocked);
    const used = E.discsPerPlayer(st) - E.discsFree(st, me);
    check(`level ${lvl}: costs ${2 + lvl} discs, not 2`, used === 2 + lvl, `${used}`);
  }
}

section("presence, not holdings");
{
  const { st, me, biz } = retailTable(3);
  const br = E.branchPlotsOf(st.board, biz);
  check("the company's own plot is the only one that counts for plots",
    E.plotCount(st, me) === 1, `${E.plotCount(st, me)}`);
  check("but every branch district counts for districts",
    E.districtCount(st, me) === 1 + E.branchDistricts(st.board, biz).size,
    `${E.districtCount(st, me)} districts, ${br.length} branches`);
}

/* The branch picker aims at open demand, which often lands it somewhere hemmed in.
   These two checks are the whole point of the "a branch is a structure" decision, so
   they hunt for a board where there is something to measure rather than skipping. */
function tableWithOpenNeighbour(lvl) {
  for (let seed = 1; seed < 60; seed++) {
    const t = retailTable(lvl, seed);
    if (!t.built) continue;
    const br = E.branchPlotsOf(t.st.board, t.biz)[0];
    if (br === undefined) continue;
    const nbr = E.orthOf(t.st.board, br).find((k) => E.plotFree(t.st.board, k) && !(k in t.st.board.owner));
    if (nbr !== undefined) return { ...t, br, nbr, seed };
  }
  return null;
}

section("a branch is a structure, so the land around it is dearer");
{
  const t = tableWithOpenNeighbour(1);
  if (!t) { check("found a board to measure on", false); }
  else {
    const { st, br, nbr } = t;
    const withIt = E.plotValue(st, nbr);
    delete st.board.occupiedBy[br];                       // take the shopfront away
    const without = E.plotValue(st, nbr);
    check("a plot beside a branch is worth more than one that is not",
      withIt > without, `$${withIt} vs $${without}`);
  }
}

section("Hospitality counts a branch like any other building in range");
{
  const t = tableWithOpenNeighbour(1);
  if (!t) { check("found a board to measure on", false); }
  else {
    const { st, br, nbr } = t;
    const rival = E.byId(st, 1);
    rival.cash = 999;
    const hobp = E.BP_DATA.find((b) => b.ind === "HO" && b.lvl === 1);
    rival.hand.push(hobp);
    st.board.owner[nbr] = rival.id;
    const ok = E.doLaunch(st, rival, hobp, E.mulberry32(11), quiet, [nbr]);
    if (!ok) { check("a Hospitality was built beside the branch", false); }
    else {
      const ho = rival.businesses[rival.businesses.length - 1];
      const withBranch = E.hoBonusUnits(st, ho, rival);
      delete st.board.occupiedBy[br];
      const withoutBranch = E.hoBonusUnits(st, ho, rival);
      check("the branch is one of its customers",
        withBranch === withoutBranch + 1, `${withBranch} vs ${withoutBranch}`);
    }
  }
}

section("reach is where the chain stands");
{
  const { st, biz } = retailTable(2);
  const reach = E.reachableDistricts(st, biz);
  const home = E.footprintDistricts(st.board, biz.footprint);
  const brD = E.branchDistricts(st.board, biz);
  check("it reaches its home district and its branches, and nothing else",
    reach.size === home.size + brD.size, `${reach.size} vs ${home.size}+${brD.size}`);
  check("and every branch district is in reach", [...brD].every((d) => reach.has(d)));
}

section("sold, the shopfronts come down");
{
  const { st, me, biz } = retailTable(3);
  const br = E.branchPlotsOf(st.board, biz);
  check("three branches standing", br.length === 3, `${br.length}`);
  const before = E.discsPerPlayer(st) - E.discsFree(st, me);
  E.sellCompany(st, me, biz, true);
  check("no branch is left on the board", E.branchPlotsOf(st.board, biz).length === 0);
  check("their ground is nobody's again", br.every((k) => !(k in st.board.owner)));
  check("and their plots are free to build on", br.every((k) => E.plotFree(st.board, k)));
  const after = E.discsPerPlayer(st) - E.discsFree(st, me);
  check("the discs come back", after < before, `${before} -> ${after}`);
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
