/* A third person types the code of a game already in progress. They should land in the
   game as a watcher: full view of the board, chat and voice available, no controls, and
   the server must refuse any action they try to send. */
const { chromium } = require("playwright");
const URL = "http://127.0.0.1:8080/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function txt(p) { try { return await p.evaluate(() => document.body.innerText || ""); } catch { return ""; } }
async function waitText(p, re, ms = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (re.test(await txt(p))) return true; await sleep(150); }
  return false;
}

(async () => {
  const br = await chromium.launch();
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
  console.log("lobby warns about watching:", /join as a\s+watcher|watcher/i.test(hint));
  await S.fill('input[placeholder="Your name"]', "Cleo");
  await S.fill('input[placeholder="ROOM CODE"]', code);
  await S.getByText("Join room", { exact: true }).click();

  const inGame = await waitText(S, /PLANNING & ACTION TRACKS|Draft your starting/, 12000);
  console.log("spectator entered the running game:", inGame);
  const st = await txt(S);
  console.log("watching banner shown:", /You are\s+watching this game/.test(st));
  console.log("can see the board:", /STANDINGS/.test(st) && /INDUSTRY/.test(st));
  console.log("can see the log:", /LOG/.test(st));

  // --- no controls ---
  const controls = await S.evaluate(() => {
    const t = document.body.innerText;
    return {
      placeMeeple: /Place a meeple/.test(t),
      pass: /Pass this action/.test(t),
      tracksButton: !!Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "M&A"),
    };
  });
  console.log("no 'place a meeple' panel:", !controls.placeMeeple);
  console.log("no action buttons:", !controls.pass && !controls.tracksButton);

  // --- the server refuses actions even if one is forged ---
  const forged = await S.evaluate(async () => {
    const saved = JSON.parse(localStorage.getItem("entrepreneurs_session") || "{}");
    const r = await fetch("/api/action", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: saved.code, token: saved.token, action: "plan", data: { track: "ma" } }),
    });
    return { status: r.status, body: await r.json() };
  });
  console.log("forged action rejected:", forged.status === 403, "|", forged.body.error);

  // --- chat works both ways ---
  console.log("\n=== SPECTATOR CAN STILL TALK ===");
  for (const p of [A, S]) { const o = p.getByText(/^Table/).first(); if (await o.count()) { await o.click().catch(() => {}); await sleep(250); } }
  await S.locator('input[placeholder="Message the table"]').fill("nice opening, Ana");
  await S.locator('input[placeholder="Message the table"]').press("Enter");
  console.log("player receives the watcher's message:", await waitText(A, /nice opening, Ana/, 6000));
  await A.locator('input[placeholder="Message the table"]').fill("thanks Cleo");
  await A.locator('input[placeholder="Message the table"]').press("Enter");
  console.log("watcher receives the player's reply:", await waitText(S, /thanks Cleo/, 6000));
  console.log("voice tab available to watcher:", await S.getByText(/^voice$/i).count() > 0);

  // --- and the players are unaffected ---
  const aStill = await txt(A);
  console.log("\nplayers still see their own controls:",
    /PLANNING & ACTION TRACKS/.test(aStill) && !/You are\s+watching/.test(aStill));

  console.log("page errors:", errs.length ? errs.slice(0, 3) : "none");
  await br.close();
  process.exit(0);
})();
