/* Searching the rules, and being able to read what comes back.

   The report was "the search box is not searching anything - I searched rent, technology
   and it brings nothing". The search itself turned out to be fine; what was broken was
   everything around it:

     - the contents column is a fixed 196px, which is half a phone, so the rules rendered
       in a ~180px gutter three words to a line with the tables clipped off the side;
     - filtering left the reading pane at whatever scroll offset it already had, in a now
       much shorter document, so the matches could sit above the fold.

   Both are checked here, at phone width, because at desk width neither shows.

   Uses playwright-core against the preinstalled Chromium. */
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright-core")); }
catch (e) { console.log(" --  playwright-core not available; skipping"); process.exit(0); }
const EXE = process.env.CHROMIUM || "/opt/pw-browsers/chromium";

let fails = 0, n = 0;
const check = (what, ok, note = "") => {
  n++; if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
};
const section = (t) => console.log(`\n${t}`);

async function openBook(browser, file, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("file://" + path.join(__dirname, file));
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("skip")').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);
  await page.locator('button:has-text("Rulebook")').first().click({ timeout: 8000 });
  await page.waitForTimeout(800);
  return { page, errors };
}
const secCount = (page) => page.evaluate(() => document.querySelectorAll("[data-sec]").length);

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });

  section("The search finds the words a player would actually type");
  const { page, errors } = await openBook(browser, "online.html", 1400, 1000);
  {
    const all = await secCount(page);
    check("the whole book is there to begin with", all > 10, `${all} sections`);

    const box = page.locator('input[placeholder*="Search"]').first();
    check("there is a search box", await box.count() === 1);

    for (const [word, atLeast] of [["rent", 2], ["technology", 2], ["opex", 1], ["megacorp", 2]]) {
      await box.fill("");
      await box.type(word, { delay: 30 });
      await page.waitForTimeout(400);
      const hits = await secCount(page);
      const emptyMsg = await page.evaluate(() => document.body.innerText.includes("Nothing matches that"));
      check(`"${word}" finds something`, hits >= atLeast && !emptyMsg, `${hits} sections`);
    }

    await box.fill("");
    await box.type("zzzznotaword", { delay: 20 });
    await page.waitForTimeout(400);
    check("and a word that is genuinely absent says so",
      await page.evaluate(() => document.body.innerText.includes("Nothing matches that")));
  }

  section("Filtering puts you at the top of what it found");
  {
    const box = page.locator('input[placeholder*="Search"]').first();
    await box.fill("");
    await page.waitForTimeout(300);
    /* read down the book the way a player would, then search from there */
    const scrolled = await page.evaluate(() => {
      const pane = [...document.querySelectorAll("div")]
        .find((d) => d.scrollHeight > d.clientHeight + 100 && d.querySelector("[data-sec]"));
      if (!pane) return -1;
      pane.scrollTop = Math.min(1500, pane.scrollHeight - pane.clientHeight);
      return Math.round(pane.scrollTop);
    });
    check("scrolled down into the book first", scrolled > 100, `${scrolled}px`);

    await box.type("rent", { delay: 30 });
    await page.waitForTimeout(500);
    const top = await page.evaluate(() => {
      const pane = [...document.querySelectorAll("div")].find((d) => d.querySelector("[data-sec]") && d.scrollTop !== undefined && d.className === "");
      const first = document.querySelector("[data-sec]");
      return first ? Math.round(first.getBoundingClientRect().top) : -9999;
    });
    check("the first match is on screen, not scrolled past", top > -50 && top < 900, `${top}px from the top`);
  }
  await page.close();

  section("On a phone the rules get the screen, not a 180px gutter");
  {
    const { page: ph, errors: phErr } = await openBook(browser, "online.html", 390, 850);
    const layout = await ph.evaluate(() => {
      const toc = document.querySelector(".rb-toc");
      const panes = document.querySelector(".rb-panes");
      const body = [...document.querySelectorAll("div")].find((d) => d.querySelector("[data-sec]"));
      const sec = document.querySelector("[data-sec]");
      return {
        tocW: toc ? Math.round(toc.getBoundingClientRect().width) : -1,
        stacked: panes ? getComputedStyle(panes).flexDirection : "?",
        readW: sec ? Math.round(sec.getBoundingClientRect().width) : -1,
      };
    });
    check("the contents list is stacked above, not beside", layout.stacked === "column", layout.stacked);
    check("so the rules are readable width, not a gutter", layout.readW > 260,
      `${layout.readW}px of a 390px screen`);
    check("no page errors on the phone layout", phErr.length === 0, phErr.slice(0, 1).join(""));

    /* A header cell that cannot wrap sets its column's minimum width and drags the table
       off the side - which is how the glossary first rendered. A genuinely wide table (the
       Megacorp tiers have five columns) is allowed to be wider than the screen PROVIDED it
       sits in a container that scrolls; what must never happen is the book itself sliding
       sideways. So check the invariant, not the symptom. */
    const overflow = await ph.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      const loose = [...document.querySelectorAll("table")].filter((t) => {
        const box = t.parentElement;
        const scrolls = box && /auto|scroll/.test(getComputedStyle(box).overflowX);
        return !scrolls && t.getBoundingClientRect().width > box.clientWidth + 2;
      }).length;
      return {
        tables: document.querySelectorAll("table").length,
        loose,
        dialogSlides: dlg ? dlg.scrollWidth > dlg.clientWidth + 2 : true,
      };
    });
    check("the book itself does not scroll sideways", !overflow.dialogSlides);
    check("and every over-wide table is in a container that scrolls",
      overflow.loose === 0, `${overflow.loose} of ${overflow.tables} escape their box`);

    section("The glossary");
    const box2 = ph.locator('input[placeholder*="Search"]').first();
    await box2.fill("");
    await box2.type("OPEX", { delay: 30 });
    await ph.waitForTimeout(500);
    const gl = await ph.evaluate(() => document.body.innerText);
    check("the glossary is findable by a term it defines", /The words on the board/.test(gl));
    check("and gives the real-world meaning", /Operating expenditure/.test(gl));
    check("the designer's commentary stays out of the player's book",
      !/load-bearing, not flavour/.test(gl));
    await ph.close();
  }

  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await browser.close();
  console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
  process.exit(fails ? 1 : 0);
})();
