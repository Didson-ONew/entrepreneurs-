/* Rent follows the levels standing on each plot, not the plots.

   A vertical company stacks every level on one plot, so its whole rent goes to one
   landlord. A horizontal company puts one level on each plot, so each landlord takes
   $3. A persona can flip which way a company grows, and then a plot carries two levels
   while its neighbour carries one - $6 and $3, never $4.50 each.

   Run: node test_rent.js
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
    box.exports = { initGame, BP_DATA, byId, activeBiz, mulberry32, doLaunch, doUpgrade,
      levelsOn, ensureLevels, newBusiness, SCALING, upgradeScaling, runProduction,
      bizOpex, orthOf, PERSONAS };
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

/* Find a run of orthogonally connected plots so horizontal builds are possible. */
function connectedRun(st, n) {
  for (const start of Object.keys(st.board.owner === undefined ? {} : st.board.cellOf)) {
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

/* ============================================================ the levels record */
section("A new company knows where its levels stand");
{
  const st = E.initGame(2, 4, ["You"], undefined, false, undefined);
  const vertical = Object.keys(E.SCALING).filter((i) => E.SCALING[i] === "V");
  const horizontal = Object.keys(E.SCALING).filter((i) => E.SCALING[i] === "H");
  check("the board has both kinds of industry", vertical.length > 0 && horizontal.length > 0,
    `V: ${vertical.join(",")}  H: ${horizontal.join(",")}`);

  const vbp = E.BP_DATA.find((x) => E.SCALING[x.ind] === "V" && x.lvl === 3);
  const vb = E.newBusiness(vbp, ["a"], 1);
  check("a level 3 vertical stacks all three levels on its one plot", E.levelsOn(vb, "a") === 3,
    `${E.levelsOn(vb, "a")} on the plot`);

  const hbp = E.BP_DATA.find((x) => E.SCALING[x.ind] === "H" && x.lvl === 3);
  const hb = E.newBusiness(hbp, ["a", "b", "c"], 1);
  check("a level 3 horizontal puts one level on each of three plots",
    E.levelsOn(hb, "a") === 1 && E.levelsOn(hb, "b") === 1 && E.levelsOn(hb, "c") === 1);
  check("and the levels always add up to the company's level",
    ["a", "b", "c"].reduce((n, k) => n + E.levelsOn(hb, k), 0) === hb.level);
}

section("A business from before this record still answers");
{
  const bp = E.BP_DATA.find((x) => x.lvl === 3);
  const old = { id: 1, bp, footprint: ["a", "b"], level: 3, upgraded: false, distressed: false };
  const a = E.levelsOn(old, "a"), b = E.levelsOn(old, "b");
  check("an unrecorded level 3 on two plots falls back to 2 and 1, never 1.5 each",
    a + b === 3 && Number.isInteger(a) && Number.isInteger(b), `${a} and ${b}`);
}

/* ============================================================ rent in practice */
section("Rent is $3 for every level on a plot");
{
  /* Two landlords, one tenant. The tenant builds a vertical company on ONE of their
     plots, so that landlord takes the whole rent and the other takes nothing. */
  const st = E.initGame(2, 11, ["You"], undefined, false, undefined);
  const tenant = E.byId(st, 0);
  const landlordA = st.players[1], landlordB = st.players[2];

  const run = connectedRun(st, 2);
  check("found two connected plots", !!run, run && run.join(" "));
  st.board.owner[run[0]] = landlordA.id;
  st.board.owner[run[1]] = landlordB.id;

  const vbp = E.BP_DATA.find((x) => E.SCALING[x.ind] === "V" && x.lvl === 2);
  tenant.hand = [vbp]; tenant.cash = 500;
  const built = E.doLaunch(st, tenant, vbp, E.mulberry32(1), quiet, [run[0]]);
  check("the vertical company is built on landlord A's plot", built);

  const biz = E.activeBiz(tenant)[0];
  landlordA.cash = 0; landlordB.cash = 0; tenant.cash = 500;
  E.runProduction(st, quiet);
  check("landlord A collects $3 x 2 levels", landlordA.cash === 6, `$${landlordA.cash}`);
  check("landlord B, with nothing standing on their plot, collects nothing",
    landlordB.cash === 0, `$${landlordB.cash}`);
}

section("A horizontal company pays each landlord for its own storey");
{
  const st = E.initGame(2, 13, ["You"], undefined, false, undefined);
  const tenant = E.byId(st, 0);
  const A = st.players[1], B = st.players[2];
  const run = connectedRun(st, 2);
  st.board.owner[run[0]] = A.id;
  st.board.owner[run[1]] = B.id;

  const hbp = E.BP_DATA.find((x) => E.SCALING[x.ind] === "H" && x.lvl === 2);
  tenant.hand = [hbp]; tenant.cash = 500;
  const built = E.doLaunch(st, tenant, hbp, E.mulberry32(2), quiet, run);
  check("the level 2 horizontal covers both plots", built && E.activeBiz(tenant)[0].footprint.length === 2);

  A.cash = 0; B.cash = 0; tenant.cash = 500;
  E.runProduction(st, quiet);
  check("each landlord collects $3", A.cash === 3 && B.cash === 3, `A $${A.cash}, B $${B.cash}`);
}

section("The case that used to owe $4.50: two storeys here, one there");
{
  /* Technology spreads by default. The Systems Architect makes it stack instead, so a
     level 2 TE on two plots upgraded by that persona becomes level 3 on the same two
     plots - two levels on one, one on the other. */
  const st = E.initGame(2, 17, ["You"], undefined, false, undefined);
  const tenant = E.byId(st, 0);
  const A = st.players[1], B = st.players[2];
  tenant.persona = "tech_savvy";
  check("that persona really does flip Technology to vertical growth",
    E.upgradeScaling(tenant, { bp: { ind: "TE" } }) === "V");

  const run = connectedRun(st, 2);
  st.board.owner[run[0]] = A.id;
  st.board.owner[run[1]] = B.id;

  const bp = E.BP_DATA.find((x) => x.ind === "TE" && x.lvl === 2);
  tenant.hand = [bp]; tenant.cash = 500;
  E.doLaunch(st, tenant, bp, E.mulberry32(3), quiet, run);
  const biz = E.activeBiz(tenant)[0];
  check("built at level 2 on two plots", biz && biz.level === 2 && biz.footprint.length === 2);

  /* Neither plot is the tenant's, so the engine stacks on the first of the footprint. */
  const ok = E.doUpgrade(st, tenant, biz, E.mulberry32(4), quiet, run[1]);
  check("upgraded vertically onto the plot we named", ok && biz.level === 3 && biz.footprint.length === 2);
  check("that plot now carries two levels", E.levelsOn(biz, run[1]) === 2, `${E.levelsOn(biz, run[1])}`);
  check("and the other still carries one", E.levelsOn(biz, run[0]) === 1, `${E.levelsOn(biz, run[0])}`);

  A.cash = 0; B.cash = 0; tenant.cash = 500;
  E.runProduction(st, quiet);
  check("the two-storey landlord collects $6", B.cash === 6, `$${B.cash}`);
  check("the one-storey landlord collects $3", A.cash === 3, `$${A.cash}`);
  check("and the two together are the company's whole $3 x level rent",
    A.cash + B.cash === 3 * biz.level, `$${A.cash + B.cash} of $${3 * biz.level}`);
  check("every payment is a whole number of dollars",
    Number.isInteger(A.cash) && Number.isInteger(B.cash));
}

section("Stacking on your own land brings the rent back");
{
  const st = E.initGame(2, 19, ["You"], undefined, false, undefined);
  const tenant = E.byId(st, 0);
  const landlord = st.players[1];
  tenant.persona = "tech_savvy";

  const run = connectedRun(st, 2);
  st.board.owner[run[0]] = landlord.id;
  st.board.owner[run[1]] = tenant.id;          // the tenant owns the second plot

  const bp = E.BP_DATA.find((x) => x.ind === "TE" && x.lvl === 2);
  tenant.hand = [bp]; tenant.cash = 500;
  E.doLaunch(st, tenant, bp, E.mulberry32(5), quiet, run);
  const biz = E.activeBiz(tenant)[0];
  E.doUpgrade(st, tenant, biz, E.mulberry32(6), quiet);       // no plot named: bot's choice

  check("with no plot named, the new level goes on the tenant's own land",
    E.levelsOn(biz, run[1]) === 2, `own plot carries ${E.levelsOn(biz, run[1])}`);
  check("so the outside landlord is left collecting the smaller share",
    E.levelsOn(biz, run[0]) === 1);
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
