/* Two independent browser windows join the same room and play a real game.
   Nothing is shared between them except the server. */
const { launchBrowser } = require("./testkit.js");
/* The runner picks a free port rather than assuming 8080 is idle, so read where
   the server actually is. */
const BASE = process.env.BASE || "http://127.0.0.1:8080";
const URL = BASE + "/";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* This test has hung intermittently with no output at all: the play loop's own
   stall detectors only fire between iterations, so an await that never settles is
   invisible to them. A timer on the Node side keeps running while the loop is
   blocked, so it can say which await we are parked on. */
let MARK = "boot", MARK_T = Date.now();
const mark = (m) => { MARK = m; MARK_T = Date.now(); };
setInterval(() => {
  const stuck = Date.now() - MARK_T;
  if (stuck > 6000) console.log(`!! WATCHDOG: ${Math.round(stuck / 1000)}s at "${MARK}" (t=${Math.round((Date.now() - T0) / 1000)}s)`);
}, 5000).unref();


/* This test printed its findings and never set an exit code at all, so nothing it
   discovered could fail a run. Assertions now reach the exit code; lines that are
   genuinely informational stay as console.log. */
let fails = 0;
function check(label, ok, detail) {
  if (!ok) fails++;
  console.log(" " + (ok ? "ok  " : "FAIL") + "  " + label
    + (detail !== undefined && detail !== "" ? "  [" + detail + "]" : ""));
}

async function txt(p) { return p.evaluate(() => document.getElementById("root").innerText); }
async function waitText(p, re, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (re.test(await txt(p))) return true; await sleep(120); }
  return false;
}

/* Every click in here was written `.click({timeout}).catch(() => {})` and then the
   branch returned its label regardless. So a click that never landed - the button
   covered by an overlay, say - was counted as an action: the idle counter reset, the
   stall detector never fired, and the loop span for as long as the runner allowed
   while the SERVER sat idle. Failed clicks are now visible and do not count. */
const clickFails = {};
async function click(loc, label, opts = {}) {
  try {
    await loc.click({ timeout: 2500, ...opts });
    return true;
  } catch (e) {
    clickFails[label] = (clickFails[label] || 0) + 1;
    if (clickFails[label] <= 3 || clickFails[label] % 25 === 0) {
      /* The whole message, not its first line: Playwright says WHAT intercepted the
         click several lines down ("<div ...> intercepts pointer events"), and the
         first line alone is just "Timeout 2500ms exceeded". */
      const lines = String(e.message || e).split("\n").map((l) => l.trim()).filter(Boolean);
      const why = lines.find((l) => /intercepts pointer events|not visible|outside of the viewport|detached/.test(l)) || lines[0] || "";
      console.log(`  !! click "${label}" failed (${clickFails[label]}x): ${why.slice(0, 160)}`);
      /* "<div></div> intercepts pointer events" names nothing. Ask the page what is
         actually under the button's centre and describe it - tag, class, inline
         style, size, and its parents - so the overlay can be found in the source. */
      if (clickFails[label] === 1) {
        try {
          const box = await loc.boundingBox();
          if (box) {
            const desc = await loc.page().evaluate(([x, y]) => {
              const el = document.elementFromPoint(x, y);
              const d = (e) => e ? `<${e.tagName.toLowerCase()} class="${(e.className || "").toString().slice(0, 60)}" style="${(e.getAttribute("style") || "").slice(0, 120)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)} text="${(e.textContent || "").trim().slice(0, 30)}">` : "none";
              const chain = []; let e = el;
              for (let i = 0; e && i < 4; i++) { chain.push(d(e)); e = e.parentElement; }
              return chain.join("\n        in ");
            }, [box.x + box.width / 2, box.y + box.height / 2]);
            console.log(`     under the cursor: ${desc}`);
            /* Both full-screen catchers in this UI close on click, so hitting the
               interceptor once is the same as a person clicking the dark backdrop. */
            const closed = await loc.page().evaluate(([x, y]) => {
              const el = document.elementFromPoint(x, y);
              if (!el || el.tagName !== "DIV" || el.children.length) return false;
              el.click(); return true;
            }, [box.x + box.width / 2, box.y + box.height / 2]).catch(() => false);
            if (closed) console.log("     clicked the interceptor to close it");
          }
        } catch (e2) { console.log("     (could not describe the overlay:", String(e2.message || e2).slice(0, 60) + ")"); }
      }
    }
    return false;
  }
}

/* Play one action if this page currently has controls; returns true if it acted. */
const buyFails = new Map();   // per-page consecutive failed buy attempts
/* How long each branch of tryAct spends, in total. The 420s failures turned out to
   show no stalled await at all, so the question became which branch is eating the
   clock rather than which one is stuck. */
const branchMs = {};
const timed = async (label, fn) => {
  const t = Date.now();
  try { return await fn(); } finally { branchMs[label] = (branchMs[label] || 0) + (Date.now() - t); }
};
/* A modal comes with a full-screen click-catcher, and the driver was clicking THROUGH
   it: every placement button underneath stayed enabled, every click timed out on
   "<div></div> intercepts pointer events", and the server sat idle while the loop
   looked busy. The one that bit is FinalQuarterNotice - shown to everybody the moment
   a second Megacorp calls the deadline, so late in the game and only in some games,
   which is exactly the intermittent late stall this test had. A driver has to
   acknowledge a dialog before it can do anything else, the same as a person. */
async function dismissDialog(p, who) {
  const dlg = p.getByRole("dialog").first();
  if (!(await dlg.count().catch(() => 0))) return false;
  const btn = dlg.getByRole("button").first();
  if (await btn.count().catch(() => 0)) {
    const label = ((await btn.textContent().catch(() => "")) || "").trim().slice(0, 30);
    if (await click(btn, `dialog:${label}`)) { console.log(`  ${who} dismissed a dialog: "${label}"`); await sleep(150); return true; }
  }
  return false;
}

async function tryAct(p, who) { /* returns branch label or null */
  const M = (m) => mark(who + ":" + m);
  M("start");
  if (p.isClosed()) return false;
  if (await dismissDialog(p, who)) return "dismiss";
  let t;
  try { t = await txt(p); } catch { return false; }
  if (/Waiting for |Waiting on other/.test(t) && !/Draft your starting/.test(t)) return false;

  // stuck in a plot-picking mode? select an eligible plot, else back out.
  const cancel = p.getByRole("button", { name: "Cancel", exact: true });
  M("cancel.count");
  if (await cancel.count()) {
    if (/That action is not available/.test(t)) {
      await cancel.first().click({ timeout: 2000 }).catch(() => {});
      await sleep(120);
      const ps = p.getByText("Pass this action");
      if (await ps.count()) await ps.first().click({ timeout: 2000 }).catch(() => {});
      buyFails.set(p, 0);
      return "refusedPass";
    }
    M("pickPlot.evaluate");
    const picked = await timed("scan:plot", () => p.evaluate(() => {
      const d = Array.from(document.querySelectorAll("div"))
        .filter((x) => getComputedStyle(x).backgroundColor === "rgb(13, 40, 24)");
      if (!d.length) return false;
      d[0].click();
      return true;
    }));
    await sleep(120);
    const cf = p.getByRole("button", { name: "Confirm", exact: true });
    if (picked && await cf.count() && await cf.first().isEnabled().catch(() => false)) {
      await cf.first().click({ timeout: 2500 }).catch(() => {});
      return "pickConfirm";
    }
    await cancel.first().click({ timeout: 2500 }).catch(() => {});
    return "pickCancel";
  }

  // draft
  if (/Draft your starting Blueprints/.test(t)) {
    M("draft");
    if (/Waiting for .* to draft/.test(t)) return false;
    const btns = await timed("scan:buttons", () => p.locator("button").all());
    for (const b of btns) {
      const bt = await b.textContent().catch(() => null);
      if (bt && /left/.test(bt) && (await b.isEnabled().catch(() => false))) {
        await b.click({ timeout: 2500 }).catch(() => {});
        return "draft";
      }
    }
    const go = p.getByText(/Start Year 1/);
    if (await go.count() && await go.first().isEnabled().catch(() => false)) {
      await go.first().click({ timeout: 2500 }).catch(() => {});
      return "draftStart";
    }
    return null;
  }
  // hub placement
  if (/place this quarter.s Logistic Hub/.test(t)) {
    M("hub");
    const ok = await p.evaluate(() => {
      const d = Array.from(document.querySelectorAll("div")).filter((x) => getComputedStyle(x).backgroundColor === "rgb(13, 40, 24)");
      if (!d.length) return false; d[0].click(); return true;
    });
    if (ok) return "lhPick";
    const cb = p.getByText("Confirm placement");
    if (await cb.count() && await cb.first().isEnabled()) { await cb.first().click({ timeout: 2500 }).catch(() => {}); return "lhConfirm"; }
    const rb = p.getByText("Reset selection");
    if (await rb.count()) { await rb.first().click({ timeout: 2500 }).catch(() => {}); return "lhReset"; }
    return null;
  }
  // delivery
  if (/unit\(s\) left/.test(t)) {
    M("deliver");
    const ok = await timed("scan:deliver", () => p.evaluate(() => {
      const d = Array.from(document.querySelectorAll("div")).find((x) => {
        const cs = getComputedStyle(x);
        return cs.cursor === "pointer" && cs.width === "16px";
      });
      if (d) { d.click(); return true; } return false;
    }));
    if (ok) return "deliver";
    const sk = p.getByText(/Recycle remainder/);
    if (await sk.count()) { await sk.first().click({ timeout: 2500 }).catch(() => {}); return "recycle"; }
    return null;
  }
  // retail reach picker
  if (/may reach/.test(t)) {
    M("reach");
    const btns = await p.locator("button").all();
    for (const b of btns) {
      const bt = (await b.textContent() || "").trim();
      if (/^[A-Z]{1,2}\d?$/.test(bt)) { await b.click({ timeout: 2500 }).catch(() => {}); break; }
    }
    const cf = p.getByText("Confirm reach");
    if (await cf.count() && await cf.first().isEnabled()) { await cf.first().click({ timeout: 2500 }).catch(() => {}); return "reachConfirm"; }
    return "reachPick";
  }
  // cash shortfall
  if (/Cash shortfall/.test(t)) {
    M("shortfall");
    const c = p.getByRole("button", { name: "Continue" });
    if (await c.count() && await c.first().isEnabled()) { await c.first().click({ timeout: 2500 }).catch(() => {}); return "liqDone"; }
    const btns = await p.locator("button").all();
    for (const b of btns) { const bt = await b.textContent(); if (bt && /\$/.test(bt) && !(await b.isDisabled())) { await b.click({ timeout: 2500 }).catch(() => {}); return "liqSell"; } }
    return null;
  }
  // loan repayment
  if (/you may repay loan discs/.test(t)) {
    M("repay");
    const d = p.getByRole("button", { name: "Done" });
    if (await d.count()) { await d.first().click({ timeout: 2500 }).catch(() => {}); return "repayDone"; }
    return null;
  }
  // planning
  // planning: detected by enabled track buttons rather than a text string
  M("planning");
  for (const nm of ["M&A", "R&D", "Raise Capital"]) {
    const tb = p.getByRole("button", { name: nm, exact: true });
    if (await tb.count() && await tb.first().isEnabled().catch(() => false)) {
      /* A click that did not land is not an action. Returning "plan" for one is what
         let this loop spin for four minutes against an idle server. */
      return (await click(tb.first(), "plan:" + nm)) ? "plan" : null;
    }
  }
  // resolving: buy land, else pass
  M("buy");
  const buy = p.getByRole("button", { name: "Buy", exact: true });
  if (await buy.count() && (buyFails.get(p) || 0) >= 2) {
    buyFails.set(p, 0);
    const ps = p.getByText("Pass this action");
    if (await ps.count()) { await ps.first().click({ timeout: 2000 }).catch(() => {}); return "giveUpPass"; }
  }
  if (await buy.count()) {
    await buy.first().click({ timeout: 2500 }).catch(() => {}); await sleep(150);
    const pick = p.getByText(/Pick a plot to buy/);
    if (await pick.count() && !(await pick.first().isDisabled())) {
      await pick.first().click({ timeout: 2500 }).catch(() => {}); await sleep(150);
      const ok = await p.evaluate(() => {
        const d = Array.from(document.querySelectorAll("div")).filter((x) => getComputedStyle(x).backgroundColor === "rgb(13, 40, 24)");
        if (!d.length) return false; d[0].click(); return true;
      });
      await sleep(150);
      const cf = p.getByRole("button", { name: "Confirm" });
      if (ok && await cf.count() && await cf.first().isEnabled()) { await cf.first().click({ timeout: 2500 }).catch(() => {}); buyFails.set(p, (buyFails.get(p) || 0) + 1); return "buyConfirm"; }
      const cancel = p.getByRole("button", { name: "Cancel" });
      if (await cancel.count()) await cancel.first().click({ timeout: 2500 }).catch(() => {});
      buyFails.set(p, (buyFails.get(p) || 0) + 1);
      return "buyAbort";
    }
    return "buyOpen";
  }
  M("pass");
  const pass = p.getByText("Pass this action");
  if (await pass.count()) {
    const ok = await click(pass.first(), "pass");
    buyFails.set(p, 0);
    return ok ? "pass" : null;
  }
  return false;
}

const T0 = Date.now();
(async () => {
  const browser = await launchBrowser();
  browser.on("disconnected", () => console.log("!! BROWSER DISCONNECTED after", Date.now() - T0, "ms"));
  const ctxA = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const ctxB = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const A = await ctxA.newPage(), B = await ctxB.newPage();
  // BOTH pages: a page without this flag opens the first-run tutorial, whose full-screen
  // click-catcher swallows every click and hangs the run on that player's first turn.
  for (const p of [A, B]) await p.addInitScript(() => { try { localStorage.setItem('entrepreneurs_tutorial_seen','1'); } catch(e) {} });
  const errs = [];
  A.on("pageerror", (e) => errs.push("A: " + e.message));
  B.on("pageerror", (e) => errs.push("B: " + e.message));

  console.log("=== LOBBY ===");
  await A.goto(URL); await B.goto(URL);
  await A.waitForTimeout(500);

  await A.locator('input[placeholder="Your name"]').fill("Ana");
  await A.getByText("1 bot", { exact: true }).click({ timeout: 2500 }).catch(() => {});
  await A.getByRole("button", { name: "Create room" }).click({ timeout: 2500 }).catch(() => {});
  await A.waitForTimeout(600);
  const aText = await txt(A);
  const code = (aText.match(/([0-9A-F]{6})/) || [])[1];
  console.log("Ana created room:", code);

  await B.locator('input[placeholder="Your name"]').fill("Bruno");
  await B.locator('input[placeholder="ROOM CODE"]').fill(code);
  await B.getByRole("button", { name: "Join room" }).click({ timeout: 2500 }).catch(() => {});
  await B.waitForTimeout(700);
  check("Bruno sees room", /Waiting for the host/.test(await txt(B)));
  check("Ana sees Bruno in the room", /Bruno/.test(await txt(A)));

  console.log("\n=== START ===");
  await A.getByRole("button", { name: /Start game/ }).click({ timeout: 2500 }).catch(() => {});
  const started = await waitText(A, /Quarter 1 of 12|Draft your starting/, 8000)
    && await waitText(B, /Quarter 1 of 12|Draft your starting/, 8000);
  check("both browsers entered the game", started);

  console.log("\n=== PLAYING ===");
  const stallDump = async () => {  // STALLDUMP
    const dbg = await fetch(`${BASE}/api/debug?code=${code}`).then((r) => r.json()).catch(() => null);
    console.log("SERVER:", JSON.stringify(dbg));
    /* Eight filtered lines of innerText and a truncated button list were not enough to
       say what the game was actually asking for. Keep the whole page for each browser -
       rendered HTML and a picture - so a run that reproduces can be read afterwards
       instead of being reproduced again. */
    const fs = require("fs");
    for (const [nm, P] of [["A", A], ["B", B]]) {
      const stem = `stall_${code}_${nm}`;
      try {
        fs.writeFileSync(stem + ".html", await P.content());
        await P.screenshot({ path: stem + ".png", fullPage: true });
        const full = await txt(P);
        fs.writeFileSync(stem + ".txt", full);
        console.log(`${nm}: ${full.split("\n").filter((x) => x.trim()).length} non-blank lines of text, saved ${stem}.{html,png,txt}`);
      } catch (e) { console.log(`${nm}: could not save the page -`, String(e.message || e).slice(0, 80)); }
    }
    for (const [nm, P] of [["A", A], ["B", B]]) {
      const t = await txt(P);
      console.log(`--- ${nm} sees ---`);
      console.log(t.split("\n").filter((x) => x.trim()).slice(0, 8).join(" | "));
      const btns = await P.locator("button").all(); const L = [];
      for (const b of btns) { const bt = ((await b.textContent().catch(() => "")) || "").trim();
        const en = await b.isEnabled().catch(() => false);
        if (bt && bt.length < 40) L.push((en ? "" : "[off]") + bt); }
      console.log("buttons:", JSON.stringify(L.slice(0, 16)));
    }
  };
  let steps = 0, acted = 0, idle = 0, lastQ = 0, lastQStep = 0; const hist = {};
  /* The step ceiling alone is not a bound on RUNNING TIME: a step costs a quarter of a
     second on an empty board and several seconds on a full one, so 900 steps can be a
     minute or can outlast any timeout the runner is willing to give it. A wall-clock
     deadline makes the loop end by saying what it was doing rather than by being killed
     with its output half-written. */
  const DEADLINE = parseInt(process.env.PLAY_DEADLINE_MS || "240000", 10);
  const tPlay = Date.now();
  while (steps++ < 900) {
    if (Date.now() - tPlay > DEADLINE) {
      console.log(`\n!! OUT OF TIME after ${Math.round((Date.now() - tPlay) / 1000)}s at step ${steps}, quarter ${lastQ}`);
      console.log("branch histogram:", JSON.stringify(hist));
      console.log("clicks that never landed:", JSON.stringify(clickFails));
      console.log("seconds per branch:", JSON.stringify(Object.fromEntries(
        Object.entries(branchMs).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / 1000).toFixed(1)]))));
      await stallDump();
      check("the game finished inside the time budget", false, `step ${steps}, Q${lastQ}`);
      break;
    }
    if (steps % 25 === 0) {
      const el = (Date.now() - tPlay) / 1000;
      console.log(`  ..step ${steps}  ${el.toFixed(0)}s  ${(steps / el).toFixed(1)} steps/s  Q${lastQ}`);
    }
    if (A.isClosed() || B.isClosed()) { console.log("page closed at step", steps, "t=", Date.now() - T0); break; }
    mark("loop:txt(A) step " + steps);
    let ta; try { ta = await txt(A); } catch (e) { console.log("txt failed at step", steps, e.message.slice(0, 60)); break; }
    if (/Game Over/.test(ta)) { console.log("Game Over reached at step", steps); break; }
    let a = null, b = null;
    try { a = await tryAct(A, "A"); } catch (e) { console.log("A err:", e.message.slice(0, 80)); }
    try { b = await tryAct(B, "B"); } catch (e) { console.log("B err:", e.message.slice(0, 80)); }
    if (a) hist["A:" + a] = (hist["A:" + a] || 0) + 1;
    if (b) hist["B:" + b] = (hist["B:" + b] || 0) + 1;
    /* Ask the server how far the game has got. The header always draws all four
       Q1..Q4 pills and numbers them within the year, so scraping it for a quarter
       reads "Q1" from the first pill forever and this loop cries stall at a game
       that is running perfectly well. */
    mark("loop:debug-poll step " + steps);
    const qNow = steps % 5 === 0
      ? await fetch(`${BASE}/api/debug?code=${code}`).then((r) => r.json()).then((d) => d.quarter || 0).catch(() => lastQ)
      : lastQ;
    if (qNow > lastQ) { lastQ = qNow; lastQStep = steps; console.log(`  Q${qNow} at step ${steps}`); }
    if (steps - lastQStep > 150) {
      console.log(`\n!! CHURN: quarter stuck at ${lastQ} for 150 steps`);
      console.log("branch histogram:", JSON.stringify(hist));
      await stallDump();
      process.exit(2);
    }
    if (a || b) { acted++; idle = 0; } else { idle++; }
    if (idle > 40) {
      console.log("STALLED. phase text:");
      await stallDump();
      for (const [nm, P] of [["A", A], ["B", B]]) {
        const t = await txt(P);
        console.log(`  ${nm}: ${t.split("\n").filter((x) => x.trim()).slice(0, 6).join(" | ")}`);
        const bs = await P.locator("button").all();
        const L = [];
        for (const b of bs) {
          const bt = ((await b.textContent().catch(() => "")) || "").trim();
          const en = await b.isEnabled().catch(() => false);
          if (bt && bt.length < 34) L.push((en ? "" : "[x]") + bt);
        }
        console.log(`     buttons: ${JSON.stringify(L.slice(0, 16))}`);
      }
      break;
    }
    await sleep(90);
  }

  const finalA = await txt(A), finalB = await txt(B);
  const q = await fetch(`${BASE}/api/debug?code=${code}`)
    .then((r) => r.json()).then((d) => d.quarter).catch(() => null);   // see the note above
  console.log(`\nactions taken: ${acted} | quarter reached: ${q || "end"}`);
  console.log("seconds per branch:", JSON.stringify(Object.fromEntries(
    Object.entries(branchMs).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / 1000).toFixed(1)]))));
  console.log("clicks that never landed:", JSON.stringify(clickFails));
  check("A reached Game Over", /Game Over/.test(finalA));
  check("B reached Game Over", /Game Over/.test(finalB));

  // both should show the same standings
  const scoreOf = (t) => (t.match(/(\d+)\s*EP/g) || []).slice(0, 4).join(",");
  console.log("A scores:", scoreOf(finalA));
  console.log("B scores:", scoreOf(finalB));
  check("both browsers agree", scoreOf(finalA) === scoreOf(finalB), scoreOf(finalA));
  check("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));

  await A.screenshot({ path: "shot_online_A.png" });
  await B.screenshot({ path: "shot_online_B.png" });
  await browser.close();
  console.log(fails ? "\n" + fails + " check(s) failed" : "\nall checks passed");
  process.exit(fails);
})();
