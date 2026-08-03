/* Refresh-resume test: two browsers start a game; browser B refreshes mid-game and
   must land back inside the game (not the lobby) and still be able to act. */
const { chromium } = require("playwright");
const URL = "http://127.0.0.1:8080/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const ctxB = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const A = await ctxA.newPage(), B = await ctxB.newPage();
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
  const inA = await waitText(A, /Quarter|Draft your starting/);
  const inB = await waitText(B, /Quarter|Draft your starting/);
  console.log("both entered the game:", inA && inB);

  // let a few server updates land
  await sleep(1200);
  const beforeB = await txt(B);
  const phaseHint = (beforeB.match(/Quarter \d+ of 12[^\n]*/) || ["(drafting)"])[0];
  console.log("state before refresh:", phaseHint);

  // ---- the moment of truth: B refreshes mid-game ----
  await B.reload();
  const resumed = await waitText(B, /Quarter|Draft your starting/, 10000);
  const notLobby = !/Create room/.test(await txt(B));
  console.log("B resumed into the game after refresh:", resumed && notLobby);
  const roomShown = new RegExp("room " + code).test(await txt(B));
  console.log("B still shows its room code:", roomShown);

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
  console.log("B performed an action after resuming:", bActed);

  // the "leave" control clears the session
  await B.getByText("leave", { exact: true }).click().catch(() => {});
  const backToLobby = await waitText(B, /Create room/, 6000);
  console.log("leave returns B to the lobby:", backToLobby);

  console.log("page errors:", errsA.length + errsB.length ? [...errsA, ...errsB].slice(0, 3) : "none");
  await browser.close();
  process.exit(0);
})();
