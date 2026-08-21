/* A game in progress outlives the server.

   A room used to live only in memory, so a deploy - or hosting that puts the
   service to sleep after fifteen idle minutes - ended every game on the board. A
   three-bot game that had been waiting days for one player's move simply stopped
   existing.

   This starts a real game against real bots, plays until the bots are waiting on
   the human, stops the server the way a deploy stops it (SIGTERM), starts a new
   one on the same data directory, and checks the game came back the same.

   The part most worth pinning down is the random number generator. Its position
   is saved as a seed plus a count of draws; get that wrong and a resumed game
   quietly re-deals cards it had already dealt, which nobody would notice until
   the same Blueprint turned up twice.

   This test runs its OWN servers - do not start one first.

   Run: node test_survives_restart.js
*/
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PORT = process.env.PORT || 8137;
const BASE = `http://127.0.0.1:${PORT}`;
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ent-restart-"));

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n${t}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const api = async (p, body) => {
  const r = await fetch(BASE + p, {
    method: body ? "POST" : "GET", cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

/* Read a room's state the way a browser does, off the event stream. */
async function readState(code, token) {
  const r = await fetch(`${BASE}/api/stream?code=${code}&token=${token}`, { cache: "no-store" });
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (let i = 0; i < 60; i++) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      /* The stream opens with a {"type":"hello"} frame naming the seat, then sends
         the room. Read frames until the room turns up. */
      let at;
      while ((at = buf.indexOf("\n\n")) > 0) {
        const frame = buf.slice(0, at).replace(/^data: /, "");
        buf = buf.slice(at + 2);
        let parsed;
        try { parsed = JSON.parse(frame); } catch (_) { continue; }
        if (parsed.type === "state" || parsed.type === "lobby") return parsed;
      }
    }
  } finally { try { await reader.cancel(); } catch (_) { /* closing is enough */ } }
  return null;
}

/* ------------------------------------------------------------------ the generator
   The whole resume rests on this: a generator wound forward by N draws must be
   indistinguishable from one that has been drawn from N times. Checked here with a
   generator of its own, so the property is pinned down whatever the engine does. */
function checkWinding() {
  const livegames = require("./livegames.js");
  section("A wound-forward generator is the same generator");
  const counter = (seed) => { let n = seed; return () => (n = (n * 1103515245 + 12345) % 2147483648) / 2147483648; };
  const make = livegames.rngFactory(counter);

  const played = make(42);
  const drawn = [];
  for (let i = 0; i < 7; i++) drawn.push(played());
  check("a generator counts what has been drawn from it", played.calls === 7, `${played.calls}`);
  check("and remembers its seed", played.seed === 42);

  const resumed = make(played.seed, played.calls);
  check("one wound forward reports the same position", resumed.calls === 7);
  const nextA = played(), nextB = resumed();
  check("and gives the same next number", nextA === nextB, `${nextA} vs ${nextB}`);
  for (let i = 0; i < 5; i++) {
    if (played() !== resumed()) { check("and every number after that", false, `diverged at ${i}`); return; }
  }
  check("and every number after that", true);

  const rewound = make(played.seed);          // the bug this guards against
  check("whereas the seed alone rewinds it, which is the bug",
    rewound() === drawn[0], "re-deals the first card");
}

let server = null;
function start(label) {
  return new Promise((resolve, reject) => {
    server = spawn(process.execPath, [path.join(__dirname, "server.js")], {
      env: { ...process.env, PORT: String(PORT), ENT_DATA_DIR: DIR },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    const onData = (c) => {
      out += c.toString();
      if (/Entrepreneurs server on/.test(out)) {
        /* Give the boot report and the resume log a moment to finish printing. */
        setTimeout(() => resolve(out), 400);
      }
    };
    server.stdout.on("data", onData);
    server.stderr.on("data", onData);
    server.on("exit", (c) => { if (!/Entrepreneurs server on/.test(out)) reject(new Error(`${label} exited ${c}: ${out}`)); });
    setTimeout(() => reject(new Error(`${label} never started: ${out}`)), 15000);
  });
}
/* Stop it the way a deploy does. */
function stop() {
  return new Promise((resolve) => {
    if (!server) return resolve("");
    let out = "";
    server.stdout.on("data", (c) => { out += c.toString(); });
    server.on("exit", () => resolve(out));
    server.kill("SIGTERM");
    setTimeout(() => { try { server.kill("SIGKILL"); } catch (_) { /* gone */ } resolve(out); }, 8000);
  });
}

(async () => {
  checkWinding();
  try {
    /* ------------------------------------------------ a game, mid-play */
    section("A game is under way");
    await start("first server");

    const made = await api("/api/create", { name: "Ana", bots: 3 });
    check("a table opens", made.status === 200 && !!made.body.code, made.body.error || "");
    const code = made.body.code, token = made.body.token;

    const started = await api("/api/start", { code, token });
    check("the game starts against three bots", started.status === 200, started.body.error || "");

    /* Get past the draft and into a quarter, because the draft is where the room's
       generator first gets used - and its position is the thing most worth checking
       across a restart. */
    for (let i = 0; i < 12; i++) {
      const s = await readState(code, token);
      if (!s || s.state.phase !== "drafting") break;
      const ind = Object.keys(s.state.decks).find((k) => (s.state.decks[k] || []).length);
      const r = await api("/api/action", { code, token, action: "draft", data: { ind } });
      if (r.status !== 200) break;
      await sleep(120);
    }
    await sleep(600);

    const before = await readState(code, token);
    check("the board is there and it is a real game",
      !!before && before.type === "state" && before.state.quarter >= 1,
      before && `Q${before.state.quarter} ${before.state.phase}`);
    check("the draft is done and the quarter has begun",
      before.state.phase === "planning", before.state.phase);
    check("and it is waiting on the human, not on a bot",
      before.state.planningQueue[0] === 0 || before.state.awaitingPlayerId === 0,
      `awaiting ${before.state.awaitingPlayerId}, queue ${JSON.stringify(before.state.planningQueue)}`);

    const beforeJson = JSON.stringify(before.state);
    const beforeLogs = before.logs.length;

    /* ------------------------------------------------ the deploy */
    section("The server stops the way a deploy stops it");
    const bye = await stop();
    check("it says it saved the game on its way out", /saved 1 room/.test(bye),
      (bye.split("\n").find((l) => /saved/.test(l)) || "nothing said").trim());
    check("and the games file is on disk", fs.existsSync(path.join(DIR, "games.json")));

    const saved = JSON.parse(fs.readFileSync(path.join(DIR, "games.json"), "utf8"));
    check("holding one room", saved.rooms.length === 1, `${saved.rooms.length}`);
    check("with the random generator's POSITION, not just its seed",
      saved.rooms[0].rng && typeof saved.rooms[0].rng.seed === "number"
        && typeof saved.rooms[0].rng.calls === "number",
      JSON.stringify(saved.rooms[0].rng));

    /* ------------------------------------------------ back again */
    section("A new server picks the game up");
    const boot = await start("second server");
    check("it says so at boot", /Resumed 1 room/.test(boot),
      (boot.split("\n").find((l) => /Resumed/.test(l)) || "nothing said").trim());
    check("and names the table and the quarter", boot.includes(code) && /Q\d/.test(boot),
      (boot.split("\n").find((l) => l.includes(code)) || "").trim());

    const after = await readState(code, token);
    check("the same table answers to the token the browser already had",
      !!after && after.type === "state", after && after.type);
    check("the board is identical, down to the last plot",
      JSON.stringify(after.state) === beforeJson,
      JSON.stringify(after.state) === beforeJson ? "" : "the state changed across the restart");
    check("the log came back with it", after.logs.length === beforeLogs,
      `${after.logs.length} vs ${beforeLogs}`);

    const resumed = await api("/api/resume", { code, token });
    check("and rejoining works, in the seat that was held",
      resumed.status === 200 && resumed.body.seat === 0 && resumed.body.started === true,
      JSON.stringify(resumed.body));

    /* ------------------------------------------------ and it still plays */
    section("The resumed game carries on being a game");
    let acted = await api("/api/action", { code, token, action: "plan", data: { track: "rd" } });
    if (acted.status !== 200) acted = await api("/api/action", { code, token, action: "plan", data: { track: "ma" } });
    check("the human can still take a turn", acted.status === 200, acted.body.error || `${acted.status}`);
    await sleep(800);
    const moved = await readState(code, token);
    check("and the game moved on from where it was",
      JSON.stringify(moved.state) !== beforeJson);

    /* Two restarts running: the second save must not lose what the first kept. */
    section("It survives being restarted twice");
    await stop();
    await start("third server");
    const third = await readState(code, token);
    check("the table is still there after a second restart",
      !!third && third.type === "state" && third.state.quarter >= 1,
      third && `Q${third.state.quarter}`);
    check("and it is the game that had already moved on",
      JSON.stringify(third.state) === JSON.stringify(moved.state));

    /* ------------------------------------------------ finished games are not hoarded */
    section("A finished game is not carried forever");
    const livegames = require("./livegames.js");
    const over = { code: "OLD", state: { phase: "gameover" }, touchedAt: Date.now() };
    const stale = { code: "STALE", state: { phase: "planning" }, touchedAt: Date.now() - livegames.KEEP_MS - 1 };
    const live = { code: "LIVE", state: { phase: "planning" }, touchedAt: Date.now() };
    check("a game that ended is dropped", livegames.worthKeeping(over) === false);
    check("so is one nobody has touched in a fortnight", livegames.worthKeeping(stale) === false);
    check("a live one is kept", livegames.worthKeeping(live) === true);
  } catch (e) {
    check(`the test ran to the end`, false, e.message);
  } finally {
    await stop();
    fs.rmSync(DIR, { recursive: true, force: true });
  }

  console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
  process.exit(fails ? 1 : 0);
})();
