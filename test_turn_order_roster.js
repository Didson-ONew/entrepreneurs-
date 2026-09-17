/* The bank roster lists players in the order they will sell in.

   WHY IT MATTERS. Delivery runs in turn order and demand icons are first come first
   served, so whether a rival sells before or after you decides whether the icons you
   planned around are still there. Nothing on screen said so: the bank listed players
   in SEAT order, which is fixed at setup and never changes, and the only hint of turn
   order anywhere was being able to guess the first player from the Board Meeting track.

   THE TWO CASES THAT MAKE THIS MORE THAN A SORT. Reposition rewrites state.turnOrder
   the instant it resolves, so the roster has to follow the live array rather than
   anything cached. And once delivery opens, the authoritative sequence is
   state.deliveryOrder - a snapshot taken as the phase begins - together with
   deliveryCursor, which says how many have already sold. */
const fs = require("fs"), vm = require("vm"), path = require("path");

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = src.indexOf("/* ============================== REACT UI ============================== */");
const engine = src.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");
const ui = src.slice(CUT);
const grab = (name, kind) => {
  const needle = kind === "const" ? `export const ${name} =` : `export function ${name}(`;
  const at = ui.indexOf(needle);
  if (at < 0) { console.error(`${name} is gone from the UI half - update this test`); process.exit(2); }
  const end = kind === "const" ? ui.indexOf("\n", at) : ui.indexOf("\n}", at) + 2;
  return ui.slice(at, end).replace(/^export\s+/, "");
};

const box = {}, sb = { console, Math, Set, Object, Array, JSON, box };
vm.createContext(sb);
vm.runInContext(engine + "\n" + grab("ordinal", "const") + "\n" + grab("tableOrder", "fn") + `
  box.e = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
    doReposition, tableOrder, ordinal };`, sb);
const E = box.e;

let fails = 0;
function check(label, ok, detail) {
  if (!ok) fails++;
  console.log(` ${ok ? "ok  " : "FAIL"}  ${label}${detail !== undefined && detail !== "" ? "  [" + detail + "]" : ""}`);
}
const names = (r) => r.players.map((p) => p.name);

check("ordinals read correctly",
  [1, 2, 3, 4, 5, 6].map(E.ordinal).join(" ") === "1st 2nd 3rd 4th 5th 6th",
  [1, 2, 3, 4, 5, 6].map(E.ordinal).join(" "));

/* A fresh game: the roster is turn order, which is NOT seat order. */
const st = E.initGame(3, 12345, ["Seat 1"], undefined, true, undefined);
const roster = E.tableOrder(st);
check("every player is listed exactly once",
  roster.players.length === st.players.length
  && new Set(roster.players.map((p) => p.id)).size === st.players.length);
check("the roster is turn order",
  JSON.stringify(roster.players.map((p) => p.id)) === JSON.stringify(st.turnOrder),
  JSON.stringify(roster.players.map((p) => p.id)));
check("nothing is marked sold outside delivery", roster.soldThrough === -1);

/* Seat order is what the panel used to show. If turn order happened to equal it this
   test would prove nothing, so say so rather than passing quietly. */
const seatOrder = st.players.map((p) => p.id);
check("this seed actually shuffles the seats, so the check above means something",
  JSON.stringify(seatOrder) !== JSON.stringify(st.turnOrder),
  `seats ${JSON.stringify(seatOrder)} vs turn ${JSON.stringify(st.turnOrder)}`);

/* REPOSITION: the player jumps to the front, and the roster follows immediately. */
const mover = st.players[st.turnOrder[st.turnOrder.length - 1]];
E.doReposition(st, mover, () => {});
const after = E.tableOrder(st);
check("reposition puts that player first in the roster at once",
  after.players[0].id === mover.id, after.players[0].name);
check("and nobody is lost doing it",
  after.players.length === st.players.length
  && new Set(after.players.map((p) => p.id)).size === st.players.length);
check("the rest keep their relative order",
  JSON.stringify(after.players.slice(1).map((p) => p.id))
  === JSON.stringify(roster.players.filter((p) => p.id !== mover.id).map((p) => p.id)));

/* DELIVERY: the snapshot wins over turnOrder, and the cursor marks who has sold. */
st.phase = "delivering";
st.deliveryOrder = [...st.turnOrder].reverse();   // deliberately different from turnOrder
st.deliveryCursor = 2;
const mid = E.tableOrder(st);
check("during delivery the roster follows deliveryOrder, not turnOrder",
  JSON.stringify(mid.players.map((p) => p.id)) === JSON.stringify(st.deliveryOrder),
  JSON.stringify(mid.players.map((p) => p.id)));
check("the cursor says how many have already sold", mid.soldThrough === 2);

/* A player who is somehow absent from the order must still appear. */
st.deliveryOrder = st.deliveryOrder.slice(1);
const short = E.tableOrder(st);
check("a player missing from the order is appended, not dropped",
  short.players.length === st.players.length
  && new Set(short.players.map((p) => p.id)).size === st.players.length,
  `${short.players.length} listed of ${st.players.length}`);

/* An empty or absent order must not blank the roster. */
st.deliveryOrder = [];
check("an empty delivery order falls back to turn order",
  E.tableOrder(st).players.length === st.players.length);
delete st.deliveryOrder;
check("a missing delivery order does not throw",
  E.tableOrder(st).players.length === st.players.length);

/* And it holds in a real finished game rather than a hand-built state. */
let played = 0, mismatched = 0;
for (let seed = 1; seed <= 40; seed++) {
  const g = E.initGame(3, seed, ["Seat 1"], undefined, true, undefined);
  g.players[0].isHuman = false;
  try {
    if (g.phase === "drafting") { E.advanceDraft(g, () => {}); E.startPlanning(g); }
    E.advancePlanning(g, E.mulberry32(seed + 7), () => {});
  } catch (e) { continue; }
  played++;
  const r = E.tableOrder(g);
  if (r.players.length !== g.players.length
    || new Set(r.players.map((p) => p.id)).size !== g.players.length) mismatched++;
}
check("every player is listed in every one of 40 played-out games",
  played > 0 && mismatched === 0, `${played} games, ${mismatched} bad`);

console.log(fails ? `\n${fails} check(s) failed` : "\nall checks passed");
process.exit(fails);
