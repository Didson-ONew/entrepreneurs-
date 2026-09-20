/* The match record ranks a tie the way the game does.

   finalRank breaks an EP tie by MORE ACTIVE COMPANIES, then cash, then fewer loan
   discs. The records writer skipped the company count, so on a tie the Hall of Fame
   could name a different winner than the screen that had just shown the result.

   Run: node test_record_rank.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const matchlog = require("./matchlog.js");

function loadEngine() {
  const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
  const cut = src.indexOf("/* ============================== REACT UI ============================== */");
  const logic = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, byId, finalRank, epTotal, activeBiz, bizInd, ENGINE_VERSION, BP_DATA, addEP };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

let failures = 0;
const check = (label, cond) => { console.log(`${cond ? "  ok  " : " FAIL "} ${label}`); if (!cond) failures++; };

/* Two players level on EP. "Builder" runs one company and has less cash; "Hoarder"
   runs none and has more. The game says Builder wins. */
const st = E.initGame(2, 5, ["Builder", "Hoarder"], undefined, false);
st.phase = "gameover";
const builder = E.byId(st, 0), hoarder = E.byId(st, 1);
E.addEP(builder, 10, "Company: Test L1", 12);
E.addEP(hoarder, 10, "Company: Test L1", 12);
const bp = E.BP_DATA.find((b) => b.ind === "RE" && b.lvl === 1);
const plot = Object.keys(st.board.graph)[0];
st.board.owner[plot] = builder.id;
builder.businesses.push({ id: 9001, bp, footprint: [plot], level: 1, upgraded: false, distressed: false, scored: true, epOnCard: 0, quarterBuilt: 1 });
st.board.occupiedBy[plot] = 9001;
builder.cash = 10; hoarder.cash = 40;
builder.discsInBank = 0; hoarder.discsInBank = 0;

const gameOrder = [...st.players].sort(E.finalRank).map((p) => p.name);
check(`the game ranks ${gameOrder.join(" over ")}`, gameOrder[0] === "Builder");

const room = { code: "TEST01", state: st, members: [{ seat: 0, name: "Builder" }, { seat: 1, name: "Hoarder" }], bots: 0, personas: false, startedAt: Date.now() - 1000 };
const rec = matchlog.buildRecord(E, room);
const recOrder = [...rec.players].sort((a, b) => a.rank - b.rank).map((p) => p.name);
check(`the record ranks ${recOrder.join(" over ")} - the same`, recOrder[0] === "Builder" && rec.winner && rec.winner.name === "Builder");

console.log(failures ? `\n${failures} check(s) failed\n` : "\nall checks passed\n");
process.exit(failures ? 1 : 0);
