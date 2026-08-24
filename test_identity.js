/* The identity cookie: does a returning player get their name back, and is the
   cookie doing only that and nothing more?

   Run the server first, then: node test_identity.js
*/
const { chromium } = require("playwright-core");

const BASE = process.env.BASE || "http://127.0.0.1:8080";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n${t}`);

/* This test needs a name NOBODY has reserved: a registered name may only be used by
   its owner, which is exactly the rule test_accounts and the live store both exercise.
   Hard-coding a friendly name means the suite starts failing the day someone signs up
   with it, so the name is made unique per run. */
/* short, too: the solo name field caps at 16 characters and silently truncates. */
const WHO = `G${process.pid.toString(36).slice(-4)}${Date.now().toString(36).slice(-4)}`;

/* A browser keeps cookies between requests; fetch does not, so carry the jar by hand. */
function jar() {
  let cookie = "";
  return {
    get cookie() { return cookie; },
    async call(path, opts = {}) {
      const headers = { ...(opts.headers || {}) };
      if (cookie) headers.cookie = cookie;
      const r = await fetch(BASE + path, { ...opts, headers });
      const set = r.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];          // keep just name=value, like a browser would send
      return { status: r.status, setCookie: set, body: await r.json().catch(() => ({})) };
    },
  };
}
const postJSON = (b) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

(async () => {
  section("A first visit");
  const a = jar();
  const first = await a.call("/api/whoami");
  check("the server answers with an identity", !!first.body.id, first.body.id);
  check("it sets a cookie", !!first.setCookie, (first.setCookie || "").split(";")[0]);
  check("with no name yet", first.body.name === "" && first.body.returning === false);
  check("the cookie is HttpOnly", /HttpOnly/i.test(first.setCookie || ""));
  check("it is SameSite=Lax", /SameSite=Lax/i.test(first.setCookie || ""));
  check("it lasts a year", /Max-Age=31536000/.test(first.setCookie || ""));
  check("it is not marked Secure over plain http", !/;\s*Secure/i.test(first.setCookie || ""),
    "Secure is added only behind https");

  section("Playing once teaches it your name");
  const made = await a.call("/api/create", postJSON({ name: `  ${WHO}  `, bots: 1 }));
  check("a room was created", !!made.body.code, made.body.code);
  const back = await a.call("/api/whoami");
  check("the name comes back, trimmed", back.body.name === WHO, `"${back.body.name}"`);
  check("and it says this is a returning player", back.body.returning === true);
  check("the id did not change", back.body.id === first.body.id);

  section("A different browser is a different person");
  const b = jar();
  const other = await b.call("/api/whoami");
  check("it gets its own identity", other.body.id !== first.body.id);
  check("and knows no name", other.body.name === "");

  section("What the cookie will and will not accept");
  const c = jar();
  await c.call("/api/whoami");
  const long = await c.call("/api/whoami", postJSON({ name: "x".repeat(200) }));
  check("an absurd name is cut to 24 characters", long.body.name.length === 24, `${long.body.name.length} chars`);
  const spaces = await c.call("/api/whoami", postJSON({ name: "  a   b  " }));
  check("whitespace is collapsed", spaces.body.name === "a b", `"${spaces.body.name}"`);

  // a forged or corrupt cookie must read as a first visit, not crash or be trusted
  for (const junk of ["ent_player=notjson", "ent_player=%7B%22id%22%3A%22../etc%22%7D", "ent_player="]) {
    const r = await fetch(`${BASE}/api/whoami`, { headers: { cookie: junk } });
    const body = await r.json();
    check(`a corrupt cookie (${junk.slice(0, 24)}...) is treated as a first visit`,
      r.status === 200 && /^[a-f0-9]{24}$/.test(body.id) && body.name === "");
  }

  section("It grants nothing");
  /* The cookie is not signed, so it must never be what lets you act. Room membership
     still rides on the per-room token, and holding someone's cookie must not help. */
  const host = jar();
  await host.call("/api/whoami");
  const room = await host.call("/api/create", postJSON({ name: "Host", bots: 1 }));
  const thief = jar();
  // the thief copies the host's cookie exactly, but has no room token
  const stolen = await fetch(`${BASE}/api/options`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: host.cookie },
    body: JSON.stringify({ code: room.body.code, token: "not-the-real-token", personas: true }),
  });
  const stolenBody = await stolen.json();
  check("holding the cookie does not make you the host", !!stolenBody.error, stolenBody.error || "NO ERROR");
  const started = await fetch(`${BASE}/api/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: host.cookie },
    body: JSON.stringify({ code: room.body.code, token: "not-the-real-token" }),
  });
  check("nor let you start the game", !!(await started.json()).error);

  section("In a real browser");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const errs = [];
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(e.message));
  const txt = () => page.evaluate(() => document.body.innerText || "");

  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(600);
  check("the name field starts empty on a first visit",
    (await page.locator('input[placeholder="Your name"]').inputValue()) === "");

  await page.locator('input[placeholder="Your name"]').fill(WHO);
  await page.getByRole("button", { name: "Create room" }).click();
  await sleep(1200);
  check("the game was joined", /Room code/i.test(await txt()));

  // come back later: same browser, same cookie jar, fresh page load
  const page2 = await ctx.newPage();
  page2.on("pageerror", (e) => errs.push(e.message));
  await page2.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page2.goto(BASE, { waitUntil: "networkidle" });
  await sleep(900);
  const filled = await page2.locator('input[placeholder="Your name"]').inputValue();
  check("returning, the name is already filled in", filled === WHO, `"${filled}"`);
  check("and the page says so", new RegExp(`Welcome back, ${WHO}`).test(await page2.evaluate(() => document.body.innerText)));
  check("the cookie is invisible to page scripts",
    !(await page2.evaluate(() => document.cookie)).includes("ent_player"),
    await page2.evaluate(() => document.cookie || "(none)"));
  await page2.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/identity-welcome.png` : "/tmp/identity-welcome.png" });

  // typing over it wins
  await page2.locator('input[placeholder="Your name"]').fill("Someone Else");
  await sleep(200);
  check("typing over it clears the welcome", !/Welcome back/.test(await page2.evaluate(() => document.body.innerText)));

  // a private window knows nothing
  const ctx2 = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page3 = await ctx2.newPage();
  await page3.goto(BASE, { waitUntil: "networkidle" });
  await sleep(700);
  check("a fresh browser starts blank",
    (await page3.locator('input[placeholder="Your name"]').inputValue()) === "");

  section("The single-player page shares the same memory");
  /* Single player already keeps the name in localStorage, so clear it: whatever
     fills the field after that came from the cookie and nowhere else. */
  const ctx3 = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const noTutorial = () => { try { localStorage.setItem("entrepreneurs_tutorial_seen", "1"); } catch (e) {} };
  const solo = await ctx3.newPage();
  solo.on("pageerror", (e) => errs.push(e.message));
  await solo.addInitScript(noTutorial);
  await solo.goto(`${BASE}/Entrepreneurs.html`, { waitUntil: "networkidle" });
  await sleep(700);
  check("the setup screen starts empty for a stranger",
    (await solo.locator('input[placeholder="You"]').inputValue()) === "");
  await solo.locator('input[placeholder="You"]').fill(`Solo ${WHO}`);
  await solo.getByRole("button", { name: /Start Game/i }).first().click();
  await sleep(1200);

  const solo2 = await ctx3.newPage();
  solo2.on("pageerror", (e) => errs.push(e.message));
  await solo2.addInitScript(() => { try { localStorage.clear(); localStorage.setItem("entrepreneurs_tutorial_seen", "1"); } catch (e) {} });
  await solo2.goto(`${BASE}/Entrepreneurs.html`, { waitUntil: "networkidle" });
  await sleep(900);
  const soloName = await solo2.locator('input[placeholder="You"]').inputValue();
  check("starting a solo game is remembered, without localStorage", soloName === `Solo ${WHO}`, `"${soloName}"`);

  check("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  await browser.close();

  console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
  process.exit(fails ? 1 : 0);
})();
