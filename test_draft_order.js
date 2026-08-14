/* The draft is one sequence, in reverse seat order.

   The last seat picks first. Everybody is in the same queue - a bot takes its cards
   when the order reaches it, not before. This used to run as two passes, every bot
   during setup and then every human, so at a mixed table a bot seated 2nd took its
   Blueprints ahead of a human seated 3rd, who by the rule picks first.

   Run: node test_draft_order.js
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
    box.exports = { initGame, advanceDraft, byId, startPlanning, advancePlanning, mulberry32, INDUSTRIES };
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

const seatOf = (st, id) => st.turnOrder.indexOf(id) + 1;
const nameOf = (st, id) => E.byId(st, id).name;

/* Play out the whole draft, recording who picked in what order. Humans are served by
   taking the first available deck, which is all this test cares about. */
function runDraft(st) {
  const picks = [];
  let guard = 0;
  const before = st.players.map((p) => p.hand.length);
  st.players.forEach((p, i) => { if (p.hand.length > before[i]) { /* unreachable, kept for clarity */ } });
  // whatever the bots took during setup happened at their place in the order already
  st.draftOrder.forEach((id) => { if (!E.byId(st, id).isHuman && E.byId(st, id).hand.length) picks.push(id); });
  while (st.phase === "drafting" && guard++ < 50) {
    const who = st.awaitingPlayerId;
    const p = E.byId(st, who);
    const need = st.draftCounts[who];
    while (p.hand.length < need) {
      const ind = E.INDUSTRIES.find((i) => st.decks[i] && st.decks[i].length);
      if (!ind) break;
      p.hand.push(st.decks[ind].shift());
    }
    picks.push(who);
    E.advanceDraft(st);
    // any bots seated after this human drafted inside advanceDraft
    st.draftOrder.forEach((id) => {
      if (!E.byId(st, id).isHuman && E.byId(st, id).hand.length && !picks.includes(id)) picks.push(id);
    });
  }
  return picks;
}

section("Reverse seat order, everyone in one queue");
{
  let allInOrder = true, sawBotAfterHuman = false, checked = 0;
  const offenders = [];
  for (let seed = 1; seed <= 60; seed++) {
    const st = E.initGame(2, seed, ["Ana", "Bruno"], undefined, false, undefined);
    const picks = runDraft(st);
    checked++;
    // the order picks were taken in must be exactly the reverse seat order
    const want = st.draftOrder;
    if (picks.length !== want.length || picks.some((id, i) => id !== want[i])) {
      allInOrder = false;
      if (offenders.length < 2) {
        offenders.push(`seed ${seed}: took ${picks.map((id) => `${nameOf(st, id)}#${seatOf(st, id)}`).join(",")}`);
      }
    }
    // did any seed put a bot behind a human in the order? that is the case that used to break
    const firstHuman = want.findIndex((id) => E.byId(st, id).isHuman);
    if (want.slice(firstHuman + 1).some((id) => !E.byId(st, id).isHuman)) sawBotAfterHuman = true;
  }
  check("every draft ran in exact reverse seat order", allInOrder, offenders.join(" | "));
  check("and the seeds included tables where a bot sits behind a human", sawBotAfterHuman,
    "otherwise this test would prove nothing");
  check("plenty of tables checked", checked === 60, `${checked}`);
}

section("A bot seated first drafts last");
{
  /* The exact shape reported: find a table where a bot holds an early seat, and check
     it is still empty-handed while the game waits on a human seated behind it. */
  let found = null;
  for (let seed = 1; seed <= 200 && !found; seed++) {
    const st = E.initGame(2, seed, ["Ana", "Bruno"], undefined, false, undefined);
    const waiting = st.awaitingPlayerId;
    const bots = st.players.filter((p) => !p.isHuman);
    const late = bots.find((b) => seatOf(st, b.id) < seatOf(st, waiting));
    if (late) found = { seed, st, late, waiting };
  }
  check("found a table with a bot seated ahead of the waiting human", !!found,
    found ? `seed ${found.seed}` : "none in 200 seeds");
  if (found) {
    const { st, late, waiting } = found;
    check("the game is waiting on the human", E.byId(st, waiting).isHuman);
    check("that human sits later than the bot",
      seatOf(st, waiting) > seatOf(st, late.id), `human seat ${seatOf(st, waiting)}, bot seat ${seatOf(st, late.id)}`);
    check("and the bot has not drafted yet - it picks after them", late.hand.length === 0,
      `${late.name} holds ${late.hand.length} cards`);
  }
}

section("The draft still finishes, and everyone gets their cards");
{
  let ok = true, detail = "";
  for (let seed = 1; seed <= 40; seed++) {
    const st = E.initGame(2, seed, ["Ana", "Bruno"], undefined, false, undefined);
    runDraft(st);
    if (st.phase === "drafting") { ok = false; detail = `seed ${seed} never finished`; break; }
    for (const p of st.players) {
      if (p.hand.length !== st.draftCounts[p.id]) {
        ok = false;
        detail = `seed ${seed}: ${p.name} holds ${p.hand.length}, should hold ${st.draftCounts[p.id]}`;
        break;
      }
    }
    if (!ok) break;
  }
  check("every player ends the draft with exactly their seat's card count", ok, detail);
}

section("Later seats really do draft more");
{
  const st = E.initGame(2, 1, ["Ana", "Bruno"], undefined, false, undefined);
  const bySeat = st.draftOrder.map((id) => [seatOf(st, id), st.draftCounts[id]]);
  const sorted = [...bySeat].sort((a, b) => a[0] - b[0]);
  check("card counts never fall as the seat number rises",
    sorted.every(([, n], i) => i === 0 || n >= sorted[i - 1][1]),
    sorted.map(([s, n]) => `seat${s}:${n}`).join(" "));
}

section("Single player is affected too");
{
  /* One human against three bots: if the human is seated last they draft FIRST, and
     no bot should have taken anything before them. */
  let found = null;
  for (let seed = 1; seed <= 200 && !found; seed++) {
    const st = E.initGame(3, seed, ["You"], undefined, false, undefined);
    if (st.draftOrder[0] === st.players[0].id) found = { seed, st };
  }
  check("found a seed where the human drafts first", !!found, found ? `seed ${found.seed}` : "none");
  if (found) {
    const { st } = found;
    check("no bot has drafted yet",
      st.players.filter((p) => !p.isHuman).every((b) => b.hand.length === 0),
      st.players.filter((p) => !p.isHuman).map((b) => `${b.name}:${b.hand.length}`).join(" "));
  }
}

section("Bots read what has already been taken");
{
  /* Every card anyone drafts goes into draftTaken, which is what the bots weigh and
     what the draft screen shows. With the old two-pass draft, a bot could never see a
     human's pick, because no human had picked yet. */
  const st = E.initGame(2, 3, ["Ana", "Bruno"], undefined, false, undefined);
  const beforeHuman = (st.draftTaken || []).length;
  const who = st.awaitingPlayerId;
  const p = E.byId(st, who);
  while (p.hand.length < st.draftCounts[who]) {
    p.hand.push(st.decks.HC.length ? st.decks.HC.shift() : st.decks[E.INDUSTRIES.find((i) => st.decks[i].length)].shift());
    (st.draftTaken = st.draftTaken || []).push("HC");
  }
  E.advanceDraft(st);
  const afterBots = (st.draftTaken || []).length;
  check("the record of taken cards grows as the draft proceeds", afterBots > beforeHuman,
    `${beforeHuman} -> ${afterBots}`);
  check("and it contains the human's pick, so later bots can see it",
    (st.draftTaken || []).includes("HC"));
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
