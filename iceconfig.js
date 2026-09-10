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

/* For the boot log, so the host can see at a glance which of the three states
   the service is in without reading the environment back by hand. */
function describe(cfg) {
  if (!cfg.relay) {
    return "STUN only - no TURN relay configured, so calls between two mobile "
      + "networks will usually fail (set ENT_TURN_URLS; see iceconfig.js)";
  }
  const n = cfg.iceServers[cfg.iceServers.length - 1].urls.length;
  return `STUN + ${n} TURN relay URL${n === 1 ? "" : "s"} (${
    cfg.via === "secret" ? "time-limited credentials" : "fixed credentials"})`;
}

module.exports = { build, describe, restCredential, STUN, TTL_SECONDS };
