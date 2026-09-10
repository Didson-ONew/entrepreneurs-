/* The whole point, end to end: play a game, wipe the data directory the way a
   deploy does, boot again, and see whether the hall of fame came back.

   A tiny local server stands in for GitHub's contents API so nothing leaves the
   machine and no token is needed. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = __dirname;
const DIR = require("os").tmpdir() + "/entrepreneurs-deploy-test";
const PORT = 8091, GH_PORT = 8092;   // out of the way of a dev server on 8080
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fails = 0;
const check = (w, ok, note = "") => { if (!ok) fails++; console.log(`${ok ? " ok  " : " FAIL"} ${w}${note ? `  [${note}]` : ""}`); };

/* ---- stand-in for api.github.com ---- */
let stored = null, sha = null, writes = 0;
const gh = http.createServer((req, res) => {
  if (req.method === "GET") {
    if (!stored) { res.writeHead(404); return res.end("{}"); }
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ sha, content: Buffer.from(stored).toString("base64") }));
  }
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    const b = JSON.parse(body);
    stored = Buffer.from(b.content, "base64").toString("utf8");
    writes++; sha = `sha-${writes}`;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ content: { sha } }));
  });
});

function boot(label) {
  const env = {
    ...process.env,
    PORT: String(PORT),
    ENT_DATA_DIR: DIR,
    ENT_ADMINS: "Tester",
    ENT_BACKUP_REPO: "fake/repo",
    ENT_BACKUP_TOKEN: "fake-token",
    ENT_BACKUP_API: `http://127.0.0.1:${GH_PORT}`,
  };
  const p = spawn("node", ["server.js"], { cwd: ROOT, env });
  p.stdout.on("data", (d) => String(d).split("\n").filter(Boolean)
    .filter((l) => /Backup store|match .* recorded|Data directory|matches /.test(l))
    .forEach((l) => console.log(`   [${label}] ${l}`)));
  p.stderr.on("data", (d) => console.log(`   [${label}!] ${String(d).trim()}`));
  return p;
}

const api = async (p, opt) => {
  const r = await fetch(`http://127.0.0.1:${PORT}${p}`, opt);
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

(async () => {
  fs.rmSync(DIR, { recursive: true, force: true });
  fs.mkdirSync(DIR, { recursive: true });
  await new Promise((r) => gh.listen(GH_PORT, r));

  /* A finished game already in the book. Written before the server starts, so
     it is in what the server holds - appending behind its back afterwards would
     not be, and could never reach the store. */
  const rec = { id: "match-test-1", at: new Date().toISOString(), engine: "test",
    players: [{ name: "Ana", ep: 101 }, { name: "Bruno", ep: 88 }] };
  fs.writeFileSync(path.join(DIR, "matches.jsonl"), JSON.stringify(rec) + "\n");

  console.log("\nFIRST RUN - a game in the book, then a note to trigger a save");
  let srv = boot("run 1");
  await sleep(3500);

  // and a playtest note, through the real endpoint, which triggers a save
  const fb = await api("/api/feedback", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "suggestion", text: "the board fits my phone now", where: "test" }),
  });
  check("a playtest note was accepted", fb.status === 200 || fb.status === 201, `HTTP ${fb.status}`);

  /* A GAME IN PROGRESS, made the way a player makes one.

     This is the case the first version of this test missed: it triggered a save
     with a playtest note and then checked that matches and feedback came back,
     which is checking that a save HAPPENED rather than that the room was in it.
     A room only reached the store when something else happened to write, so a
     game played on its own was lost - and nothing here noticed. */
  const made = await api("/api/create", { method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Ana", bots: 1 }) });
  const roomCode = made.body.code;
  check("a room was created", !!roomCode, roomCode || JSON.stringify(made.body));

  console.log("   waiting for the debounced save…");
  await sleep(23000);
  check("the store was written", writes > 0, `${writes} write(s)`);
  const saved = stored ? JSON.parse(stored) : null;
  check("it holds the playtest note", !!saved && saved.counts.feedback >= 1,
    saved ? `${saved.counts.feedback} note(s)` : "nothing stored");
  check("AND it holds the game in progress",
    !!saved && Array.isArray(saved.rooms) && saved.rooms.some((r) => r.code === roomCode),
    saved && saved.rooms ? `${saved.rooms.length} room(s): ${saved.rooms.map((r) => r.code).join(",")}` : "no rooms field");

  console.log("\nDEPLOY - stop, and wipe the data directory the way Render does");
  srv.kill("SIGTERM");
  await sleep(4000);
  fs.rmSync(DIR, { recursive: true, force: true });
  fs.mkdirSync(DIR, { recursive: true });
  check("the data directory is empty", fs.readdirSync(DIR).length === 0);

  console.log("\nSECOND RUN - boot on the empty directory");
  srv = boot("run 2");
  await sleep(6000);

  const stats = await api("/api/feedback");
  const after = fs.existsSync(path.join(DIR, "matches.jsonl"))
    ? fs.readFileSync(path.join(DIR, "matches.jsonl"), "utf8").trim().split("\n").filter(Boolean) : [];
  check("the hall of fame came back", after.length >= 1, `${after.length} match(es) on disk`);
  check("and it is the same match", after.some((l) => l.includes("match-test-1")));
  const fbFile = path.join(DIR, "feedback.json");
  const notes = fs.existsSync(fbFile) ? (JSON.parse(fs.readFileSync(fbFile, "utf8")).entries || []) : [];
  check("the playtest note came back", notes.length >= 1, `${notes.length} note(s)`);
  check("and it is the same note", notes.some((e) => /fits my phone/.test(e.text || "")));

  const resumed = await api(`/api/mygames`);   // just to touch the server
  const rooms2 = await api("/api/presence?id=probe");
  check("the game in progress came back too", rooms2.body.waiting + rooms2.body.matches >= 1,
    `${rooms2.body.waiting} waiting, ${rooms2.body.matches} playing`);

  const writesBefore = writes;
  await sleep(23000);
  check("an ordinary wake does not write to the store again",
    writes === writesBefore, `${writes - writesBefore} extra write(s)`);

  srv.kill("SIGTERM");
  await sleep(2000);
  gh.close();
  console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
  process.exit(fails ? 1 : 0);
})();
