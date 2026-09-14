/* The idle clock has to survive a reload. So did the match clock, once.

   Both numbers ride on the state frame so that every player sees the same figure and a
   reload does not reset it. That only works if the server's idea of "last activity" is
   about PLAY. It wasn't: broadcast() stamped touchedAt on every frame it sent, and
   attaching to the stream sends a frame - so opening the page set the room's last
   activity to now, for everybody at the table.

   Two things were wrong with that. The clock looked like it restarted on reload, which
   is what got reported. And a room nobody was playing could be held open forever by one
   stale tab reconnecting, because the 48-hour sweep reads the same field.

   Needs a server on 8080. */
const BASE = process.env.BASE || "http://127.0.0.1:8080";

let fails = 0, n = 0;
const check = (what, ok, note = "") => {
  n++; if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
};
const section = (t) => console.log(`\n${t}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const post = async (p, b) => {
  const r = await fetch(BASE + p, { method: "POST",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const frame = async (code, token) => {
  const r = await fetch(`${BASE}/api/state?code=${code}&token=${token}`, { cache: "no-store" });
  return r.ok ? r.json().catch(() => ({})) : {};
};
/* Attach to the event stream exactly as the page does, read nothing, and drop it. This
   is the act that used to reset everybody's clock. */
async function attachStream(code, token) {
  const ctrl = new AbortController();
  const r = await fetch(`${BASE}/api/stream?code=${code}&token=${token}`, { signal: ctrl.signal })
    .catch(() => null);
  await sleep(250);
  ctrl.abort();
  return !!r;
}

(async () => {
  section("A room with something in it");
  const host = await post("/api/create", { name: "Ana", bots: 1 });
  const code = host.body.code, token = host.body.token;
  check("a room was made", !!code, code || JSON.stringify(host.body));
  await post("/api/start", { code, token });

  const first = await frame(code, token);
  check("the frame carries lastActive", typeof first.lastActive === "number", String(first.lastActive));
  check("and a 48-hour idle limit", first.idleLimitMs === 48 * 3600 * 1000, String(first.idleLimitMs));

  section("Time passes with nobody playing");
  await sleep(1200);
  const aged = await frame(code, token);
  const idleBefore = Date.now() - aged.lastActive;
  check("the room has started to go idle", idleBefore >= 1000, `${idleBefore}ms`);
  check("lastActive did not move just because a frame was read",
    aged.lastActive === first.lastActive,
    `${first.lastActive} -> ${aged.lastActive}`);

  section("SOMEBODY RELOADS THE PAGE");
  {
    const ok = await attachStream(code, token);
    check("the stream accepted the connection", ok);

    const after = await frame(code, token);
    check("lastActive is UNCHANGED by attaching to the stream",
      after.lastActive === first.lastActive,
      `${first.lastActive} -> ${after.lastActive}`);

    const idleAfter = Date.now() - after.lastActive;
    check("so the idle clock kept counting instead of restarting",
      idleAfter >= idleBefore, `${idleBefore}ms -> ${idleAfter}ms`);
  }

  section("A SECOND PLAYER OPENING THE PAGE DOES NOT RESET IT EITHER");
  {
    const watcher = await post("/api/join", { code, name: "Nosy" });
    /* joining IS a person doing something, so that may count - what must not count is
       the stream attach that follows it. */
    const beforeAttach = (await frame(code, token)).lastActive;
    await sleep(600);
    await attachStream(code, watcher.body.token);
    const afterAttach = (await frame(code, token)).lastActive;
    check("a watcher's stream attach leaves the clock alone",
      afterAttach === beforeAttach, `${beforeAttach} -> ${afterAttach}`);
  }

  section("But actually playing does move it");
  {
    const before = (await frame(code, token)).lastActive;
    await sleep(600);
    await post("/api/chat", { code, token, text: "still here" });
    const after = (await frame(code, token)).lastActive;
    check("a human doing something counts as activity", after > before,
      `${before} -> ${after}`);
  }

  console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
  process.exit(fails ? 1 : 0);
})();
