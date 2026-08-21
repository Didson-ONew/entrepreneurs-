/* ============================================================================
   Entrepreneurs - where the server keeps the things it must not lose.

   Three files outlive any single game: the accounts, the match history behind
   the hall of fame, and the playtest notes. Every one of them used to default
   to sitting NEXT TO server.js, which is the one place that does not survive a
   deployment - most hosts replace the application directory wholesale on every
   push, and the records, the accounts and the notes go with it. That is not a
   theoretical risk; it happened, and the hall of fame came back empty with
   everybody's account gone.

   So there is now one directory for all three, one environment variable to
   move it, and a line at boot that says out loud where the data is and how much
   of it there is. If a redeploy has just emptied the store, the boot log says
   so in the first three lines rather than a player discovering it a week later.

     ENT_DATA_DIR=/var/lib/entrepreneurs node server.js

   The three per-file variables still work and still win, so an existing setup
   keeps behaving exactly as it did:

     ACCOUNTS_FILE  MATCHES_FILE  FEEDBACK_FILE

   Files already sitting beside server.js from an older version are moved into
   the data directory the first time this runs, so nobody upgrades into an empty
   hall of fame.
   ========================================================================== */
const fs = require("fs");
const path = require("path");

/* Default: a `data` folder beside the application. Better than the application
   directory itself - it is one thing to mount, one thing to back up, one thing
   to copy - but on a host with an ephemeral disk it is still ephemeral, which
   is what the warning at boot is for. */
const DIR = process.env.ENT_DATA_DIR || path.join(__dirname, "data");

/* Where a file WOULD have lived before there was a data directory. */
const legacyPath = (basename) => path.join(__dirname, basename);

let ensured = false;
function ensureDir() {
  if (ensured) return;
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  ensured = true;
}

/* Resolve one store's file, honouring its own variable first, and carry a
   pre-existing file in from beside server.js if the new home has none.

   The move is a rename where it can be and a copy-then-unlink where it cannot,
   because a data directory on a mounted disk is a different filesystem. If
   anything goes wrong the old file is left exactly where it is - losing data
   while tidying it away would be the worst possible outcome here. */
function resolve(basename, envVar) {
  const override = process.env[envVar];
  if (override) return override;
  ensureDir();
  const home = path.join(DIR, basename);
  if (fs.existsSync(home)) return home;
  const old = legacyPath(basename);
  if (!fs.existsSync(old)) return home;
  try {
    fs.renameSync(old, home);
    console.log(`  moved ${basename} into ${DIR}`);
  } catch (_) {
    try {
      fs.copyFileSync(old, home);
      fs.unlinkSync(old);
      console.log(`  copied ${basename} into ${DIR}`);
    } catch (e) {
      console.log(`  could not move ${basename} into ${DIR} (${e.code || e.message}) - still reading it where it is`);
      return old;
    }
  }
  return home;
}

/* Is the data directory inside the application directory? That is the
   configuration that gets wiped by a redeploy, and the one worth warning about. */
function insideApp(file) {
  const rel = path.relative(__dirname, path.resolve(file));
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/* One line per store at boot: where it is, how much is in it, and whether it is
   somewhere a deployment can delete. `counts` is {label: [file, count]}. */
function report(stores) {
  console.log(`Data directory: ${DIR}`);
  let atRisk = false;
  for (const [label, [file, count]] of Object.entries(stores)) {
    const risky = insideApp(file);
    atRisk = atRisk || risky;
    console.log(`  ${label.padEnd(9)} ${String(count).padStart(5)}  ${file}`);
  }
  if (atRisk) {
    console.log("");
    console.log("  NOTE: this data lives inside the application folder. If you deploy by");
    console.log("  replacing that folder - most free hosting does - the accounts, the hall");
    console.log("  of fame and the playtest notes go with it. To keep them, put them on a");
    console.log("  disk that outlives a deploy:");
    console.log("      ENT_DATA_DIR=/var/lib/entrepreneurs node server.js");
  }
  console.log("");
}

module.exports = { DIR, resolve, report, insideApp };
