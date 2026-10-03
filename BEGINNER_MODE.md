# Beginner mode — the design, and what it measured

A shorter game that teaches the loop. Playtesters say teaching is the
bottleneck, not balance, so this exists to get somebody through a whole arc —
build, produce, sell, pay suppliers, watch prices move — in one sitting,
without the subsystems that need a second explanation.

**Built, measured and playable.** The mode is complete behind the `beginner`
variant, `audit_beginner.js` measures it, and the UI pass has landed: the
actions the engine refuses - BUY, SELL, UPGRADE, RENOVATE, RECLAIM, GO PUBLIC -
no longer render, the lobby and the solo setup screen clamp the table to four,
and the rulebooks document it in all three languages.

## What it keeps

The entire supply-chain loop, untouched. Production sells into the demand
icons; operating costs go into the industry pots and are split among whoever
owns companies there; building pushes your own industry's price down a dollar
and each supplier's up one. That is the thing worth teaching and none of it
changes.

## What changes

| | full game | beginner |
|---|---|---|
| length | 12 quarters, 3 years | **8 quarters, 2 years** |
| Megacorps | go public, HQ, brand EP | **none** |
| Players | 2-6 | **2-4** |
| Personas | one each, six exist | **one each, four exist** |
| Raise Capital | LOAN, SELL | **LOAN only** |
| M&A | BUY, LAUNCH | **LAUNCH only** |
| R&D | RESEARCH, UPGRADE | **RESEARCH only** |
| Board Meeting | GO PUBLIC, REPOSITION, 2 seats | **REPOSITION only, one seat** |
| land | bought and sold separately | **claimed free by launching** |
| discs | 12 | **6** |
| cash scores | $50 a point, at the end | **bought at a year end, $50 then $100** |
| land awards | most plots + most districts | **most districts only** |
| demand reach | columns 1..level | **columns 1..level+1** |

## The rules that make it work

**Launching claims its ground, free.** Not a convenience — a precondition.
`doLaunch` refuses unless every plot is already `in board.owner`, and
`businessCanProduce` requires the same, so with no BUY nobody could build or
produce anything and the mode would not start. Land becomes part of a
company's setup cost rather than a separate purchase.

**A company's disc covers its whole footprint.** Today `discsUsed` is
`plotsOwned + companySlotsUsed + discsInBank`, so every plot costs a disc of
its own; five vertical companies would cost ten discs. Under this rule a
three-plot horizontal company costs one disc, and six discs reaches five
companies with one spare — which is the point of six.

**Six discs is one more than a full tableau.** Five company bays, five discs,
one left. A loan takes a disc, so one loan and you are at cap with a full
board; two loans and you can only field four companies. That tension is the
best thing the number buys.

**Land leaves with the company.** No BUY and no SELL means solvency is the only
exit, and when a company goes its ground goes with it. Nobody can buy it back.
Failure is final rather than a market event.

**Land scores districts only.** The Real-Estate Mogul is dropped; The
Omnipresent stays. This is what makes horizontal industries matter, because a
single company can span several districts for one disc.

**Companies reach one column higher than their level.** Level 1 reaches columns
1-2, level 2 reaches 1-3, level 3 reaches all four.

**Four personas, and four seats.** All six industries stay and play exactly as
they do in the full game, but only four of the six personas are dealt. The
Systems Architect and the Resort Developer both change how you UPGRADE, and
nothing is upgraded here, so a player holding either would have a specialism
that never comes up. The four that remain - Public Health Director, White-Label
Supplier, Supply Chain Expert, Concession Holder - all act somewhere this mode
still goes.

That is also why the table seats four. Four personas dealt to four players means
everybody has one and none is left over, so nobody is playing against a power
that is not on the table. The engine clamps the seat count and the lobby refuses
a fifth, re-clamping the bots if the mode is switched on after they are set.

Cutting the two industries instead was considered and does not work. Each
industry draws on exactly three of the other five and a level-3 card needs all
three, so an industry keeps its top card only if BOTH cut industries are among
its two non-suppliers - one specific pair per industry, different for each. At
most one industry can keep its level 3 whatever you cut. Filtering HO and TE
leaves 17 of 60 cards with Utilities and Retail on one card each; the best pair
of the fifteen, UT+TE, still leaves three industries with no level 3.

## Why the demand rule is not optional

The engine's own note on demand depth says a level-1 company "is unchanged,
because a level-1 company still only reaches the level-1 icon." In a mode with
no UPGRADE that is nearly every company, and a level-1 Retail company makes
four units while column 1 absorbs one. Most production would be dumped at $1.

What a clean row absorbs:

| level | columns 1..level | columns 1..level+1 |
|---|---|---|
| 1 | 1 unit | **3** |
| 2 | 3 units | **6** |
| 3 | 6 units | **10** |

It also makes the column-4 icon reachable at all, which today only a Healthcare
persona can manage.

**Keep it beginner-only.** Top-to-bottom capacity goes from 6x to 3.3x, which
is right where you cannot upgrade and wrong where you can - in the full game it
would quietly devalue the upgrade, and companies and upgrades are a third of
the scoreboard.

## Levels still exist without UPGRADE

`doLaunch` sets a horizontal company's footprint from the CARD's level
(`nPlots = SCALING[ind] === "H" ? bp.lvl : 1`) and has no prerequisite that a
lower level was built first. RESEARCH draws the top card of a deck, which is
shuffled whole and so can be level 2 or 3. So a player can draw a level-3
Utilities card and launch a three-plot company outright for its $30 setup.

That is what gives R&D a job beyond "draw a card", and what makes
districts-only land scoring a real race.

## What this costs, measured

Share of the winner's score in the full game, from `audit_ep_mix.js`:

| source | 2p | 4p |
|---|---|---|
| Companies & upgrades | 35.1% | 33.9% |
| Land awards (both) | 24.9% | 16.8% |
| Cash on hand | 15.2% | 14.3% |
| Industry debuts | 12.0% | 11.7% |
| Forming a Megacorp | 8.2% | 12.3% |
| Megacorp brand | 4.1% | 11.4% |

Dropping Megacorps removes about **12% of the scoreboard at two players and 24%
at four** — and it grows with table size, so the teaching mode differs most from
the real game at the biggest table it seats. Dropping The Real-Estate Mogul
removes roughly half of land's share.

Land's relative share was expected to go UP, because the denominator shrinks so
much. It did not - see below. Dropping the second award cost more than the
smaller scoreboard gave back.

## What the measurements said

200 games per arm at each of the mode's three table sizes, the full game on the
same seeds as a reference. The mode seats four, so 2p, 3p and 4p is the whole
sweep.

**Things compound.** The last two quarters carry 32.8% of the winning score at
two seats, 37.2% at three and 38.5% at four - against the full game's 30.4 /
35.8 / 36.1. The endgame is worth the same share of a short game as of a long
one. More is banked by halfway, 44-49% against 31-40%, which is what a shorter
game should look like.

**A bad start is not fatal**, and the mode is markedly gentler than the full
game. No seat ended with nothing standing at any table size (3.5-7.5% in the
full game), and almost none was ever emptied at all (0-2.8% against 32-42%). A
seat last at halfway reached the top half 34.9% / 44.6% / 32.9% of the time
against 29.7 / 43.8 / 24.9.

That has a consequence worth owning: **solvency is close to dead code here**. It
was kept as the only way out of a company, and it almost never fires.

**There is no single line.** Level 3 is 27.6-34.7% of what gets built against
the full game's 30.9-36.7%, and the winner's average company level is 2.07-2.19
against a table average of 1.91-2.07. RESEARCH-into-a-level-3 is a good line,
not the only one.

**Tension is fine.** Fewer lead changes per game than the full game - 1.70 /
2.40 / 2.68 against 1.83 / 2.88 / 3.31 - but more per QUARTER at every table
size, 0.21 / 0.30 / 0.34 against 0.15 / 0.24 / 0.28, because the game is a third
shorter. Games never headed at all run 13.5% at two seats against the full
game's 17.0%, and 9.0% / 6.5% at three and four against 6.0% / 2.0%.

### The one thing worth changing, and what was done about it

Megacorps were about a quarter of the scoreboard, and their share went to **cash
and industry debuts**, not to companies or land:

| winner's points from | beginner, before | full |
|---|---|---|
| companies | 38.3-41.0% | 33.6-35.6% |
| **cash** | **21.8-26.0%** | **13.3-14.9%** |
| industry debuts | 20.8-22.4% | 12.1-12.5% |
| land awards | 14.9-16.1% | 19.4-27.3% |

A quarter of the answer in the teaching game was holding money, which the full
game does not teach. The cause is structural: no land to buy, nothing to upgrade
and no Megacorp to form leaves money with nowhere to go, and a seat ended this
mode on about as much cash as a full game three quarters longer.

**Cash now has to be spent to score.** It buys EP at a year end and nowhere
else, at $50 a point at the end of Year 1 and $100 at the end of Year 2, and
money still on the table when the game ends is worth nothing. Buying early is
half price, and early is exactly when you are poorest and need the money to
build - which is the decision the rule exists to create. 300 games per arm:

| | 2p | 3p | 4p | full game |
|---|---|---|---|---|
| **cash** | 21.7 → **12.5%** | 21.8 → **11.7%** | 26.4 → **14.5%** | 15.3 / 14.0 / 14.4% |
| cash at the end | $491 → $45 | — → $47 | $494 → $48 | $532 / $445 / $500 |
| companies standing | 4.44 → 4.39 | — → 4.33 | 4.45 → 4.45 | 2.6-2.8 |
| land awards | 15.3 → 18.1% | — → 18.3% | 14.5 → 17.9% | 26.8 / 21.7 / 17.8% |
| lead changes | 1.69 → 1.60 | 2.40 → 2.37 | 2.65 → 2.74 | 1.87 / 2.85 / 3.32 |
| never headed | 15.3 → 14.3% | — → 7.7% | 8.0 → 5.7% | 17.0 / 6.0 / 1.7% |

Nothing paid for it. Companies standing held, tension held, and land recovered
about three points. The money went to companies (43.5-45.4%) and industry debuts
(24.1-25.2%).

**A launch-time ground charge was measured first, and rejected.** Charging for
the plots a company claims looked like the obvious sink and fails twice. A flat
fee breaks the opening - starting capital is $16-25 and the cheapest company is
$10, so a flat $15 a plot left 0.20 companies standing and a winning score of
9.4. And the board's own price, which is gentler early, is REGRESSIVE by
construction: it rises with what is already built, so whoever builds first makes
the ground dearer for everyone behind them. At two seats that put **43.3% of
games wire to wire against 14.7%**, in a mode whose whole point is that a bad
start is not fatal.

**Kept out of the full game.** It has land, upgrades and Megacorps to spend on,
and cash is a healthy ~14% there. Applied to it anyway, cash fell to 7.5% and
games led wire to wire went from 2.3% to 6.5% over 400 games at four seats.
Nothing asked for that.

## Open questions, for measurement or for a table

The first three are answered above: yes it compounds, no a bad start is not
fatal, and no there is not one line. What is left:

- **Solvency almost never fires.** It is the only exit and it is close to
  unreachable, so a teaching game may never show a player what failure looks
  like. That may be right for a first game.
- **Four personas, or none?** The two that only touch UPGRADE are out and the
  table seats four so the remaining four deal exactly. Whether a first-time
  player wants a personal power at all is a table question, not a measurable
  one.
