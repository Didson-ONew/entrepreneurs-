/* Refresh-resume test: two browsers start a game; browser B refreshes mid-game and
   must land back inside the game (not the lobby) and still be able to act. */
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

async function txt(p) {
  try { return await p.evaluate(() => (document.getElementById("root") || {}).innerText || ""); }
  catch { return ""; }
}
async function waitText(p, re, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (re.test(await txt(p))) return true; await sleep(120); }
  return false;
}

(async () => {
  const browser = await launchBrowser();
  const ctxA = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const ctxB = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const A = await ctxA.newPage(), B = await ctxB.newPage();
  // BOTH pages: a page without this flag opens the first-run tutorial, whose full-screen
  // click-catcher swallows every click and hangs the run on that player's first turn.
  for (const p of [A, B]) await p.addInitScript(() => { try { localStorage.setItem('entrepreneurs_tutorial_seen','1'); } catch(e) {} });
  const errsA = [], errsB = [];
  A.on("pageerror", (e) => errsA.push(e.message));
  B.on("pageerror", (e) => errsB.push(e.message));

  // lobby
  await A.goto(URL); await waitText(A, /ENTREPRENEURS/);
  await A.fill('input[placeholder="Your name"]', "Ana");
  await A.getByText("1 bot", { exact: true }).click();
  await A.getByText("Create room", { exact: true }).click();
  await waitText(A, /Room code/);
  const code = (await txt(A)).match(/([0-9A-F]{6})/)[1];

  await B.goto(URL); await waitText(B, /ENTREPRENEURS/);
  await B.fill('input[placeholder="Your name"]', "Bruno");
  await B.fill('input[placeholder="ROOM CODE"]', code);
  await B.getByText("Join room", { exact: true }).click();
  await waitText(B, /Room code/);

  await A.getByText(/Start game/).click();
  const inA = await waitText(A, /PLANNING & ACTION TRACKS|Draft your starting/);
  const inB = await waitText(B, /PLANNING & ACTION TRACKS|Draft your starting/);
  check("both entered the game", inA && inB);

  // let a few server updates land
  await sleep(1200);
  const beforeB = await txt(B);
  const phaseHint = (beforeB.match(/Quarter \d+ of 12[^\n]*/) || ["(drafting)"])[0];
  console.log("state before refresh:", phaseHint);

  // ---- the moment of truth: B refreshes mid-game ----
  await B.reload();
  const resumed = await waitText(B, /PLANNING & ACTION TRACKS|Draft your starting/, 10000);
  const notLobby = !/Create room/.test(await txt(B));
  check("B resumed into the game after refresh", resumed && notLobby);
  const roomShown = new RegExp("room " + code).test(await txt(B));
  check("B still shows its room code", roomShown);

  // B can still act when its turn comes: poke both pages briefly
  let bActed = false;
  for (let i = 0; i < 60 && !bActed; i++) {
    for (const p of [A, B]) {
      const t = await txt(p).catch(() => "");
      if (/Draft your starting Blueprints/.test(t) && !/Waiting for/.test(t)) {
        const btns = await p.locator("button").all();
        for (const b of btns) {
          const bt = await b.textContent().catch(() => null);
          if (bt && /left/.test(bt) && (await b.isEnabled().catch(() => false))) {
            await b.click({ timeout: 2000 }).catch(() => {});
            if (p === B) bActed = true;
            break;
          }
        }
        const go = p.getByText(/Start Year 1/);
        if (await go.count() && (await go.first().isEnabled().catch(() => false)))
          await go.first().click({ timeout: 2000 }).catch(() => {});
      } else if (/Planning/.test(t) && !/Waiting/.test(t)) {
        const ma = p.getByRole("button", { name: "M&A", exact: true });
        if (await ma.count() && !(await ma.first().isDisabled().catch(() => true))) {
          await ma.first().click({ timeout: 2000 }).catch(() => {});
          if (p === B) bActed = true;
        }
      } else if (/Pass this action/.test(t)) {
        await p.getByText("Pass this action").first().click({ timeout: 2000 }).catch(() => {});
        if (p === B) bActed = true;
      }
    }
    await sleep(180);
  }
  check("B performed an action after resuming", bActed);

  // the "leave" control clears the session
  /* The one "leave" button became two when watchers got their own: a watcher gets
     "stop watching", a seated player gets "lobby" (their seat is kept). */
  await B.getByText("lobby", { exact: true }).click().catch(() => {});
  const backToLobby = await waitText(B, /Create room/, 6000);
  check("leave returns B to the lobby", backToLobby);

  check("no page errors", errsA.length + errsB.length === 0, [...errsA, ...errsB].slice(0, 3).join(" | "));
  await browser.close();
  console.log(fails ? "\n" + fails + " check(s) failed" : "\nall checks passed");
  process.exit(fails);
})();
