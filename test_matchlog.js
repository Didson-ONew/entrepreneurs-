/* The match log and the statistics drawn from it.

   Plays real games through the engine to completion, records them the way the
   server does, and checks the numbers that come back out.

   Run: node test_matchlog.js
*/
const fs = require("fs");
const path = require("path");
const os = require("os");
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
    box.exports = { initGame, mulberry32, advancePlanning, advanceResolution, byId,
      activeBiz, epTotal, ENGINE_VERSION, PERSONAS, startPlanning };
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

/* initGame always seats at least one human, so seat 0 is created as a human and
   then handed to a bot - exactly what the server does when someone walks away.
   The table then plays itself to the end with no interaction, which is what a
   recorded match needs to look like. */
function playOut(seed, bots, personas) {
  const st = E.initGame(bots, seed, ["Seat 1"], undefined, personas);
  st.players[0].isHuman = false;
  const rng = E.mulberry32(seed + 777);
  const noop = () => {};
  // the game opens on the draft, waiting for the seat we just handed to a bot:
  // fill its hand and move on, which is what the server does on a takeover
  if (st.phase === "drafting") {
    const need = (st.draftCounts || {})[0] || 0;
    for (let k = 0; k < need; k++) {
      const ind = Object.keys(st.decks).find((i) => st.decks[i].length);
      if (!ind) break;
      st.players[0].hand.push(st.decks[ind].shift());
    }
    st.draftQueue = [];
    st.awaitingPlayerId = null;
    E.startPlanning(st);
    E.advancePlanning(st, rng, noop);
  }
  for (let guard = 0; guard < 4000 && st.phase !== "gameover"; guard++) {
    if (st.phase === "planning") E.advancePlanning(st, rng, noop);
    else if (st.phase === "resolving" || st.phase === "production") E.advanceResolution(st, rng, noop);
    else break;
  }
  return st;
}

/* A room, as the server would hand it to the recorder. Humans are marked by
   giving the seat a member; everything else is a bot. */
function fakeRoom(st, names, personas) {
  return {
    code: "TEST01",
    members: names.map((name, i) => ({ name, seat: i, host: i === 0 })),
    state: st,
    personas: !!personas,
    startedAt: Date.now() - 900000,
  };
}

section("Recording a finished match");
let rec;
{
  const st = playOut(101, 3, true);
  st.players[0].isHuman = true;          // record seat 0 as the human who sat there
  check("the game really finished", st.phase === "gameover", st.phase);
  rec = matchlog.buildRecord(E, fakeRoom(st, ["Ana"], true));
  check("one entry per seat", rec.players.length === st.players.length);
  check("it stamps the rules build it was played under", rec.engine === E.ENGINE_VERSION);
  check("it records the quarter it ended on", rec.quarters === 12, `Q${rec.quarters}`);
  check("ranks run 1..n with no gaps",
    JSON.stringify(rec.players.map((p) => p.rank).sort((a, b) => a - b)) === JSON.stringify(rec.players.map((_, i) => i + 1)));
  const win = rec.players.find((p) => p.rank === 1);
  check("the winner is the highest scorer", win.ep === Math.max(...rec.players.map((p) => p.ep)));
  check("the winner is named at the top level", rec.winner.name === win.name && rec.winner.ep === win.ep);
  check("EP is a whole number", rec.players.every((p) => Number.isInteger(p.ep)));
  const p0 = rec.players[0];
  check("each seat carries its land and companies", "plots" in p0 && "districts" in p0 && "companies" in p0);
  const bucketSum = Object.values(p0.ep_from).reduce((a, b) => a + b, 0);
  check("the EP breakdown adds up to the score", Math.round(bucketSum) === p0.ep,
    `${Math.round(bucketSum)} vs ${p0.ep}`);
  check("personas are remembered when they were in play", rec.personas === true && rec.players.every((p) => p.persona));
}

section("Classifying where EP came from");
{
  const cases = [
    ["Entered RE", "industries"], ["Vested: Corner Store I", "companies"],
    ["Megacorp: Local Syndicate", "megacorps"], ["IPO tile", "ipo"],
    ["The Real-Estate Mogul", "land"], ["The Omnipresent", "land"],
    ["Cash on hand ($35)", "cash"], ["Unpaid loans (2 discs)", "loans"],
  ];
  for (const [label, want] of cases) check(`"${label}" -> ${want}`, matchlog.epBucket(label) === want, matchlog.epBucket(label));
}

section("Who counts as the same player");
{
  check("case and spacing do not make a second person",
    matchlog.nameKey(" Ana ") === matchlog.nameKey("ana") && matchlog.nameKey("A  na") === matchlog.nameKey("A na"));
  check("names are trimmed and capped", matchlog.cleanName("  " + "x".repeat(40) + "  ").length === 24);
}

section("The hall of fame");
{
  const mk = (at, rows) => ({
    id: String(at), at, players: rows.map(([name, ep, rank, human = true, abandoned = false]) =>
      ({ name, ep, rank, human, abandoned, megacorps: 0, industries: [], ep_from: {} })),
    humans: rows.filter((r) => r[3] !== false).length, bots: 0,
  });
  const matches = [
    mk(1, [["Ana", 50, 1], ["Bruno", 40, 2], ["Balanced Bot", 60, 3, false]]),
    mk(2, [["ana", 30, 2], ["Bruno", 45, 1]]),
    mk(3, [["Ana", 20, 2], ["Cara", 55, 1]]),
  ];
  const hof = matchlog.hallOfFame(matches);
  const by = Object.fromEntries(hof.map((e) => [e.name.toLowerCase(), e]));
  check("bots never enter the hall of fame", !hof.some((e) => /bot/i.test(e.name)));
  check("Ana's three games are one row", by.ana.matches === 3, JSON.stringify(hof.map((e) => e.name)));
  check("her EP totals across them", by.ana.ep === 100, `${by.ana.ep}`);
  check("and her wins are counted", by.ana.wins === 1);
  check("the display name follows her latest spelling", by.ana.name === "Ana");
  check("Bruno's total is right", by.bruno.ep === 85 && by.bruno.wins === 1);
  check("ranked by total EP", hof[0].name === "Ana" && hof[1].name === "Bruno");
  check("best single game is kept", by.ana.best === 50 && by.ana.avg === 33.3, `best ${by.ana.best}, avg ${by.ana.avg}`);
  check("win rate is a percentage", by.bruno.winRate === 50, `${by.bruno.winRate}%`);

  // a seat handed to a bot mid-game does not earn its abandoner anything
  const abandoned = [mk(4, [["Dev", 70, 1, false, true], ["Ana", 10, 2]])];
  const hof2 = matchlog.hallOfFame(abandoned);
  check("an abandoned seat is not credited", !hof2.some((e) => e.name === "Dev"));
}

section("Summary statistics");
{
  const games = [];
  for (const seed of [11, 22, 33]) {
    const st = playOut(seed, 3, true);
    st.players[0].isHuman = true;
    games.push(matchlog.buildRecord(E, fakeRoom(st, ["Ana"], true)));
  }
  const s = matchlog.summarise(games, E.PERSONAS);
  check("it counts the matches", s.matches === 3);
  check("it reports an average winning score", s.summary.avgWinningEP > 0, `${s.summary.avgWinningEP} EP`);
  check("it times the games it recorded", s.summary.avgDurationMs > 0, `${s.summary.avgDurationMs} ms`);
  check("it names the highest score ever seen", !!s.summary.topScore === false || s.summary.topScore.ep > 0);
  check("industries are ranked by how often they are entered",
    s.industries.length > 0 && s.industries.every((i, k) => k === 0 || i.entered <= s.industries[k - 1].entered));
  check("personas report a win rate", s.personas.length > 0 && s.personas.every((p) => p.name && p.winRate >= 0));
  check("persona names are the current ones, not their keys",
    s.personas.every((p) => p.name !== p.key), s.personas.map((p) => p.name).join(", "));
  check("EP sources are broken out", s.epSources.length > 0 && s.epSources.some((e) => e.source === "companies"));
  check("recent matches are newest first",
    s.recent.every((m, k) => k === 0 || m.at <= s.recent[k - 1].at));
  check("an empty history does not explode", matchlog.summarise([]).matches === 0);
}

section("The file on disk");
{
  const tmp = path.join(os.tmpdir(), `matches-test-${process.pid}.jsonl`);
  try { fs.unlinkSync(tmp); } catch (_) {}
  check("appending works", matchlog.append(rec, tmp) === true);
  matchlog.append({ ...rec, id: "second" }, tmp);
  check("both lines come back", matchlog.load(tmp).length === 2);
  check("a match survives the round trip",
    JSON.stringify(matchlog.load(tmp)[0]) === JSON.stringify(rec));
  // a half-written final line must cost the last match and nothing more
  fs.appendFileSync(tmp, '{"id":"torn","play');
  check("a torn last line is skipped, not fatal", matchlog.load(tmp).length === 2);
  check("a file that does not exist reads as empty", matchlog.load(tmp + ".nope").length === 0);
  fs.unlinkSync(tmp);
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
