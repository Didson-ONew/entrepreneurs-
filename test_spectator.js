/* A third person types the code of a game already in progress. They should land in the
   game as a watcher: full view of the board, chat and voice available, no controls, and
   the server must refuse any action they try to send. */
const { launchBrowser } = require("./testkit.js");
/* The runner picks a free port rather than assuming 8080 is idle, so read where
   the server actually is. */
const BASE = process.env.BASE || "http://127.0.0.1:8080";
const URL = BASE + "/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* This test printed its findings and exited 0 whatever they said, so a run reporting
   "false" still counted as a pass. Assertions now reach the exit code; lines that are
   genuinely informational stay as console.log. */
let fails = 0;
function check(label, ok, detail) {
  if (!ok) fails++;
  console.log(" " + (ok ? "ok  " : "FAIL") + "  " + label
    + (detail !== undefined && detail !== "" ? "  [" + detail + "]" : ""));
}

async function txt(p) { try { return await p.evaluate(() => document.body.innerText || ""); } catch { return ""; } }
async function waitText(p, re, ms = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (re.test(await txt(p))) return true; await sleep(150); }
  return false;
}

(async () => {
  const br = await launchBrowser();
  const mk = async () => {
    const ctx = await br.newContext({ viewport: { width: 1500, height: 950 } });
    const p = await ctx.newPage();
    await p.addInitScript(() => { try { localStorage.setItem("entrepreneurs_tutorial_seen", "1"); } catch (e) {} });
    return p;
  };
  const A = await mk(), B = await mk(), S = await mk();
  const errs = [];
  for (const [n, p] of [["A", A], ["B", B], ["S", S]]) p.on("pageerror", (e) => errs.push(n + ":" + e.message));

  // --- two players start a game ---
  await A.goto(URL); await waitText(A, /ENTREPRENEURS/);
  await A.fill('input[placeholder="Your name"]', "Ana");
  await A.getByText("1 bot", { exact: true }).click();
  await A.getByText("Create room", { exact: true }).click();
  await waitText(A, /ROOM CODE|Room code/);
  const code = (await txt(A)).match(/([0-9A-F]{6})/)[1];

  await B.goto(URL); await waitText(B, /ENTREPRENEURS/);
  await B.fill('input[placeholder="Your name"]', "Bruno");
  await B.fill('input[placeholder="ROOM CODE"]', code);
  await B.getByText("Join room", { exact: true }).click();
  await waitText(A, /Bruno/);
  await A.getByText(/Start game/).click();
  await waitText(A, /PLANNING & ACTION TRACKS|Draft your starting/);
  console.log("game running in room", code);

  // --- a spectator types the same code, mid-game ---
  console.log("\n=== SPECTATOR JOINS AN ONGOING MATCH ===");
  await S.goto(URL); await waitText(S, /ENTREPRENEURS/);
  const hint = await txt(S);
  check("lobby warns about watching", /join as a\s+watcher|watcher/i.test(hint));
  await S.fill('input[placeholder="Your name"]', "Cleo");
  await S.fill('input[placeholder="ROOM CODE"]', code);
  await S.getByText("Join room", { exact: true }).click();

  const inGame = await waitText(S, /PLANNING & ACTION TRACKS|Draft your starting/, 12000);
  check("spectator entered the running game", inGame);
  /* The watcher used to be told so by a full-width fixed banner reading "You are
     watching this game". It is a title label beside the room code now, so the text to
     look for is just "watching" next to "stop watching". */
  const st = await txt(S);
  check("told they are watching", /\bwatching\b/.test(st) && /stop watching/i.test(st));
  /* This test joins a watcher to a room that is still drafting and never drives the
     game forward, so the standings and the log - which only exist once play starts -
     are out of its reach. What it CAN prove is that the watcher is looking at the live
     game rather than a lobby or an empty shell: the same draft screen the players are
     on, with the real price row on it. Driving a full game to check the standings is
     test_browsers' job. */
  check("sees the live game, not a lobby",
    /Draft your starting Blueprints|PLANNING & ACTION TRACKS/.test(st));
  /* Not the "TAKEN SO FAR" price panel, which only appears once somebody has drafted
     and so is a coin toss in a test that never drives the draft. The deck state is on
     screen from the moment the watcher arrives, and proves the same thing: this is
     live game data, not a shell. */
  check("is served the live deck state",
    await waitText(S, /\d+ left/, 12000) && /opex \$\d+/.test(await txt(S)));


  // --- no controls ---
  const controls = await S.evaluate(() => {
    const t = document.body.innerText;
    return {
      placeMeeple: /Place a meeple/.test(t),
      pass: /Pass this action/.test(t),
      tracksButton: !!Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "M&A"),
    };
  });
  check("no 'place a meeple' panel", !controls.placeMeeple);
  check("no action buttons", !controls.pass && !controls.tracksButton);

  // --- the server refuses actions even if one is forged ---
  const forged = await S.evaluate(async () => {
    const saved = JSON.parse(localStorage.getItem("entrepreneurs_session") || "{}");
    const r = await fetch("/api/action", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: saved.code, token: saved.token, action: "plan", data: { track: "ma" } }),
    });
    return { status: r.status, body: await r.json() };
  });
  check("forged action rejected", forged.status === 403, forged.body.error);

  // --- chat works both ways ---
  console.log("\n=== SPECTATOR CAN STILL TALK ===");
  for (const p of [A, S]) { const o = p.getByText(/^Table/).first(); if (await o.count()) { await o.click().catch(() => {}); await sleep(250); } }
  await S.locator('input[placeholder="Message the table"]').fill("nice opening, Ana");
  await S.locator('input[placeholder="Message the table"]').press("Enter");
  check("player receives the watcher's message", await waitText(A, /nice opening, Ana/, 6000));
  await A.locator('input[placeholder="Message the table"]').fill("thanks Cleo");
  await A.locator('input[placeholder="Message the table"]').press("Enter");
  check("watcher receives the player's reply", await waitText(S, /thanks Cleo/, 6000));
  check("voice tab available to watcher", await S.getByText(/^voice$/i).count() > 0);

  // --- and the players are unaffected ---
  const aStill = await txt(A);
  /* The point is that a seated player is not handed the watcher's UI. The old test
     looked for the action tracks, which this game has not reached, and for a banner
     that no longer exists - so it reported false on a table that was working fine. */
  check("a player is not shown the watcher controls",
    !/stop watching/i.test(aStill)
    && /Draft your starting Blueprints|PLANNING & ACTION TRACKS/.test(aStill));

  check("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
  await br.close();
  console.log(fails ? "\n" + fails + " check(s) failed" : "\nall checks passed");
  process.exit(fails);
})();
