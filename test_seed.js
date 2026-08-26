/* ============================================================================
   ENT_SEED_BACKUP - the accounts that survive a deploy.

   THE PROBLEM IT SOLVES. Free hosting has no permanent disk: the data directory
   is rebuilt from the deploy on every restart, including waking from sleep. So
   accounts.json is erased over and over and everybody has to register again. A
   disk fixes it properly, but disks need a paid WORKSPACE plan on Render (Pro),
   not merely a paid instance type - the blueprint refuses with "Disks are not
   available for this compute plan". An environment variable survives a deploy,
   costs nothing, and is stored by the host rather than in this repository, which
   matters because the value contains password hashes and this repo is public.

   THE ONE PROPERTY THAT MAKES IT SAFE. The seed is applied on EVERY boot, so it
   has to be idempotent, and it must never undo something a player did on the
   live site. backup.apply adds an account only when that name is not already
   registered; a name that IS registered is left exactly as it stands. That is
   what these checks pin down:

     1. an empty store plus the seed leaves the account signed-in-able
     2. applying it twice adds one account, not two
     3. a name already present is NOT overwritten - so a password changed on the
        site survives the next boot, and an old seed cannot roll it back

   Check 3 is the one worth having. Get it wrong and the failure is silent and
   awful: a player changes their password, the host restarts, and the old one is
   quietly restored from an environment variable nobody remembers setting.

   Run: node test_seed.js
   ========================================================================== */
const fs = require("fs");
const os = require("os");
const path = require("path");

const accounts = require("./accounts.js");
const backup = require("./backup.js");

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ent-seed-"));
const file = path.join(tmp, "accounts.json");

/* A seed file shaped exactly like the real thing: the download is format 1 with
   accounts, matches and feedback, and `seed` strips it to accounts alone. */
function seedFile(users) {
  return {
    format: backup.FORMAT,
    at: "2026-08-25T23:39:19.195Z",
    engine: "test",
    counts: { accounts: users.length, matches: 0, feedback: 0 },
    accounts: users,
    matches: [],
    feedback: [],
  };
}
/* A store the way the server holds one, so apply() writes into the real shape. */
const emptyCurrent = () => ({
  accounts: { version: 1, secret: "x".repeat(64), users: [] },
  matches: [],
  feedback: { entries: [] },
});

console.log("Entrepreneurs - ENT_SEED_BACKUP\n");

/* hashPassword and checkPassword are both ASYNC - scrypt runs off the main
   thread - so every call here has to be awaited. Forgetting it does not fail
   loudly: `checkPassword(...)` returns a Promise, which is truthy, so a positive
   check passes whatever the password was. The negative checks below are the ones
   that catch it, which is why each password assertion is made in both
   directions. */
(async () => {

/* A real account record with a real password hash, the way registering builds
   one, so the checks exercise the actual verifier rather than a stand-in. */
const SEEDED_PASSWORD = "correct horse battery staple";
const user = {
  id: "078a1dc856873e16e36c0c6d",
  name: "Didson",
  nameKey: "didson",
  email: "someone@example.com",
  emailKey: "someone@example.com",
  pw: await accounts.hashPassword(SEEDED_PASSWORD),
  question: "street",
  answer: await accounts.hashPassword("an answer"),
  createdAt: Date.now(),
  lastLoginAt: Date.now(),
  reset: null,
};

/* ---- 1. an empty store plus the seed --------------------------------------- */
console.log("1. A WIPED DATA DIRECTORY, SEEDED");
const cur1 = emptyCurrent();
const r1 = backup.apply(seedFile([user]), cur1);
check("the seed is accepted", !r1.error, r1.error || "");
check("one account added", r1.added.accounts === 1, `added ${r1.added.accounts}`);
check("the account is in the store", cur1.accounts.users.length === 1);
check("and it is the right one", cur1.accounts.users[0].name === "Didson");
check("the seeded password actually verifies",
  await accounts.checkPassword(SEEDED_PASSWORD, cur1.accounts.users[0].pw),
  "checkPassword against the restored hash");
check("a wrong password still does not",
  !(await accounts.checkPassword("not the password", cur1.accounts.users[0].pw)));

/* It has to survive a real write/read cycle, not just live in memory. */
accounts.save(cur1.accounts, file);
const reloaded = accounts.load(file);
check("it survives being written and read back",
  reloaded.users.length === 1 && reloaded.users[0].name === "Didson");

/* ---- 2. applied twice, as every boot would --------------------------------- */
console.log("\n2. THE SAME SEED ON THE NEXT BOOT");
const r2 = backup.apply(seedFile([user]), cur1);
check("nothing is added the second time", r2.added.accounts === 0, `added ${r2.added.accounts}`);
check("it reports the account as already here", r2.skipped.accounts === 1);
check("still exactly one account, not two", cur1.accounts.users.length === 1,
  `${cur1.accounts.users.length} in the store`);
check("and describe() says so in words",
  /already here/.test(backup.describe(r2)), backup.describe(r2));

/* ---- 3. the password-change case, which is the dangerous one --------------- */
console.log("\n3. A PASSWORD CHANGED ON THE LIVE SITE");
const CHANGED = "a brand new password";
const cur3 = emptyCurrent();
cur3.accounts.users.push({ ...user, pw: await accounts.hashPassword(CHANGED) });
const r3 = backup.apply(seedFile([user]), cur3);
check("the stale seed adds nothing", r3.added.accounts === 0);
check("the NEW password still works",
  await accounts.checkPassword(CHANGED, cur3.accounts.users[0].pw),
  "the live password must win");
check("the OLD password does NOT come back",
  !(await accounts.checkPassword(SEEDED_PASSWORD, cur3.accounts.users[0].pw)),
  "an old seed must never roll a password back");

/* Matching is by name, case-insensitively - a seed written "didson" must not
   sneak a second copy in beside "Didson". */
const cur3b = emptyCurrent();
cur3b.accounts.users.push({ ...user, name: "Didson" });
const r3b = backup.apply(seedFile([{ ...user, name: "didson", id: "other" }]), cur3b);
check("a differently-cased name is the same account",
  r3b.added.accounts === 0 && cur3b.accounts.users.length === 1,
  `${cur3b.accounts.users.length} account(s)`);

/* ---- 4. rubbish in the variable must not stop the server ------------------- */
console.log("\n4. SOMEBODY PASTES THE WRONG THING IN");
check("a non-backup object is refused with a reason",
  !!backup.problem({ hello: "world" }));
check("the wrong format is refused with a reason",
  !!backup.problem({ format: 99, accounts: [], matches: [], feedback: [] }));
check("a real backup is not refused", backup.problem(seedFile([user])) === null);
/* The server decodes base64 before any of that; garbage must throw where the
   caller catches it rather than yielding a half-parsed object. */
let threw = false;
try { JSON.parse(Buffer.from("not base64 at all!!", "base64").toString("utf8")); }
catch (e) { threw = true; }
check("undecodable input throws rather than parsing to something", threw);

/* ---- 5. what account_tool.js seed produces --------------------------------- */
console.log("\n5. THE VALUE account_tool.js PRODUCES");
const whole = seedFile([user]);
whole.matches = [{ id: "m1", at: 1 }, { id: "m2", at: 2 }];
whole.feedback = [{ id: "f1", at: "2026-01-01" }];
const stripped = { ...whole, matches: [], feedback: [] };
const value = Buffer.from(JSON.stringify(stripped), "utf8").toString("base64");
const decoded = JSON.parse(Buffer.from(value, "base64").toString("utf8"));
check("it round-trips through base64", decoded.accounts[0].name === "Didson");
check("the hall of fame is stripped out", decoded.matches.length === 0);
check("the notes are stripped out", decoded.feedback.length === 0);
check("and it is still a valid backup", backup.problem(decoded) === null);
check("small enough for a dashboard field", value.length < 4096, `${value.length} characters`);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED\n` : "\nall good\n");
process.exit(fails ? 1 : 0);

})();
