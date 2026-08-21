/* ============================================================================
   Entrepreneurs - one file with everything worth keeping in it.

   The hall of fame, the accounts and the playtest notes are three files on the
   server's disk. On hosting with no permanent disk that disk is wiped on every
   deploy, and there is no configuration that fixes it. So: take a copy before,
   put it back after.

   One file, one button each way. The copy is plain JSON, so it can be opened,
   read and kept anywhere.

   PUTTING ONE BACK NEVER DELETES ANYTHING. It merges:

     matches   added if the server has never seen that game's id
     notes     added if the server has never seen that note's id
     accounts  added if that name is not registered here already; a name that IS
               registered is LEFT ALONE, so restoring an old copy can never undo
               somebody's password change or hand their name to an older claim

   That rule is what makes the button safe to press when you are not sure. The
   worst a wrong file can do is add games that already happened.
   ========================================================================== */

const FORMAT = 1;

/* What goes in the file. `engine` is the ruleset the server was running when the
   copy was taken - not used when putting it back, but it dates the file in terms
   that mean something here. */
function build({ accounts, matches, feedback, engine }) {
  return {
    format: FORMAT,
    at: new Date().toISOString(),
    engine: engine || null,
    _warning: "This file contains password hashes and email addresses. Keep it as "
      + "carefully as you would keep a password list.",
    counts: {
      accounts: (accounts && accounts.users ? accounts.users.length : 0),
      matches: (matches || []).length,
      feedback: (feedback && feedback.entries ? feedback.entries.length : 0),
    },
    accounts: accounts && Array.isArray(accounts.users) ? accounts.users : [],
    matches: Array.isArray(matches) ? matches : [],
    feedback: feedback && Array.isArray(feedback.entries) ? feedback.entries : [],
  };
}

/* Is this actually one of ours? Checked before anything is merged, because the
   likeliest wrong file is some other JSON entirely. */
function problem(file) {
  if (!file || typeof file !== "object") return "That is not a backup file.";
  if (file.format !== FORMAT) {
    return `That backup is format ${file.format === undefined ? "?" : file.format}, and this server reads format ${FORMAT}.`;
  }
  for (const k of ["accounts", "matches", "feedback"]) {
    if (!Array.isArray(file[k])) return `That backup has no ${k} in it.`;
  }
  return null;
}

const nameKey = (s) => String(s == null ? "" : s).trim().toLowerCase();

/* Merge a backup into what the server already has. Returns what to save and a
   plain-language account of what happened, which is what the button reports. */
function apply(file, current) {
  const why = problem(file);
  if (why) return { error: why };

  const accounts = current.accounts;
  const matches = current.matches;
  const feedback = current.feedback;

  /* ---- accounts: add the missing, never overwrite the present ---- */
  const have = new Set(accounts.users.map((u) => nameKey(u.name)));
  let accountsAdded = 0, accountsKept = 0;
  for (const u of file.accounts) {
    if (!u || !u.name) continue;
    if (have.has(nameKey(u.name))) { accountsKept += 1; continue; }
    accounts.users.push(u);
    have.add(nameKey(u.name));
    accountsAdded += 1;
  }

  /* ---- matches: union by id, then oldest first so the file stays a timeline ---- */
  const seenMatch = new Set(matches.map((m) => m && m.id).filter(Boolean));
  const newMatches = [];
  for (const m of file.matches) {
    if (!m || !m.id || seenMatch.has(m.id)) continue;
    seenMatch.add(m.id);
    newMatches.push(m);
  }
  newMatches.sort((a, b) => (a.at || 0) - (b.at || 0));

  /* ---- notes: union by id ---- */
  const seenNote = new Set(feedback.entries.map((e) => e && e.id).filter(Boolean));
  let notesAdded = 0;
  for (const e of file.feedback) {
    if (!e || !e.id || seenNote.has(e.id)) continue;
    seenNote.add(e.id);
    feedback.entries.push(e);
    notesAdded += 1;
  }
  feedback.entries.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));

  return {
    newMatches,
    added: { accounts: accountsAdded, matches: newMatches.length, feedback: notesAdded },
    skipped: { accounts: accountsKept,
      matches: file.matches.length - newMatches.length,
      feedback: file.feedback.length - notesAdded },
    takenAt: file.at || null,
  };
}

/* "3 games and 1 account added; 12 games were already here." */
function describe(result) {
  const bits = [];
  const say = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  if (result.added.matches) bits.push(say(result.added.matches, "game", "games"));
  if (result.added.accounts) bits.push(say(result.added.accounts, "account", "accounts"));
  if (result.added.feedback) bits.push(say(result.added.feedback, "note", "notes"));
  const added = bits.length ? `${bits.join(", ")} added` : "Nothing new to add";

  const already = [];
  if (result.skipped.matches) already.push(say(result.skipped.matches, "game", "games"));
  if (result.skipped.accounts) already.push(say(result.skipped.accounts, "account", "accounts"));
  if (result.skipped.feedback) already.push(say(result.skipped.feedback, "note", "notes"));
  return already.length ? `${added}; ${already.join(", ")} already here.` : `${added}.`;
}

/* A filename with the date in it, so a folder of these sorts itself. */
function filename(at = new Date()) {
  const d = at.toISOString().slice(0, 10);
  return `entrepreneurs-backup-${d}.json`;
}

module.exports = { FORMAT, build, problem, apply, describe, filename };
