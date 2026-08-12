/* Two people who both type "Dan" share one hall-of-fame row, because the records are
   kept by name and there are no accounts. That cannot be undone afterwards, so the
   lobby warns while the name is still being typed. This checks it warns the stranger
   and not the owner.

   Run the server first, then: node test_nickname.js
*/
const matchlog = require("./matchlog.js");
const { chromium } = require("playwright-core");
const testkit = require("./testkit.js");

const BASE = process.env.BASE || "http://127.0.0.1:8080";
const sleep = testkit.sleep;

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n${t}`);

/* ---------------------------------------------- the rule, without a server */
section("Who holds a name");
{
  const rec = (name, pid) => ({ at: 1, players: [{ name, pid, human: true, ep: 10, rank: 1 }] });
  const matches = [rec("Dids", "aaa"), rec("Dids", "aaa"), rec("Mara", "bbb")];

  const mine = matchlog.nickStatus(matches, "Dids", "aaa");
  check("the player who earned it is not warned", mine.taken === false && mine.mine === true);

  const stranger = matchlog.nickStatus(matches, "Dids", "ccc");
  check("someone else is", stranger.taken === true && stranger.mine === false, `${stranger.others} other(s)`);

  check("case and spacing do not let you sneak past it",
    matchlog.nickStatus(matches, "  dids  ", "ccc").taken === true);
  check("a free name is free", matchlog.nickStatus(matches, "Nobody", "ccc").taken === false);
  check("an empty name is not a collision", matchlog.nickStatus(matches, "   ", "ccc").taken === false);

  /* Records written before browsers were identified carry no pid. Warning their owner
     that their own name is taken would be exactly backwards, so they claim nobody. */
  const legacy = [{ at: 1, players: [{ name: "Old Timer", human: true, ep: 30, rank: 1 }] }];
  check("a record with no identity claims the name for nobody",
    matchlog.nickStatus(legacy, "Old Timer", "ccc").taken === false);

  const bots = [{ at: 1, players: [{ name: "Balanced Bot", pid: null, human: false, ep: 30 }] }];
  check("bots hold no names", matchlog.nickStatus(bots, "Balanced Bot", "ccc").taken === false);

  const shared = [rec("Dids", "aaa"), rec("Dids", "zzz")];
  check("a name two people already share warns the third", matchlog.nickStatus(shared, "Dids", "ccc").others === 2);
  check("and still warns one of the two, about the other",
    matchlog.nickStatus(shared, "Dids", "aaa").taken === true
    && matchlog.nickStatus(shared, "Dids", "aaa").mine === true);
}

/* ------------------------------------------------------------ over http */
section("Asking the server");
function jar() {
  let cookie = "";
  return {
    get cookie() { return cookie; },
    async call(path, opts = {}) {
      const headers = { ...(opts.headers || {}) };
      if (cookie) headers.cookie = cookie;
      const r = await fetch(BASE + path, { ...opts, headers });
      const set = r.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];
      return { status: r.status, body: await r.json().catch(() => ({})) };
    },
  };
}
const postJSON = (b) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

(async () => {
  const nick = (jarObj, n) => jarObj.call(`/api/nickname?name=${encodeURIComponent(n)}`);

  const owner = jar();
  await owner.call("/api/whoami");
  const unused = `Nick${Math.floor(Date.now() % 100000)}`;
  const free = await nick(owner, unused);
  check("a name nobody has played under is free", free.body.taken === false && free.body.mine === false, unused);
  check("the name comes back cleaned", free.body.name === unused);

  /* The server only learns who holds a name from FINISHED games, so play one. It has
     to run under this browser's cookie, or the record would not know who sat there. */
  const cookies = testkit.jar();
  cookies.cookie = owner.cookie;
  console.log(`  ..   playing a game as "${unused}" so the name is really held`);
  const played = await testkit.playAGame(unused, 3, false, { base: BASE, jar: cookies });
  check("the game reached game over", !!played, played ? `Q${played.st.quarter}` : "gave up");
  await sleep(300);

  const owned = await nick(owner, unused);
  check("the player who earned it is still not warned", owned.body.taken === false && owned.body.mine === true);
  const strangerHttp = await nick(jar(), unused);
  check("but a different browser is warned", strangerHttp.body.taken === true, `${strangerHttp.body.others} other(s)`);

  /* ------------------------------------------------------- in the lobby */
  section("The lobby says so while you type");
  const held = { name: unused };
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(500);
  const field = page.locator('input[placeholder="Your name"]');
  const text = () => page.evaluate(() => document.body.innerText || "");

  await field.fill(`Nobody ${unused}`);
  await sleep(900);
  check("typing an unclaimed name says nothing", !/already plays as/.test(await text()));

  {
    await field.fill(held.name);
    await sleep(900);
    const body = await text();
    check("typing a name someone already holds warns you", /already plays as/.test(body), held.name);
    check("and says why", /hall-of-fame row|scores would add together/.test(body));
    await page.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/nickname-warning.png` : "/tmp/nickname-warning.png" });

    await field.fill(`${held.name} 2`);
    await sleep(900);
    check("changing it clears the warning", !/already plays as/.test(await text()));

    await field.fill(held.name);
    await sleep(900);
    check("it is a warning, not a lock - the button still works",
      await page.getByRole("button", { name: "Create room" }).isEnabled());
  }
  check("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  await browser.close();

  console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
  process.exit(fails ? 1 : 0);
})();
