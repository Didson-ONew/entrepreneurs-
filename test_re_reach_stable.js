/* A Retail company's reach must not move while it is delivering.

   THE ORIGINAL BUG. Retail's extra districts used to be recomputed by open-icon
   count on every slot, so the moment it filled the icons in one district the pick
   drifted to another and the rest of the district it had been counting on became
   unreachable mid-delivery. A third of the units Retail left over had had enough
   capacity in reach when the delivery began. It was fixed by pinning the pick for
   the length of a delivery, and test_re_pick_pinned guarded that pin.

   THE PIN IS GONE, AND SO IS THE REASON FOR IT. Retail now opens branches - real
   buildings on real plots, one per level, placed when the company is launched or
   upgraded - and reachableDistricts reads where they stand. A building cannot
   drift. This checks the property the pin existed to provide, against the
   mechanism that replaced it: reach is the home district plus the branches,
   it is identical before and after a delivery, and nothing about selling moves it.

   Run: node test_re_reach_stable.js
*/
const fs = require("fs"), path = require("path"), vm = require("vm");
let fails = 0;
const check = (w, ok, note = "") => { if (!ok) fails++; console.log(`${ok ? "  ok  " : " FAIL "} ${w}${note ? `  [${note}]` : ""}`); };
const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const engine = src.slice(0, src.indexOf("/* ============================== REACT UI ============================== */"))
  .replace(/^\s*(import|export)\s.*$/gm, "");
const box = {}; const sb = { console, Math, Set, Object, Array, JSON, String, Map, box };
vm.createContext(sb);
vm.runInContext(engine + `box.E = { logEntry, initGame, mulberry32, advanceDraft, startPlanning,
  advancePlanning, activeBiz, bizInd, autoDeliver, businessCanProduce, reachableDistricts,
  footprintDistricts, branchDistricts, branchPlotsOf, ownerOf };`, sb);
const E = box.E;

/* A seeded game where a bot holds a producing Retail company partway through. */
let found = null;
for (let seed = 1; seed <= 60 && !found; seed++) {
  const st = E.initGame(3, seed, ["Seat 1"], undefined, true, undefined);
  st.players[0].isHuman = false;
  if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
  E.advancePlanning(st, E.mulberry32(seed + 777), (m) => {
    if (found) return;
    if (!/Quarter 6/.test(E.logEntry(m, null).msg)) return;
    for (const p of st.players) for (const b of E.activeBiz(p)) {
      if (E.bizInd(b) === "RE" && E.businessCanProduce(st, b)) {
        found = { seed, st: JSON.parse(JSON.stringify(st)), pid: p.id, bid: b.id };
        return;
      }
    }
  });
}
check("a bot with a producing Retail company was found by Q6", !!found, found && `seed ${found.seed}`);

if (found) {
  const st = found.st;
  const p = st.players.find((x) => x.id === found.pid);
  const biz = p.businesses.find((b) => b.id === found.bid);
  const key = (s) => [...s].sort().join("|");

  const home = E.footprintDistricts(st.board, biz.footprint);
  const branches = E.branchDistricts(st.board, biz);
  const before = E.reachableDistricts(st, biz);

  check("it has a branch for every level it has",
    E.branchPlotsOf(st.board, biz).length === biz.level,
    `level ${biz.level}, ${E.branchPlotsOf(st.board, biz).length} branches`);
  check("its reach is exactly its home district plus its branches",
    before.size === home.size + branches.size,
    `${before.size} reached, ${home.size} home + ${branches.size} branch`);

  /* Deliver everything it has. Under the old rule this is the point at which the
     pick drifted, because filling icons changed which districts scored best. */
  E.autoDeliver(st, p, biz);
  const after = E.reachableDistricts(st, biz);

  check("selling its whole output does not move its reach",
    key(after) === key(before), `${key(before)} -> ${key(after)}`);
  check("and the branches are still standing where they were",
    key(E.branchDistricts(st.board, biz)) === key(branches));
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
