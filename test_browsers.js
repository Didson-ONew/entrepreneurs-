/* Two independent browser windows join the same room and play a real game.
   Nothing is shared between them except the server. */
const { chromium } = require("playwright");
const URL = "http://127.0.0.1:8080/";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function txt(p) { return p.evaluate(() => document.getElementById("root").innerText); }
async function waitText(p, re, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (re.test(await txt(p))) return true; await sleep(120); }
  return false;
}

/* Play one action if this page currently has controls; returns true if it acted. */
const buyFails = new Map();   // per-page consecutive failed buy attempts
async function tryAct(p) { /* returns branch label or null */
  if (p.isClosed()) return false;
  let t;
  try { t = await txt(p); } catch { return false; }
  if (/Waiting for |Waiting on other/.test(t) && !/Draft your starting/.test(t)) return false;

  // stuck in a plot-picking mode? select an eligible plot, else back out.
  const cancel = p.getByRole("button", { name: "Cancel", exact: true });
  if (await cancel.count()) {
    if (/That action is not available/.test(t)) {
      await cancel.first().click({ timeout: 2000 }).catch(() => {});
      await sleep(120);
      const ps = p.getByText("Pass this action");
      if (await ps.count()) await ps.first().click({ timeout: 2000 }).catch(() => {});
      buyFails.set(p, 0);
      return "refusedPass";
    }
    const picked = await p.evaluate(() => {
      const d = Array.from(document.querySelectorAll("div"))
        .filter((x) => getComputedStyle(x).backgroundColor === "rgb(13, 40, 24)");
      if (!d.length) return false;
      d[0].click();
      return true;
    });
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
    if (/Waiting for .* to draft/.test(t)) return false;
    const btns = await p.locator("button").all();
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
  if (/Placing Logistic Hub/.test(t)) {
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
    const ok = await p.evaluate(() => {
      const d = Array.from(document.querySelectorAll("div")).find((x) => {
        const cs = getComputedStyle(x);
        return cs.cursor === "pointer" && cs.width === "16px";
      });
      if (d) { d.click(); return true; } return false;
    });
    if (ok) return "deliver";
    const sk = p.getByText(/Recycle remainder/);
    if (await sk.count()) { await sk.first().click({ timeout: 2500 }).catch(() => {}); return "recycle"; }
    return null;
  }
  // retail reach picker
  if (/may reach/.test(t)) {
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
    const c = p.getByRole("button", { name: "Continue" });
    if (await c.count() && await c.first().isEnabled()) { await c.first().click({ timeout: 2500 }).catch(() => {}); return "liqDone"; }
    const btns = await p.locator("button").all();
    for (const b of btns) { const bt = await b.textContent(); if (bt && /\$/.test(bt) && !(await b.isDisabled())) { await b.click({ timeout: 2500 }).catch(() => {}); return "liqSell"; } }
    return null;
  }
  // loan repayment
  if (/you may repay loan discs/.test(t)) {
    const d = p.getByRole("button", { name: "Done" });
    if (await d.count()) { await d.first().click({ timeout: 2500 }).catch(() => {}); return "repayDone"; }
    return null;
  }
  // planning
  // planning: detected by enabled track buttons rather than a text string
  for (const nm of ["M&A", "R&D", "Raise Capital"]) {
    const tb = p.getByRole("button", { name: nm, exact: true });
    if (await tb.count() && await tb.first().isEnabled().catch(() => false)) {
      await tb.first().click({ timeout: 2500 }).catch(() => {});
      return "plan";
    }
  }
  // resolving: buy land, else pass
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
  const pass = p.getByText("Pass this action");
  if (await pass.count()) { await pass.first().click({ timeout: 2500 }).catch(() => {}); buyFails.set(p, 0); return "pass"; }
  return false;
}

const T0 = Date.now();
(async () => {
  const browser = await chromium.launch();
  browser.on("disconnected", () => console.log("!! BROWSER DISCONNECTED after", Date.now() - T0, "ms"));
  const ctxA = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const ctxB = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const A = await ctxA.newPage(), B = await ctxB.newPage();
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
  console.log("Bruno sees room:", /Waiting for the host/.test(await txt(B)));
  console.log("Ana sees Bruno in the room:", /Bruno/.test(await txt(A)));

  console.log("\n=== START ===");
  await A.getByRole("button", { name: /Start game/ }).click({ timeout: 2500 }).catch(() => {});
  const started = await waitText(A, /Quarter 1 of 12|Draft your starting/, 8000)
    && await waitText(B, /Quarter 1 of 12|Draft your starting/, 8000);
  console.log("both browsers entered the game:", started);

  console.log("\n=== PLAYING ===");
  const stallDump = async () => {  // STALLDUMP
    const dbg = await fetch(`http://127.0.0.1:8080/api/debug?code=${code}`).then((r) => r.json()).catch(() => null);
    console.log("SERVER:", JSON.stringify(dbg));
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
  while (steps++ < 900) {
    if (A.isClosed() || B.isClosed()) { console.log("page closed at step", steps, "t=", Date.now() - T0); break; }
    let ta; try { ta = await txt(A); } catch (e) { console.log("txt failed at step", steps, e.message.slice(0, 60)); break; }
    if (/Game Over/.test(ta)) { console.log("Game Over reached at step", steps); break; }
    let a = null, b = null;
    try { a = await tryAct(A); } catch (e) { console.log("A err:", e.message.slice(0, 80)); }
    try { b = await tryAct(B); } catch (e) { console.log("B err:", e.message.slice(0, 80)); }
    if (a) hist["A:" + a] = (hist["A:" + a] || 0) + 1;
    if (b) hist["B:" + b] = (hist["B:" + b] || 0) + 1;
    const qm = ta.match(/Quarter (\d+) of 12/);
    const qNow = qm ? +qm[1] : 0;
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
  const q = (finalA.match(/Quarter (\d+) of 12/) || [])[1];
  console.log(`\nactions taken: ${acted} | quarter reached: ${q || "end"}`);
  console.log("A reached Game Over:", /Game Over/.test(finalA));
  console.log("B reached Game Over:", /Game Over/.test(finalB));

  // both should show the same standings
  const scoreOf = (t) => (t.match(/(\d+)\s*EP/g) || []).slice(0, 4).join(",");
  console.log("A scores:", scoreOf(finalA));
  console.log("B scores:", scoreOf(finalB));
  console.log("both browsers agree:", scoreOf(finalA) === scoreOf(finalB));
  console.log("\npage errors:", errs.length ? JSON.stringify(errs.slice(0, 4)) : "none");

  await A.screenshot({ path: "shot_online_A.png" });
  await B.screenshot({ path: "shot_online_B.png" });
  await browser.close();
})();
