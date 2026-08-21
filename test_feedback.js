/* The playtest feedback box, and who is allowed to read it.

   Anyone may write in - the friend who sat down for one game and never registered
   is exactly whose opinion is worth having. Reading what came in, and seeing who is
   sitting at which table, is for the accounts named in ENT_ADMINS.

   Needs a server. Start one first:
     ENT_ADMINS=Dids ACCOUNTS_FILE=/tmp/a.json FEEDBACK_FILE=/tmp/f.json node server.js

   Run: node test_feedback.js
*/
const feedback = require("./feedback.js");

const BASE = process.env.BASE || "http://127.0.0.1:8080";

/* A browser, near enough: it keeps every cookie the server sets - the identity one
   and the session one both matter here - and it reports the status code, because
   half of what this test checks is a 403. testkit's client keeps one cookie and
   returns only the body, which is right for what it does and not enough for this. */
function jar() {
  const store = new Map();
  return {
    header() {
      return store.size ? { cookie: [...store].map(([k, v]) => `${k}=${v}`).join("; ") } : {};
    },
    remember(res) {
      const all = typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [res.headers.get("set-cookie")].filter(Boolean);
      for (const line of all) {
        const [pair] = String(line).split(";");
        const i = pair.indexOf("=");
        if (i > 0) store.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }
    },
  };
}
/* Registering a name only works once. A test that can only be run against a fresh
   accounts file is a test nobody runs twice, so sign in instead when the name is
   already taken. */
async function beSomebody(c, name, password) {
  const reg = await c.post("/api/register", { name, password, email: `${name.toLowerCase()}@example.com` });
  if (reg.status === 200) return reg;
  return c.post("/api/login", { name, password });
}

function client(cookies) {
  const go = async (method, p, b) => {
    const r = await fetch(BASE + p, {
      method, cache: "no-store",
      headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...cookies.header() },
      ...(b ? { body: JSON.stringify(b) } : {}),
    });
    cookies.remember(r);
    const body = await r.json().catch(() => ({}));
    return { status: r.status, body };
  };
  return { post: (p, b) => go("POST", p, b || {}), get: (p) => go("GET", p) };
}

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n${t}`);

/* ============================================================ the store alone */
section("The store keeps what is worth keeping and refuses what is not");
{
  const s = { version: 1, entries: [] };

  check("a note needs a kind it recognises",
    feedback.add(s, { kind: "rant", text: "hi" }).ok === false);
  check("and something in it",
    feedback.add(s, { kind: "suggestion", text: "   " }).ok === false);
  check("a score alone is a fine session note",
    feedback.add(s, { kind: "session", rating: 4 }).ok === true);
  check("but a score alone is not a suggestion",
    feedback.add(s, { kind: "suggestion", rating: 4 }).ok === false);
  check("a score has to be 1 to 5",
    feedback.add(s, { kind: "session", rating: 9 }).ok === false);

  const r = feedback.add(s, {
    kind: "issue", text: "Rent looked wrong on a level 3 on two plots.",
    rating: 3, account: "Dids", name: "Dids", room: "AB12CD", quarter: 7, engine: "abc123",
  });
  check("a full note goes in", r.ok === true);
  check("with everything it was written under",
    r.entry.room === "AB12CD" && r.entry.quarter === 7 && r.entry.engine === "abc123",
    JSON.stringify({ room: r.entry.room, q: r.entry.quarter, e: r.entry.engine }));
  check("and a timestamp and an id of its own",
    !!r.entry.id && !Number.isNaN(Date.parse(r.entry.at)));

  const long = feedback.add(s, { kind: "suggestion", text: "x".repeat(5000) });
  check("a very long note is trimmed, not refused",
    long.ok === true && long.entry.text.length === feedback.MAX_TEXT,
    `${long.entry.text.length} characters`);

  const sum = feedback.summary(s);
  check("the summary counts the kinds", sum.byKind.issue === 1 && sum.byKind.session === 1,
    JSON.stringify(sum.byKind));
  check("and averages the scores that were given",
    sum.rated === 2 && sum.averageRating === 3.5, `${sum.averageRating} from ${sum.rated}`);
  check("newest first when read back", feedback.list(s)[0].id === long.entry.id);
}

section("A store file that cannot be read is never silently replaced");
{
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const f = path.join(os.tmpdir(), `ent-feedback-${process.pid}.json`);
  fs.writeFileSync(f, "{ this is not json");
  let threw = false;
  try { feedback.load(f); } catch (_) { threw = true; }
  check("it refuses to start instead of discarding every note", threw === true);
  fs.unlinkSync(f);
  check("a file that is simply not there is a normal first run",
    feedback.load(f).entries.length === 0);
}

/* ============================================================ over the wire */
(async () => {
  const guest = client(jar());
  const admin = client(jar());
  const other = client(jar());

  section("Anyone may write in");
  {
    const r = await guest.post("/api/feedback", { kind: "suggestion", text: "More Megacorp tiles." });
    check("a visitor who never signed in can send a note", r.status === 200, `${r.status}`);

    const bad = await guest.post("/api/feedback", { kind: "suggestion", text: "" });
    check("an empty one is refused, with a reason to read", bad.status === 400 && !!bad.body.error,
      bad.body.error);

    const rated = await guest.post("/api/feedback", { kind: "session", rating: 5 });
    check("a score on its own goes through", rated.status === 200);
  }

  section("Reading it back is not for everyone");
  {
    const r = await guest.get("/api/feedback");
    check("a visitor cannot read what came in", r.status === 403, `${r.status}`);
    const m = await guest.get("/api/matches");
    check("nor who is playing", m.status === 403, `${m.status}`);

    await beSomebody(other, "Rival", "correcthorse");
    const or_ = await other.get("/api/feedback");
    check("a signed-in player who is not an admin cannot either", or_.status === 403, `${or_.status}`);
    const om = await other.get("/api/matches");
    check("and cannot see the tables", om.status === 403, `${om.status}`);
    const acc = await other.get("/api/account");
    check("their account does not claim otherwise", acc.body.admin === false, `${acc.body.admin}`);
  }

  section("The designer reads the lot");
  {
    const reg = await beSomebody(admin, "Dids", "correcthorse");
    check("Dids is signed in", reg.status === 200, reg.body.error || "");

    const acc = await admin.get("/api/account");
    check("and is recognised as an admin", acc.body.admin === true, `${acc.body.admin}`);

    const r = await admin.get("/api/feedback");
    check("who can read every note", r.status === 200 && r.body.entries.length >= 2,
      `${r.status}, ${r.body.entries ? r.body.entries.length : 0} notes`);
    check("with a summary over them", r.body.summary && r.body.summary.total >= 2,
      JSON.stringify(r.body.summary));
    check("newest first", r.body.entries[0].kind === "session");
    check("and the rules each was written under is on it",
      r.body.entries.every((e) => typeof e.engine === "string" && e.engine.length > 0));

    const mine = await admin.post("/api/feedback", { kind: "issue", text: "Testing from an account." });
    check("an admin can write in too", mine.status === 200);
    const after = await admin.get("/api/feedback");
    check("and their note is attributed to the account, not just a typed name",
      after.body.entries[0].account === "Dids", `${after.body.entries[0].account}`);
  }

  section("Who is sitting at which table");
  {
    const empty = await admin.get("/api/matches");
    check("the list is readable", empty.status === 200 && Array.isArray(empty.body.matches));

    /* Open a table and put two people at it. */
    const host = client(jar());
    const friend = client(jar());
    const made = await host.post("/api/create", { name: "Ana", bots: 1 });
    check("a table opens", made.status === 200 && !!made.body.code, made.body.error || "");
    const codeStr = made.body.code;
    const joined = await friend.post("/api/join", { code: codeStr, name: "Bruno" });
    check("a second player sits down", joined.status === 200, joined.body.error || "");

    const seen = await admin.get("/api/matches");
    const row = seen.body.matches.find((m) => m.code === codeStr);
    check("the admin sees the table", !!row, codeStr);
    check("and reads the human players by name",
      !!row && row.seats.map((s) => s.name).includes("Ana") && row.seats.map((s) => s.name).includes("Bruno"),
      row ? row.seats.map((s) => s.name).join(", ") : "");
    check("and which of them opened it",
      !!row && (row.seats.find((s) => s.name === "Ana") || {}).host === true);
    check("a table that has not started says so", !!row && row.phase === "lobby", row && row.phase);

    /* Start it, and the seats should now come from the game itself - bots included. */
    const started = await host.post("/api/start", { code: codeStr, token: made.body.token });
    check("the game starts", started.status === 200, started.body.error || "");
    const running = await admin.get("/api/matches");
    const live = running.body.matches.find((m) => m.code === codeStr);
    check("the running table reports a quarter", !!live && live.quarter === 1, live && `Q${live.quarter}`);
    check("every seat is listed, people and bots alike",
      !!live && live.seats.length === 3, live && `${live.seats.length} seats`);
    check("the people are marked as people",
      !!live && live.seats.filter((s) => s.human).length === 2,
      live && live.seats.map((s) => `${s.name}:${s.human ? "human" : "bot"}`).join(" "));
    check("and the humans are still Ana and Bruno",
      !!live && live.seats.filter((s) => s.human).map((s) => s.name).sort().join(",") === "Ana,Bruno",
      live && live.seats.filter((s) => s.human).map((s) => s.name).join(","));
  }

  console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
  process.exit(fails ? 1 : 0);
})();
