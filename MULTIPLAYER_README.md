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
| `GET /api/presence?id=` | heartbeat → `{online, matches, waiting, seated}` for the live counters |
| `GET /api/stats` | the hall of fame and match statistics, drawn from `matches.jsonl` |
| `GET /api/variants` | the optional-rule catalogue the lobby renders its toggles from |
| `GET /api/whoami` | who this browser is, from its cookie → `{id, name, returning}` |
| `POST /api/whoami` `{name}` | remember a name for next time |
| `GET /api/nickname?name=` | is that name already someone's? → `{name, taken, mine, others}` |

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
OnlineApp.jsx          the online client: lobby, waiting room, table panel
Rulebook.jsx           the in-game rulebook and the live online/match counters
Records.jsx            the hall of fame, statistics and recent games panel
matchlog.js            records finished games and computes the statistics
rulebook.data.mjs      the rules text — the single source of truth for both books
make_rulebook.mjs      writes RULEBOOK.md and RULEBOOK_PLAYERS.md from that data
build.mjs              bundles the two shipped pages
app.css                stylesheet
Entrepreneurs.html     built single-player page  ← generated, do not hand-edit
online.html            built online client       ← generated, do not hand-edit
RULEBOOK.md            full rules + designer's notes  ← generated
RULEBOOK_PLAYERS.md    the player-facing rules        ← generated
Entrepreneurs_Rulebook_v12.docx   the printed rulebook — the authority over all of the above
test_online.js         two-client end-to-end test — run the server, then this
test_2humans.js        engine-level test: full game with two humans
test_rulebook_v12.js   conformance: pins the engine to every clause of Rulebook v12
test_preventive.js     regression test: the Public Health Director rule (engine only)
test_preventive_ui.js  the same persona through the real page - needs the server
test_matchlog.js       the match record, the hall of fame and the statistics
test_records_ui.js     plays real games and reads the records back off the page
test_variants.js       every optional rule, and that they are all off by default
test_variants_ui.js    the lobby toggles, host to guest to finished game
audit_strategy.js      are the bots competing for the points actually on the table?
test_identity.js       the name-remembering cookie, and that it grants nothing
test_nickname.js       the "someone already plays as that" warning
test_scoring_once.js   a company scores once per build or upgrade, not once a year
testkit.js             shared: drives one seat through a whole game over HTTP
```

`build.mjs` also stamps `ENGINE_VERSION` from a hash of the rules code, so changing
a rule always moves it. The server prints the version it loaded at boot and the
client compares it with its own — if you deploy new pages without restarting the
server, the page says so instead of quietly playing by the old rules.

## Building

The two `.html` files are single self-contained pages with the stylesheet and the
whole React bundle inlined, so they work over HTTP or straight off the disk. They
are **generated** — edit the `.jsx` sources and rebuild:

```bash
npm install     # esbuild + react, one time
npm run build   # regenerates both rulebooks and both pages
```

The server itself still has zero runtime dependencies; the build tools are only
needed if you change the client.

## Rule variants

Six optional rule changes, listed in `VARIANTS` in `EntrepreneursGame.jsx` and served
to the lobby by `GET /api/variants` so the switches can never drift from the engine.
All are **off by default** — a table that touches nothing plays the printed rulebook.
The host sets them in the waiting room (`POST /api/options {variants}`); guests see
what was chosen but cannot change it. Single-player has the same switches on its
setup screen.

They live on `state.variants`, and the board carries `lhOnPlots` as well because the
hub helpers take a board rather than a state. `normaliseVariants` reads only the keys
the engine knows, so nothing off the wire can invent one; `/api/options` merges, so
naming one variant does not switch the others off.

Whichever were on is recorded with the finished game, so a variant table is never
mistaken for a standard one in the records.

## Records

Every game the server finishes is appended to `matches.jsonl`, one JSON object per
line: who played, what they scored, where their EP came from, and which rules build
ran it. `GET /api/stats` turns that into a hall of fame ranked by total EP, plus
statistics, and the **Records** button shows it on every screen.

A few things worth knowing:

- **Only games the server runs are recorded.** A single-player page keeps its game
  in the browser; letting a browser post its own score would make the hall of fame a
  text box rather than a record.
- **Players are the name they type.** There are no accounts, so two people sharing a
  name share a row. Names are matched case-insensitively with whitespace collapsed.
  The lobby warns about this *before* it happens: as you type, it asks
  `GET /api/nickname` whether anyone else has finished a game under that name, and says
  so. It is advice, not a lock — someone who cleared their cookies must still be able to
  type their own name — so the buttons keep working either way. Each record stores the
  `pid` of the browser that played the seat, which is the only thing that tells a
  returning player apart from a stranger; nothing is scored on it.
- **Bots never enter the hall of fame**, and a seat handed to a bot part-way through
  earns its player nothing for that game.
- **`matches.jsonl` is your data, not source** — it is gitignored. Back it up if you
  care about it, and see HOSTING_GUIDE.md before hosting somewhere with a disk that
  does not survive a restart. `MATCHES_FILE=/some/path` moves it.

## Remembering who you are

Typing your name every visit is a small annoyance, so the server sets one cookie,
`ent_player`, holding an id it generated and the last name you played under. Coming
back, the lobby fills the field in and says "Welcome back, X"; typing over it wins,
and playing under the new name is what updates the cookie.

It is deliberately thin:

- **HttpOnly, SameSite=Lax, a year long**, `Secure` when the request arrived over
  https. Page scripts cannot read it, so nothing on the page can leak it.
- **It is not signed, so it grants nothing.** Room membership and host rights still
  ride on the per-room token the server mints for each seat — copying somebody's
  cookie gets you their name in a text box and nothing else. `test_identity.js` tries
  exactly that and checks it fails.
- **A corrupt or forged cookie reads as a first visit** rather than an error: the id
  must look like an id, the name is trimmed, whitespace-collapsed and cut to 24
  characters, or it is thrown away.
- **The records do not use it.** The hall of fame is still keyed on the name you
  typed, so nothing about who gets credit for a game has changed.

The single-player page asks the same endpoint, so the two entry points agree; opened
straight off the disk there is no server to ask and its own `localStorage` is the
whole story.

## The rulebook

`rulebook.data.mjs` holds the rules as data, once. Three things read it:

- **the game** — `Rulebook.jsx` renders it as an in-game rulebook, reachable from
  every screen, and deliberately skips every `note` block;
- **`RULEBOOK.md`** — the complete edition, designer's notes included;
- **`RULEBOOK_PLAYERS.md`** — exactly what players see in the game.

So a rule cannot be right in the book and wrong in the game: there is one copy.

The printed **Rulebook v12** (`Entrepreneurs_Rulebook_v12.docx`) is the authority above
both. `test_rulebook_v11.js` pins
the engine to it clause by clause - starting capital, the card tables, the price
curve, how the pots divide, what going public does, the tiebreak - so a change that
contradicts the printed rules fails a test that names the sentence it broke.
