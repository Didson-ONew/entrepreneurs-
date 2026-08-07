/* Two browsers, one room. Verifies chat is delivered both ways, and that a real
   WebRTC peer connection reaches "connected" with audio tracks flowing. Chromium is
   launched with a fake microphone so getUserMedia succeeds without hardware. */
const { chromium } = require("playwright");
const URL = "http://127.0.0.1:8080/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function txt(p) { try { return await p.evaluate(() => document.body.innerText || ""); } catch { return ""; } }
async function waitText(p, re, ms = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (re.test(await txt(p))) return true; await sleep(150); }
  return false;
}

(async () => {
  const br = await chromium.launch({
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
           "--autoplay-policy=no-user-gesture-required"],
  });
  const ctxA = await br.newContext({ permissions: ["microphone"], viewport: { width: 1400, height: 950 } });
  const ctxB = await br.newContext({ permissions: ["microphone"], viewport: { width: 1400, height: 950 } });
  const A = await ctxA.newPage(), B = await ctxB.newPage();
  for (const p of [A, B]) await p.addInitScript(() => { try { localStorage.setItem("entrepreneurs_tutorial_seen", "1"); } catch (e) {} });
  const errs = [];
  A.on("pageerror", (e) => errs.push("A:" + e.message));
  B.on("pageerror", (e) => errs.push("B:" + e.message));

  // --- room ---
  await A.goto(URL); await waitText(A, /ENTREPRENEURS/);
  await A.fill('input[placeholder="Your name"]', "Ana");
  await A.getByText("1 bot", { exact: true }).click();
  await A.getByText("Create room", { exact: true }).click();
  await waitText(A, /ROOM CODE|Room code/);
  const code = (await txt(A)).match(/([0-9A-F]{6})/)[1];
  await B.goto(URL); await waitText(B, /ENTREPRENEURS/);
  await B.fill('input[placeholder="Your name"]', "Bruno");
  await B.fill('input[placeholder="ROOM CODE"]', code);
  await B.getByText("Join room", { exact: true }).click();
  await waitText(A, /Bruno/);
  console.log("room ready:", code);

  // --- chat ---
  console.log("\n=== CHAT ===");
  for (const p of [A, B]) await p.getByText(/^Table/).first().click();
  await sleep(300);
  await A.locator('input[placeholder="Message the table"]').fill("hello from Ana");
  await A.locator('input[placeholder="Message the table"]').press("Enter");
  console.log("B receives Ana's message:", await waitText(B, /hello from Ana/, 6000));
  await B.locator('input[placeholder="Message the table"]').fill("Bruno here, ready");
  await B.locator('input[placeholder="Message the table"]').press("Enter");
  console.log("A receives Bruno's reply:", await waitText(A, /Bruno here, ready/, 6000));
  const aShowsYou = /You\b[\s\S]{0,40}hello from Ana/.test(await txt(A));
  console.log("A's own message is labelled 'You':", aShowsYou);
  // chat survives into the game
  await A.getByText(/Start game/).click();
  await waitText(A, /PLANNING & ACTION TRACKS|Draft your starting/);
  await sleep(600);
  console.log("chat persists after the game starts:", /hello from Ana/.test(await txt(A)));

  // --- voice ---
  console.log("\n=== VOICE ===");
  for (const p of [A, B]) {
    const opener = p.getByText(/^Table/).first();
    if (await opener.count()) { await opener.click().catch(() => {}); await sleep(250); }
    const t = p.getByText(/^voice$/i).first();
    if (await t.count()) await t.first().click();
    await sleep(250);
  }
  await A.getByText(/Join voice call/).click();
  await sleep(600);
  await B.getByText(/Join voice call/).click();

  // wait for a real peer connection on both sides
  const connected = async (p) => await p.evaluate(async () => {
    // the app keeps its peers in closures, so probe the audio elements it created
    const els = Array.from(document.querySelectorAll("audio[data-seat]"));
    return els.some((e) => e.srcObject && e.srcObject.getAudioTracks().length > 0);
  });
  let ok = false;
  for (let i = 0; i < 40 && !ok; i++) {
    ok = (await connected(A)) && (await connected(B));
    await sleep(400);
  }
  console.log("both sides received a remote audio track:", ok);
  const aList = await txt(A);
  console.log("A lists Bruno on the call:", /ON THE CALL[\s\S]{0,80}Bruno/.test(aList));
  console.log("mute control present:", await A.getByText("Mute", { exact: true }).count() > 0);
  if (await A.getByText("Mute", { exact: true }).count()) {
    await A.getByText("Mute", { exact: true }).click(); await sleep(250);
    console.log("mute toggles:", /\(muted\)/.test(await txt(A)));
  }
  await A.getByText(/Leave call/).click(); await sleep(900);
  console.log("B sees Ana leave the call:", !/ON THE CALL[\s\S]{0,60}Ana/.test(await txt(B)));

  console.log("\npage errors:", errs.length ? errs.slice(0, 3) : "none");
  await br.close();
  process.exit(0);
})();
