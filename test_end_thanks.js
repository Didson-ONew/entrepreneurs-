/* At the end of a match, each human is thanked and asked how it went.

   A playtest is worth what comes back from it, and the moment a player can say
   how it felt is the moment the final score goes up - not later, from a button
   they have to think to press. So the game asks there, once.

   ONCE is the part worth testing. A prompt that reappears on every reload is a
   prompt people learn to dismiss without reading, so being asked is remembered
   in the browser, and remembered when it is SHOWN rather than when it is
   answered: a player who closes the tab has still been asked.

   Run the server first, then: node test_end_thanks.js
*/
const { chromium } = require("playwright-core");
const { playAGame, DEFAULT_BASE } = require("./testkit");
const BASE = process.env.BASE || DEFAULT_BASE;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (label, cond, note = "") => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${note ? `  [${note}]` : ""}`);
  if (!cond) failures++;
};

const feedbackCount = async () => {
  /* The notes endpoint is admin-only, so count through the file the server
     writes instead - the test runner points ENT_DATA_DIR at a throwaway copy. */
  const fs = require("fs");
  const file = require("./datadir.js").resolve("feedback.json", "FEEDBACK_FILE");
  try { return (JSON.parse(fs.readFileSync(file, "utf8")).entries || []).length; } catch (_) { return 0; }
};

(async () => {
  const done = await playAGame("Ana", 2, false, { base: BASE });
  if (!done) { console.log("could not play a game out to the end"); process.exit(1); }
  console.log(`room ${done.code} finished in Q${done.st.quarter}`);

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  await ctx.addInitScript(([code, token]) => {
    localStorage.setItem("entrepreneurs_session", JSON.stringify({ code, token, seat: 0, host: true, name: "Ana" }));
    localStorage.setItem("entrepreneurs_tutorial_seen", "1");
  }, [done.code, done.token]);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(BASE, { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog", { name: /Thanks for playing|Obrigado por jogar/ });
  let shown = false;
  for (let i = 0; i < 40 && !shown; i++) { shown = (await dialog.count()) > 0; if (!shown) await sleep(250); }
  check("the player is thanked when the match ends", shown);
  if (!shown) { await browser.close(); console.log(`\n${failures + 1} check(s) failed\n`); process.exit(1); }

  check("it asks whether they liked it", /Did you enjoy it|Você gostou/.test(await page.evaluate(() => document.body.innerText)));
  check("and offers somewhere to write", (await page.locator("textarea").count()) > 0);

  /* Nothing to send yet, so sending is refused until they say something. */
  const send = page.getByRole("button", { name: /Send it|Enviar/ }).first();
  check("sending is disabled until there is something to send", await send.isDisabled().catch(() => false));

  const before = await feedbackCount();
  /* The star's label is a translated string now - "4 of 5" - rather than English
     welded into the component, so this matches what t() produces rather than what
     a template literal used to. */
  await page.getByRole("button", { name: "4 of 5" }).first().click().catch((e) => errs.push("star: " + e.message));
  await page.locator("textarea").first().fill("The tithe changed how I built. Good.");
  await sleep(200);
  const enabled = !(await send.isDisabled().catch(() => true));
  check("once they have said something, sending is offered", enabled);
  const posted = page.waitForResponse((r) => r.url().includes("/api/feedback") && r.request().method() === "POST", { timeout: 6000 }).catch(() => null);
  await send.click();
  const resp = await posted;
  check("the browser posted the note", !!resp, resp ? `HTTP ${resp.status()}` : "no request seen");
  await sleep(1200);
  const after = await feedbackCount();
  check(`the note reaches the server (${before} -> ${after})`, after === before + 1);

  /* Reload: the same match must not ask again. */
  await page.reload({ waitUntil: "domcontentloaded" });
  await sleep(2000);
  check("a reload does not ask again", (await dialog.count()) === 0);
  check("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed\n` : "\nall checks passed\n");
  process.exit(failures ? 1 : 0);
})();
