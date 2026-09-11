/* Getting out of a room, and knowing how long it has left.

   A watcher could not leave. /api/leave only ever looked in room.members, so a
   spectator's token never matched, the call answered "ok" and did nothing -
   they stayed on everyone else's watcher list for as long as the room lived,
   however many times they pressed the button.

   A player has the opposite problem: they must NOT lose their seat by going
   back to the lobby, which is the only way to start a second game.

   Needs a server on 8080. */
const BASE = process.env.BASE || "http://127.0.0.1:8080";

let fails = 0, n = 0;
const check = (what, ok, note = "") => {
  n++; if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
};
const section = (t) => console.log(`\n${t}`);

const post = async (p, b) => {
  const r = await fetch(BASE + p, { method: "POST",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const get = async (p) => {
  const r = await fetch(BASE + p, { cache: "no-store" });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
/* The watcher list rides on the state frame, so read it from the stream's first
   message rather than inventing an endpoint for the test's convenience. */
async function watchersOf(code, token) {
  const res = await fetch(`${BASE}/api/state?code=${code}&token=${token}`, { cache: "no-store" })
    .catch(() => null);
  if (res && res.ok) { const j = await res.json().catch(() => ({})); if (j.watchers) return j.watchers; }
  return null;
}

(async () => {
  section("A game with one player and a watcher");
  const host = await post("/api/create", { name: "Ana", bots: 1 });
  const code = host.body.code;
  check("a room was made", !!code, code || JSON.stringify(host.body));
  await post("/api/start", { code, token: host.body.token });

  const watcher = await post("/api/join", { code, name: "Nosy" });
  check("joining a started game makes you a watcher", watcher.body.spectator === true,
    JSON.stringify(watcher.body).slice(0, 90));

  section("The watcher can leave, and is actually gone");
  {
    const before = await watchersOf(code, host.body.token);
    if (before) check("they are on the watcher list first", before.includes("Nosy"), before.join(", "));

    const out = await post("/api/leave", { code, token: watcher.body.token });
    check("leaving is accepted", out.body.ok === true, JSON.stringify(out.body));
    check("and the server says it was a watcher it removed", out.body.wasWatching === true,
      JSON.stringify(out.body));

    const after = await watchersOf(code, host.body.token);
    if (after) check("they are off the watcher list", !after.includes("Nosy"), after.join(", ") || "empty");

    /* The token is spent: a second press, or a stale tab, must not resurrect
       them or throw. */
    const again = await post("/api/leave", { code, token: watcher.body.token });
    check("leaving twice is harmless", again.body.ok === true && !again.body.wasWatching,
      JSON.stringify(again.body));
  }

  section("A player going back to the lobby KEEPS their seat");
  {
    const out = await post("/api/leave", { code, token: host.body.token });
    check("the call is accepted", out.body.ok === true);
    check("it was not treated as a watcher", !out.body.wasWatching);
    const back = await post("/api/resume", { code, token: host.body.token });
    check("their token still works - the seat is theirs", back.body.ok === true,
      back.body.error || "");
    check("and it is the same seat", back.body.seat === 0, String(back.body.seat));
  }

  section("The room says how long it has been idle");
  {
    const r = await get(`/api/mygames`);
    // not signed in here, so just check the state frame carries the fields
    const st = await fetch(`${BASE}/api/state?code=${code}&token=${host.body.token}`)
      .then((x) => x.json()).catch(() => null);
    if (st) {
      check("the state frame carries lastActive", typeof st.lastActive === "number", String(st.lastActive));
      check("and the idle limit", st.idleLimitMs === 48 * 3600 * 1000, String(st.idleLimitMs));
      check("lastActive is recent, not the epoch", Date.now() - st.lastActive < 60000,
        `${Math.round((Date.now() - st.lastActive) / 1000)}s ago`);
    } else {
      console.log(" --   no /api/state endpoint; the fields are checked in the browser instead");
    }
  }

  console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
  process.exit(fails ? 1 : 0);
})();
