/* How many accounts exist, and who is on the site.

   Both are for the designer's own eyes. Who is currently online is not public,
   and neither is the size of the register - so the gate is on the SERVER, and
   the whole point of this file is that it holds for everybody who is not an
   admin. The page only displays whatever arrived.

   Needs a server on 8080, started with ENT_ADMINS naming an account this test
   can register. It registers its own admin under a name the default ENT_ADMINS
   allows ("Dids" / "Didson"), so run it against a default server. */
const BASE = process.env.BASE || "http://127.0.0.1:8080";

let fails = 0, n = 0;
const check = (what, ok, note = "") => {
  n++; if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
};
const section = (t) => console.log(`\n${t}`);

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
const rid = () => Math.random().toString(16).slice(2, 10);

(async () => {
  const admin = browser(), player = browser(), stranger = browser();

  section("Three people on the site");
  {
    /* The admin name has to be one the server was told about; ENT_ADMINS
       defaults to Dids,Didson and the check is case-insensitive. */
    const r = await admin("/api/register", { method: "POST", body: JSON.stringify({
      name: "Didson", email: "didson@example.com", password: "a-good-enough-password",
      question: "street", answer: "Baker" }) });
    if (r.body.error) {
      // already registered on this server from an earlier run - sign in instead
      const l = await admin("/api/login", { method: "POST", body: JSON.stringify({
        name: "Didson", password: "a-good-enough-password" }) });
      check("signed in as the admin", !l.body.error, l.body.error || "");
    } else {
      check("registered the admin", true, "Didson");
    }

    const who = `Reg${rid()}`;
    const p = await player("/api/register", { method: "POST", body: JSON.stringify({
      name: who, email: `${who}@example.com`, password: "a-good-enough-password",
      question: "street", answer: "Baker" }) });
    check("registered an ordinary player", !p.body.error, p.body.error || who);

    // three separate browsers ping presence, so all three are "here"
    await admin(`/api/presence?id=admin-${rid()}`);
    await player(`/api/presence?id=player-${rid()}`);
    await stranger(`/api/presence?id=guest-${rid()}`);
  }

  section("The admin is told how many accounts exist, and who is here");
  let seen;
  {
    const r = await admin(`/api/presence?id=admin-${rid()}`);
    seen = r.body;
    check("a count of registered accounts comes back",
      typeof seen.accounts === "number" && seen.accounts >= 2, String(seen.accounts));
    check("and a list of who is online", Array.isArray(seen.who), typeof seen.who);
    check("with at least the three of us on it", (seen.who || []).length >= 3,
      `${(seen.who || []).length} entries`);
    check("the admin is on it by name",
      (seen.who || []).some((w) => /didson/i.test(w.name)),
      (seen.who || []).map((w) => w.name).join(", "));
    check("a signed-in player is marked registered",
      (seen.who || []).some((w) => w.registered === true));
    check("and somebody who never signed in is marked a guest",
      (seen.who || []).some((w) => w.registered === false));
    check("the ordinary counts are still there",
      typeof seen.online === "number" && typeof seen.matches === "number");
  }

  section("NOBODY ELSE IS TOLD EITHER OF THOSE");
  {
    const r = await player(`/api/presence?id=player-${rid()}`);
    check("a signed-in player gets no account count", r.body.accounts === undefined,
      String(r.body.accounts));
    check("and no list of names", r.body.who === undefined, JSON.stringify(r.body.who));
    check("but still sees the counters", typeof r.body.online === "number");

    const g = await stranger(`/api/presence?id=guest-${rid()}`);
    check("a guest gets no account count", g.body.accounts === undefined);
    check("and no list of names", g.body.who === undefined);

    const anon = browser();
    const a = await anon(`/api/presence?id=anon-${rid()}`);
    check("a browser with no cookies at all gets neither",
      a.body.accounts === undefined && a.body.who === undefined);

    /* The one that matters most: no name of anybody should appear anywhere in
       what a non-admin is handed, whatever shape it arrives in. */
    const names = (seen.who || []).map((w) => w.name).filter((x) => x && x.length > 3);
    const leaked = names.filter((nm) => JSON.stringify(r.body).includes(nm)
      || JSON.stringify(g.body).includes(nm) || JSON.stringify(a.body).includes(nm));
    check("no name appears anywhere in a non-admin reply", leaked.length === 0, leaked.join(", "));
  }

  section("Two tabs are one person");
  {
    const id = `same-${rid()}`;
    await admin(`/api/presence?id=${id}`);
    const before = (await admin(`/api/presence?id=admin-${rid()}`)).body.who || [];
    const meRow = before.filter((w) => /didson/i.test(w.name));
    check("the admin appears exactly once however many tabs are open",
      meRow.length === 1, `${meRow.length} rows`);
    check("and the tab count says how many", meRow[0] && meRow[0].tabs >= 1,
      meRow[0] ? String(meRow[0].tabs) : "no row");
  }

  console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
  process.exit(fails ? 1 : 0);
})();
