# Entrepreneurs — physical playtest feedback

Every paper feedback form from a face-to-face session, transcribed. The forms
themselves are photographs; this is the only searchable copy, and it exists
because evidence that lives in a camera roll is evidence nobody can check.

Scale is 1–5. The form labels it "1 = Poor/Too Little, 5 = Excellent/Too Much",
which makes **Game Length ambiguous** — some players read it as a quality score
and some as "how long did it feel", and two struck the Too Little/Too Much
wording out. That column is reported per player and deliberately **not**
averaged.

Quoted text is verbatim, including the swearing and the spelling.

| Player | Version | Playtime | Enjoy | Length | Clarity | Depth | Theme |
|---|---|---|---|---|---|---|---|
| Amy | v1.0 | 2h30 (1 year only) | 2 | 2 | 5 | 5 | 5 |
| Michael Boggs | v1.0 | 120 min | 3 | 2 | 2 | 5 | 5 |
| Nikola | v2.0 | 180 min | 4 | 3 | 2 | 4 | 5 |
| Flora | v2.0 | — | 5 | 5 | 3 | 5 | 5 |
| Amber | v20 | 135 min | 3 | 3 | 2 | 3 | 4 |
| Tiago Monteiro | v20 | 150 min | 4 | 1 | 4 | 4 | 4 |
| Rick Chuang | — | 4h (left at Year 3) | 4 | 2 | 4 | 5 | 5 |

**Means across seven players:** Enjoyment 3.6 · Clarity 3.1 · Strategic depth
4.4 · Theme immersion 4.7.

The shape is consistent and worth stating plainly: **theme and depth land,
clarity does not, and length is the common complaint.** Four of seven rate
depth at 5 and five of seven rate theme at 4 or 5; four of seven put clarity at
2 or 3.

---

## Amy — v1.0, 2h30 for one year of play

- **Most satisfying:** "Every cards has dependency"
- **Frustrated/confused:** "being 4th player"
- **Over/underpowered:** Overpowered — "because 4th player have to spend money, then get back in choosing action"
- **The goal, in her words:** "Investment"
- **Magic wand:** "Every starter player gets same resources + money"
- **Play again:** "Yes if the player set changes"

## Michael Boggs — v1.0, 120 min

- **Most satisfying:** "I loved taking from the collective pot."
- **Frustrated/confused:** "Confused! It took me 3 to 4 rounds to see the big picture."
- **Over/underpowered:** "Not that I saw."
- **The goal, in his words:** "Build a detailed economy engine."
- **Magic wand:** "Simplify somewhere (although it's hard to say where)."
- **Play again:** "Yes, absolutely. I think it's a game that may require a few plays to 'get', and that's okay. Some people will fucking love this game."

## Nikola — v2.0, 180 min

- **Most satisfying:** "I liked combining bus. 2 dep. where 1 covers the others"
- **Frustrated/confused:** "Hires need a lot more clarification. Some cards need price reduction or ability improvement."
- **Over/underpowered:** "'Assistant' hire should not be able to step into occupied slot."
- **The goal, in their words:** "Learning how demand and supply work. It really does educate young entrepreneurs some valuable skills."
- **Magic wand:** "I would add more interaction between buildings."
- **Play again:** "I can't wait to play it again and experiment with different strategies."

## Flora — v2.0

- **Most satisfying:** "Acquiring a certain asset and combo"
- **Frustrated/confused:** "The bored part is rule explanation takes too long. And I'm confused about rules."
- **Over/underpowered:** "Assistant is overpowered"
- **The goal, in her words:** "I'd tell my friends it's a game with a very well-rounded strategy"
- **Magic wand:** "We can use money to get some points, even very little."
- **Play again:** "Yes."

## Amber — v20, 135 min

- **Most satisfying:** "Getting more cards from 1 industry and reveal higher level cards."
- **Frustrated/confused:** "I thought building higher level buildings will give me more rewards, but I couldn't sell my products due to market limitations."
- **The goal, in her words:** "Expand and upgrade your business to get points"
- **Magic wand:** "Limit the industries for beginner mode"
- **Play again:** "Maybe. I like it when market demand/supply changes the price of materials"

## Tiago Monteiro — v20, 150 min

- **Most satisfying:** "Building vertical and horizontal, board meeting, building hubs, positioning of buildings"
- **Frustrated/confused:** "Revenue phase was a bit difficult to understand at first"
- **Over/underpowered:** "Focusing on high level utility building from turn one"
- **The goal, in his words:** "Build your economy and obliterate your competitors"
- **Magic wand:** "More flexibility to build"
- **Play again:** "Yes. To explore more opportunities to interact with other players"

## Rick Chuang — 4 hours, had to leave at Year 3

- **Most satisfying:** "MEGA CORP"
- **Frustrated/confused:** "FIRST PLAYER ADVANTAGE IS WAY TOO HIGH. NOT ONLY THE FIRST PLAYER IS HANDED THE FIRST TO ACT, THEY ALSO START WITH THE MOST MONEY. THE LAST PLAYER IS BASICALLY FORCED TO FORFEIT ONE ROUND, WHILE OTHERS WHO ALREADY HAVE THE ADVANTAGE TO KEEP BUILDING. ON TOP OF THAT, THE FIRST PLAYER DROPS DOWN TO ONLY THE SECOND POSITION. BEING SELECTED AS THE FIRST PLAYER IS BASICALLY GODSEND."
- **Over/underpowered:** "OVERPOWERED => FIRST PLAYER. UNDERPOWERED => LAST PLAYER. THESE COMBINED IS THE MAIN ISSUE"
- **The goal, in his words:** "BECOME/EMBODY DISNEY OR 20TH CENTURY FOX"
- **Magic wand:** "REVERSE THE STARTING MONEY. THE LAST PLAYER SHOULD HAVE SOME CATCH UP MECH."
- **Play again:** "YES. THOUGH, A FEW THOUGHTS. TO FIX THE GAME LENGTH: 1. DO 3Q PER YEAR INSTEAD OF 4? OR THE 4TH Q IS A SPECIAL ACTION Q INSTEAD OF REGULAR 2 ACTIONS => FOR EXAMPLE: AN EVENT CARD IS REVEALED THAT ALTERS THE MARKET, LIKE HEALTH INCIDENT, NATURAL DISASTER, GOV. CORRUPTION."

---

## What has been done about each

**The seat you are dealt — Amy and Rick, months apart, named the same thing.**
Measured in `audit_seat.js`, and the table's reading turned out to be back to
front: **seat 1 is the worst seat, not the best.** At three players it wins
27.9% against a 33.3% baseline and finishes 6.6 EP behind seat 3 on 40.0%,
because the compensation for sitting late — three Blueprints against seat 1's
one, and drafting first — beats the $6 of extra capital by a distance. Rick's
wand, reversing the capital, makes it *worse*; so does rotating turn order. The
only arm that closes the gap is equal capital **and** equal cards, which lands
32.5 / 33.8 / 33.8 against a shipped spread of 12.1 points. Not yet applied: it
is a real change to the opening and wants a decision, not a default.

What the simulation honestly cannot see is delivery order. Bots do not fight
over demand icons the way a table does, and first delivery into first-come
icons is the other thing seat 1 holds. A table saying seat 1 is a godsend is
probably pointing at that.

**Rules clarity — four of seven at 2 or 3**, with "rule explanation takes too
long", "confused about rules", "3 to 4 rounds to see the big picture", and
"Revenue phase was a bit difficult to understand at first". `TEACH.md` is a
ten-minute teaching script written against exactly this, and the beginner game
(8 quarters, four actions, no Megacorps) exists to give a table a first pass
without the whole rule set.

**Game length.** Rick's suggestion of a special fourth quarter carrying an
event card that alters the market is close to the **Events** expansion already
drafted on the sell sheet, and worth testing as a core-box variant rather than
an expansion.

**Amber's "I couldn't sell my products due to market limitations"** is the
clearest player-side report of the thing the rebalance went after: production
that finds no demand icon. Retail and Manufacturing still dump over half their
output at $1, which is intended for them — but a player who builds *up* and
cannot sell is reading the same wall from the inside.

**"Assistant" hire overpowered — Nikola and Flora, independently.** This is a
v2.0 mechanic that predates the current Personas; recorded because two players
flagged the same card without conferring, which is the strongest signal a paper
form can give.
