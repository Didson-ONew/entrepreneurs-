/* ============================================================================
   Which servers the browser may use to find a path to another player.

   WHY THIS FILE EXISTS

   Voice is peer to peer: the server relays the handshake and nothing else, so
   the audio never touches the host. To open that peer connection each browser
   has to learn an address the other one can actually reach, and there are two
   kinds of helper for that:

     STUN  tells a browser what its own public address looks like from outside.
           It is free, it is a single round trip, and it is enough whenever
           there is any direct path at all between the two networks.

     TURN  is a relay. When there is NO direct path, both browsers connect
           outward to the relay and it forwards the audio between them.

   For a long time this app configured STUN alone. That works from a laptop on
   home wifi and it works between two tabs on one machine, which is why every
   test passed. It does NOT work between two phones on mobile networks. Carriers
   put subscribers behind CGNAT, which is usually a SYMMETRIC NAT: it hands out
   a different public port for every destination you talk to. So the address
   STUN reports is the one the carrier opened towards the STUN server, and it is
   dead the moment the other player tries it. There is no direct path to find,
   and no amount of retrying invents one. Only a relay gets through.

   That is the whole of the "could not connect" the players were seeing.

   CONFIGURING A RELAY

   A relay costs bandwidth, so there is no free universal one and this app
   cannot ship credentials - the repository is public. It reads them from the
   environment instead:

     ENT_TURN_URLS    comma separated, e.g.
                      turn:relay.example.com:3478,turns:relay.example.com:5349
     ENT_TURN_USER    a fixed username   \  use these two together
     ENT_TURN_PASS    a fixed password   /
     ENT_TURN_SECRET  a shared secret, INSTEAD of user+pass, if the relay
                      speaks coturn's REST scheme (`use-auth-secret`)

   Prefer ENT_TURN_SECRET. A relay credential has to be handed to the browser to
   be used at all, so anyone in the room can read it out of the network tab. A
   fixed username and password read that way is usable by a stranger forever; a
   REST credential is an HMAC over an expiry timestamp, so the copy they take
   stops working within the hour. Same exposure, far smaller blast radius.

   With nothing set, this returns STUN only and says so, and the call falls back
   to what it did before - which is fine on a laptop and unreliable on a phone.
   The panel tells the player that in those words rather than leaving them to
   guess at a microphone fault.
   ========================================================================== */
const crypto = require("crypto");

/* Public STUN. Two of them, because one being down should not cost a call, and
   they are contacted only to ask "what does my address look like from there" -
   no audio and no game data ever goes near them. */
const STUN = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

const TTL_SECONDS = 3600;    // an hour: longer than any single sitting

/* coturn's REST scheme, verbatim from its README: the username is an expiry
   timestamp joined to a name by a colon, and the password is that whole string
   HMAC-SHA1'd with the shared secret and base64'd. The relay recomputes it and
   never has to be told about the user at all, which is what makes it possible
   to mint a credential per call without an account anywhere. */
function restCredential(secret, name, now = Date.now(), ttl = TTL_SECONDS) {
  const expiry = Math.floor(now / 1000) + ttl;
  const username = `${expiry}:${name || "player"}`;
  const credential = crypto.createHmac("sha1", secret).update(username).digest("base64");
  return { username, credential, expiry };
}

function urlList(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------ Cloudflare ---
   Cloudflare Realtime's TURN service is the relay this game is set up for: a
   thousand gigabytes a month free, which an evening of six-player games does
   not come close to. It does NOT speak coturn's HMAC scheme, though. You hold a
   long-lived TURN key on the server and ask Cloudflare to mint a short-lived
   credential from it, and the key must never reach the browser - which suits
   this app, because the browser already asks the server for its ICE list.

     ENT_TURN_CF_KEY_ID      the TURN key's id
     ENT_TURN_CF_API_TOKEN   its API token

   Two endpoints exist and they answer in different shapes: /generate returns a
   single iceServers OBJECT, /generate-ice-servers returns an ARRAY with the
   STUN entry separated out. We ask for the array and normalise anyway, so
   either shape works and a change at their end cannot silently produce an
   RTCPeerConnection configured with nothing. */
const CF_ENDPOINT = (keyId) =>
  `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`;

function cloudflareConfigured(env = process.env) {
  return !!(String(env.ENT_TURN_CF_KEY_ID || "").trim()
    && String(env.ENT_TURN_CF_API_TOKEN || "").trim());
}

/* Whatever Cloudflare answers, hand back a plain array of RTCIceServer. */
function normaliseCloudflare(body) {
  const ice = body && body.iceServers;
  if (!ice) return null;
  const list = Array.isArray(ice) ? ice : [ice];
  const out = list
    .filter((s) => s && (s.urls || s.url))
    .map((s) => {
      const urls = s.urls || s.url;
      const e = { urls: Array.isArray(urls) ? urls : [urls] };
      if (s.username) e.username = s.username;
      if (s.credential) e.credential = s.credential;
      return e;
    })
    .filter((s) => s.urls.length);
  if (!out.length) return null;
  // it is only a relay if something in there is actually a turn: URL
  const hasTurn = out.some((s) => s.urls.some((u) => /^turns?:/i.test(u)));
  return hasTurn ? out : null;
}

/* Cached, because every player asks for this when they join a call and the
   credential is good for hours. A failure is never cached: if Cloudflare is
   having a bad minute the next player tries again rather than inheriting it. */
let cfCache = null;    // { at, iceServers }
const CF_TTL = 7200;             // ask for two hours
const CF_REUSE_MS = 3600 * 1000; // hand the same one out for the first hour

async function fetchCloudflare(env = process.env, now = Date.now(), fetchImpl = fetch) {
  if (!cloudflareConfigured(env)) return null;
  if (cfCache && now - cfCache.at < CF_REUSE_MS) return cfCache.iceServers;
  try {
    const res = await fetchImpl(CF_ENDPOINT(String(env.ENT_TURN_CF_KEY_ID).trim()), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${String(env.ENT_TURN_CF_API_TOKEN).trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl: CF_TTL }),
    });
    if (!res || !res.ok) {
      console.error(`TURN: Cloudflare refused the credential request (HTTP ${res && res.status})`);
      return null;
    }
    const servers = normaliseCloudflare(await res.json());
    if (!servers) { console.error("TURN: Cloudflare answered with no usable relay"); return null; }
    cfCache = { at: now, iceServers: servers };
    return servers;
  } catch (e) {
    console.error(`TURN: could not reach Cloudflare (${(e && e.message) || e})`);
    return null;
  }
}

/* Everything the browser needs, for whichever relay is configured. Async
   because Cloudflare has to be asked; the other two paths are pure. */
async function resolve(env = process.env, name = "player", now = Date.now(), fetchImpl = fetch) {
  if (cloudflareConfigured(env)) {
    const iceServers = await fetchCloudflare(env, now, fetchImpl);
    /* Falling back to STUN rather than failing the call: without a relay two
       phones will not connect, but everyone on wifi still can, and the panel
       says which of the two states it is in. */
    if (iceServers) return { iceServers: [...STUN, ...iceServers], relay: true, via: "cloudflare" };
    return { ...build(env, name, now), cloudflareFailed: true };
  }
  return build(env, name, now);
}

/* Everything the browser needs, in the shape RTCPeerConnection wants.
   `relay` is the flag the UI reads: false means a phone-to-phone call is
   likely to fail, and the player should be told that up front rather than
   after two minutes of silence. */
function build(env = process.env, name = "player", now = Date.now()) {
  const urls = urlList(env.ENT_TURN_URLS);
  const iceServers = [...STUN];
  let relay = false;
  let via = "none";

  if (urls.length) {
    const secret = String(env.ENT_TURN_SECRET || "").trim();
    const user = String(env.ENT_TURN_USER || "").trim();
    const pass = String(env.ENT_TURN_PASS || "").trim();
    if (secret) {
      const c = restCredential(secret, name, now);
      iceServers.push({ urls, username: c.username, credential: c.credential });
      relay = true;
      via = "secret";
    } else if (user && pass) {
      iceServers.push({ urls, username: user, credential: pass });
      relay = true;
      via = "static";
    }
    /* URLs with no credentials at all is a half-finished setup, not a relay.
       Saying so beats shipping a server the browser will only ever be refused
       by, and reporting it to the player as their own network's fault. */
  }
  return { iceServers, relay, via };
}

/* For the boot log, so the host can see at a glance which state the service is
   in without reading the environment back by hand. */
function describe(cfg) {
  if (cfg.via === "cloudflare") return "STUN + Cloudflare Realtime TURN (credentials minted per call)";
  if (cfg.cloudflareFailed) {
    return "STUN only - Cloudflare is configured but would not mint a credential; "
      + "check ENT_TURN_CF_KEY_ID and ENT_TURN_CF_API_TOKEN";
  }
  if (!cfg.relay) {
    return "STUN only - no TURN relay configured, so calls between two mobile "
      + "networks will usually fail (see iceconfig.js for how to set one up)";
  }
  const n = cfg.iceServers[cfg.iceServers.length - 1].urls.length;
  return `STUN + ${n} TURN relay URL${n === 1 ? "" : "s"} (${
    cfg.via === "secret" ? "time-limited credentials" : "fixed credentials"})`;
}

/* Which relay the environment asks for, without contacting anything. The boot
   log uses this so starting the server never waits on a network call. */
function plan(env = process.env) {
  if (cloudflareConfigured(env)) return "Cloudflare Realtime TURN (credentials minted per call)";
  return describe(build(env));
}

module.exports = {
  build, resolve, describe, plan, restCredential, STUN, TTL_SECONDS,
  cloudflareConfigured, normaliseCloudflare, fetchCloudflare,
  _resetCache: () => { cfCache = null; },
};
