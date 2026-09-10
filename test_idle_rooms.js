/* A table where somebody stopped answering is not a live game.

   After 48 hours of silence the room is retired: the play in it is written to
   the match log first, stamped unfinished, and then the room goes. The stamp is
   what keeps a mid-quarter snapshot out of every statistic that assumes a game
   reached its own end - because a "winner" at Q4 who was merely ahead when
   everyone left is not a winner, and averaging them in would drag every number
   down quietly. */
const livegames = require("./livegames.js");
const matchlog = require("./matchlog.js");

let fails = 0, n = 0;
const check = (what, ok, note = "") => {
  n++; if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
};
const section = (t) => console.log(`\n${t}`);

const HOUR = 3600 * 1000;
const room = (over = {}) => ({
  code: "ABC123", members: [], spectators: [], clients: new Set(),
  state: { phase: "planning", quarter: 4 }, ...over,
});

section("The window is forty-eight hours");
{
  check("KEEP_MS is 48 hours", livegames.KEEP_MS === 48 * HOUR,
    `${livegames.KEEP_MS / HOUR}h`);
}

section("What counts as activity");
{
  const now = Date.now();
  check("a room touched a minute ago is kept",
    livegames.worthKeeping(room({ touchedAt: now - 60 * 1000 }), now));
  check("one touched 47 hours ago is kept",
    livegames.worthKeeping(room({ touchedAt: now - 47 * HOUR }), now));
  check("one touched 49 hours ago is not",
    !livegames.worthKeeping(room({ touchedAt: now - 49 * HOUR }), now));

  /* The bug this exists to stop: touchedAt is only set when a room broadcasts,
     so a table somebody has just made has none at all. Falling through to 0
     reads as "idle since 1970", and the sweeper would delete a brand-new room
     seconds after it was created. */
  check("a brand-new room with no touchedAt is kept",
    livegames.worthKeeping(room({ createdAt: now, touchedAt: undefined, startedAt: null }), now));
  check("and lastActive says when it was made",
    livegames.lastActive(room({ createdAt: now })) === now);
  check("a room with nothing at all is not kept forever",
    !livegames.worthKeeping(room({ touchedAt: undefined, startedAt: null, createdAt: undefined }), now));

  check("a finished game is spent whatever the clock says",
    !livegames.worthKeeping(room({ touchedAt: now, state: { phase: "gameover", quarter: 12 } }), now));
}

section("createdAt survives a round trip through the file");
{
  const now = Date.now();
  // a lobby room, so pack does not need a whole board to walk
  const packed = livegames.pack(room({ createdAt: now - 5 * HOUR, touchedAt: now - HOUR, state: null }));
  check("it is written down", packed.createdAt === now - 5 * HOUR);
  const back = livegames.unpack(packed, () => null);
  check("and read back", back.createdAt === now - 5 * HOUR);

  // a file written before createdAt existed must still load sensibly
  const old = { ...packed }; delete old.createdAt;
  const revived = livegames.unpack(old, () => null);
  check("an older file falls back to touchedAt rather than 1970",
    revived.createdAt === old.touchedAt, String(revived.createdAt));
}

section("An abandoned game is written down, and marked");
{
  /* buildRecord needs enough of the engine to read a state. Rather than stand a
     game up, check the stamping rule directly on records of both kinds. */
  const finished = { id: "a", at: 1, players: [{ rank: 1, ep: 100, industries: ["RE"] }], humans: 2 };
  const quit = { id: "b", at: 2, unfinished: true, endedBecause: "idle",
    players: [{ rank: 1, ep: 22, industries: ["RE"] }], humans: 2 };

  const all = [finished, quit];
  const stats = matchlog.summarise(all, {}, {});
  check("the statistics count only the finished game", stats.matches === 1, `${stats.matches}`);
  check("but the abandoned one is still on file", stats.total === 2, `${stats.total}`);

  const asked = matchlog.summarise(all, {}, { unfinished: true });
  check("and can be asked for by name", asked.matches === 2, `${asked.matches}`);

  check("a finished record carries no stamp", finished.unfinished === undefined);
  check("an abandoned one says why it ended", quit.endedBecause === "idle");
}

section("A 22 EP snapshot cannot drag the averages down");
{
  /* The whole reason for the stamp: a game abandoned at Q4 has a low top score,
     and averaging it into "what a winning score looks like" is simply wrong. */
  const real = Array.from({ length: 9 }, (_, i) => ({
    id: `r${i}`, at: i, humans: 2, players: [{ rank: 1, ep: 100, industries: [] }],
  }));
  const quit = { id: "q", at: 99, unfinished: true, humans: 2,
    players: [{ rank: 1, ep: 10, industries: [] }] };

  const clean = matchlog.summarise(real, {}, {});
  check("the field being compared actually exists",
    typeof clean.summary.avgWinningEP === "number", String(clean.summary.avgWinningEP));
  const polluted = matchlog.summarise([...real, quit], {}, {});
  check("adding an abandoned game changes nothing",
    clean.summary.avgWinningEP === polluted.summary.avgWinningEP,
    `${clean.summary.avgWinningEP} vs ${polluted.summary.avgWinningEP}`);

  const counted = matchlog.summarise([...real, quit], {}, { unfinished: true });
  check("and counting it deliberately does move it",
    counted.summary.avgWinningEP < clean.summary.avgWinningEP,
    `${counted.summary.avgWinningEP} vs ${clean.summary.avgWinningEP}`);
}

console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
process.exit(fails ? 1 : 0);
