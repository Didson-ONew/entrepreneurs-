# Beginner mode — the spec, before any of it is built

A shorter game that teaches the loop. Playtesters say teaching is the
bottleneck, not balance, so this exists to get somebody through a whole arc —
build, produce, sell, pay suppliers, watch prices move — in one sitting,
without the subsystems that need a second explanation.

**Nothing here is implemented.** This is the agreed design, written down so the
decisions survive the conversation that produced them.

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

## Open questions, for measurement or for a table

- Does 8 quarters give anything time to compound, or does the game end before
  the second-order effects a euro player came for ever appear?
- A player who loses their only companies early has no way back: no BUY, no
  reclaim, no renovate. At 8 quarters that may be survivable. It may also be
  four quarters of nothing to do.
- With no upgrades, is RESEARCH-into-a-level-3-card the dominant line? It is
  the only way to a big footprint, and the only way to reach column 4.
- Do personas stay? Several of them modify actions this mode removes.
