/* Taking a copy of everything, and putting one back.

   The promise the button makes is that putting a copy back can never cost you
   anything: it adds what is missing and leaves what is here alone. That promise is
   what makes it safe to press when you are not sure which file you are holding, so
   it is the thing most worth pinning down.

   Needs a server for the second half:
     ENT_ADMINS=Dids ACCOUNTS_FILE=/tmp/a.json FEEDBACK_FILE=/tmp/f.json node server.js

   Run: node test_backup.js
*/
const backup = require("./backup.js");

const BASE = process.env.BASE || "http://127.0.0.1:8080";

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n${t}`);

const store = (users) => ({ version: 1, secret: "x", users });
const notes = (entries) => ({ version: 1, entries });
/* Shaped like a record the server writes, engine stamp and all: these fixtures get
   restored into whatever store the server is running, and a record missing fields a
   real one always has shows up later as a failure somewhere else entirely. */
const match = (id, at) => ({ id, at, engine: "testeng0",
  players: [{ name: "Ana", ep: 40, rank: 1, human: true }] });
const note = (id, at) => ({ id, at, kind: "suggestion", text: "more tiles" });

/* ============================================================ the file itself */
section("What goes in the file");
{
  const f = backup.build({
    accounts: store([{ id: 1, name: "Dids", pw: "hash" }]),
    matches: [match("m1", 10), match("m2", 20)],
    feedback: notes([note("n1", "2026-01-01")]),
    engine: "abc123",
  });
  check("it says what format it is, so a future one can refuse it", f.format === backup.FORMAT);
  check("and which rules the server was running", f.engine === "abc123");
  check("it carries all three stores", f.accounts.length === 1 && f.matches.length === 2 && f.feedback.length === 1);
  check("with the counts on the outside, readable without parsing the lot",
    f.counts.accounts === 1 && f.counts.matches === 2 && f.counts.feedback === 1,
    JSON.stringify(f.counts));
  check("and it says out loud what it holds",
    /password/i.test(f._warning), f._warning);
  check("the filename carries the date so a folder of them sorts itself",
    /^entrepreneurs-backup-\d{4}-\d{2}-\d{2}\.json$/.test(backup.filename(new Date("2026-08-21"))),
    backup.filename(new Date("2026-08-21")));
}

section("A file that is not one of ours is refused before anything is touched");
{
  check("not an object", !!backup.problem("hello"));
  check("no format", !!backup.problem({ matches: [], accounts: [], feedback: [] }));
  check("a format this server does not read",
    /format/.test(backup.problem({ format: 99, matches: [], accounts: [], feedback: [] }) || ""),
    backup.problem({ format: 99, matches: [], accounts: [], feedback: [] }));
  check("missing a store", /matches/.test(backup.problem({ format: 1, accounts: [], feedback: [] }) || ""));
  check("a good one has no problem",
    backup.problem({ format: 1, accounts: [], matches: [], feedback: [] }) === null);
}

/* ============================================================ merging */
section("Putting one back adds what is missing");
{
  const current = {
    accounts: store([{ id: 1, name: "Dids", pw: "current-hash" }]),
    matches: [match("m1", 10)],
    feedback: notes([note("n1", "2026-01-01")]),
  };
  const file = backup.build({
    accounts: store([{ id: 9, name: "Didson", pw: "h2" }]),
    matches: [match("m2", 20), match("m3", 30)],
    feedback: notes([note("n2", "2026-01-02")]),
  });
  const r = backup.apply(file, current);
  check("the account that was not here is added", r.added.accounts === 1);
  check("the games that were not here are added", r.added.matches === 2, `${r.added.matches}`);
  check("the notes that were not here are added", r.added.feedback === 1);
  check("the new games come back oldest first",
    r.newMatches.map((m) => m.id).join(",") === "m2,m3", r.newMatches.map((m) => m.id).join(","));
  check("and it says so in words a person can read",
    /2 games/.test(backup.describe(r)), backup.describe(r));
}

section("And never takes anything away");
{
  const current = {
    accounts: store([{ id: 1, name: "Dids", pw: "CURRENT" }]),
    matches: [match("m1", 10), match("m2", 20)],
    feedback: notes([note("n1", "2026-01-01")]),
  };
  /* An OLD copy: same name with an old password, games the server already has. */
  const file = backup.build({
    accounts: store([{ id: 1, name: "dids", pw: "OLD-PASSWORD" }]),
    matches: [match("m1", 10)],
    feedback: notes([note("n1", "2026-01-01")]),
  });
  const before = JSON.stringify(current.matches);
  const r = backup.apply(file, current);

  check("a name that is registered here keeps ITS password, not the file's",
    current.accounts.users.find((u) => u.name === "Dids").pw === "CURRENT",
    current.accounts.users.find((u) => u.name === "Dids").pw);
  check("matched case-insensitively, so 'dids' does not become a second account",
    current.accounts.users.length === 1, `${current.accounts.users.length} accounts`);
  check("no game is added twice", r.added.matches === 0 && JSON.stringify(current.matches) === before);
  check("no note is added twice", current.feedback.entries.length === 1);
  check("and it says nothing was new", /Nothing new/.test(backup.describe(r)), backup.describe(r));
}

section("Restoring the same file twice changes nothing the second time");
{
  const current = { accounts: store([]), matches: [], feedback: notes([]) };
  const file = backup.build({
    accounts: store([{ id: 1, name: "Ana", pw: "h" }]),
    matches: [match("m1", 10)],
    feedback: notes([note("n1", "2026-01-01")]),
  });
  const first = backup.apply(file, current);
  /* The server appends the new matches itself, so mirror that before round two. */
  current.matches.push(...first.newMatches);
  const second = backup.apply(file, current);
  check("the first time takes everything", first.added.matches === 1 && first.added.accounts === 1);
  check("the second time takes nothing",
    second.added.matches === 0 && second.added.accounts === 0 && second.added.feedback === 0,
    JSON.stringify(second.added));
}

/* ============================================================ over the wire */
function jar() {
  const s = new Map();
  return {
    header() { return s.size ? { cookie: [...s].map(([k, v]) => `${k}=${v}`).join("; ") } : {}; },
    remember(res) {
      const all = typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie() : [res.headers.get("set-cookie")].filter(Boolean);
      for (const line of all) {
        const [pair] = String(line).split(";");
        const i = pair.indexOf("=");
        if (i > 0) s.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }
    },
  };
}
function client(cookies) {
  const go = async (method, p, b) => {
    const r = await fetch(BASE + p, {
      method, cache: "no-store",
      headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...cookies.header() },
      ...(b ? { body: JSON.stringify(b) } : {}),
    });
    cookies.remember(r);
    const type = r.headers.get("content-type") || "";
    const disp = r.headers.get("content-disposition") || "";
    const parsed = await r.json().catch(() => ({}));
    return { status: r.status, body: parsed, type, disp };
  };
  return { post: (p, b) => go("POST", p, b || {}), get: (p) => go("GET", p) };
}
async function beSomebody(c, name, password) {
  const reg = await c.post("/api/register", {
    name, password, email: `${name.toLowerCase()}@example.com`,
    question: "street", answer: "Baker Street",
  });
  if (reg.status === 200) return reg;
  return c.post("/api/login", { name, password });
}

(async () => {
  const guest = client(jar());
  const admin = client(jar());

  section("Only the designer may take a copy or put one back");
  {
    const g1 = await guest.get("/api/backup");
    check("a visitor cannot download it", g1.status === 403, `${g1.status}`);
    const g2 = await guest.post("/api/restore", { format: 1, accounts: [], matches: [], feedback: [] });
    check("nor put one back", g2.status === 403, `${g2.status}`);
  }

  section("The designer downloads a real file");
  {
    const reg = await beSomebody(admin, "Dids", "correcthorse");
    check("signed in", reg.status === 200, reg.body.error || "");

    const r = await admin.get("/api/backup");
    check("the download works", r.status === 200, `${r.status}`);
    check("and arrives as a file to save, not a page to look at",
      /attachment/.test(r.disp) && /entrepreneurs-backup-/.test(r.disp), r.disp);
    check("with all three stores in it",
      Array.isArray(r.body.accounts) && Array.isArray(r.body.matches) && Array.isArray(r.body.feedback));
    check("the signed-in account is in it",
      r.body.accounts.some((u) => String(u.name).toLowerCase() === "dids"),
      r.body.accounts.map((u) => u.name).join(", "));
    check("and it is stamped with the rules that were running", typeof r.body.engine === "string");
  }

  section("Putting one back, over the wire");
  {
    const mine = await admin.get("/api/backup");
    const withExtra = {
      ...mine.body,
      /* a fresh id every run: this restores into whatever store the server is using,
         and re-using a fixture id makes the second run a no-op that looks like a bug */
      matches: [...mine.body.matches, match(`wire-test-${process.pid}-${Date.now()}`, Date.now())],
    };
    const r = await admin.post("/api/restore", withExtra);
    check("the server takes it", r.status === 200, r.body.error || "");
    check("and reports what it did", /1 game/.test(r.body.message || ""), r.body.message);

    const again = await admin.post("/api/restore", withExtra);
    check("doing it twice adds nothing the second time",
      again.status === 200 && again.body.added.matches === 0, JSON.stringify(again.body.added));

    const stats = await admin.get("/api/stats");
    check("and the restored game is in the record book now",
      stats.body.total >= 1, `${stats.body.total} games`);
  }

  section("Rubbish is refused with a reason, not a stack trace");
  {
    const r = await admin.post("/api/restore", { hello: "world" });
    check("a JSON file that is not a backup", r.status === 400 && !!r.body.error, r.body.error);
    const old = await admin.post("/api/restore", { format: 99, accounts: [], matches: [], feedback: [] });
    check("a backup from a future version", old.status === 400 && /format/.test(old.body.error || ""),
      old.body.error);
  }

  section("A body larger than the server will take is refused, not swallowed");
  {
    /* Not the 64MB restore limit - that would take a minute to send. The ordinary
       limit on every other endpoint is what protects the server, so check that. */
    const big = "x".repeat(300 * 1024);
    const r = await fetch(`${BASE}/api/feedback`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "suggestion", text: big }),
    }).then((res) => ({ status: res.status })).catch(() => ({ status: "connection dropped" }));
    check("an oversized ordinary request does not go through",
      r.status !== 200, `${r.status}`);
  }

  console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
  process.exit(fails ? 1 : 0);
})();
