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

(async () => {
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

  /* ------------------------------------------------------------- Cloudflare */
  /* Cloudflare Realtime is the relay this game is set up for. It does not speak
     coturn's HMAC scheme: the server holds a key and asks Cloudflare to mint a
     short-lived credential. Two of its endpoints answer in different shapes, so
     the normaliser takes either - and everything here runs against a stubbed
     fetch, so the suite never touches the network. */
  const ARRAY_SHAPE = {
    iceServers: [
      { urls: ["stun:stun.cloudflare.com:3478"] },
      { urls: ["turn:turn.cloudflare.com:3478?transport=udp",
               "turns:turn.cloudflare.com:5349?transport=tcp"],
        username: "abc", credential: "xyz" },
    ],
  };
  const OBJECT_SHAPE = {
    iceServers: {
      urls: ["stun:stun.cloudflare.com:3478", "turn:turn.cloudflare.com:3478?transport=udp"],
      username: "abc", credential: "xyz",
    },
  };
  const CF_ENV = { ENT_TURN_CF_KEY_ID: "key123", ENT_TURN_CF_API_TOKEN: "tok456" };
  const stub = (body, ok = true, status = 201) => {
    const calls = [];
    const f = async (url, opts) => { calls.push({ url, opts }); return { ok, status, json: async () => body }; };
    f.calls = calls;
    return f;
  };

  section("Cloudflare answers in two shapes; both are accepted");
  {
    const a = iceconfig.normaliseCloudflare(ARRAY_SHAPE);
    check("the array shape is read", !!a && a.length === 2);
    check("the relay entry keeps both its URLs", a[1].urls.length === 2);
    check("and its credentials", a[1].username === "abc" && a[1].credential === "xyz");

    const o = iceconfig.normaliseCloudflare(OBJECT_SHAPE);
    check("the single-object shape is read too", !!o && o.length === 1);
    check("its urls survive as an array", Array.isArray(o[0].urls) && o[0].urls.length === 2);
  }

  section("A reply with no relay in it is not treated as one");
  {
    check("stun only is rejected",
      iceconfig.normaliseCloudflare({ iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }] }) === null);
    check("an empty reply is rejected", iceconfig.normaliseCloudflare({}) === null);
    check("junk is rejected", iceconfig.normaliseCloudflare({ iceServers: [{}] }) === null);
    check("null is rejected", iceconfig.normaliseCloudflare(null) === null);
  }

  section("Asking Cloudflare for a credential");
  {
    iceconfig._resetCache();
    const f = stub(ARRAY_SHAPE);
    const cfg = await iceconfig.resolve(CF_ENV, "Lello", Date.now(), f);
    check("a relay is offered", cfg.relay === true && cfg.via === "cloudflare");
    check("public STUN is still in front of it",
      /^stun:/.test(cfg.iceServers[0].urls));
    check("the request is a POST to the generate-ice-servers endpoint",
      f.calls[0].opts.method === "POST"
      && f.calls[0].url.includes("/v1/turn/keys/key123/credentials/generate-ice-servers"),
      f.calls[0].url);
    check("the key travels as a bearer token",
      f.calls[0].opts.headers.Authorization === "Bearer tok456");
    check("a ttl is asked for", JSON.parse(f.calls[0].opts.body).ttl > 0);
    check("the API token never reaches the browser",
      !JSON.stringify(cfg.iceServers).includes("tok456"));
  }

  section("The credential is cached, so a table does not hammer the API");
  {
    iceconfig._resetCache();
    const f = stub(ARRAY_SHAPE);
    const t0 = Date.now();
    for (let i = 0; i < 6; i++) await iceconfig.resolve(CF_ENV, "P" + i, t0 + i * 1000, f);
    check("six players joining cost one API call", f.calls.length === 1, `${f.calls.length} calls`);
    await iceconfig.resolve(CF_ENV, "later", t0 + 3 * 3600 * 1000, f);
    check("but it is re-minted once it ages out", f.calls.length === 2, `${f.calls.length} calls`);
  }

  section("Cloudflare having a bad minute does not break the call");
  {
    iceconfig._resetCache();
    const bad = stub({ error: "nope" }, false, 401);
    const cfg = await iceconfig.resolve(CF_ENV, "Lello", Date.now(), bad);
    check("it falls back to STUN rather than throwing", Array.isArray(cfg.iceServers));
    check("and does not claim a relay it has not got", cfg.relay === false);
    check("the failure is flagged so the log can say so", cfg.cloudflareFailed === true);
    check("describe() names the likely cause",
      /ENT_TURN_CF_KEY_ID/.test(iceconfig.describe(cfg)));

    iceconfig._resetCache();
    const thrower = async () => { throw new Error("network down"); };
    const cfg2 = await iceconfig.resolve(CF_ENV, "Lello", Date.now(), thrower);
    check("an unreachable Cloudflare is caught too", cfg2.relay === false && Array.isArray(cfg2.iceServers));

    iceconfig._resetCache();
    const f = stub(ARRAY_SHAPE);
    await iceconfig.resolve(CF_ENV, "a", Date.now(), thrower).catch(() => {});
    const ok = await iceconfig.resolve(CF_ENV, "b", Date.now(), f);
    check("a failure is never cached - the next player tries again", ok.relay === true);
  }

  section("The boot log says which relay is set up without calling out");
  {
    check("Cloudflare is named", /Cloudflare/.test(iceconfig.plan(CF_ENV)));
    check("no relay is named plainly", /no TURN relay configured/.test(iceconfig.plan({})));
    check("a coturn secret still reports as before",
      /time-limited/.test(iceconfig.plan({ ENT_TURN_URLS: "turn:x:3478", ENT_TURN_SECRET: "s" })));
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

})();
