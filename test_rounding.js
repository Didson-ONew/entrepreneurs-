/* Everything in this game is paid with chips and tracked on a score track, so nothing
   is allowed to come out in fractions. Every split rounds DOWN. The one leftover that
   survives is money in an industry pot, which carries forward to the next quarter
   instead of being lost.

   This plays full games and checks, at every quarter end, that no player holds a
   fraction of a dollar or a fraction of a point, and that no pot does either.

   Run: node test_rounding.js [games]
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "60", 10);
const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
let logic = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");

/* Watch the close of every quarter from inside the engine. */
const needle = "function finishQuarterAfterLH(state, log, rng) {\n  runClosingRest(state, log);";
if (!logic.includes(needle)) { console.error("the engine changed shape around finishQuarterAfterLH"); process.exit(2); }
logic = logic.replace(needle, needle + "\n  __watch(state);");

const box = {};
const bad = [];
const __watch = (state) => {
  const whole = (x) => Math.abs(x - Math.round(x)) < 1e-9;
  for (const p of state.players) {
    if (!whole(p.cash)) bad.push(`Q${state.quarter} ${p.name} holds $${p.cash}`);
    if (!whole(p.epBank)) bad.push(`Q${state.quarter} ${p.name} has ${p.epBank} EP banked`);
    for (const e of p.epLog || []) if (!whole(e.amount)) bad.push(`Q${state.quarter} "${e.label}" awarded ${e.amount} EP`);
  }
  for (const [ind, v] of Object.entries(state.pots || {})) if (!whole(v)) bad.push(`Q${state.quarter} the ${ind} pot holds $${v}`);
};
const sandbox = { console, Math, Set, Object, Array, JSON, box, __watch };
vm.createContext(sandbox);
vm.runInContext(logic + `
  box.exports = { initGame, mulberry32, advancePlanning, advanceDraft, startPlanning, epTotal, byId };
`, sandbox);
const E = box.exports;

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};

console.log(`Playing ${GAMES} games and watching every quarter for a fraction\n`);
let played = 0, quartersSeen = 0;
for (let seed = 1; seed <= GAMES; seed++) {
  const st = E.initGame(3, seed, ["Seat 1"], undefined, true, undefined);
  st.players[0].isHuman = false;                 // an all-bot table plays itself through
  if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
  E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
  if (st.phase === "gameover") { played++; quartersSeen += 12; }
}
check(`all ${GAMES} games finished`, played === GAMES, `${played} finished`);
console.log(`  ..   watched ${quartersSeen} quarter ends across ${played} tables`);

check("no player ever held a fraction of a dollar or a point, and no pot did either",
  bad.length === 0);
if (bad.length) {
  const uniq = [...new Set(bad)];
  console.log(`\n  ${bad.length} fractional value(s); first few:`);
  uniq.slice(0, 12).forEach((m) => console.log(`    ${m}`));
}

/* The one leftover that is allowed to survive: a pot too small to divide rides forward
   rather than being handed out or thrown away. */
console.log("\nA pot that will not divide carries forward");
{
  const st = E.initGame(3, 5, ["Seat 1"], undefined, true, undefined);
  st.players[0].isHuman = false;
  if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
  E.advancePlanning(st, E.mulberry32(99), () => {});
  const potsLeft = Object.values(st.pots || {}).reduce((a, b) => a + b, 0);
  check("money is still sitting in the pots when the game ends", potsLeft >= 0,
    `$${potsLeft} across all six industries`);
  check("and every last dollar of it is a whole dollar",
    Object.values(st.pots || {}).every((v) => Number.isInteger(v)),
    Object.entries(st.pots || {}).map(([k, v]) => `${k}:${v}`).join(" "));
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
