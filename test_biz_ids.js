/* Business ids are unique across a game, even across a restart. They were minted from a
   counter that starts at 1 whenever the engine is loaded; a room restored from backup
   already holds ids 1, 2, 3, so every launch after a restart collided. A live match
   went through three deploys and came out with three of one player's four companies
   all numbered 1 - hovering one described another, and anything sent by id could land
   on the wrong building. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
let fails = 0, n = 0;
const check = (what, ok, note = "") => { n++; if (!ok) fails++; console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`); };

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const engine = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");
const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, String, box };
vm.createContext(sandbox);
vm.runInContext(engine + `
  box.E = { initGame, byId, newBusiness, nextBizId, repairBizIds, BP_DATA, plotFree, orthOf,
    resetCounter: () => { bizIdCounter = 1; }, counter: () => bizIdCounter };
`, sandbox);
const E = box.E;
const bp = (ind) => E.BP_DATA.find((x) => x.ind === ind && x.lvl === 1);
const freePlots = (st, k) => Object.keys(st.board.graph).filter((pk) => E.plotFree(st.board, pk) && !(pk in st.board.owner)).slice(0, k);
const place = (st, p, b) => { b.footprint.forEach((pk) => { st.board.owner[pk] = p.id; st.board.occupiedBy[pk] = b.id; }); p.businesses.push(b); return b; };

console.log("\nAfter a restart, a new company never takes an id already on the board");
{
  const st = E.initGame(1, 21, ["You"], undefined, false);
  const me = E.byId(st, 0), bot = st.players[1];
  const [a, b, c, d] = freePlots(st, 4);
  const first = place(st, me, E.newBusiness(bp("RE"), [a], 1, st));
  const second = place(st, bot, E.newBusiness(bp("HO"), [b], 1, st));
  check("two companies get two ids", first.id !== second.id, `${first.id}, ${second.id}`);
  E.resetCounter();                       // what a server restart does to the engine
  check("the counter really did start over", E.counter() === 1);
  const third = place(st, me, E.newBusiness(bp("UT"), [c], 2, st));
  check("the next company is numbered past everything in play, not from 1 again",
    third.id > Math.max(first.id, second.id), `${first.id}, ${second.id} then ${third.id}`);
  const fourth = E.newBusiness(bp("MA"), [d], 2, st);
  check("and the one after that too", fourth.id > third.id, `${fourth.id}`);
  check("a business built without a state still gets a fresh id", E.newBusiness(bp("HC"), [d], 2).id > fourth.id);
}

console.log("\nA game already numbered by a reset counter is repaired on restore");
{
  const st = E.initGame(1, 22, ["You"], undefined, false);
  const me = E.byId(st, 0);
  const [a, b, c, d] = freePlots(st, 4);
  const inn = place(st, me, E.newBusiness(bp("HO"), [a], 1, st));
  // what the live room looked like: two more companies minted with the inn's id
  const hub = place(st, me, { ...E.newBusiness(bp("TE"), [b, c], 3, st), id: inn.id });
  st.board.occupiedBy[b] = inn.id; st.board.occupiedBy[c] = inn.id;
  const plant = place(st, me, { ...E.newBusiness(bp("UT"), [d], 4, st), id: inn.id });
  st.board.occupiedBy[d] = inn.id;
  check("the corruption is reproduced: three companies, one id", inn.id === hub.id && hub.id === plant.id);
  const fixed = E.repairBizIds(st);
  check("two of them are renumbered", fixed === 2, `${fixed}`);
  check("the first keeps its number", inn.id === st.players[0].businesses[0].id);
  const ids = me.businesses.map((x) => x.id);
  check("all three are now distinct", new Set(ids).size === 3, ids.join(","));
  check("the plots under the renumbered ones point at their real building",
    st.board.occupiedBy[b] === hub.id && st.board.occupiedBy[c] === hub.id && st.board.occupiedBy[d] === plant.id);
  check("the inn's plot still points at the inn", st.board.occupiedBy[a] === inn.id);
  check("a clean game is left alone", E.repairBizIds(st) === 0);
}

console.log("\nThe server repairs every room it restores");
{
  const srv = fs.readFileSync(path.join(__dirname, "server.js"), "utf8");
  check("the engine exports the repair", /activeBiz, repairBizIds,/.test(srv));
  check("the boot-file restore calls it", /const resumed = livegames\.load\(GAMES_FILE, seededRng\);\s*for \(const room of resumed\) \{ repairRoomIds\(room\);/.test(srv));
  check("and so does the backup-store restore", /livegames\.unpack\(saved, seededRng\);\s*repairRoomIds\(room\);/.test(srv));
}
console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
process.exit(fails ? 1 : 0);
