# Beginner mode — the spec, before any of it is built

A shorter game that teaches the loop. Playtesters say teaching is the
bottleneck, not balance, so this exists to get somebody through a whole arc —
build, produce, sell, pay suppliers, watch prices move — in one sitting,
without the subsystems that need a second explanation.

**Built and measured.** The engine mode is complete behind the `beginner`
variant and `audit_beginner.js` measures it. What is NOT done is the UI: the
engine refuses BUY, UPGRADE, RENOVATE, RECLAIM and GO PUBLIC, but their buttons
still render, so a human would click them and nothing would happen. That pass
has to land before anyone plays it.

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
| Personas | one each | **none** |
| Raise Capital | LOAN, SELL | **LOAN only** |
| M&A | BUY, LAUNCH | **LAUNCH only** |
| R&D | RESEARCH, UPGRADE | **RESEARCH only** |
| Board Meeting | GO PUBLIC, REPOSITION, 2 seats | **REPOSITION only, one seat** |
| land | bought and sold separately | **claimed free by launching** |
| discs | 12 | **6** |
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

**Nobody has a persona.** All six industries stay and play exactly as they do in
the full game, but no player is dealt a specialism. Two of the six personas -
the Systems Architect and the Resort Developer - change how you UPGRADE, and
nothing is upgraded here, so they would do nothing at all. Dealing the other
four and not those two would be worse than dealing none: a persona is an
asymmetric power that has to be read, understood and weighed against the draft
before the first card is taken, which is the second explanation this mode exists
without.

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

| source | 2p | 4p | 6p |
|---|---|---|---|
| Companies & upgrades | 35.1% | 33.9% | 32.3% |
| Land awards (both) | 24.9% | 16.8% | 12.9% |
| Cash on hand | 15.2% | 14.3% | 14.7% |
| Industry debuts | 12.0% | 11.7% | 11.1% |
| Forming a Megacorp | 8.2% | 12.3% | 14.4% |
| Megacorp brand | 4.1% | 11.4% | 14.3% |

Dropping Megacorps removes about **24% of the scoreboard at four players and
29% at six** — and it grows with table size, so the teaching mode differs most
from the real game at exactly the big tables people are taught at. Dropping The
Real-Estate Mogul removes roughly half of land's share.

Land's RELATIVE share will likely go up rather than down, because the
denominator shrinks so much. Worth checking against the intent.

## What the measurements said

150 games per arm per table, the full game on the same seeds as a reference.

**Things compound.** The last two quarters carry 31.6% of the winning score at
two seats, 38.5% at four, 36.0% at six - against the full game's 31.2 / 35.4 /
36.9. The endgame is worth the same share of a short game as of a long one.

**A bad start is not fatal**, and the mode is markedly gentler than the full
game. No seat ended with nothing standing at any table size (3.7-8.2% in the
full game), and almost none was ever emptied at all (0-0.5% against 32-53%). A
seat last at halfway reached the top half 34.5% / 35.7% / 19.0% of the time
against 28.6 / 24.1 / 20.9.

That has a consequence worth owning: **solvency is close to dead code here**. It
was kept as the only way out of a company, and it almost never fires.

**There is no single line.** Level 3 is 26-33% of what gets built against the
full game's 29-37%, and the winner's average company level is 2.11-2.18 against
a table average of 1.93-1.96. RESEARCH-into-a-level-3 is a good line, not the
only one.

**Tension is fine per quarter** and lower per game, which is arithmetic: 2.53
lead changes at six seats against 4.11, over eight quarters against nearly
twelve - 0.32 a quarter against 0.35.

### The one thing worth changing

| winner's points from | beginner | full |
|---|---|---|
| companies | 35.7-41.1% | 30.8-35.3% |
| **cash** | **20.6-25.4%** | **13.1-15.4%** |
| industry debuts | 19.6-23.5% | 11.1-12.2% |
| land awards | 16.1-20.5% | 18.4-27.4% |

Megacorps were 24-29% of the scoreboard, and their share went to **cash and
industry debuts**, not to companies or land. A quarter of the answer in the
teaching game is holding money, which the full game does not teach - somebody
who learns here learns to sit on cash and then meets a game where that is worth
half as much.

Land holds up on the districts award alone, and at six seats is worth MORE than
in the full game, so the districts-only call is sound.

## Open questions, for measurement or for a table

The first three are answered above: yes it compounds, no a bad start is not
fatal, and no there is not one line. What is left:

- **Cash at a quarter of the score.** The obvious levers are what cash converts
  at, or paying the districts award more so building outward competes with
  sitting on the bank. Neither is measured yet.
- **Solvency almost never fires.** It is the only exit and it is close to
  unreachable, so a teaching game may never show a player what failure looks
  like. That may be right for a first game.
- **Do personas stay?** Several modify actions this mode removes.
- **The UI pass**, which is the only thing between this and a table.
