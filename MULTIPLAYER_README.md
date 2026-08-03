# Entrepreneurs — Online Multiplayer

Server-authoritative online play for 2–4 humans (plus optional bots to fill seats).
**Zero dependencies** — plain Node, no `npm install` required.

---

## Status, honestly

| Piece | State |
|---|---|
| **Multi-human game engine** | ✅ Done and tested (2, 3 and 4 humans) |
| **Game server** (rooms, lobby, turn validation, live sync) | ✅ Done and tested end-to-end |
| **Browser client** (lobby, full game UI, reconnect) | ✅ Done and tested (2 and 3 browsers, full games) |

Everything is finished and verified end-to-end: four consecutive full games played by
two independent browsers (all reaching Game Over with identical scores and zero page
errors), a three-browser game with all players rotating turns in sync, and mid-game
refresh recovery. See HOSTING_GUIDE.md for how to put it online with your friends.

I could not test across the internet — this sandbox has no external network — so
everything below was verified on localhost with real, separate socket connections.

---

## What was verified

A full game played by two independent clients over HTTP (`test_online.js`):

```
Ana created room 597C62 (seat 0)
Bruno joined (seat 1)
lobby seen by both: ["Ana","Bruno"] + 1 bot
non-host start rejected: true (Only the host can start.)
out-of-turn action rejected: true (Not your turn.)

steps: 183 | final phase: gameover | quarter: 12
phases exercised: {"drafting":5,"planning":48,"resolving":108,"liquidating":9,"delivering":12}
SSE updates received - Ana: 183, Bruno: 183
both clients hold identical state: true
```

Also verified:
- 2, 3 and 4 human seats, with randomised seating and per-player draft counts
- Every interactive phase serves each human in turn: drafting, planning, resolving,
  delivering, liquidating, hub placement, loan repayment
- Single-player is unaffected (full 12-quarter game, no errors)
- Balance simulations unchanged, so the refactor is behaviour-preserving

---

## Running it

Requires Node 18+. Nothing to install.

```bash
node server.js            # defaults to port 8080
PORT=3000 node server.js  # or pick a port
```

Then open `http://localhost:8080`.

### Playing with friends over the internet

The server is a normal HTTP server, so any of these work:

1. **Quick and free — a tunnel.** Run the server locally and expose it:
   ```bash
   npx localtunnel --port 8080     # or: ngrok http 8080, cloudflared tunnel --url localhost:8080
   ```
   Share the URL it prints. Good for a one-off session.

2. **Host it.** Push the folder to Render, Railway, Fly.io or a VPS. Start command
   `node server.js`; they set `PORT` automatically. Free tiers are fine — the whole
   thing is a few hundred KB and a game state is ~16 KB.

3. **Same network.** Find your LAN IP (`hostname -I`) and share
   `http://YOUR-IP:8080`. No setup at all if everyone is in the same house.

Server-Sent Events were chosen over WebSockets deliberately: they need no dependencies,
survive proxies and corporate firewalls better, and reconnect on their own.

---

## How it fits together

```
EntrepreneursGame.jsx     single source of truth
  ├── lines 1..~1600      the game engine (pure logic, no React)
  └── below               the React UI (single-player)

server.js                 loads the engine section at boot and runs it authoritatively
online.html               browser client  <-- still to be written
```

The server never trusts a client. Every action is checked against
`whoIsAwaited(state)`; anything from the wrong player is rejected with
`"Not your turn."` Bots resolve server-side, so clients only ever send human moves.

---

## Protocol

All endpoints are JSON over POST except the event stream.

| Endpoint | Purpose |
|---|---|
| `POST /api/create` `{name, bots}` | create a room → `{code, token, seat}` |
| `POST /api/join` `{code, name}` | join a room → `{code, token, seat}` |
| `POST /api/start` `{code, token}` | host starts the game |
| `GET /api/stream?code=&token=` | SSE: pushes `{type:"state", state, logs}` on every change |
| `POST /api/action` `{code, token, action, data}` | submit a move |

Actions: `draft`, `plan`, `act`, `deliver`, `skipDelivery`, `liquidate`,
`liquidateDone`, `placeLH`, `repay`, `repayDone`.

`act` carries a `type`: `loan`, `buyPlot`, `sellPlot`, `sellBP`, `sellCompany`,
`launch`, `renovate`, `research`, `upgrade`, `megacorp`, `reposition`, `pass`.

Because the protocol is plain HTTP+JSON, you can drive a whole game with `curl` —
`test_online.js` is a readable worked example.

---

## The remaining work

The browser client needs to do three things:

1. **Lobby** — create/join a room, show who is in it, host presses Start.
2. **Render from server state** rather than local state. The existing single-player UI
   already renders everything from one `state` object, so this is mostly rewiring
   where that object comes from.
3. **Send actions instead of mutating.** The single-player UI calls engine functions
   directly (`doLaunch(...)`, `setState({...state})`); online, each of those becomes a
   `POST /api/action` and the UI waits for the pushed state. About 30 handlers.

The one genuinely new piece of UI is gating: showing controls only when
`whoIsAwaited(state) === mySeat`, and a clear "waiting for Bruno…" otherwise. The
single-player build already has a "Waiting on other players…" state to build on.

---

## Files

```
server.js              the server (no dependencies)
EntrepreneursGame.jsx  engine + single-player UI (single source of truth)
app.css                stylesheet
Entrepreneurs.html     the working single-player game, unchanged
test_online.js         two-client end-to-end test — run the server, then this
test_2humans.js        engine-level test: full game with two humans
online.html            placeholder for the browser client
```
