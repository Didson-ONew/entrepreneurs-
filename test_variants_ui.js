/* The lobby toggles, end to end: the host sets them, a guest sees them, the game
   starts under them, and the finished game remembers which were on.

   Run the server first, then: node test_variants_ui.js
*/
const { chromium } = require("playwright-core");

const BASE = process.env.BASE || "http://127.0.0.1:8080";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = async (p, b) => (await fetch(BASE + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) })).json();
const get = async (p) => (await fetch(BASE + p, { cache: "no-store" })).json();
const lobbyOf = async (c, t) => get(`/api/state?code=${c}&token=${t}&since=-1`);

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n${t}`);

(async () => {
  section("The catalogue the lobby renders from");
  const cat = await get("/api/variants");
  check("the server publishes the variant list", Array.isArray(cat.variants) && cat.variants.length === 5,
    (cat.variants || []).map((v) => v.key).join(", "));
  check("every entry has a name and an explanation",
    cat.variants.every((v) => v.key && v.name && v.blurb));

  section("Host sets them, guest sees them");
  const host = await post("/api/create", { name: "Ana", bots: 1 });
  const guest = await post("/api/join", { code: host.code, name: "Bruno" });
  let lob = await lobbyOf(host.code, host.token);
  check("a fresh room has every variant off",
    lob.variants && Object.values(lob.variants).every((v) => v === false), JSON.stringify(lob.variants));

  const wanted = { roadHubs: true, heavyLevelEP: true, orderedDecks: true };
  const r = await post("/api/options", { code: host.code, token: host.token, variants: wanted });
  check("the host may set them", !r.error, r.error || "");
  lob = await lobbyOf(host.code, host.token);
  check("the lobby reports exactly what was set",
    lob.variants.roadHubs && lob.variants.heavyLevelEP && lob.variants.orderedDecks
    && !lob.variants.classicScoring && !lob.variants.endgameLandAwards,
    JSON.stringify(lob.variants));
  const guestView = await lobbyOf(host.code, guest.token);
  check("the guest sees the same rules", JSON.stringify(guestView.variants) === JSON.stringify(lob.variants));

  const bad = await post("/api/options", { code: host.code, token: guest.token, variants: { endgameLandAwards: true } });
  check("a guest cannot change them", !!bad.error, bad.error || "no error!");
  await post("/api/options", { code: host.code, token: host.token, variants: { nonsense: true } });
  lob = await lobbyOf(host.code, host.token);
  check("an unknown variant is ignored, not stored", !("nonsense" in lob.variants));
  check("and naming one variant does not switch the others off",
    lob.variants.roadHubs && lob.variants.heavyLevelEP && lob.variants.orderedDecks,
    JSON.stringify(lob.variants));
  await post("/api/options", { code: host.code, token: host.token, variants: { orderedDecks: false } });
  lob = await lobbyOf(host.code, host.token);
  check("a partial update changes only what it names",
    lob.variants.orderedDecks === false && lob.variants.roadHubs === true);
  await post("/api/options", { code: host.code, token: host.token, variants: { orderedDecks: true } });

  section("The game starts under them");
  await post("/api/start", { code: host.code, token: host.token });
  const st = (await lobbyOf(host.code, host.token)).state;
  check("the state carries the variants", st.variants.roadHubs === true && st.variants.heavyLevelEP === true);
  check("the board is in road-hub mode, as those variants asked", st.board.lhOnPlots === false);
  check("and the decks are ordered, as Ordered decks asked",
    Object.values(st.decks).every((d) => !d[0] || d[0].lvl === 1),
    Object.entries(st.decks).map(([k, d]) => `${k}:${d[0] ? d[0].lvl : "-"}`).join(" "));

  section("The lobby in a browser");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  const A = await ctxA.newPage(), B = await ctxB.newPage();
  const errs = [];
  for (const p of [A, B]) {
    p.on("pageerror", (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem("entrepreneurs_tutorial_seen", "1"); } catch (e) {} });
  }
  const txt = (p) => p.evaluate(() => document.body.innerText || "");

  await A.goto(BASE, { waitUntil: "networkidle" });
  await A.locator('input[placeholder="Your name"]').fill("Cara");
  await A.getByText("1 bot", { exact: true }).click();
  await A.getByRole("button", { name: "Create room" }).click();
  await sleep(900);
  const code = ((await txt(A)).match(/([0-9A-F]{6})/) || [])[1];
  check("a room was created", !!code, code);

  check("the variants are folded away by default", /Rule variants/.test(await txt(A)) && !/Hubs on the road/.test(await txt(A)));
  await A.getByText(/Rule variants/).click();
  await sleep(300);
  let t = await txt(A);
  check("opening the fold lists all five",
    ["Score at the year end", "Levels score heavy", "Ordered decks", "Hubs on the road",
     "Land awards at the end only"].every((n) => t.includes(n)));
  check("they start OFF", (t.match(/OFF/g) || []).length >= 5);

  await A.getByText("Levels score heavy").click();
  await sleep(500);
  t = await txt(A);
  check("clicking one turns it on", /Levels score heavy[\s\S]{0,20}ON/.test(t));
  check("the fold header counts what is on", /Rule variants\s*—\s*1 on/.test(t) || /1 on/.test(t));
  await A.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/variants-host.png` : "/tmp/variants-host.png" });

  // a guest joins and is told, without being able to change it
  await B.goto(BASE, { waitUntil: "networkidle" });
  await B.locator('input[placeholder="Your name"]').fill("Dev");
  await B.locator('input[placeholder="ROOM CODE"]').fill(code);
  await B.getByRole("button", { name: "Join room" }).click();
  await sleep(1200);
  const tb = await txt(B);
  check("the guest is told what the host changed", /The host changed the rules/.test(tb) && /Levels score heavy/.test(tb));
  check("the guest gets no toggles of their own", !/Rule variants/.test(tb));
  await B.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/variants-guest.png` : "/tmp/variants-guest.png" });

  check("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  await browser.close();

  section("A finished game remembers them");
  const solo = await post("/api/create", { name: "Eve", bots: 1 });
  await post("/api/options", { code: solo.code, token: solo.token, variants: { endgameLandAwards: true, orderedDecks: true } });
  await post("/api/start", { code: solo.code, token: solo.token });
  const act = (action, data) => post("/api/action", { code: solo.code, token: solo.token, action, data });
  for (let i = 0; i < 3000; i++) {
    const s = (await lobbyOf(solo.code, solo.token)).state;
    if (!s || s.phase === "gameover") break;
    if (s.phase === "drafting" && s.awaitingPlayerId === 0) await act("draft", { ind: Object.keys(s.decks).find((k) => s.decks[k].length) });
    else if (s.phase === "planning" && s.planningQueue[0] === 0) await act("plan", { track: ["ma", "rd", "raise_capital"].find((k) => s.tracks[k].some((x) => x === null)) || "raise_capital" });
    else if (s.phase === "resolving" && s.pendingHumanAction && s.pendingHumanAction.playerId === 0) await act("act", { type: "pass" });
    else if (s.phase === "delivering" && s.awaitingPlayerId === 0) await act("skipDelivery", {});
    else if (s.phase === "liquidating" && s.awaitingPlayerId === 0) await act("liquidateDone", {});
    else if (s.phase === "repayingLoans" && s.awaitingPlayerId === 0) await act("repayDone", {});
    else if (s.phase === "placingLH" && s.turnOrder[0] === 0) {
      let done = false;
      for (const a of Object.keys(s.board.graph)) {
        if ((await act("placeLH", { a, b: null })).error === undefined) { done = true; break; }
        for (const b2 of s.board.graph[a]) {
          if ((await act("placeLH", { a, b: b2 })).error === undefined) { done = true; break; }
        }
        if (done) break;
      }
      if (!done) break;
    } else await sleep(20);
  }
  await sleep(400);
  const stats = await get("/api/stats");
  const last = stats.recent[0];
  check("the finished game names the variants it used",
    last && Array.isArray(last.variants) && last.variants.includes("endgameLandAwards") && last.variants.includes("orderedDecks"),
    last ? JSON.stringify(last.variants) : "no game recorded");

  console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
  process.exit(fails ? 1 : 0);
})();
