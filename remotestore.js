/* ============================================================================
   Somewhere for the data to live that a deploy cannot reach.

   THE PROBLEM THIS SOLVES

   Free hosting has no permanent disk. The data directory is rebuilt from the
   deploy on every restart - which includes waking from the sleep the service
   drops into after fifteen idle minutes - so the hall of fame, the playtest
   notes and the accounts are erased over and over.

   ENT_SEED_BACKUP already carries the ACCOUNTS across, but it is a value pasted
   into a dashboard by hand: it goes stale the moment somebody registers or
   changes a password, and it cannot carry matches at all because those grow.
   Everything else was down to remembering to press Download before a deploy and
   Put a copy back afterwards - which is exactly the kind of thing that gets
   forgotten on the one deploy that mattered.

   So the server keeps its own copy somewhere durable instead: it writes a
   backup after anything worth keeping happens, and reads it back at boot. The
   wipe still happens; it just stops costing anything.

   WHERE IT PUTS IT, AND WHY THERE

   A file in a PRIVATE GitHub repository, through the contents API.

   The obvious cheaper option is a secret gist, and it is the wrong one: a
   secret gist is unlisted, not private - anybody with the URL can read it. This
   file contains PASSWORD HASHES AND EMAIL ADDRESSES, so "unguessable" is not
   good enough. A private repo is actually private, and a fine-grained token
   scoped to Contents on that one repo can do nothing else with the account.

     ENT_BACKUP_REPO    owner/name of a PRIVATE repo, e.g. Didson-ONew/ent-data
     ENT_BACKUP_TOKEN   a fine-grained token with Contents: Read and write,
                        on that repository and nothing else
     ENT_BACKUP_PATH    optional, defaults to backup.json
     ENT_BACKUP_BRANCH  optional, defaults to the repo's default branch

   Unset any of the first two and this does nothing at all, quietly, and the
   server behaves exactly as it did before.

   WHAT IT WILL NOT DO

   It never deletes and never overwrites a record: reading it back goes through
   the same backup.apply the Restore button uses, which only ever ADDS what is
   missing. So a stale copy cannot undo a password change made on the live site,
   and pulling at boot can never cost anything that is already there.

   And it never takes the server down with it. Every call is wrapped; a failure
   is logged in words and then ignored. A game night does not stop because
   GitHub had a bad minute.
   ========================================================================== */

/* Overridable so the tests can stand a fake GitHub up on localhost, and so a
   GitHub Enterprise host works without a code change. */
const DEFAULT_API = "https://api.github.com";
const apiBase = (env) => String(env.ENT_BACKUP_API || DEFAULT_API).replace(/\/+$/, "");

function cfg(env = process.env) {
  const repo = String(env.ENT_BACKUP_REPO || "").trim();
  const token = String(env.ENT_BACKUP_TOKEN || "").trim();
  const path = String(env.ENT_BACKUP_PATH || "backup.json").trim().replace(/^\/+/, "");
  const branch = String(env.ENT_BACKUP_BRANCH || "").trim();
  return { repo, token, path, branch };
}

function configured(env = process.env) {
  const c = cfg(env);
  return !!(c.repo && c.token && /^[^/\s]+\/[^/\s]+$/.test(c.repo));
}

/* For the boot log. Never prints the token, and never prints enough of it to
   help anyone who has seen the log. */
function describe(env = process.env) {
  const c = cfg(env);
  if (!c.repo && !c.token) {
    return "off - the data directory is whatever this deploy left behind "
      + "(set ENT_BACKUP_REPO and ENT_BACKUP_TOKEN; see remotestore.js)";
  }
  if (!configured(env)) {
    return `misconfigured - ${!c.repo ? "ENT_BACKUP_REPO is not set"
      : !/^[^/\s]+\/[^/\s]+$/.test(c.repo) ? `ENT_BACKUP_REPO should read owner/name, not ${JSON.stringify(c.repo)}`
      : "ENT_BACKUP_TOKEN is not set"} - nothing will be kept`;
  }
  return `${c.repo}/${c.path}${c.branch ? ` on ${c.branch}` : ""}`;
}

const headers = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "entrepreneurs-server",
});

/* The blob's sha, which GitHub demands back when updating an existing file.
   Remembered between calls so a save is one request rather than two. */
let knownSha = null;

/* What is in the store, or null. `null` is the honest answer for every failure
   as well as for "nothing there yet" - the caller treats them the same, because
   there is nothing useful to do differently. */
async function load(env = process.env, fetchImpl = fetch) {
  if (!configured(env)) return null;
  const c = cfg(env);
  const url = `${apiBase(env)}/repos/${c.repo}/contents/${encodeURIComponent(c.path)}`
    + (c.branch ? `?ref=${encodeURIComponent(c.branch)}` : "");
  try {
    const res = await fetchImpl(url, { headers: headers(c.token) });
    if (res.status === 404) return null;                 // first run: nothing saved yet
    if (!res.ok) {
      console.error(`backup store: could not read ${c.repo}/${c.path} (HTTP ${res.status})`
        + (res.status === 401 || res.status === 403
          ? " - check ENT_BACKUP_TOKEN has Contents: Read and write on that repository" : ""));
      return null;
    }
    const meta = await res.json();
    knownSha = meta.sha || null;
    const text = Buffer.from(String(meta.content || ""), "base64").toString("utf8");
    return JSON.parse(text);
  } catch (e) {
    console.error(`backup store: could not read (${(e && e.message) || e})`);
    return null;
  }
}

async function save(file, env = process.env, fetchImpl = fetch, now = new Date()) {
  if (!configured(env)) return false;
  const c = cfg(env);
  const url = `${apiBase(env)}/repos/${c.repo}/contents/${encodeURIComponent(c.path)}`;
  const body = {
    message: `entrepreneurs backup ${now.toISOString()}`
      + ` (${(file.counts && file.counts.matches) || 0} matches,`
      + ` ${(file.counts && file.counts.accounts) || 0} accounts)`,
    content: Buffer.from(JSON.stringify(file, null, 2), "utf8").toString("base64"),
  };
  if (knownSha) body.sha = knownSha;
  if (c.branch) body.branch = c.branch;
  try {
    let res = await fetchImpl(url, { method: "PUT", headers: headers(c.token), body: JSON.stringify(body) });
    /* 409 means the sha we held is stale - something else wrote the file, or
       this instance restarted. Read the current one and try once more, rather
       than dropping the save. */
    if (res.status === 409 || res.status === 422) {
      knownSha = null;
      await load(env, fetchImpl);
      if (knownSha) {
        body.sha = knownSha;
        res = await fetchImpl(url, { method: "PUT", headers: headers(c.token), body: JSON.stringify(body) });
      }
    }
    if (!res.ok) {
      console.error(`backup store: could not write ${c.repo}/${c.path} (HTTP ${res.status})`
        + (res.status === 401 || res.status === 403
          ? " - check ENT_BACKUP_TOKEN has Contents: Read and write on that repository" : ""));
      return false;
    }
    const out = await res.json().catch(() => ({}));
    knownSha = (out && out.content && out.content.sha) || null;
    return true;
  } catch (e) {
    console.error(`backup store: could not write (${(e && e.message) || e})`);
    return false;
  }
}

module.exports = { configured, describe, load, save, _resetSha: () => { knownSha = null; } };
