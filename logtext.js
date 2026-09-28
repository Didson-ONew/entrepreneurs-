/* ============================================================================
   Reading the game log from an audit, safely.  (logtext.js)

   WHY THIS EXISTS. Half the audits in this repo watch the game log to know when
   a quarter turned over, or that somebody sold a plot. They all did it the same
   way:

       const m = /^▶ Year \d+, Quarter (\d+)/.exec(String(msg));

   That worked for as long as the engine logged strings. It does not any more.
   The log was translated, so the engine emits a KEY AND ITS ARGUMENTS -
   logMsg("▶ Year {0}, Quarter {1}", year, quarter) returns { k, a } - and
   the client renders it in whatever language is on screen.

   String({k, a}) is "[object Object]". Every one of those regexes silently
   stopped matching. Nothing threw, no shape guard fired, and the audits carried
   on printing tables - with the columns that depended on the log reading zero.
   audit_state_of_play.js reported that the Q6 leader went on to win 0% of games
   at every table size, and that is the number the rulebook's "no runaway
   leaders" note is built on.

   THAT IS THE WORSE KIND OF ROT. A probe whose needle moves exits 2 and is
   loud. A probe that quietly measures nothing still prints a table, and the
   table is believed.

   SO: logText renders a message the way the English client would, and THROWS on
   anything it does not recognise rather than returning something regex-shaped
   and empty. An audit that starts getting a shape this does not know about
   stops, instead of reporting zeros.

   `seenCounter` is the other half. A regex that matches nothing is invisible;
   a counter that is still zero at the end of a game is not. Audits that key
   their whole measurement off a log line use it to assert they saw one.
   ========================================================================== */

/* Render a log message as the English client would. Accepts the { k, a } the
   engine emits, a plain string (older call sites, and the few places that still
   log literal text), and null/undefined for a message with no text. */
function logText(msg) {
  if (msg === null || msg === undefined) return "";
  if (typeof msg === "string") return msg;
  if (typeof msg === "object" && msg.k !== undefined) {
    const a = msg.a || [];
    return String(msg.k).replace(/\{(\d+)\}/g, (m, i) => (a[+i] === undefined ? m : String(a[+i])));
  }
  throw new Error(
    "logtext.logText: unrecognised log message shape " + JSON.stringify(msg) +
    " - the engine's log format has changed, and every audit that reads the log " +
    "is now measuring nothing. Fix this before trusting any audit output.");
}

/* The quarter a "Year N, Quarter M" line announces, or null for any other line.
   One place, so the next time that line is reworded there is one thing to fix
   rather than thirteen. */
const QUARTER_RE = /Year \d+, Quarter (\d+)/;
function quarterOf(msg) {
  const m = QUARTER_RE.exec(logText(msg));
  return m ? parseInt(m[1], 10) : null;
}

/* Counts how many times something was seen and complains if the answer is none.
   Use it for anything an audit's numbers actually depend on:

       const seen = seenCounter("quarter markers");
       ...  if (quarterOf(msg) !== null) seen.hit();
       ...  seen.assert();          // throws if the log never said so

   A silent zero becomes a stack trace, which the suite's audit check catches. */
function seenCounter(what) {
  let n = 0;
  return {
    hit() { n += 1; },
    get count() { return n; },
    assert() {
      if (n === 0) {
        throw new Error(
          `logtext: never saw ${what} in the whole run. The log line this audit ` +
          "keys on has been reworded, retranslated or removed, so every number " +
          "below it would have been zero. See logtext.js.");
      }
      return n;
    },
  };
}

module.exports = { logText, quarterOf, seenCounter };
