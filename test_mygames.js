/* Picking a game up on another device, and holding more than one at a time.

   A seat is held by a per-room token kept in one browser. That is why resuming
   used to mean "reopen the link on the same device and browser" - which is fine
   until your phone is the other device. A signed-in player is a different case:
   the account is the proof of who they are, so they can ask for their own seat
   back anywhere.

   Needs a server on 8080. */
const BASE = process.env.BASE || "http://127.0.0.1:8080";

let fails = 0, n = 0;
const check = (what, ok, note = "") => {
  n++; if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
};
const section = (t) => console.log(`\n${t}`);

/* Each "browser" is its own cookie jar, which is the whole point of the test. */
function browser() {
  const jar = new Map();
  return async (path, opts = {}) => {
    const headers = { ...(opts.headers || {}) };
    if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    if (opts.body) headers["Content-Type"] = "application/json";
    const r = await fetch(BASE + path, { ...opts, headers });
    for (const c of (r.headers.getSetCookie ? r.headers.getSetCookie() : [])) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
}

(async () => {
  const laptop = browser();
  const phone = browser();
  const stranger = browser();

  const who = `Dev${Math.random().toString(16).slice(2, 8)}`;
  const pass = "a-good-enough-password";

  section("An account, signed in on a laptop");
  {
    const r = await laptop("/api/register", { method: "POST", body: JSON.stringify({
      name: who, email: `${who}@example.com`, password: pass,
      question: "street", answer: "Baker" }) });
    check("registered", !r.body.error, r.body.error || who);
  }

  section("Two games on the laptop, at once");
  const codes = [];
  {
    for (let i = 0; i < 2; i++) {
      const r = await laptop("/api/create", { method: "POST", body: JSON.stringify({ name: who, bots: 1 }) });
      check(`game ${i + 1} created`, !!r.body.code, r.body.code || r.body.error);
      codes.push(r.body.code);
    }
    check("they are different tables", codes[0] !== codes[1], codes.join(" and "));
  }

  section("The phone has never seen either of them");
  {
    const r = await phone("/api/mygames");
    check("a signed-out browser is told so", r.body.signedIn === false);
    check("and is shown nothing", (r.body.games || []).length === 0);
  }

  section("Sign in on the phone and both games are there");
  {
    const r = await phone("/api/login", { method: "POST", body: JSON.stringify({ name: who, password: pass }) });
    check("signed in on the phone", !r.body.error, r.body.error || "");
    const g = await phone("/api/mygames");
    check("both games are listed", (g.body.games || []).length === 2, `${(g.body.games || []).length}`);
    const listed = (g.body.games || []).map((x) => x.code).sort();
    check("and they are the right two", listed.join() === [...codes].sort().join(), listed.join());
    check("each says which seat is yours", (g.body.games || []).every((x) => x.seat === 0));
    check("and when it would be retired", (g.body.games || []).every((x) => x.retiresAt > Date.now()));
    check("the idle window is stated", g.body.idleHours === 48, `${g.body.idleHours}h`);
  }

  section("The phone can claim a seat and play it");
  {
    const c = await phone("/api/claim", { method: "POST", body: JSON.stringify({ code: codes[0] }) });
    check("the seat is handed over", !!c.body.token, c.body.error || "");
    check("it is the same seat, not a new one", c.body.seat === 0);
    const r = await phone("/api/resume", { method: "POST",
      body: JSON.stringify({ code: codes[0], token: c.body.token }) });
    check("and the token works", r.body.ok === true, r.body.error || "");
  }

  section("Somebody else's account cannot");
  {
    const other = `Other${Math.random().toString(16).slice(2, 8)}`;
    await stranger("/api/register", { method: "POST", body: JSON.stringify({
      name: other, email: `${other}@example.com`, password: pass,
      question: "street", answer: "Baker" }) });
    const g = await stranger("/api/mygames");
    check("a different account sees none of them", (g.body.games || []).length === 0);
    const c = await stranger("/api/claim", { method: "POST", body: JSON.stringify({ code: codes[0] }) });
    check("and is refused the seat", c.status === 403, `HTTP ${c.status}`);
    check("in words, not a stack trace", /seat at that table/i.test(c.body.error || ""), c.body.error);
  }

  section("A signed-out browser cannot claim either");
  {
    const anon = browser();
    const c = await anon("/api/claim", { method: "POST", body: JSON.stringify({ code: codes[0] }) });
    check("refused", c.status === 403, `HTTP ${c.status}`);
    check("and told what to do about it", /sign in/i.test(c.body.error || ""), c.body.error);
  }

  section("A room that is gone says so rather than pretending");
  {
    const c = await phone("/api/claim", { method: "POST", body: JSON.stringify({ code: "ZZZZZZ" }) });
    check("404, not a seat", c.status === 404, `HTTP ${c.status}`);
  }

  console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
  process.exit(fails ? 1 : 0);
})();
