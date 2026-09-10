/* What a voice call needs from the server: the right list of ICE servers, and a
   signal inbox that does not throw the handshake away when it overflows.

   Both of these were broken in ways the browser test could never catch, because
   two tabs on one machine connect over host candidates and never touch a relay
   or fill an inbox. */
const assert = require("assert");
const crypto = require("crypto");
const iceconfig = require("./iceconfig.js");

let fails = 0, n = 0;
function check(what, ok, note = "") {
  n++;
  if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
}
function section(t) { console.log(`\n${t}`); }

/* ---------------------------------------------------------------- ICE list */
section("With nothing configured");
{
  const c = iceconfig.build({});
  check("STUN is always offered", c.iceServers.length === 2);
  check("every entry is a stun: URL", c.iceServers.every((s) => /^stun:/.test(s.urls)));
  check("no relay is claimed", c.relay === false);
  check("and the boot line says why that matters",
    /mobile/.test(iceconfig.describe(c)), iceconfig.describe(c).slice(0, 60) + "…");
}

section("With a fixed username and password");
{
  const c = iceconfig.build({
    ENT_TURN_URLS: "turn:relay.example.com:3478, turns:relay.example.com:5349",
    ENT_TURN_USER: "ent", ENT_TURN_PASS: "hunter2",
  });
  const turn = c.iceServers[c.iceServers.length - 1];
  check("a relay is offered", c.relay === true);
  check("the STUN servers are still there", c.iceServers.length === 3);
  check("both URLs are carried, whitespace trimmed",
    turn.urls.length === 2 && turn.urls[1] === "turns:relay.example.com:5349");
  check("with the credentials attached", turn.username === "ent" && turn.credential === "hunter2");
}

section("With a shared secret (coturn's REST scheme)");
{
  const now = 1_700_000_000_000;
  const c = iceconfig.build({
    ENT_TURN_URLS: "turn:relay.example.com:3478",
    ENT_TURN_SECRET: "s3cret",
  }, "Lello", now);
  const turn = c.iceServers[c.iceServers.length - 1];
  check("a relay is offered", c.relay === true);

  const [expiry, name] = turn.username.split(":");
  check("the username is expiry:name", name === "Lello", turn.username);
  check("the expiry is an hour out",
    Number(expiry) === Math.floor(now / 1000) + 3600);

  // recompute it the way the relay would
  const want = crypto.createHmac("sha1", "s3cret").update(turn.username).digest("base64");
  check("the password is HMAC-SHA1 of the username, base64", turn.credential === want);

  const later = iceconfig.build({
    ENT_TURN_URLS: "turn:relay.example.com:3478", ENT_TURN_SECRET: "s3cret",
  }, "Lello", now + 60_000);
  const t2 = later.iceServers[later.iceServers.length - 1];
  check("a credential minted a minute later is a different one",
    t2.credential !== turn.credential);
  check("the secret itself is never handed to the browser",
    !JSON.stringify(later.iceServers).includes("s3cret"));
}

section("A half-finished setup is not a relay");
{
  const c = iceconfig.build({ ENT_TURN_URLS: "turn:relay.example.com:3478" });
  check("URLs with no credentials are dropped", c.iceServers.length === 2);
  check("and not reported as a working relay", c.relay === false);

  const u = iceconfig.build({ ENT_TURN_USER: "ent", ENT_TURN_PASS: "hunter2" });
  check("credentials with no URL are dropped too", u.relay === false && u.iceServers.length === 2);
}

/* ------------------------------------------------------------ inbox policy */
/* The server caps each member's signal inbox. It used to shift() - dropping the
   OLDEST message, which is the offer. Losing a candidate costs one path; losing
   the offer costs the whole call, and a six-seat table overflows the old cap of
   60 without trying. This is that rule on its own, so it can be checked without
   standing a room up. */
function pushCapped(inbox, msg, cap = 240) {
  inbox.push(msg);
  if (inbox.length > cap) {
    const i = inbox.findIndex((m) => m.kind === "ice");
    inbox.splice(i === -1 ? 0 : i, 1);
  }
  return inbox;
}

section("An overflowing inbox drops candidates, never the offer");
{
  let inbox = [];
  pushCapped(inbox, { kind: "offer", from: 1 }, 5);
  for (let i = 0; i < 20; i++) pushCapped(inbox, { kind: "ice", from: 1, i }, 5);
  check("the inbox is held at the cap", inbox.length === 5, `${inbox.length}`);
  check("the offer survived", inbox.some((m) => m.kind === "offer"));
  check("it is candidates that were shed", inbox.filter((m) => m.kind === "ice").length === 4);
  check("and the ones kept are the newest",
    inbox[inbox.length - 1].i === 19, `last i=${inbox[inbox.length - 1].i}`);

  // the old rule, for contrast: it loses the one message a call cannot start without
  let old = [{ kind: "offer", from: 1 }];
  for (let i = 0; i < 20; i++) { old.push({ kind: "ice", i }); if (old.length > 5) old.shift(); }
  check("the old shift() rule would have lost the offer",
    !old.some((m) => m.kind === "offer"));
}

section("Nothing but candidates still obeys the cap");
{
  let inbox = [];
  for (let i = 0; i < 30; i++) pushCapped(inbox, { kind: "ice", i }, 5);
  check("held at the cap with no offer present", inbox.length === 5);
}

console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
process.exit(fails ? 1 : 0);
