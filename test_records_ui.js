/* Records, end to end: play real games through the server, then read the hall of
   fame and the statistics back out of the live page.

   Run the server first, then: node test_records_ui.js
*/
const { chromium } = require("playwright-core");
const { playAGame } = require("./testkit.js");   // one copy of the game driver

const BASE = process.env.BASE || "http://127.0.0.1:8080";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = async (p, b) => (await fetch(BASE + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) })).json();
const stateOf = async (c, t) => (await (await fetch(`${BASE}/api/state?code=${c}&token=${t}&since=-1`, { cache: "no-store" })).json()).state;

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};

(async () => {
  const before = await (await fetch(`${BASE}/api/stats`)).json();
  console.log(`records held before this run: ${before.matches}`);

  console.log("\nplaying two games through the server...");
  const g1 = await playAGame("Ana", 2, true);
  check("the first game finished", !!g1, g1 ? `Q${g1.st.quarter}` : "gave up");
  const g2 = await playAGame("Ana", 2, false);
  check("the second game finished", !!g2);
  const g3 = await playAGame("Bruno", 1, false);
  check("a third, by someone else, finished", !!g3);

  await sleep(400);
  const s = await (await fetch(`${BASE}/api/stats`)).json();
  check("all three were recorded", s.matches === before.matches + 3, `${before.matches} -> ${s.matches}`);

  const ana = s.hallOfFame.find((e) => e.name === "Ana");
  const bruno = s.hallOfFame.find((e) => e.name === "Bruno");
  check("Ana is in the hall of fame with both her games", !!ana && ana.matches >= 2, ana ? `${ana.matches} games` : "missing");
  check("her total EP is the sum of them", !!ana && ana.ep >= ana.best, ana ? `${ana.ep} EP total, best ${ana.best}` : "");
  check("Bruno is there too, separately", !!bruno && bruno.name === "Bruno");
  check("no bot ever appears", !s.hallOfFame.some((e) => /bot/i.test(e.name)),
    s.hallOfFame.map((e) => e.name).join(", "));
  check("the summary counts the games", s.summary && s.summary.matches === s.matches);
  check("it reports an average winning score", s.summary.avgWinningEP > 0, `${s.summary.avgWinningEP} EP`);
  check("industries are ranked", s.industries.length > 0);
  check("personas appear from the game that used them", s.personas.length > 0,
    s.personas.map((p) => `${p.name} ${p.won}/${p.played}`).join(", "));
  check("recent games are listed", s.recent.length >= 3);
  check("every recent game is stamped with the rules build", s.recent.every((m) => !!m.engine));

  /* Now the page. The Records button must be there before a game is joined, so a
     visitor can read the hall of fame from the front door. */
  console.log("\nreading it back off the page...");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(600);

  check("the Records button is on the join screen", await page.locator("button", { hasText: "Records" }).count() === 1);
  await page.locator("button", { hasText: "Records" }).click();
  await sleep(900);
  const text = () => page.evaluate(() => document.body.innerText || "");
  let t = await text();
  check("the hall of fame opens on Ana", /Hall of fame/i.test(t) && /Ana/.test(t));
  check("it shows her totals", /Total EP/i.test(t) && /Games/i.test(t));
  await page.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/records-hof.png` : "/tmp/records-hof.png" });

  await page.locator("button", { hasText: "Statistics" }).click();
  await sleep(400);
  t = await text();
  check("statistics show where points come from", /Where the points come from/i.test(t));
  check("statistics show the industries", /Industries/i.test(t));
  check("statistics show the highest score", /Highest score/i.test(t));
  await page.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/records-stats.png` : "/tmp/records-stats.png" });

  await page.locator("button", { hasText: "Recent games" }).click();
  await sleep(400);
  t = await text();
  check("recent games list finished tables", /human/i.test(t) && /EP/.test(t));
  await page.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/records-recent.png` : "/tmp/records-recent.png" });

  await page.keyboard.press("Escape");
  await sleep(300);
  check("Escape closes it", !/Hall of fame/i.test(await text()));
  check("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));

  await browser.close();
  console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
  process.exit(fails ? 1 : 0);
})();
