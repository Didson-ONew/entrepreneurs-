/* ============================================================================
   The audits can still read the game log.

   WHY THIS IS A SEPARATE TEST FROM test_audits_alive.js. That one catches the
   LOUD rot: an audit whose source-shape needle no longer matches exits 2 and is
   reported. This one catches the SILENT rot, which is worse and had been
   running unnoticed for longer.

   Eleven audits key their measurements off a line in the game log - almost all
   of them off the quarter marker, "Year N, Quarter M", which is how they know
   when to take a standings snapshot. They read it with a regex over the message.

   When the log was translated, the engine stopped logging strings. logMsg now
   returns { k, a } - a key and its arguments - and the client renders it in
   whatever language is on screen. String({k, a}) is "[object Object]", so every
   one of those regexes quietly stopped matching. Nothing threw. No needle moved.
   The audits still ran, still printed their tables, and every column that came
   from the log read zero.

   audit_state_of_play.js is the one that mattered: it reported that the Q6
   leader went on to win 0% of games at every table size, which is the section
   the rulebook's "no runaway leaders" note is built on. The real figure is
   nowhere near zero.

   WHAT THIS ASSERTS. Not the wording of any line - that is allowed to change.
   It asserts the CONTRACT the audits depend on:

     1. the engine still announces each quarter on the log
     2. logtext.js can render whatever shape the engine emits, in English
     3. quarterOf() recovers the quarter number from that rendering

   If the engine's log format changes again, this fails with a message saying so,
   instead of thirteen audits quietly reporting zeros.
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { logText, quarterOf, seenCounter } = require("./logtext.js");

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("FAIL  the engine marker moved - update this test"); process.exit(1); }

const box = {};
const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
vm.createContext(sandbox);
vm.runInContext(SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "") + `
  box.E = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning };
`, sandbox);
const E = box.E;

let failures = 0;
const check = (what, ok, detail = "") => {
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${detail ? `  [${detail}]` : ""}`);
  if (!ok) failures += 1;
};

/* Play one four-seat game to the end, capturing every message the engine logs. */
const messages = [];
const st = E.initGame(3, 20260926, ["Seat 1"], undefined, true, undefined);
st.players[0].isHuman = false;
if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
E.advancePlanning(st, E.mulberry32(20260926 + 777), (msg) => { messages.push(msg); });

check("a game produces log messages", messages.length > 0, `${messages.length} messages`);
check("the game reached the end", st.phase === "gameover", st.phase);

/* 1. Every message renders. logText throws on a shape it does not know, which is
      the point - an unknown shape must stop the run, not become "". */
let rendered = 0;
let renderError = "";
try {
  for (const m of messages) { const s = logText(m); if (typeof s === "string") rendered += 1; }
} catch (e) { renderError = e.message; }
check("every log message renders to English text", !renderError && rendered === messages.length,
  renderError || `${rendered}/${messages.length}`);

/* 2. Nothing renders as the tell-tale of the bug this test exists for. */
const objecty = messages.filter((m) => !renderError && logText(m).includes("[object Object]"));
check("no message renders as [object Object]", objecty.length === 0, `${objecty.length} did`);

/* 3. Placeholders are actually substituted - a key rendered with its {0} still in
      it would match a regex looking for digits and quietly give the wrong answer. */
const unfilled = messages.filter((m) => !renderError && /\{\d+\}/.test(logText(m)));
check("no message renders with an unfilled {n} placeholder", unfilled.length === 0,
  unfilled.length ? logText(unfilled[0]) : "");

/* 4. The quarter marker - the line eleven audits take their snapshots on - is
      still emitted, and quarterOf still recovers the number from it. */
const seen = seenCounter("the quarter marker");
const quarters = [];
for (const m of messages) {
  const q = renderError ? null : quarterOf(m);
  if (q !== null) { seen.hit(); quarters.push(q); }
}
let assertErr = "";
try { seen.assert(); } catch (e) { assertErr = e.message; }
check("the engine announces each quarter on the log", !assertErr, assertErr || `${seen.count} markers`);

/* A twelve-quarter game announces Q2 through Q12: the first quarter is not
   announced because nothing advanced into it. Any game that ran past Q2 should
   give a rising run of quarter numbers. */
const rising = quarters.length > 1 && quarters.every((q, i) => i === 0 || q > quarters[i - 1]);
check("the quarters it announces run upward", rising,
  quarters.length ? `Q${quarters[0]}..Q${quarters[quarters.length - 1]}` : "none");
check("it got past the halfway point the audits sample at", quarters.includes(6),
  quarters.join(","));

/* 5. logText refuses a shape it does not understand, rather than inventing one. */
let threw = false;
try { logText({ notAKey: true }); } catch (e) { threw = /unrecognised log message shape/.test(e.message); }
check("logText throws on an unrecognised message shape", threw);

/* 6. And the idiom that caused all this does not come back. String(msg) on a
      message the engine now emits as an object is "[object Object]"; any audit
      that reads the log must go through logtext.js. This is a static check
      because the damage is invisible at runtime - the audit still runs. */
const auditFiles = fs.readdirSync(__dirname).filter((f) => /^audit_.*\.(js|mjs)$/.test(f));
const offenders = [];
for (const f of auditFiles) {
  const src = fs.readFileSync(path.join(__dirname, f), "utf8");
  /* Only the log callback matters. String(x) on a number or a name is fine, so
     this looks for the specific names the log callbacks bind. */
  const bad = src.match(/String\((?:msg|line|entry)\)/g);
  if (bad) offenders.push(`${f} (${bad.length})`);
}
check("no audit String()s a log message instead of rendering it", offenders.length === 0,
  offenders.join(", "));

console.log(`\n${failures ? `${failures} failed` : "all passed"}`);
process.exit(failures ? 1 : 0);
