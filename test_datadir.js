/* Where the server keeps what it must not lose.

   The accounts, the hall of fame and the playtest notes used to default to sitting
   loose beside server.js - the one place a deployment replaces. A redeploy emptied
   all three, and the first anybody knew was a player finding their account gone.

   So there is one directory, one variable that moves it, a migration that carries
   old files in rather than leaving them to be deleted, and a warning at boot when
   the directory is somewhere a deploy can reach.

   Run: node test_datadir.js
*/
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n${t}`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ent-datadir-"));
const after = [];

/* datadir.js resolves its paths at require() time and node caches modules, so each
   case runs in its own process with its own environment. */
function ask(env) {
  const src = `
    const d = require(${JSON.stringify(path.join(__dirname, "datadir.js"))});
    console.log(JSON.stringify({
      dir: d.DIR,
      accounts: d.resolve("accounts.json", "ACCOUNTS_FILE"),
      matches: d.resolve("matches.jsonl", "MATCHES_FILE"),
      feedback: d.resolve("feedback.json", "FEEDBACK_FILE"),
      insideApp: d.insideApp(d.DIR),
    }));`;
  const out = execFileSync(process.execPath, ["-e", src], {
    env: { ...process.env, ...env }, encoding: "utf8",
  });
  const line = out.trim().split("\n").pop();
  return { json: JSON.parse(line), log: out };
}

section("One directory, and one variable that moves it");
{
  const dir = path.join(tmp, "chosen");
  const { json } = ask({ ENT_DATA_DIR: dir });
  check("ENT_DATA_DIR is where everything goes", json.dir === dir, json.dir);
  check("all three files land in it",
    [json.accounts, json.matches, json.feedback].every((f) => path.dirname(f) === dir),
    [json.accounts, json.matches, json.feedback].map((f) => path.basename(f)).join(" "));
  check("and the directory is created", fs.existsSync(dir));
  const mode = fs.statSync(dir).mode & 0o777;
  check("readable only by the account running the server", mode === 0o700, mode.toString(8));
  check("a directory outside the app is not flagged as at risk", json.insideApp === false);
}

section("A single file can still be pinned on its own");
{
  const dir = path.join(tmp, "mixed");
  const pinned = path.join(tmp, "somewhere-else", "accounts.json");
  const { json } = ask({ ENT_DATA_DIR: dir, ACCOUNTS_FILE: pinned });
  check("ACCOUNTS_FILE wins for the accounts", json.accounts === pinned, json.accounts);
  check("and the rest still go to the data directory",
    path.dirname(json.matches) === dir && path.dirname(json.feedback) === dir);
}

section("Upgrading never costs you the record book");
{
  /* A file where an older version left it, next to server.js. */
  const legacy = path.join(__dirname, "matches.jsonl");
  const existed = fs.existsSync(legacy);
  const saved = existed ? fs.readFileSync(legacy) : null;
  fs.writeFileSync(legacy, '{"id":"old","at":1,"players":[]}\n');
  after.push(() => {
    try { fs.unlinkSync(legacy); } catch (_) { /* already moved */ }
    if (existed) fs.writeFileSync(legacy, saved);
  });

  const dir = path.join(tmp, "upgrade");
  const { json, log } = ask({ ENT_DATA_DIR: dir });
  check("the old file is carried into the data directory",
    fs.existsSync(json.matches) && fs.readFileSync(json.matches, "utf8").includes('"old"'),
    json.matches);
  check("it is not left behind to be deleted by the next deploy", !fs.existsSync(legacy));
  check("and the move is announced rather than done silently", /moved matches\.jsonl/.test(log),
    log.split("\n")[0]);

  /* Second start: nothing to migrate, and what is already there is kept. */
  fs.writeFileSync(json.matches, '{"id":"new","at":2,"players":[]}\n');
  const again = ask({ ENT_DATA_DIR: dir });
  check("a second start migrates nothing and keeps what is there",
    fs.readFileSync(again.json.matches, "utf8").includes('"new"') && !/moved/.test(again.log));
}

section("A file already in the data directory is never overwritten by an old one");
{
  const legacy = path.join(__dirname, "feedback.json");
  const existed = fs.existsSync(legacy);
  const saved = existed ? fs.readFileSync(legacy) : null;
  fs.writeFileSync(legacy, '{"version":1,"entries":[{"id":"stale"}]}');
  after.push(() => {
    try { fs.unlinkSync(legacy); } catch (_) { /* moved */ }
    if (existed) fs.writeFileSync(legacy, saved);
  });

  const dir = path.join(tmp, "nocollide");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "feedback.json"), '{"version":1,"entries":[{"id":"current"}]}');
  const { json } = ask({ ENT_DATA_DIR: dir });
  check("the file in the data directory wins",
    fs.readFileSync(json.feedback, "utf8").includes("current"),
    fs.readFileSync(json.feedback, "utf8").slice(0, 40));
  check("and the old one is left alone rather than deleted", fs.existsSync(legacy));
}

section("Data inside the application folder is called out as at risk");
{
  const { json } = ask({ ENT_DATA_DIR: path.join(__dirname, "data") });
  check("the default location is flagged", json.insideApp === true, json.dir);

  /* The warning itself, as the server prints it. */
  const src = `
    const d = require(${JSON.stringify(path.join(__dirname, "datadir.js"))});
    d.report({ accounts: [d.resolve("accounts.json", "X1"), 0] });`;
  const out = execFileSync(process.execPath, ["-e", src], {
    env: { ...process.env, ENT_DATA_DIR: path.join(__dirname, "data") }, encoding: "utf8",
  });
  check("and the boot log says what to do about it", /ENT_DATA_DIR=/.test(out) && /deploy/.test(out),
    out.split("\n").find((l) => /NOTE/.test(l)) || "no NOTE line");

  const safe = execFileSync(process.execPath, ["-e", src], {
    env: { ...process.env, ENT_DATA_DIR: path.join(tmp, "safe") }, encoding: "utf8",
  });
  check("a safe location gets no warning to learn to ignore", !/NOTE/.test(safe));
  check("but still reports where the data is and how much there is",
    /accounts/.test(safe) && /Data directory/.test(safe), safe.trim().split("\n")[0]);
}

section("A disk it cannot write to is caught at boot, not at the first sign-up");
{
  const dir = path.join(tmp, "readonly");
  fs.mkdirSync(dir, { recursive: true });
  const d = require("./datadir.js");
  check("a writable directory reports no problem", d.writable(path.join(dir, "x.json")) === null);

  /* A disk that is not mounted where the configuration says: the path simply is not
     there. This is the failure a wrong mountPath actually produces. */
  const missing = path.join(tmp, "not-mounted", "accounts.json");
  check("a directory that does not exist is reported, not created",
    d.writable(missing) !== null && !fs.existsSync(path.dirname(missing)),
    `${d.writable(missing)}`);

  /* A disk mounted read-only, or owned by another user. root overrides the mode bits,
     so this only stages as an ordinary user - which is how Render runs a service. */
  fs.chmodSync(dir, 0o500);
  const why = d.writable(path.join(dir, "x.json"));
  const asRoot = process.getuid && process.getuid() === 0;
  check(asRoot
    ? "a read-only directory: skipped, this test is running as root"
    : "a read-only directory is reported rather than assumed fine",
    asRoot ? true : why !== null, `${why}`);
  fs.chmodSync(dir, 0o700);

  /* And the boot log has to say so loudly, because a server that starts happily and
     then forgets everything is the worst of the available failures. */
  const src = `
    const d = require(${JSON.stringify(path.join(__dirname, "datadir.js"))});
    d.report({ accounts: [${JSON.stringify(missing)}, 0] });`;
  const out = execFileSync(process.execPath, ["-e", src], { encoding: "utf8" });
  check("the boot log says CANNOT WRITE against the store", /CANNOT WRITE/.test(out),
    (out.split("\n").find((l) => /accounts/.test(l)) || "").trim());
  check("and explains what is usually wrong", /STOP:/.test(out) && /mounted/.test(out));
}

section("A data directory that is not a directory stops the server, in words");
{
  /* The failure a wrong Render mountPath actually produces: ENT_DATA_DIR points at
     something that is not a folder, or at a disk that never mounted. */
  const notADir = path.join(tmp, "not-a-directory");
  fs.writeFileSync(notADir, "this is a file");

  const probe = `
    const d = require(${JSON.stringify(path.join(__dirname, "datadir.js"))});
    const f = d.resolve("accounts.json", "NOPE_1");
    console.log(JSON.stringify({ file: f, why: d.writable(f) }));`;
  const out = execFileSync(process.execPath, ["-e", probe], {
    env: { ...process.env, ENT_DATA_DIR: notADir }, encoding: "utf8",
  });
  const got = JSON.parse(out.trim().split("\n").pop());
  check("resolving a path there does not throw out of a require", !!got.file, got.file);
  check("and the problem is reported rather than hidden", got.why !== null, `${got.why}`);

  /* And the server says so in a sentence and stops, instead of a stack trace. */
  let boot;
  try {
    boot = execFileSync(process.execPath, [path.join(__dirname, "server.js")], {
      env: { ...process.env, ENT_DATA_DIR: notADir, PORT: "10777" },
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000,
    });
    boot = { status: 0, text: boot };
  } catch (e) {
    boot = { status: e.status, text: `${e.stdout || ""}${e.stderr || ""}` };
  }
  check("the server refuses to start rather than run without accounts", boot.status === 1,
    `exit ${boot.status}`);
  check("and explains it without a stack trace",
    /cannot start/.test(boot.text) && !/at Object\./.test(boot.text),
    boot.text.trim().split("\n")[0]);
  check("naming the data directory and what to check",
    /ENT_DATA_DIR/.test(boot.text) && boot.text.includes(notADir));

  fs.unlinkSync(notADir);
}

for (const fn of after) fn();
fs.rmSync(tmp, { recursive: true, force: true });

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
