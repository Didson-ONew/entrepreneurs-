/* The Public Health Director persona, end to end through the real interface.

   test_preventive.js proves the rule itself. This proves the part that was actually
   broken: that the demand grid a human clicks offers those extra columns. It drives a
   real online game over HTTP until a preventive player's level-1 clinic is delivering,
   then opens a browser on that seat and counts the cells the page marks clickable.

   Run the server first, then: node test_preventive_ui.js
*/
const { chromium } = require("playwright-core");

const BASE = process.env.BASE || "http://127.0.0.1:8080";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = async (p, b) => {
  const r = await fetch(BASE + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const getState = async (code, token) =>
  (await (await fetch(`${BASE}/api/state?code=${code}&token=${token}&since=-1`, { cache: "no-store" })).json()).state;

const HOME = (st, biz) => new Set(biz.footprint.map((pk) => { const c = st.board.cellOf[pk]; return `${c.r},${c.c}`; }));

/* Start rooms until the human seat is dealt the Public Health Director. Personas are
   dealt at random from six, so this is a handful of tries. */
async function roomWithPreventive(maxTries = 40) {
  for (let i = 0; i < maxTries; i++) {
    const c = await post("/api/create", { name: "Doc", bots: 2 });
    const { code, token } = c.body;
    await post("/api/options", { code, token, personas: true });
    await post("/api/start", { code, token });
    const st = await getState(code, token);
    if (st && st.players[0].persona === "preventive") return { code, token, tries: i + 1 };
  }
  return null;
}

/* Play seat 0 towards a Healthcare clinic that can actually sell: land first, in a
   district that carries a Healthcare row, then build the HC blueprint on it. */
async function driveToHcDelivery(code, token, maxSteps = 4000) {
  const act = (action, data) => post("/api/action", { code, token, action, data });
  for (let step = 0; step < maxSteps; step++) {
    const st = await getState(code, token);
    if (!st || st.phase === "gameover") return { st, reached: false, why: "game ended" };
    const me = st.players[0];

    if (st.phase === "delivering" && st.awaitingPlayerId === 0) {
      const biz = me.businesses.find((b) => b.id === st.deliveringBizId);
      // wait for a clinic that still has an open Healthcare row to sell into
      const openBeyond = biz && biz.bp.ind === "HC" && [...HOME(st, biz)].some((tk) => {
        const t = st.demand.tiles[tk];
        return t && t.rows.some((ind, ri) => ind === "HC" && (ri < 2 || st.quarter > 4)
          && t.filled[ri].some((f, li) => !f && li >= biz.level));
      });
      if (openBeyond) return { st, biz, reached: true };
      await act("skipDelivery", {});
      continue;
    }

    /* Only a district whose Healthcare row is actually open is any use: rows 3 and 4
       stay locked until Q5, and the persona can only show itself where there are
       columns to reach. */
    const hcTiles = Object.keys(st.demand.tiles).filter((k) =>
      st.demand.tiles[k].rows.some((ind, ri) => ind === "HC" && (ri < 2 || st.quarter > 4)));

    if (st.phase === "drafting" && st.awaitingPlayerId === 0) {
      await act("draft", { ind: st.decks.HC.length ? "HC" : Object.keys(st.decks).find((i) => st.decks[i].length) });
    } else if (st.phase === "planning" && st.planningQueue[0] === 0) {
      const haveHc = me.hand.some((b) => b.ind === "HC");
      const wantCash = me.cash < 30;
      const order = !haveHc ? ["rd", "ma", "raise_capital"]
        : wantCash ? ["raise_capital", "ma", "rd"] : ["ma", "raise_capital", "rd"];
      const track = order.find((t) => st.tracks[t].some((x) => x === null)) || "raise_capital";
      await act("plan", { track });
    } else if (st.phase === "resolving" && st.pendingHumanAction && st.pendingHumanAction.playerId === 0) {
      const ent = st.pendingHumanAction;
      const ownedFreeHc = Object.entries(st.board.owner)
        .filter(([k, v]) => v === 0 && !(k in st.board.occupiedBy))
        .map(([k]) => k)
        .filter((k) => { const c = st.board.cellOf[k]; return hcTiles.includes(`${c.r},${c.c}`); });
      const hcIdx = me.hand.findIndex((b) => b.ind === "HC" && me.cash >= b.setup);
      let r = null;
      if (ent.track === "ma" && hcIdx >= 0 && ownedFreeHc.length) {
        r = await act("act", { type: "launch", index: hcIdx, footprint: [ownedFreeHc[0]] });   // HC is vertical: one plot
      }
      if ((!r || r.status !== 200) && ent.track === "ma") {
        const target = Object.keys(st.board.graph)
          .filter((k) => !(k in st.board.owner))
          .find((k) => { const c = st.board.cellOf[k]; return hcTiles.includes(`${c.r},${c.c}`); });
        if (target) r = await act("act", { type: "buyPlot", plot: target });
      }
      if ((!r || r.status !== 200) && ent.track === "rd" && me.hand.length < 5) {
        r = await act("act", { type: "research", ind: "HC" });
      }
      if ((!r || r.status !== 200) && ent.track === "raise_capital") r = await act("act", { type: "loan" });
      if (!r || r.status !== 200) await act("act", { type: "pass" });
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
      await sleep(25);   // a bot's turn, or the server is resolving
    }
  }
  return { reached: false, why: "ran out of steps" };
}

(async () => {
  let failures = 0;
  const check = (label, cond) => { console.log(`${cond ? "  ok  " : " FAIL "} ${label}`); if (!cond) failures++; };

  const room = await roomWithPreventive();
  if (!room) { console.log("could not deal the Public Health Director in 40 rooms - giving up"); process.exit(1); }
  console.log(`room ${room.code}: seat 0 is the Public Health Director (after ${room.tries} deal${room.tries === 1 ? "" : "s"})`);

  const out = await driveToHcDelivery(room.code, room.token);
  if (!out.reached) { console.log(`could not reach a Healthcare delivery: ${out.why}`); process.exit(1); }
  const { st, biz } = out;
  console.log(`delivering ${biz.bp.name} (HC level ${biz.level}) in Q${st.quarter}`);
  check("the clinic really is below level 4 - so the persona has something to give", biz.level < 4);

  /* Now look at what the page offers. Anything the grid marks clickable carries a
     white border and a pointer cursor; the cells are 16px wide. */
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

  let onDeliveryScreen = false;
  for (let i = 0; i < 80; i++) {
    onDeliveryScreen = /unit\(s\) left/.test(await page.evaluate(() => document.body.innerText || ""));
    if (onDeliveryScreen) break;
    await sleep(250);
  }
  check("the browser reached the delivery screen on that seat", onDeliveryScreen);

  const clickable = await page.evaluate(() => {
    let n = 0;
    for (const d of document.querySelectorAll("div")) {
      const cs = getComputedStyle(d);
      if (cs.width !== "16px" || cs.cursor !== "pointer") continue;
      if (!cs.borderColor.includes("255, 255, 255")) continue;   // white ring = own-industry slot
      n++;
    }
    return n;
  });
  console.log(`the page offers ${clickable} clickable Healthcare cell(s)`);

  /* Without the persona a level-N clinic reaches N columns per reachable district.
     With it, it reaches all four - so more cells are on offer than the level allows. */
  const homeTiles = [...HOME(st, biz)];
  const openWithinLevel = homeTiles.reduce((acc, tk) => {
    const t = st.demand.tiles[tk];
    let k = 0;
    t.rows.forEach((ind, ri) => {
      if (ind !== "HC" || (ri >= 2 && st.quarter <= 4)) return;
      for (let li = 0; li < biz.level; li++) if (!t.filled[ri][li]) k++;
    });
    return acc + k;
  }, 0);
  console.log(`its own district(s) offer ${openWithinLevel} cell(s) within its level`);
  check("the page offers cells beyond the clinic's own level - the persona is live in the UI",
    clickable > openWithinLevel);

  // and one of them can actually be clicked through to a sale
  const cashBefore = st.players[0].cash;
  await page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      const cs = getComputedStyle(d);
      if (cs.width === "16px" && cs.cursor === "pointer" && cs.borderColor.includes("255, 255, 255")) { d.click(); return; }
    }
  });
  await sleep(1200);
  const after = await getState(room.code, room.token);
  check(`clicking one sold something (cash $${Math.round(cashBefore)} -> $${Math.round(after.players[0].cash)})`,
    after.players[0].cash > cashBefore);
  check("no page errors", errs.length === 0);
  if (errs.length) console.log(errs.slice(0, 3));

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed\n` : "\nall checks passed\n");
  process.exit(failures ? 1 : 0);
})();
