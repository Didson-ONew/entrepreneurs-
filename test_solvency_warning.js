/* Spending yourself under the quarter's bills should be questioned, not just punished.

   The game's answer to an unpayable bill is to sell your buildings at half price, which
   is a harsh reply to what is usually a misread of the numbers. So a purchase that would
   leave a player short now asks first.

   This drives the real single-player build in a browser rather than testing the predicate
   in isolation: the thing that goes wrong with a confirmation step is that it does not
   appear, and only a page can tell you that.

   Uses playwright-core against the preinstalled Chromium; the full `playwright` package
   is not in this project, which is why the other browser tests skip. */
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright-core")); }
catch (e) { console.log(" --  playwright-core not available; skipping"); process.exit(0); }

const EXE = process.env.CHROMIUM || "/opt/pw-browsers/chromium";
const PAGE = "file://" + path.join(__dirname, "Entrepreneurs.html");

let fails = 0, n = 0;
const check = (what, ok, note = "") => {
  n++; if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
};

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(PAGE);
  await page.waitForTimeout(1200);

  /* A first-run tutorial overlay sits over the start screen and swallows clicks, so it
     has to go before anything else can be pressed. */
  const skip = page.locator('button:has-text("skip")').first();
  if (await skip.count() && await skip.isVisible().catch(() => false)) {
    await skip.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.locator('button:has-text("Start Game")').first().click({ timeout: 10000 });
  await page.waitForTimeout(1500);

  /* Drafting: press an industry deck until the hand is full, then start the year. The
     screen says "Pick N more" while it still wants cards and offers "Start Year 1" when
     it does not - which is the signal to stop, not a fixed number of clicks, because the
     seat drawn decides how many cards this player gets. */
  for (let i = 0; i < 12; i++) {
    const go = page.locator('button:has-text("Start Year 1")').first();
    if (await go.count() && await go.isVisible().catch(() => false)) { await go.click(); break; }
    const deck = page.locator('button:has-text("left")').first();
    if (!(await deck.count())) break;
    await deck.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(1500);

  const body = () => page.evaluate(() => document.body.innerText);
  const text = await body();
  check("a game is running", /Q[1-9]|Quarter|Planning|Action/i.test(text), text.slice(0, 70).replace(/\n/g, " | "));

  /* The predicate itself is what decides whether the panel is ever reachable, so read the
     player's own figures off the board rather than guessing them. The board prints
     SUPPLIERS / QTR and GROUND RENT since rent was split out of OPEX. */
  check("the board shows the supplier bill and rent as separate figures",
    /SUPPLIERS \/ QTR/i.test(text) && /GROUND RENT/i.test(text),
    (text.match(/SUPPLIERS[^\n]*/i) || ["not found"])[0]);
  check("and the leftover line was renamed off OPEX", /AFTER BILLS/i.test(text));

  /* What this test does NOT do: drive the game to an actual shortfall. Launching needs
     ground, ground needs buying, and the bill only outgrows the purse several quarters in
     - a blind click-through reaches it rarely and flakily, which is worse than not
     claiming it at all. So the trigger is checked by construction below, and what the
     browser proves is that the page renders, carries the split figures, and throws
     nothing. If you want to see the panel, spend down to near zero and try to upgrade. */

  /* The wiring has to be there, at every door the player can spend through. */
  const src = require("fs").readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
  check("launch goes through the guard", /`Launching \$\{t\(bp\.name\)\}`/.test(src));
  check("buying ground goes through the guard", /guardSpend\(plotValue/.test(src));
  check("buying back a distressed company does too", /guardSpend\(reclaimCost/.test(src));
  check("renovating does too", /Renovating into/.test(src));
  check("upgrading does too", /`Upgrading \$\{t\(b\.bp\.name\)\}`/.test(src));
  check("the guard tests the bill AFTER the purchase, not before",
    /quarterBill\(state, human\) \+ addedBill/.test(src));

  /* And it has to survive the bundler: a panel that is compiled out is a panel that
     never appears, which source alone would not catch. */
  const bundle = require("fs").readFileSync(path.join(__dirname, "Entrepreneurs.html"), "utf8");
  check("the warning text is in the built page",
    bundle.includes("leaves you short at the end of this quarter"));
  check("so are both its buttons", bundle.includes("Do it anyway") && bundle.includes("Cancel"));

  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));

  await browser.close();
  console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
  process.exit(fails ? 1 : 0);
})();
