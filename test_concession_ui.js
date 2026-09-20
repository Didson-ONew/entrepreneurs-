/* The Concession Holder's choice is a real prompt in the online game.

   test_concession.js proves the rule. This proves the part a player actually meets: a
   real room over HTTP, driven until the human seat holds a producing Utilities company
   and the game stops in the supplyChain phase to ask - then a browser on that seat sees
   the Concession panel, presses "Switch it on", and the server records the answer.

   Run the server first, then: node test_concession_ui.js */
const { chromium } = require("playwright-core");
const { dismissDialog } = require("./testkit");
const BASE = process.env.BASE || "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = async (p, b) => {
  const r = await fetch(BASE + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const getState = async (code, token) =>
  (await (await fetch(`${BASE}/api/state?code=${code}&token=${token}&since=-1`, { cache: "no-store" })).json()).state;

async function roomWithHolder(maxTries = 40) {
  for (let i = 0; i < maxTries; i++) {
    const c = await post("/api/create", { name: "Doc", bots: 2 });
    const { code, token } = c.body;
    await post("/api/options", { code, token, personas: true });
    await post("/api/start", { code, token });
    const st = await getState(code, token);
    if (st && st.players[0].persona === "gov_rel") return { code, token, tries: i + 1 };
  }
  return null;
}

/* Seat 0 towards a Utilities company that produces: draft UT, buy land, build. Stops
   the moment the server is waiting on seat 0 in the supplyChain phase. */
async function driveToPrompt(code, token, maxSteps = 4000) {
  const act = (action, data) => post("/api/action", { code, token, action, data });
  for (let step = 0; step < maxSteps; step++) {
    const st = await getState(code, token);
    if (!st || st.phase === "gameover") return { st, reached: false, why: "game ended" };
    const me = st.players[0];
    if (st.phase === "supplyChain" && st.awaitingPlayerId === 0) return { st, reached: true };

    if (st.phase === "drafting" && st.awaitingPlayerId === 0) {
      await act("draft", { ind: st.decks.UT.length ? "UT" : Object.keys(st.decks).find((i) => st.decks[i].length) });
    } else if (st.phase === "planning" && st.planningQueue[0] === 0) {
      const haveUt = me.hand.some((b) => b.ind === "UT");
      const wantCash = me.cash < 30;
      const order = !haveUt ? ["rd", "ma", "raise_capital"]
        : wantCash ? ["raise_capital", "ma", "rd"] : ["ma", "raise_capital", "rd"];
      const track = order.find((t) => st.tracks[t].some((x) => x === null)) || "raise_capital";
      await act("plan", { track });
    } else if (st.phase === "resolving" && st.pendingHumanAction && st.pendingHumanAction.playerId === 0) {
      const ent = st.pendingHumanAction;
      const ownedFree = Object.entries(st.board.owner).filter(([k, v]) => v === 0 && !(k in st.board.occupiedBy)).map(([k]) => k);
      const utIdx = me.hand.findIndex((b) => b.ind === "UT" && me.cash >= b.setup);
      let r = null;
      if (ent.track === "ma" && utIdx >= 0 && ownedFree.length) r = await act("act", { type: "launch", index: utIdx, footprint: [ownedFree[0]] });
      if ((!r || r.status !== 200) && ent.track === "ma") {
        const free = Object.keys(st.board.graph).find((k) => !(k in st.board.owner));
        if (free) r = await act("act", { type: "buyPlot", plot: free });
      }
      if ((!r || r.status !== 200) && ent.track === "rd" && me.hand.length < 5) r = await act("act", { type: "research", ind: "UT" });
      if ((!r || r.status !== 200) && ent.track === "raise_capital") r = await act("act", { type: "loan" });
      if (!r || r.status !== 200) await act("act", { type: "pass" });
    } else if (st.phase === "delivering" && st.awaitingPlayerId === 0) {
      await act("skipDelivery", {});
    } else if (st.phase === "liquidating" && st.awaitingPlayerId === 0) {
      await act("liquidateDone", {});
    } else if (st.phase === "repayingLoans" && st.awaitingPlayerId === 0) {
      await act("repayDone", {});
    } else if (st.phase === "placingLH" && st.turnOrder[0] === 0) {
      let placed = false;
      for (const a of Object.keys(st.board.graph)) {
        for (const b of st.board.graph[a]) {
          const ca = st.board.cellOf[a], cb = st.board.cellOf[b];
          if (ca.r === cb.r && ca.c === cb.c) continue;
          if (st.board.lhEdges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) continue;
          if ((await act("placeLH", { a, b })).status === 200) { placed = true; break; }
        }
        if (placed) break;
      }
      if (!placed) return { st, reached: false, why: "no legal hub placement" };
    } else {
      await sleep(25);
    }
  }
  return { reached: false, why: "ran out of steps" };
}

(async () => {
  let failures = 0;
  const check = (label, cond) => { console.log(`${cond ? "  ok  " : " FAIL "} ${label}`); if (!cond) failures++; };

  let room = null, out = { reached: false, why: "not tried" };
  for (let attempt = 0; attempt < 4 && !out.reached; attempt++) {
    room = await roomWithHolder();
    if (!room) { console.log("could not deal the Concession Holder in 40 rooms - giving up"); process.exit(1); }
    console.log(`room ${room.code}: seat 0 is the Concession Holder (after ${room.tries} deal${room.tries === 1 ? "" : "s"})`);
    out = await driveToPrompt(room.code, room.token);
    if (!out.reached) console.log(`  that game never asked (${out.why}) - dealing another`);
  }
  if (!out.reached) { console.log(`never reached the Concession prompt in 4 rooms: ${out.why}`); process.exit(1); }
  const { st } = out;
  console.log(`Q${st.quarter}: the server is waiting on seat 0 in the supplyChain phase`);
  check("seat 0 has a Utilities company", st.players[0].businesses.some((b) => b.bp.ind === "UT"));

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  await ctx.addInitScript(([code, token]) => {
    localStorage.setItem("entrepreneurs_session", JSON.stringify({ code, token, seat: 0, host: true, name: "Doc" }));
    localStorage.setItem("entrepreneurs_tutorial_seen", "1");
  }, [room.code, room.token]);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(BASE, { waitUntil: "domcontentloaded" });

  let seen = false;
  for (let i = 0; i < 80; i++) {
    await dismissDialog(page);
    seen = /Concession Holder — sell Utilities at \$\d+ this quarter\?/.test(await page.evaluate(() => document.body.innerText || ""));
    if (seen) break;
    await sleep(250);
  }
  check("the page shows the Concession panel on that seat", seen);
  await page.screenshot({ path: "shot_concession.png" }).catch(() => {});

  const btn = page.getByRole("button", { name: /Switch it on/ }).first();
  check("it offers a 'Switch it on' button", (await btn.count()) > 0);
  const offBtn = page.getByRole("button", { name: /Leave it off/ }).first();
  check("and a 'Leave it off' button", (await offBtn.count()) > 0);
  if (await btn.count()) await btn.click({ timeout: 5000 }).catch((e) => errs.push("click: " + e.message));
  await sleep(1200);
  const after = await getState(room.code, room.token);
  check("the server recorded the concession as on for seat 0", !!(after.concessionOn && after.concessionOn[0]));
  check("and moved on from the prompt", !(after.phase === "supplyChain" && after.awaitingPlayerId === 0));
  check("no page errors", errs.length === 0);
  if (errs.length) console.log(errs.slice(0, 3));

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed\n` : "\nall checks passed\n");
  process.exit(failures ? 1 : 0);
})();
