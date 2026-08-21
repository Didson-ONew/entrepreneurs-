/* ============================================================================
   Entrepreneurs - playtest feedback

   A place for players to say what they think while the game is still being
   tuned: a suggestion, something that went wrong, or a score out of five for
   how a session played. Every note is stamped with the rules it was played
   under, because "the economy felt tight" means nothing without knowing which
   version of the economy that was.

   Zero dependencies, one small JSON file, the same shape as accounts.js.

   What this deliberately is NOT: a support system. There are no threads, no
   replies, no status. Notes come in and the designer reads them.
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_FILE = require("./datadir.js").resolve("feedback.json", "FEEDBACK_FILE");

/* What a note can be. Anything else is refused rather than coerced, so the list
   stays worth filtering by. */
const KINDS = ["suggestion", "issue", "session"];
const MAX_TEXT = 2000;
/* Somebody has to be able to read every note in one sitting. This is a playtest,
   not a product; if it ever fills up, that is a good problem and a real database. */
const MAX_ENTRIES = 5000;

const clean = (s, n) => String(s == null ? "" : s).replace(/\s+$/g, "").slice(0, n);

function emptyStore() {
  return { version: 1, entries: [] };
}

function load(file = DEFAULT_FILE) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.entries)) throw new Error("shape");
    return s;
  } catch (e) {
    // No file yet is the normal first run.
    if (e.code === "ENOENT") return emptyStore();
    /* Anything else - unreadable, truncated, not JSON - must NOT be silently
       replaced: the next save would throw away everything players have written.
       Refuse to start and let a human look at the file. */
    throw new Error(`feedback file at ${file} could not be read (${e.message}). ` +
      `Move it aside if you mean to start fresh - replacing it discards every note.`);
  }
}

/* Write to a temporary file and rename over the old one, so a reader sees either
   the whole previous store or the whole new one. Mode 0600: a note can name a
   player and say what they were doing, which is nobody else's business. */
function save(store, file = DEFAULT_FILE) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
  try { fs.chmodSync(file, 0o600); } catch (_) { /* Windows, or a filesystem without modes */ }
}

/* Returns { ok, entry } or { ok: false, error }. The error is written for the
   player to read, not for a log. */
function add(store, note) {
  const kind = KINDS.includes(note && note.kind) ? note.kind : null;
  if (!kind) return { ok: false, error: "Pick what kind of note this is." };

  const text = clean(note.text, MAX_TEXT).trim();
  const rating = Number.isFinite(note.rating) ? Math.round(note.rating) : null;
  if (rating !== null && (rating < 1 || rating > 5)) {
    return { ok: false, error: "A score has to be between 1 and 5." };
  }
  /* A note with neither words nor a score says nothing. A session score on its own
     is fine - it is still a data point - but a suggestion or an issue is not. */
  if (!text && rating === null) return { ok: false, error: "Write something, or leave a score." };
  if (!text && kind !== "session") return { ok: false, error: "Tell me what you have in mind." };

  const entry = {
    id: crypto.randomBytes(8).toString("hex"),
    at: new Date().toISOString(),
    kind,
    rating,
    text,
    /* Who sent it, as far as we can tell. `account` is a signed-in username and can
       be trusted; `name` is whatever they typed to play under and cannot. Keeping
       both means a note from a registered player is attributable and a note from a
       guest is still worth reading. */
    account: note.account ? clean(note.account, 24) : null,
    name: note.name ? clean(note.name, 24) : null,
    /* Where they were when they wrote it. A complaint about the draft reads very
       differently in Quarter 1 and Quarter 11. */
    room: note.room ? clean(note.room, 12) : null,
    quarter: Number.isFinite(note.quarter) ? Math.round(note.quarter) : null,
    where: clean(note.where, 24) || null,
    /* The rules it was played under. Without this a note ages into an opinion
       about a game that no longer exists. */
    engine: note.engine ? clean(note.engine, 16) : null,
  };
  store.entries.push(entry);
  if (store.entries.length > MAX_ENTRIES) store.entries = store.entries.slice(-MAX_ENTRIES);
  return { ok: true, entry };
}

/* Newest first, which is the order anybody actually wants to read them in. */
function list(store, { limit = 200 } = {}) {
  return store.entries.slice(-Math.max(1, limit)).reverse();
}

/* Enough of a shape to see at a glance whether anything needs attention. */
function summary(store) {
  const byKind = Object.fromEntries(KINDS.map((k) => [k, 0]));
  let rated = 0, ratingTotal = 0;
  for (const e of store.entries) {
    if (byKind[e.kind] !== undefined) byKind[e.kind]++;
    if (Number.isFinite(e.rating)) { rated++; ratingTotal += e.rating; }
  }
  return {
    total: store.entries.length,
    byKind,
    rated,
    averageRating: rated ? Math.round((ratingTotal / rated) * 10) / 10 : null,
  };
}

module.exports = { KINDS, MAX_TEXT, load, save, add, list, summary, DEFAULT_FILE };
