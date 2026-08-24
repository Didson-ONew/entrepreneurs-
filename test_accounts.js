/* The login system. Two questions run through all of it:

     does it do what it promises - a registered name can only be played by its owner;
     does it refuse everything else - forged sessions, guessed passwords, reused
     reset links, and a stranger claiming a name that is already someone's.

   Run the server first, then: node test_accounts.js
   The server must be started with ACCOUNTS_FILE pointing somewhere disposable.
*/
const accounts = require("./accounts.js");
const mailer = require("./mailer.js");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
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

/* A browser-like cookie jar: several cookies, sent back together. */
function jar() {
  const store = new Map();
  return {
    header() { return [...store].map(([k, v]) => `${k}=${v}`).join("; "); },
    get(k) { return store.get(k); },
    take(res) {
      const raw = typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [res.headers.get("set-cookie")].filter(Boolean);
      for (const line of raw) {
        for (const one of splitCookies(line)) {
          const [pair] = one.split(";");
          const i = pair.indexOf("=");
          if (i < 0) continue;
          const k = pair.slice(0, i).trim();
          const v = pair.slice(i + 1).trim();
          if (v === "") store.delete(k); else store.set(k, v);
        }
      }
    },
    async call(p, opts = {}) {
      const headers = { ...(opts.headers || {}) };
      const c = this.header();
      if (c) headers.cookie = c;
      const r = await fetch(BASE + p, { ...opts, headers });
      this.take(r);
      return { status: r.status, body: await r.json().catch(() => ({})) };
    },
    post(p, b) { return this.call(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }); },
  };
}
/* Node may fold several Set-Cookie headers into one string; Expires holds a comma. */
function splitCookies(line) {
  return String(line || "").split(/,(?=[^;,]+?=)/).map((s) => s.trim()).filter(Boolean);
}

const uniq = () => crypto.randomBytes(4).toString("hex");

/* ==================================================== the store, on its own */
section("Passwords");
(async () => {
  const pw = await accounts.hashPassword("correct horse battery");
  check("the password is not stored", !JSON.stringify(pw).includes("correct horse"));
  check("nor is it recoverable from the hash", pw.hash.length === 128 && /^[a-f0-9]+$/.test(pw.hash));
  check("the right password verifies", await accounts.checkPassword("correct horse battery", pw));
  check("a wrong one does not", !(await accounts.checkPassword("correct horse batterz", pw)));

  const pw2 = await accounts.hashPassword("correct horse battery");
  check("two accounts with the same password get different hashes", pw.hash !== pw2.hash, "salted");

  check("a short password is refused", !!accounts.passwordProblem("short"));
  check("an absurd one is too", !!accounts.passwordProblem("x".repeat(500)), "scrypt cost is unbounded otherwise");
  check("a reasonable one is accepted", accounts.passwordProblem("eight is enough") === null);

  section("Sessions are signed");
  const store = accounts.emptyStore();
  const r = await accounts.register(store, { name: "Dids", email: "d@example.com", password: "eight is enough", pid: "p1", heldBy: [], question: "street", answer: "Baker Street" });
  check("registering works", !!r.user, r.error);
  const tok = accounts.signSession(store, r.user.id);
  check("a real session reads back", accounts.readSession(store, tok) === r.user.id);
  check("a tampered signature does not", accounts.readSession(store, `${tok.slice(0, -3)}aaa`) === null);
  check("a tampered body does not", accounts.readSession(store, `x${tok}`) === null);
  check("nor does one signed with another server's secret",
    accounts.readSession(accounts.emptyStore(), tok) === null, "the secret is what makes it an authority");
  const expired = accounts.signSession(store, r.user.id, -1);
  check("an expired session is refused", accounts.readSession(store, expired) === null);
  check("junk is refused rather than throwing", accounts.readSession(store, "nonsense") === null);

  section("Claiming a name");
  const dup = await accounts.register(store, { name: "dids", email: "other@example.com", password: "eight is enough", pid: "p2", heldBy: [], question: "street", answer: "Baker Street" });
  check("the same name cannot be registered twice", !!dup.error, dup.error);
  const dupMail = await accounts.register(store, { name: "Someone", email: "D@Example.com", password: "eight is enough", pid: "p2", heldBy: [], question: "street", answer: "Baker Street" });
  check("nor the same email", !!dupMail.error, dupMail.error);

  /* The interesting case: a name that is not registered but IS in the records. */
  const grab = await accounts.register(store, { name: "Mara", email: "m@example.com", password: "eight is enough", pid: "stranger", heldBy: ["someone-else"], question: "street", answer: "Baker Street" });
  check("a stranger cannot claim a name others have played under", !!grab.error, grab.error);
  const rightful = await accounts.register(store, { name: "Mara", email: "m@example.com", password: "eight is enough", pid: "mara-browser", heldBy: ["mara-browser"], question: "street", answer: "Baker Street" });
  check("but the player who has been using it can", !!rightful.user);

  section("Signing in");
  const wrong = await accounts.login(store, { name: "Dids", password: "not it" });
  const missing = await accounts.login(store, { name: "Nobody At All", password: "not it" });
  check("a wrong password is refused", !!wrong.error);
  check("an unknown name gives the SAME answer", missing.error === wrong.error,
    "otherwise the form tells you who has an account");
  check("the right password works", !!(await accounts.login(store, { name: "DIDS", password: "eight is enough" })).user);

  section("Forgotten passwords");
  const started = accounts.startReset(store, "d@example.com");
  check("a reset can be started by email", !!started, started && started.user.name);
  check("and by name", !!accounts.startReset(store, "Dids"));
  check("the token itself is not stored", JSON.stringify(store).indexOf(started.token) === -1,
    "only its hash, so a stolen accounts.json is not a set of reset links");
  check("an unknown address quietly does nothing", accounts.startReset(store, "nobody@example.com") === null);

  const fresh = accounts.startReset(store, "Dids");
  check("the link identifies its owner", accounts.resetOwner(store, fresh.token).id === r.user.id);
  check("a made-up token does not", accounts.resetOwner(store, "deadbeef") === null);
  const used = await accounts.finishReset(store, fresh.token, "a whole new password");
  check("resetting sets the password", !!used.user);
  check("the new password works", !!(await accounts.login(store, { name: "Dids", password: "a whole new password" })).user);
  check("the old one no longer does", !!(await accounts.login(store, { name: "Dids", password: "eight is enough" })).error);
  const again = await accounts.finishReset(store, fresh.token, "third password here");
  check("the same link cannot be used twice", !!again.error, again.error);

  const stale = accounts.startReset(store, "Dids");
  stale.user.reset.exp = Date.now() - 1000;
  check("an expired link is refused", accounts.resetOwner(store, stale.token) === null);

  section("The file on disk");
  const tmp = path.join(os.tmpdir(), `acc-${uniq()}.json`);
  accounts.save(store, tmp);
  const reread = accounts.load(tmp);
  check("it survives a round trip", reread.users.length === store.users.length);
  check("the signing secret survives too, so a restart does not sign everyone out",
    reread.secret === store.secret);
  const mode = fs.statSync(tmp).mode & 0o777;
  check("it is not world-readable", (mode & 0o077) === 0, `mode ${mode.toString(8)}`);
  fs.writeFileSync(tmp, "{ this is not json");
  let threw = false;
  try { accounts.load(tmp); } catch (_) { threw = true; }
  check("a corrupt file refuses to load rather than wiping everyone", threw);
  fs.unlinkSync(tmp);

  /* ============================================================ over http */
  section("The server enforces it");
  const owner = jar();
  const nm = `Owner${uniq()}`;
  const reg = await owner.post("/api/register", { name: nm, email: `${nm}@example.com`, password: "eight is enough",
    question: "street", answer: "Baker Street" });
  check("an account can be registered", !!reg.body.user, reg.body.error);
  check("registering signs you in", !!owner.get("ent_session"));
  const who = await owner.call("/api/account");
  check("and the server agrees", who.body.user && who.body.user.name === nm);

  const weak = await jar().post("/api/register", { name: `W${uniq()}`, email: `w${uniq()}@example.com`, password: "short",
    question: "street", answer: "Baker Street" });
  check("a weak password is refused", !!weak.body.error, weak.body.error);
  const noMail = await jar().post("/api/register", { name: `M${uniq()}`, email: "not-an-address", password: "eight is enough",
    question: "street", answer: "Baker Street" });
  check("a nonsense email is refused", !!noMail.body.error, noMail.body.error);

  const stranger = jar();
  await stranger.call("/api/account");
  const stolen = await stranger.post("/api/create", { name: nm, bots: 1 });
  check("a stranger cannot create a room under a registered name",
    stolen.status === 403 && !!stolen.body.error, stolen.body.error);

  const mine = await owner.post("/api/create", { name: nm, bots: 1 });
  check("its owner can", !!mine.body.code, mine.body.code || mine.body.error);

  const joinAttempt = await stranger.post("/api/join", { code: mine.body.code, name: nm });
  check("nor join one", joinAttempt.status === 403, joinAttempt.body.error);
  const guestJoin = await stranger.post("/api/join", { code: mine.body.code, name: `Guest${uniq()}` });
  check("but a guest under a free name still plays, exactly as before", !!guestJoin.body.token);

  section("A forged session grants nothing");
  const forger = jar();
  await forger.call("/api/account");
  const real = owner.get("ent_session");
  for (const [label, value] of [
    ["a signature changed by one character", `${real.slice(0, -3)}aaa`],
    ["a body swapped for another", `${Buffer.from(JSON.stringify({ u: "whatever", e: Date.now() + 1e6 })).toString("base64url")}.${real.split(".")[1]}`],
    ["something that is not a session at all", "hello"],
  ]) {
    const r2 = await fetch(`${BASE}/api/account`, { headers: { cookie: `ent_session=${value}` } });
    const b2 = await r2.json();
    check(`${label} is nobody`, b2.user === null, JSON.stringify(b2.user));
  }
  const withForged = await fetch(`${BASE}/api/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: `ent_session=${real.slice(0, -3)}aaa` },
    body: JSON.stringify({ name: nm, bots: 1 }),
  });
  check("and cannot take the registered name", withForged.status === 403);

  section("Signing out");
  await owner.post("/api/logout", {});
  const after = await owner.call("/api/account");
  check("the session is gone", after.body.user === null);
  const lockedOut = await owner.post("/api/create", { name: nm, bots: 1 });
  check("and the name is now refused, even to its owner", lockedOut.status === 403);
  const backIn = await owner.post("/api/login", { name: nm, password: "eight is enough" });
  check("signing back in restores it", !!backIn.body.user);
  check("and the room can be created again", !!(await owner.post("/api/create", { name: nm, bots: 1 })).body.code);

  section("Resetting a password through the server");
  /* The mail is delivered by whatever the host configured; in this test the server
     runs in console mode, so read the token out of the store the server writes. */
  const forgot = await jar().post("/api/forgot", { who: `${nm}@example.com` });
  check("the request is accepted", forgot.body.ok === true);
  const unknown = await jar().post("/api/forgot", { who: "nobody-at-all@example.com" });
  check("an unknown address gets the same answer", unknown.body.sent === forgot.body.sent,
    "otherwise this form lists who has an account");

  /* the store lives wherever datadir puts it, which is not beside server.js any more */
  const file = require("./datadir.js").resolve("accounts.json", "ACCOUNTS_FILE");
  const onDisk = JSON.parse(fs.readFileSync(file, "utf8"));
  const rec = onDisk.users.find((x) => x.nameKey === nm.toLowerCase());
  check("the server stored a reset request", !!(rec && rec.reset));
  check("but stored the hash, not the link", !!(rec && rec.reset && rec.reset.hash.length === 64));

  const badToken = await jar().post("/api/reset", { token: "not-a-real-token", password: "brand new password" });
  check("a made-up reset token is refused", !!badToken.body.error, badToken.body.error);

  section("Delivering the link");
  /* The reset mail goes wherever the host points it. Prove the webhook backend by
     pointing it at a listener here and catching the message. */
  let caught = null;
  const sink = http.createServer((rq, rs) => {
    let raw = "";
    rq.on("data", (d) => { raw += d; });
    rq.on("end", () => { caught = JSON.parse(raw || "{}"); rs.writeHead(200); rs.end("{}"); });
  });
  await new Promise((r2) => sink.listen(0, "127.0.0.1", r2));
  const port = sink.address().port;
  const cfg = { from: "games@example.com", webhook: `http://127.0.0.1:${port}/send`, webhookAuth: "", command: "", mode: "webhook" };
  const sent = await mailer.send(mailer.resetMessage({ to: "someone@example.com", name: "Dids", link: "https://example.com/?reset=abc", minutes: 60 }), cfg);
  check("the webhook backend delivers", sent.ok === true && sent.via === "webhook", sent.error);
  check("the message carries the link", !!caught && caught.text.includes("https://example.com/?reset=abc"));
  check("addressed to the right person", !!caught && caught.to === "someone@example.com");
  sink.close();

  const dead = await mailer.send({ to: "x@example.com", subject: "s", text: "t" },
    { ...cfg, webhook: "http://127.0.0.1:1/none" });
  check("a mail server that is down is reported, not thrown", dead.ok === false && !!dead.error);

  const outFile = path.join(os.tmpdir(), `mail-${uniq()}.txt`);
  const viaCmd = await mailer.send({ to: "x@example.com", subject: "Reset", text: "the link" },
    { from: "games@example.com", webhook: "", webhookAuth: "", command: `cat > ${outFile}`, mode: "command" });
  check("the command backend delivers", viaCmd.ok === true, viaCmd.error);
  const written = fs.readFileSync(outFile, "utf8");
  check("as a real message", /^From: games@example\.com/m.test(written) && written.includes("the link"));
  fs.unlinkSync(outFile);

  section("Guessing is throttled");
  /* Counted per source address, not per account, so nobody can lock a player out of
     their own name by guessing at it. And slowed rather than blocked, so a household
     sharing one address is never shut out. This check comes last because it slows
     down the very address the rest of this test calls from. */
  const guesser = jar();
  const timeOne = async (password) => {
    const t0 = Date.now();
    const r3 = await guesser.post("/api/login", { name: nm, password });
    return { ms: Date.now() - t0, status: r3.status, body: r3.body };
  };
  const firstGuess = await timeOne("guess-0");
  for (let i = 1; i < 11; i++) await timeOne(`guess-${i}`);
  const lateGuess = await timeOne("guess-late");
  check("a wrong password is refused", !!firstGuess.body.error && !!lateGuess.body.error);
  check("and each further guess costs more time",
    lateGuess.ms > firstGuess.ms + 1000, `${firstGuess.ms}ms then ${lateGuess.ms}ms`);
  const stillIn = await timeOne("eight is enough");
  check("but the real password still gets in - slowly, never locked out", !!stillIn.body.user,
    `${stillIn.ms}ms`);
  const afterSuccess = await timeOne("eight is enough");
  check("and signing in successfully clears the slowdown", afterSuccess.ms < 1500, `${afterSuccess.ms}ms`);

  /* ======================================================== in the browser */
  section("In the lobby");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const txt = () => page.evaluate(() => document.body.innerText || "");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(500);

  check("a visitor is told they are a guest", /Playing as a guest/.test(await txt()));

  // typing a registered name warns before the button is pressed
  await page.locator('input[placeholder="Your name"]').fill(nm);
  await sleep(900);
  check("typing a registered name says it is taken", /is a registered player/.test(await txt()), nm);
  await page.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/account-locked.png` : "/tmp/account-locked.png" });

  // register a fresh account through the UI
  const newName = `Player${uniq()}`;
  await page.getByRole("button", { name: "reserve your name" }).click();
  await sleep(200);
  await page.locator('input[placeholder="Your name"]').first().fill(newName);
  await page.locator('input[placeholder*="Email"]').fill(`${newName}@example.com`);
  await page.locator('input[placeholder*="Password"]').fill("eight is enough");
  // registering now also picks a secret question, which is the way back in without email
  await page.locator("select").selectOption("street");
  await page.locator('input[placeholder="Your answer"]').fill("Baker Street");
  await page.getByRole("button", { name: "Create account" }).click();
  await sleep(1200);
  check("registering from the lobby signs you in", new RegExp(`Signed in as\\s*${newName}`).test(await txt()), newName);
  await page.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/account-signed-in.png` : "/tmp/account-signed-in.png" });

  // and the account survives a reload
  await page.reload({ waitUntil: "networkidle" });
  await sleep(700);
  check("and it survives a reload", new RegExp(`Signed in as\\s*${newName}`).test(await txt()));
  check("the name field is filled in and locked",
    (await page.locator('input[placeholder="Your name"]').inputValue()) === newName
    && (await page.locator('input[placeholder="Your name"]').getAttribute("readonly")) !== null);

  // it really can play
  await page.getByRole("button", { name: "Create room" }).click();
  await sleep(1500);
  check("the account can start a game", /Room code/i.test(await txt()));

  /* Sign out, and the lobby is a guest again. Two wrinkles getting back there:
     the client remembers the room it was in and rejoins it, so clear that first;
     and the game page holds an SSE stream open, so "networkidle" never arrives. */
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await sleep(1500);
  check("back at the lobby, still signed in",
    new RegExp(`Signed in as\\s*${newName}`).test(await txt()));
  await page.getByRole("button", { name: "Sign out" }).click();
  await sleep(700);
  check("signing out returns you to a guest", /Playing as a guest/.test(await txt()));

  // the reset link opens the new-password form
  const reset = accounts.startReset(accounts.load(file), newName);   // read-only copy: just for a shape check
  check("a reset link can be minted for the new account", !!reset);
  await page.goto(`${BASE}/?reset=clearly-not-valid`, { waitUntil: "domcontentloaded" });
  await sleep(800);
  check("an invalid reset link says so rather than offering a form",
    /expired or has already been used/.test(await txt()));

  check("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  await browser.close();

  console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
  process.exit(fails ? 1 : 0);
})();
