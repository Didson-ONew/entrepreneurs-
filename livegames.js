/* ============================================================================
   Entrepreneurs - games in progress, kept across a restart.

   A room used to live only in the server's memory. That is fine while the server
   runs and terrible when it does not: a deploy, a crash, or hosting that puts the
   service to sleep after fifteen idle minutes took every game on the board with
   it. A three-bot game that had been waiting days for one player's move simply
   stopped existing.

   So the rooms are written to the data directory whenever they change, and read
   back at boot. Players rejoin with the token their browser already holds, and
   the game is where they left it.

   WHAT IS AND IS NOT KEPT

     kept      the board, every player, the log, the chat, who holds which seat,
               and the exact position of the random number generator
     not kept  the open connections, obviously - every browser reconnects on its
               own and is sent the state as usual

   THE RANDOM NUMBER GENERATOR is the part that has to be right. The game's
   shuffles and tie-breaks come from a seeded generator, so replaying a game with
   the same seed gives the same game. Saving the seed alone would rewind it: a
   restart would re-deal cards that had already been dealt. What is saved is the
   seed AND how many numbers have been drawn from it, and the generator is wound
   forward that many draws on the way back in. See rngFactory just below.

   A room is dropped rather than kept when the game is over, or when nothing has
   happened in it for a fortnight. Neither is worth carrying forever.
   ========================================================================== */
const fs = require("fs");

const FORMAT = 1;
const KEEP_MS = 14 * 24 * 60 * 60 * 1000;      // a fortnight of silence and it is gone

/* The generator, and the count that makes it restorable.

   Given the engine's mulberry32, hands back a maker of generators that remember how
   many numbers have been drawn from them. mulberry32 is a pure function of its seed
   and its call count, so winding a fresh one forward by that count lands it exactly
   where the old one stood. Saving the seed alone would rewind the game: it would
   re-deal cards it had already dealt, and nobody would notice until the same
   Blueprint turned up twice in one game.

   It takes mulberry32 as an argument rather than importing it because the engine is
   loaded into a sandbox at boot and this file must not know about any of that. */
function rngFactory(mulberry32) {
  return function seededRng(seed, calls = 0) {
    const draw = mulberry32(seed);
    for (let i = 0; i < calls; i++) draw();
    const rng = () => { rng.calls += 1; return draw(); };
    rng.seed = seed;
    rng.calls = calls;
    return rng;
  };
}

/* Sets do not survive JSON, and board.graph is full of them. */
function plainState(st) {
  if (!st) return null;
  const graph = {};
  for (const k of Object.keys(st.board.graph)) graph[k] = [...st.board.graph[k]];
  return { ...st, board: { ...st.board, graph } };
}
function reviveState(st) {
  if (!st) return null;
  const graph = {};
  for (const k of Object.keys(st.board.graph || {})) graph[k] = new Set(st.board.graph[k]);
  return { ...st, board: { ...st.board, graph } };
}

/* One room, as it goes to disk. `clients` is left out on purpose - those are open
   HTTP responses, and they belong to a process that is about to stop existing. */
function pack(room) {
  return {
    code: room.code,
    bots: room.bots,
    members: room.members,
    spectators: room.spectators || [],
    state: plainState(room.state),
    logs: (room.logs || []).slice(-120),
    chat: (room.chat || []).slice(-60),
    personas: room.personas,
    variants: room.variants,
    startedAt: room.startedAt,
    recorded: room.recorded,
    version: room.version || 0,
    rng: room.rng ? { seed: room.rng.seed, calls: room.rng.calls } : null,
    touchedAt: room.touchedAt || Date.now(),
  };
}

/* Back into a room. `makeRng` rebuilds the generator at the right position; the
   caller passes it in so this file does not need to know how the engine seeds. */
function unpack(saved, makeRng) {
  return {
    code: saved.code,
    bots: saved.bots,
    members: saved.members || [],
    spectators: saved.spectators || [],
    state: reviveState(saved.state),
    logs: saved.logs || [],
    chat: saved.chat || [],
    personas: saved.personas,
    variants: saved.variants,
    startedAt: saved.startedAt || null,
    recorded: !!saved.recorded,
    version: saved.version || 0,
    rng: saved.rng ? makeRng(saved.rng.seed, saved.rng.calls) : null,
    clients: new Set(),
    touchedAt: saved.touchedAt || Date.now(),
  };
}

/* Which rooms are worth keeping. A finished game has already been written to the
   record book, so the room itself is spent. */
function worthKeeping(room, now = Date.now()) {
  if (room.state && room.state.phase === "gameover") return false;
  const seen = room.touchedAt || room.startedAt || 0;
  return now - seen < KEEP_MS;
}

function save(rooms, file) {
  const keep = [...rooms.values()].filter((r) => worthKeeping(r)).map(pack);
  const tmp = `${file}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify({ format: FORMAT, at: Date.now(), rooms: keep }), { mode: 0o600 });
    fs.renameSync(tmp, file);                  // a reader sees all of the old or all of the new
    return keep.length;
  } catch (e) {
    /* A read-only disk must not take the game down with it. The boot report already
       says the store cannot be written; this just declines to make it fatal. */
    console.error(`could not save games in progress: ${e.message}`);
    return -1;
  }
}

function load(file, makeRng) {
  let raw;
  try { raw = fs.readFileSync(file, "utf8"); } catch (_) { return []; }
  let parsed;
  try { parsed = JSON.parse(raw); } catch (_) {
    console.error(`the games-in-progress file could not be read; starting with none`);
    return [];
  }
  if (!parsed || parsed.format !== FORMAT || !Array.isArray(parsed.rooms)) return [];
  const now = Date.now();
  const out = [];
  for (const saved of parsed.rooms) {
    try {
      const room = unpack(saved, makeRng);
      if (!worthKeeping(room, now)) continue;
      out.push(room);
    } catch (e) {
      /* One unreadable room must not cost the others. */
      console.error(`skipping a saved room (${saved && saved.code}): ${e.message}`);
    }
  }
  return out;
}

module.exports = { FORMAT, KEEP_MS, rngFactory, save, load, pack, unpack, worthKeeping, plainState, reviveState };
