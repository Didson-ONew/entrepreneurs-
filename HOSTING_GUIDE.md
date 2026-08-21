# How to host Entrepreneurs and play with your friends
### A guide that assumes nothing

There are three ways to play, from easiest to most permanent:

| | Good for | Needs an account? | Survives closing your PC? |
|---|---|---|---|
| **A. Same wi-fi** | Friends in the same house | No | No |
| **B. Quick internet link** | A game night, friends anywhere | No | No |
| **C. Hosting on Render** | Playing regularly | Yes | **Yes** — the records only if you attach a disk |

Whichever you choose, do **Step 0** and **Step 1** first.

---

## Step 0 — Install Node.js (one time only)

Node.js is the free program that runs the game server. Nothing else is needed.

1. Go to **https://nodejs.org**
2. Click the big green **LTS** download button
3. Run the installer, click Next until it finishes (all defaults are fine)

To check it worked: open a terminal —
- **Windows:** press the Windows key, type `cmd`, press Enter
- **Mac:** press Cmd+Space, type `terminal`, press Enter

Type `node -v` and press Enter. If you see something like `v22.11.0`, you're set.

---

## Step 1 — Get the game running on your computer

1. Unzip **Entrepreneurs_Multiplayer.zip** somewhere easy, e.g. your Desktop.
   You should end up with a folder containing `server.js` and other files.
2. Open a terminal (see Step 0) and go into that folder:
   - **Windows:** type `cd Desktop\entrepreneurs` (or wherever you unzipped) and press Enter.
     Tip: type `cd `, then drag the folder from Explorer onto the terminal window, press Enter.
   - **Mac:** type `cd ` (with a space), drag the folder onto the Terminal window, press Enter.
3. Type: `node server.js` and press Enter.
4. You should see: `Entrepreneurs server on http://localhost:8080`

**That terminal window is now the game server. Leave it open while you play.**
Closing it ends the server (nobody can play). To stop it on purpose: press Ctrl+C.

5. Test it yourself: open your browser and go to **http://localhost:8080**
   You should see the ENTREPRENEURS lobby. Type a name, pick some bots, Create room —
   you're in. This is exactly what your friends will see.

---

## Where the server keeps what it must not lose

Three things outlive any single game, and all three live in **one folder** called
`data`, next to `server.js`:

| File | What it is |
|---|---|
| `accounts.json` | reserved names and password hashes — **treat it like a password list** |
| `matches.jsonl` | every finished game: this *is* the hall of fame and the statistics |
| `feedback.json` | playtest notes people wrote in |

**Read this bit if you host it anywhere but your own computer.** Most free hosting
replaces the whole application folder on every deploy, and `data` is inside it — so a
redeploy silently takes the accounts, the hall of fame and the notes with it. Everyone
has to register again and the record book starts from nothing. Put the folder somewhere
a deploy cannot reach:

```bash
ENT_DATA_DIR=/var/lib/entrepreneurs node server.js
```

Point it at a mounted disk your host promises to keep. That one variable moves all
three files together.

The server tells you where the data is every time it starts, and how much of it there
is. If it says `accounts 0` when you know there were twelve, the disk was wiped — and
it warns you outright when the folder is somewhere a deploy can delete:

```
Data directory: /var/lib/entrepreneurs
  accounts     12  /var/lib/entrepreneurs/accounts.json
  matches      87  /var/lib/entrepreneurs/matches.jsonl
  feedback      5  /var/lib/entrepreneurs/feedback.json
```

Files from an older version sitting loose next to `server.js` are moved into the folder
automatically the first time you start it, so upgrading never costs you the hall of
fame. The old single-file variables still work and still win if you set them:
`ACCOUNTS_FILE`, `MATCHES_FILE`, `FEEDBACK_FILE`.

To back it up, copy the folder. To move the game to another machine, copy the folder.

A game in progress is not saved — it lives in memory and ends when the server stops,
either way.

---

## Reserving your name (optional)

The hall of fame remembers players by the name they type. That is fine among friends,
but it does mean anybody could type your name and have their score added to yours. If
that matters to your group, players can **reserve a name**: click *reserve your name*
in the lobby, pick a password and give an email address. From then on, only that
person can play under that name — everyone else gets told to pick another.

Nobody has to do this. Guests play exactly as before under any name that is not
reserved.

Two things to know if you host it:

**1. Accounts live in `data/accounts.json`.** Treat it like a password list, because
that is what it is (scrambled, but still). Never put it in a shared folder or a public
repository, and put the `data` folder on a disk a deploy cannot wipe — see *Where the
server keeps what it must not lose* above:

```bash
ENT_DATA_DIR=/var/lib/entrepreneurs ENT_ADMINS=Dids,Didson node server.js
```

**2. "Forgot my password" needs a way to send email**, and a game server has no mail
account of its own. So by default the reset link is **printed in the server's own
terminal window** — the same window showing `Entrepreneurs server on ...`. If a friend
forgets their password, they click *Forgot password*, and you copy the link out of
that window and send it to them however you normally talk. For a server on your own
computer that is genuinely the simplest thing that works.

If you host it somewhere permanent and want real emails, set one of these before
starting the server and it will use it instead:

- `MAIL_COMMAND="sendmail -t"` — if your host has a mail command.
- `MAIL_WEBHOOK_URL="https://..."` — any mail service that accepts a JSON POST of
  `{from, to, subject, text}`; add `MAIL_WEBHOOK_AUTH="Bearer your-key"` if it needs
  a key. Also set `PUBLIC_URL` to the address your friends actually use, so the link
  in the email points at the right place.

The server prints which of these it is using when it starts, so you know before
somebody needs it.

**A word on passwords.** Anyone who can see traffic between a player and the server
can read a password sent over a plain `http://` link. Options B and C below both give
you `https://` and are fine. On Option A (same wi-fi, plain `http://`), tell people to
use a password they do not use anywhere else — or skip accounts entirely, which is
perfectly reasonable when everyone is in the same room.

---

## Option A — Friends in the same house (same wi-fi)

Your friends connect straight to your computer. Nothing leaves your network.

1. Find your computer's local address:
   - **Windows:** in the terminal type `ipconfig` → look for **IPv4 Address**, e.g. `192.168.1.42`
   - **Mac:** type `ipconfig getifaddr en0` → it prints e.g. `192.168.1.42`
2. Keep `node server.js` running (Step 1).
3. Tell your friends to open, on their phone or laptop (same wi-fi!):
   **`http://192.168.1.42:8080`** (using YOUR number, not this example)
4. You: Create room → a 6-character **room code** appears (e.g. `3F9A2C`).
5. They: type their name, enter the code under **Join a friend** → Join room.
6. When everyone's in, you press **Start game**.

*If friends can't connect: it's almost always the firewall on your PC. On Windows, the
first time you run `node server.js` a popup asks to allow access — click **Allow**.
If you missed it: Windows Security → Firewall → Allow an app → find Node.js →
tick both boxes.*

---

## Option B — Friends anywhere, quick link (game night)

You run the server on your PC and a free "tunnel" gives it a temporary internet address.

1. Keep `node server.js` running (Step 1).
2. Open a **second** terminal window, same folder, and type:
   ```
   npx localtunnel --port 8080
   ```
   (First time it asks "Ok to proceed? (y)" — press y and Enter.)
3. It prints a link like: `your url is: https://tidy-lions-know.loca.lt`
4. Send that link to your friends. That's it — they open it, enter their name,
   enter your room code, join.

Notes worth knowing:
- The first time a friend opens a loca.lt link, a plain page may ask them to click
  a **Continue** button — that's normal, it's the tunnel service, not a scam.
- The link dies when you close either terminal window. Next game night you run the
  same two commands and get a fresh link.
- If `localtunnel` is flaky, two equally free alternatives:
  - **Cloudflare:** download `cloudflared`, then `cloudflared tunnel --url http://localhost:8080`
  - **ngrok** (needs a free account): `ngrok http 8080`
  Both print a link that works the same way.

**Both terminals must stay open while you play** — one is the game, one is the link.

---

## Option C — Permanent hosting on Render (set up once, play any time)

The game runs on Render's computers, not yours. Anyone can join any time from a fixed
link, even when your PC is off.

The repository carries a **`render.yaml`**, so Render can read the settings from the
code instead of from a form somebody filled in once. Merging to `main` then deploys on
its own.

### Read this first: the free tier has no permanent storage

Render's free tier has **no persistent storage**. Its filesystem is rebuilt on every
deploy *and* every time the service wakes from sleep, so `accounts.json`,
`matches.jsonl` and `feedback.json` are erased over and over. That is what empties the
hall of fame and lets a reserved name be reserved a second time by somebody else.

A disk needs a paid instance type (Starter and up). But you do **not** have to pay to
keep your records — there is a **Backup** button that saves everything to a file on
your own computer, and puts it back afterwards. See *Keeping your records without
paying* below.

| | Costs | What you do |
|---|---|---|
| **Free instance** | nothing | press **Download a copy** before a deploy, **Put a copy back** after |
| **Instance with a disk** | Render's Starter price | nothing — it just stays |

### Setting it up with the blueprint

1. Push the game to GitHub if it is not there already.
2. Make an account at **https://render.com** (sign in *with GitHub* — easiest).
3. **New → Blueprint** → pick your repository. Render reads `render.yaml`.
4. Check what it offers. `render.yaml` asks for a **free** instance, so this costs
   nothing. If you later want the wipes to stop, the file's header comment says the
   three lines to add for a disk.
5. **Apply**. Two minutes later your permanent link is at the top of the page, like
   `https://entrepreneurs.onrender.com`.

**If you already have a Render service for this game**, a blueprint matches services
*by name*. The file calls it `entrepreneurs` — if yours is called something else,
rename it in the Render dashboard first, or change the name in `render.yaml`.
Otherwise Render builds a **second** service on a **new URL**, and the link you have
already given people keeps pointing at the old one.

### Setting it up by hand instead

You never have to use the blueprint. In the Render dashboard, on your service:

- **Build Command:** `npm install --include=dev && npm run build`
- **Start Command:** `node server.js`
- **Settings → Disks → Add Disk:** mount path `/var/lib/entrepreneurs`, 1 GB
- **Environment:**
  - `ENT_DATA_DIR` = `/var/lib/entrepreneurs` — **must match the mount path**
  - `TRUST_PROXY` = `1` — Render sits in front of the service, and without this the
    rate limiter treats the whole internet as one visitor
  - `ENT_ADMINS` = the account names that may read the playtest notes
  - `NODE_VERSION` = `22`

Do not set `PORT`; Render sets it and the server reads it.

### Checking it worked

Open the service's **Logs** in Render after a deploy. The server says where its data is
and how much of it survived:

```
Data directory: /var/lib/entrepreneurs
  accounts      3  /var/lib/entrepreneurs/accounts.json
  matches      12  /var/lib/entrepreneurs/matches.jsonl
  feedback      0  /var/lib/entrepreneurs/feedback.json
```

Three things to read in that block:

- **Counts of zero** when you know there were more: the disk was wiped, or
  `ENT_DATA_DIR` is not pointing at it.
- **`CANNOT WRITE`** beside a line: the disk is not mounted where the setting says, is
  read-only, or belongs to another user. The server will run and forget everything.
- **A `NOTE:` about the application folder**: the data is somewhere a deploy deletes.
  That is the free-tier situation, expected there and a mistake anywhere else.

Files left over from an older version beside `server.js` are moved onto the disk
automatically the first time the new server starts, so switching to a disk does not
cost you the records you already have.

### Keeping your records without paying

Sign in, open the **Playtest** button at the bottom of the screen, and go to the
**Backup** tab. Two buttons:

- **Download a copy** — saves one file to your computer with everything in it: the
  hall of fame, the registered names, and the notes people have written in.
- **Put a copy back** — pick that file again and everything comes back.

Do the first before you deploy, the second after. That is the whole routine.

**Putting a copy back can never cost you anything.** It only *adds*: games the server
has not seen, notes it has not seen, and names that are not registered on it. A name
that *is* registered is left exactly as it is, so an old copy can never undo somebody's
new password. The worst a wrong file can do is add games that already happened, and
doing it twice changes nothing the second time.

Keep the file somewhere private — it holds password hashes and the email addresses
people gave, so treat it like a password list.

### Games in progress are not lost any more

A game used to live only in the server's memory, so restarting it — a deploy, or the
free tier going to sleep after fifteen idle minutes — ended every game on the board.
A three-bot game waiting days for one player's move simply stopped existing.

Games are now written down as they are played and picked up again when the server
starts. Nobody has to do anything: the link and the table code still work, everyone
rejoins where they were, and the board is exactly as they left it. The server says so
when it starts:

```
Resumed 1 room (1 game in progress). Players rejoin with the link they already have.
  8F3652  Q6  Ana, Bruno
```

A game that has finished is not carried forward — it is already in the hall of fame —
and neither is a table nobody has touched in a fortnight.

One caveat on the free tier: this survives *restarts*, but the games are saved into the
same folder as everything else, so a **deploy** that replaces that folder takes them
too. A disk keeps them through both.

One quirk of the free tier: if nobody has opened the link for ~15 minutes, the first
visit takes ~30 seconds to wake up. After that it's instant. **Don't create the room
until everyone has the page open** — a sleeping restart wipes rooms in progress.

---

## How a game actually starts (any option)

1. **Everyone opens the link** and types their name.
2. **One person** (the host) clicks **Create room**, chooses how many **bots**
   (bots fill seats so 2 humans + 2 bots is a 4-player game), and reads out the
   **6-character room code**.
3. **Everyone else** types the code under **Join a friend** → **Join room**.
4. The host sees the player list fill up and presses **Start game**.
5. Play. The game clearly shows whose turn it is; when it's not yours you'll see
   *"Waiting for &lt;name&gt;…"*.

Good to know while playing:
- **Refreshing the page is safe.** You land right back in the game. Same for a phone
  that locked its screen — just reopen the tab.
- The **leave** link (top right) abandons the game for real.
- One room = one game. For a rematch, create a fresh room and share the new code.

---

## Updating your hosted game

When you get new files, upload **all of them that changed**, not just the page. In
particular the server reads the rules out of `EntrepreneursGame.jsx` when it starts, so
these three usually travel together:

| File | What it holds |
|---|---|
| `online.html` | the page your friends load |
| `EntrepreneursGame.jsx` | **the rules** — the server reads this at boot |
| `server.js` | rooms, turns and syncing |

If the page is newer than the rules file, a yellow bar appears at the top of the game
saying so, naming both versions — and the game refuses to start on the mismatch rather
than quietly playing by two sets of rules.

On Render you do not have to keep those in step by hand: the build command in
`render.yaml` rebuilds the pages from the rules on every deploy, so the two cannot
disagree. Merge to `main` and it redeploys in a couple of minutes; your link stays the
same. Restarting wipes any room in progress, so update between matches.

## Watching a game (spectators)

Anyone who types the room code of a game that has **already started** — or of a full
table — joins as a **watcher** instead of a player. There is no separate link and no
limit on how many can watch.

A watcher sees the whole board, standings, log and everything else live, and can use
chat and the voice call. They cannot take any action: the controls are not shown, and
the server refuses game actions from them even if someone tries to force one.

A banner across the top reminds them they are watching, and the waiting room lists
everyone currently watching.

## Chat and voice

Every room has a **Table** button in the bottom-right corner.

- **Chat** works everywhere, on any device, with no setup.
- **Voice** is a real call between the players. Click *Join voice call*; the browser asks
  for microphone permission the first time. **Audio travels directly between players and
  never passes through the server**, so hosting cost stays the same.

Two honest limitations:

1. Voice needs **HTTPS**. Your Render link is already https, so it works there. It will
   not work over a plain `http://192.168.x.x` LAN address, or a plain-http tunnel —
   browsers block microphone access on insecure origins (localhost is the one exception).

   **This one is easy to misread**, because it does not fail evenly: you, running the
   server, reach it on `localhost`, which counts as secure, so *your* microphone works
   and everything looks fine from where you are sitting. Your friends, on the LAN
   address, get nothing. The Voice tab now says so plainly on the machines it affects
   and greys the button out, instead of letting them press it and reporting a
   microphone problem that does not exist. If you want voice, use option B or C below;
   both give you an https address.
2. Roughly one connection in ten fails on strict company or mobile-carrier networks. The
   call uses free public STUN servers, which cover most homes but cannot punch through
   every firewall; the fix is a paid TURN relay. A player who can't connect is shown
   "could not connect" and can keep using chat.

## When something goes wrong

| Problem | Fix |
|---|---|
| `node` is "not recognized" | Node isn't installed (Step 0), or reopen the terminal after installing |
| `EADDRINUSE` when starting | Something already uses port 8080. Start with another port: **Windows:** `set PORT=3000 && node server.js` · **Mac:** `PORT=3000 node server.js` — then use `:3000` in every link |
| Friends on my wi-fi can't load the page | Allow Node through the firewall (see Option A) |
| The localtunnel link doesn't load | Close the tunnel terminal, run `npx localtunnel --port 8080` again for a fresh link; or try the cloudflared alternative |
| "No such room" when joining | Code typed wrong (it's 6 characters, 0-9 and A-F), or the server restarted since the room was made — create a new room |
| "That game already started" | No longer an error — they join as a watcher instead. A player who was already in just reopens the same link on the same device to resume |
| A player left / closed their browser and the game is stuck on them | The host sees **"Replace &lt;name&gt; with a bot"** on the waiting screen (and on the draft screen). A bot takes over their seat and play continues. They cannot rejoin afterwards |
| Someone needs removing before the game starts | Host clicks **remove** next to their name in the waiting room |
| I closed my tab and want back into my game | Just reopen the link on the **same device and browser** — you are put straight back in. (This only fails if the host already replaced you with a bot) |
| A player is stuck on the waiting screen after the host pressed Start | Fixed in the current build. If it still happens, check the small pill at the top right of their screen: **live** or **syncing** are both fine; **offline** means their browser can't reach the server at all — have them reopen the link |
| A yellow "older game rules" bar appears | Your `EntrepreneursGame.jsx` on the server is out of date — upload the current one and restart |
| A rule I asked for doesn't seem to apply online | Same cause: the rules live in `EntrepreneursGame.jsx`, which the server loads at boot. Check the boot log for the `Rules engine ...` line |
| Voice button does nothing / no permission prompt | The page must be on **https** (your Render link) or `localhost`. Microphone access is blocked on plain http addresses |
| One player can't be heard | Their firewall may be blocking peer connections; their name shows "could not connect". Chat still works |
| Someone clicked **Create room** when they meant to join | On their waiting-room screen click **"Cancel this room and go back"** — that returns them to the lobby so they can enter your code. (Closing the browser tab completely and reopening the link also works.) |
| Render link takes ages the first time | Free tier waking up — normal, ~30s, then fast |
| Everything is weird / stuck | Host: Ctrl+C the server, `node server.js` again, everyone reopens, make a new room |

---

## What about the single-player version?

`Entrepreneurs.html` in the same folder is the complete solo game against bots —
double-click it, no server, no internet, works forever. The online version and the
solo version are the same game with the same rules.
