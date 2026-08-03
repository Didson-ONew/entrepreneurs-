/* Three independent browsers in one room: verify all three get turns, stay in sync,
   and the game advances. Plays ~2 quarters rather than a full game. */
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

async function tryAct(p) {
  const t = await txt(p);
  if (/Draft your starting Blueprints/.test(t) && !/Waiting for/.test(t)) {
    const btns = await p.locator("button").all();
    for (const b of btns) {
      const bt = await b.textContent().catch(() => null);
      if (bt && /left/.test(bt) && (await b.isEnabled().catch(() => false))) { await b.click({ timeout: 1500 }).catch(() => {}); return "draft"; }
    }
    const go = p.getByText(/Start Year 1/);
    if (await go.count() && (await go.first().isEnabled().catch(() => false))) { await go.first().click({ timeout: 1500 }).catch(() => {}); return "draftDone"; }
    return null;
  }
  if (/Placing Logistic Hub/.test(t)) {
    const ok = await p.evaluate(() => {
      const d = Array.from(document.querySelectorAll("div")).filter((x) => getComputedStyle(x).backgroundColor === "rgb(13, 40, 24)");
      if (!d.length) return false; d[0].click(); return true;
    });
    await sleep(120);
    const cf = p.getByText("Confirm placement");
    if (await cf.count() && (await cf.first().isEnabled().catch(() => false))) { await cf.first().click({ timeout: 1500 }).catch(() => {}); return "lh"; }
    if (!ok) { const rb = p.getByText("Reset selection"); if (await rb.count()) await rb.first().click({ timeout: 1500 }).catch(() => {}); }
    return null;
  }
  if (/Repay a loan|repayment/.test(t)) {
    const done = p.getByText(/Done repaying|Continue/);
    if (await done.count()) { await done.first().click({ timeout: 1500 }).catch(() => {}); return "repay"; }
  }
  if (/Pass this action/.test(t)) { await p.getByText("Pass this action").first().click({ timeout: 1500 }).catch(() => {}); return "act"; }
  if (/Skip \/ recycle rest|Recycle remainder/.test(t)) {
    const sk = p.getByText(/Skip \/ recycle rest|Recycle remainder/);
    if (await sk.count()) { await sk.first().click({ timeout: 1500 }).catch(() => {}); return "deliver"; }
  }
  const tracks = ["M&A", "R&D", "Raise Capital", "Board Meeting"];
  for (const nm of tracks) {
    const b = p.getByRole("button", { name: nm, exact: true });
    if (await b.count() && !(await b.first().isDisabled().catch(() => true))) { await b.first().click({ timeout: 1500 }).catch(() => {}); return "plan"; }
  }
  return null;
}

(async () => {
  const browser = await chromium.launch();
  const pages = [];
  const names = ["Ana", "Bruno", "Cleo"];
  const errs = [];
  for (const n of names) {
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errs.push(`${n}: ${e.message}`));
    pages.push(p);
  }
  const [A, B, C] = pages;

  await A.goto(URL); await waitText(A, /ENTREPRENEURS/);
  await A.fill('input[placeholder="Your name"]', "Ana");
  await A.getByText("0 bots", { exact: true }).click();
  await A.getByText("Create room", { exact: true }).click();
  await waitText(A, /Room code/);
  const code = (await txt(A)).match(/([0-9A-F]{6})/)[1];
  console.log("room:", code);

  for (let i = 1; i < 3; i++) {
    const p = pages[i];
    await p.goto(URL); await waitText(p, /ENTREPRENEURS/);
    await p.fill('input[placeholder="Your name"]', names[i]);
    await p.fill('input[placeholder="ROOM CODE"]', code);
    await p.getByText("Join room", { exact: true }).click();
    await waitText(p, /Room code/);
  }
  const allSeen = await waitText(A, /Cleo/);
  console.log("host sees all three players:", allSeen);

  await A.getByText(/Start game/).click();
  let entered = true;
  for (const p of pages) entered = entered && (await waitText(p, /Quarter|Draft your starting/));
  console.log("all three entered the game:", entered);

  const acted = { Ana: 0, Bruno: 0, Cleo: 0 };
  let steps = 0, quarter = 0;
  while (steps++ < 140) {
    const t = await txt(A);
    const m = t.match(/Quarter (\d+) of 12/);
    if (m) quarter = Math.max(quarter, +m[1]);
    if (quarter >= 3 || /Game Over/.test(t)) break;
    for (let i = 0; i < 3; i++) {
      const r = await tryAct(pages[i]);
      if (r) { acted[names[i]]++; await sleep(140); break; }
    }
    await sleep(60);
  }
  console.log(`reached quarter ${quarter} in ${steps} steps`);
  console.log("actions per player:", JSON.stringify(acted));
  console.log("every player got turns:", Object.values(acted).every((n) => n > 0));

  // sync check: all three show the same quarter and standings header
  const t3 = await Promise.all(pages.map(txt));
  const qs = t3.map((t) => (t.match(/Quarter (\d+) of 12/) || [])[1]);
  console.log("quarters shown:", JSON.stringify(qs), "| in sync:", qs.every((q) => q === qs[0]));
  console.log("page errors:", errs.length ? errs.slice(0, 3) : "none");
  await browser.close();
  process.exit(0);
})();
