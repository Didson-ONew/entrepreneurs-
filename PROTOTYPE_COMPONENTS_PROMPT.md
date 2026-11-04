# Prompt for Claude Design — physical prototype components

THE PRINT-AND-PLAY SET IS GENERATED NOW. `node make_components.mjs --pdf` writes
`Entrepreneurs_Components_v23.html` and the PDF from the engine's own data, and
`test_components.js` checks the file against the engine. This prompt is kept for
a designer who wants to restyle the set in an external tool: the brief below
describes the v23 components, and the generated file is the reference layout.

Every number in it is read from the shipped engine (`EntrepreneursGame.jsx`) as
of Rulebook v23: revenue by band, three phases, an eight-quarter game, rows
open from the first quarter. Re-check the constants block after any rules change.

---

I'm prototyping a medium-heavy economic euro board game called **Entrepreneurs**
and I need a complete set of print-and-play components. I'll be printing these
at home on A4 and US Letter, cutting them by hand, and playing on a table — so
design for *that*, not for a factory.

Build me a **design system first, then the components**, delivered as separate
artboards I can print one per sheet.

## What the game is

2–6 players build companies in a 4×4 city of districts. Every company pays
operating costs each quarter to companies in *other* industries — its suppliers
— and those payments are the heart of the game. Building a company pushes its
own industry's price down and each of its suppliers' prices up, so the market is
the sum of what everyone at the table has built. It runs 8 quarters over 2
fiscal years (a three-year variant plays 12); a second Megacorp calls the
following quarter as the last one. Every company is paid once a quarter by the
BAND of demand icons it reaches - count the icons, read the band on the card,
multiply the industry's price - so nothing is delivered and nothing is recycled.

The tone should be **corporate-modern, not sci-fi and not cute**: think an
annual report or an architect's site plan rather than a cartoon city. Clean,
confident, information-dense but legible across a table at arm's length.

## Non-negotiable constants

These are the game's actual values. Do not invent, round, or "improve" them.

**Six industries** — each has a two-letter code, a colour, a base price, and a
scaling direction (Horizontal companies spread across adjacent plots as they
level up; Vertical ones stack on one plot):

| Code | Name | Colour | Base price | Scaling |
|---|---|---|---|---|
| UT | Utilities | `#D9C70D` | $4 | Horizontal |
| RE | Retail | `#5DD067` | $4 | Vertical |
| HO | Hospitality | `#DA421D` | $5 | Vertical |
| MA | Manufacturing | `#744BAA` | $5 | Horizontal |
| HC | Healthcare | `#324DE1` | $6 | Vertical |
| TE | Technology | `#DD61B0` | $6 | Horizontal |

These six are checked in CIE Lab against the three dichromacies (audit_palette.js);
the generated set pairs each with a glyph: UT triangle, RE square, HO circle, MA
hexagon, HC cross, TE diamond.

**Critical accessibility requirement:** these six hues are not distinguishable
by every player, and two of them (HO and TE, RE and UT) are close in value. Give
every industry a **second, redundant channel** — a distinct geometric glyph, or
a distinct fill pattern, used consistently on every component where the industry
appears. A player must be able to play the whole game in greyscale. This is the
single most important constraint in the brief.

**Price track:** $2 to $12, one marker per industry, one cell per whole dollar
(11 cells). No blank cells. Beside each industry's row sits its BAND LADDER: for
levels 1-4, the icon count at which the $$ and $$$ bands begin and the three
multipliers the price is multiplied by. Price x band is the whole revenue rule.

**Player colours** (up to 6): `#22D3EE` `#FB923C` `#A78BFA` `#FB7185` `#4ADE80`
`#FACC15`. These must not be confusable with the six industry colours — that
distinction carries real information on the board, since a disc shows *who* and a
block shows *what*.

**Other values:** 12 discs per player · max 5 active companies (6 with the IPO
tile) · rent $2 per company level · cash scores 1 EP per full $100 · 2 Megacorps
ends the game · a Megacorp HQ banks its industry's price ÷ tier every quarter and pays 1 EP a quarter to each rival company beside it · loans $20 for a disc, bought back for $30 at the end of Year 1 and $40 at Year 2 ($50 at Year 3 in the three-year game).

**The band table** (icons at which $$ and $$$ begin, then the three multipliers):

| | L1 | L2 | L3 | L4 |
|---|---|---|---|---|
| UT | 1 / 2 → 1·1·2 | 4 / 6 → 2·4·6 | 7 / 12 → 7·10·12 | 14 / 24 → 23·24·24 |
| RE | 2 / 3 → 1·2·4 | 5 / 8 → 4·6·8 | 7 / 12 → 6·10·14 | 12 / 20 → 10·17·24 |
| HO | 1 / 2 → 1·1·2 | 2 / 4 → 1·3·4 | 5 / 8 → 3·6·8 | 10 / 16 → 7·13·16 |
| MA | 2 / 4 → 2·3·4 | 5 / 8 → 4·7·8 | 10 / 16 → 7·14·16 | 19 / 32 → 10·25·32 |
| HC | 2 / 3 → 1·2·3 | 4 / 6 → 2·4·6 | 7 / 12 → 5·9·12 | 14 / 24 → 13·20·24 |
| TE | 1 / 2 → 1·2·2 | 2 / 4 → 1·4·4 | 3 / 6 → 1·6·8 | 4 / 8 → 2·9·16 |

## The components I need

### 1. The city board
A 4×4 grid of **16 districts**. Each district is a 3×3 block in which **4 of the
8 compass positions hold a plot** and the centre never does — the centre is where
the district's name goes. Plot positions are drawn from NW, N, NE, W, E, SW, S,
SE. **64 plots total.**

This geometry matters and must be exact: adjacency crosses district borders, so a
Horizontal company can spread from one district into the next. Two plots are
neighbours if they are orthogonally adjacent on the underlying 12×12 grid,
regardless of which district they sit in. Don't draw districts as tidy 2×2 blocks
— that would put non-adjacent plots side by side and make the geometry a lie.

District names are two characters (examples: CC, IA, LM, FC, C4, A1, R5, R1, I3,
A3). Plots need to be big enough to hold a stack of blocks plus a disc underneath.

### 2. The demand grid, on the district tile
Each district tile carries its **4×4 grid of demand icons** in its middle cell:
4 rows, each labelled with one industry (fixed per district family - the first
and last rows are always the same industry), and 4 columns per row, numbered 1
to 4 - the company level that counts that column. **All four rows are open from
the first quarter.** Nothing is ever placed on an icon: a company COUNTS the
icons it reaches, so the grid only has to be legible across the table. Twenty
tiles exist (16 suburbs, of which 12 are drawn, and 4 centres).

### 3. Sixty Blueprint cards
Standard poker size (63×88 mm) so they fit sleeves. Ten per industry: five level
1, three level 2, two level 3.

Each card shows: company name, industry (colour + glyph), **level**, **setup
cost**, **OPEX** (split into $2-a-level rent and the supplier bill), its
**suppliers** (1 at L1, 2 at L2, 3 at L3 — each is another industry, and the
bill is paid *into those industries' pots*), its **size** (the printed
production, now only the number the top band is cut to), and — the most consulted
thing on the card — **its band row**: the icon counts at which $$ and $$$ begin
and the three multipliers, with the whole four-level ladder in small type below
so an upgraded company reads its new row off the same card.

The full data table follows at the end of this brief. Give me a card template
plus the six industry variants, and a sheet layout of 9 cards per A4 page with
cut marks.

### 4. Sixteen Megacorp tiles
Claimed by merging an exact combination of company levels. Each shows: a name, the
**combination required**, a **one-off EP award**, and — this is easy to miss and
carries real weight — a **tier from 1 to 4**. The tier is a *divisor*: the
headquarters banks its industry's price ÷ tier as EP every quarter for the rest
of the game. **Tier 1 is the best.** Make the divisor as prominent as the EP
number; a player choosing between two tiles cannot decide without it.

| Name | Combination | EP | Tier |
|---|---|---|---|
| Local Syndicate | 3 × L1 | 8 | 4 |
| Founders' Pact | 2 × L1 + 1 × L2 | 9 | 4 |
| Continental Holdings | 4 × L1 | 10 | 4 |
| Twin Ventures | 1 × L1 + 2 × L2 | 10 | 4 |
| Silent Merger | 3 × L2 | 11 | 3 |
| Neighborhood Holdings | 3 × L1 + 1 × L2 | 12 | 3 |
| Regional Consolidated | 2 × L2 + 1 × L3 | 13 | 3 |
| Crosstown Alliance | 2 × L1 + 2 × L2 | 13 | 3 |
| Metro Trust | 1 × L2 + 2 × L3 | 14 | 2 |
| Crossroads Deal | 1 × L1 + 3 × L2 | 14 | 2 |
| Skyline Consolidated | 3 × L3 | 15 | 2 |
| Apex Group | 2 × L2 + 2 × L3 | 16 | 2 |
| Titan Industries | 2 × L3 + 1 × L4 | 17 | 1 |
| Colossus Group | 4 × L3 | 19 | 1 |
| Empire Holdings | 1 × L2 + 2 × L3 + 1 × L4 | 20 | 1 |
| Omnicorp | 3 × L3 + 1 × L4 | 22 | 1 |

### 5. Six Persona cards
Dealt one per player; the rest sit out, so which powers exist changes per game.

- **Systems Architect** (TE) — Your Technology companies may upgrade vertically, stacking on one plot instead of needing a free neighbour - or spread as Technology usually does. You choose at each upgrade.
- **Public Health Director** (HC) — Your Healthcare companies reach every column of a Healthcare row whatever their level - they may count all four icons where a level-1 company counts one.
- **White-Label Supplier** (MA) — Your Manufacturing may be paid the best price among the rows of its own district, its own row included: that price is what its band multiplies.
- **Resort Developer** (HO) — Your Hospitality companies may upgrade horizontally, spreading across plots so more businesses and hubs sit adjacent to them - or stack as Hospitality usually does. You choose at each upgrade.
- **Supply Chain Expert** (RE) — At the start of Closing, you may raise one industry you do NOT operate by one step; your Retail then reaches one extra district this quarter. You may also decline.
- **Concession Holder** (UT) — At the start of Closing you may switch your concession on: your Utilities are then paid $1 over the current price this quarter - their band multiplies the higher price. Every quarter you are paid at that premium, the Utilities price falls one step at the end of the quarter.

### 6. Money
Printed notes, not chips — I measured it and the chip equivalent weighs 2.6 kg,
heavier than a whole retail box, where notes are 0.21 kg.

Six denominations: **$1, $2, $5, $10, $20, $50**. The bank needs about $8,000 in
total; a working split is roughly 60 × $1, 40 × $2, 50 × $5, 40 × $10, 30 × $20,
130 × $50. Design them at about 44 × 88 mm, 8 or 12 to an A4 sheet.

The small denominations are change for rents and bills, the $20 and $50 are what
a band pays out — make the six easy to tell apart at a glance, by colour, size and
number position together.

### 7. Player pieces (design the printed parts; I 3D-print the rest)
- **12 discs per player** in their colour. A disc under a building marks who owns
  the *land*; a disc on top marks who owns the *business*. These can differ.
- **Company blocks, levels 1–4** — stack height reads as level.
- **A Megacorp marker** for a headquarters, visually distinct from everything else.
- **2 workers per player** (3 at a 2-player game).

Give me printable disc sheets and level tokens as a fallback for anyone without a
printer for the 3D parts.

### 8. Worker placement tracks
Four tracks. Workers are placed **left to right**, but each track resolves
**right to left** — your worker takes one action plus one more for every worker
that lands after it. This inversion is the rule that catches every new player, so
**design the track to make it obvious**: the direction of play and the direction
of resolution should be visible on the board itself, not just in the rulebook.

- **Raise Capital**, **M&A**, **R&D** — 4 slots each at 2–4 players, 5 at five, 6 at six.
- **Board Meeting** — always exactly 2 seats, whatever the player count.

### 9. Player aid card (double-sided, one per player)
Front: the three phases of a quarter — Planning, Action, Closing — with the
Closing written as a checklist (bills, count-band-multiply, HQs, pots, hub, year
end), since nobody is handed the board any more.
Back: the supply web (who buys from whom), the price track rules, and the scoring
summary.

The supply web, read off the real cards:

```
UT buys from  MA, HC, TE        RE buys from  UT, HO, TE
HO buys from  RE, MA, HC        MA buys from  UT, HO, TE
HC buys from  UT, RE, HO        TE buys from  RE, MA, HC
```

Every industry buys from exactly three others and sells to exactly three others —
18 supply lines, and no industry is anyone's only customer or only source. Draw
this as a real graph, not a ring; a ring would be wrong and a player would notice.

### 10. Small bits
A **quarter/year tracker** (2 years × 4 quarters, Q4 and Q8 marked as year ends
with the land awards and the loan buy-back, and Q9–Q12 shown dashed for the
three-year variant), an **EP scoring track**, **loan tokens**, and the **IPO tile** (to the first
player to form a Megacorp; it grants a sixth company bay and opens Board Meeting's
second seat - no EP).

## How I want it delivered

1. **A design system artboard first** — palette with the exact hexes above, the
   six industry glyphs, type scale, and the rules for how a component is
   constructed. Everything after this derives from it.
2. **One artboard per component type**, at real print dimensions, laid out for A4
   with US Letter inside the safe area so one file prints on either.
3. **Greyscale-safe.** Show me one component rendered in greyscale to prove the
   glyphs carry the information.
4. **No bleed, visible cut lines**, generous inner margins — this is cut with
   scissors, not a die.

Prefer flat vector shapes, real type hierarchy and honest information design over
illustration. If something would need artwork you can't produce cleanly, use a
strong typographic or geometric treatment instead of a placeholder image.

## Appendix — the 60 Blueprints

Format: `Name · setup / production / OPEX · suppliers (share of the bill)`. Production is the company's size: under v23 it is sold only under the "Revenue by the unit" variant, and the top band begins at about that many icons.

**Utilities** (base $4, Horizontal)
- L1 Solar Field I · 15/3/6 · TE 6
- L1 Hydro-Farm Initiative I · 15/3/6 · TE 6
- L1 Wind Farm I · 15/3/6 · HC 6
- L1 Biomass Plant I · 15/3/6 · HC 6
- L1 Tidal Generator I · 15/3/6 · MA 6
- L2 Fusion Conduit Hub II · 20/6/11 · TE 6, HC 5
- L2 Smart Grid Node II · 20/6/11 · TE 6, MA 5
- L2 Oceanic Turbine II · 20/6/11 · HC 6, MA 5
- L3 Geothermal Supernode III · 30/12/15 · TE 6, HC 5, MA 4
- L3 Antimatter Reactor III · 30/12/15 · TE 6, HC 5, MA 4

**Retail** (base $4, Vertical)
- L1 Corner Store I · 15/4/10 · UT 10
- L1 Pop-Up Kiosk I · 15/4/10 · UT 10
- L1 Local Market I · 15/4/10 · HO 10
- L1 Strip Mall I · 15/4/10 · HO 10
- L1 Vending Network I · 15/4/10 · TE 10
- L2 Supermarket II · 25/8/18 · UT 10, HO 8
- L2 Department Store II · 25/8/18 · UT 10, TE 8
- L2 Outlet Center II · 25/8/18 · HO 10, TE 8
- L3 Mega-Mall III · 40/16/28 · UT 12, HO 8, TE 8
- L3 Omni-Channel Hub III · 40/16/28 · UT 12, HO 8, TE 8

**Hospitality** (base $5, Vertical)
- L1 Motel I · 10/2/6 · HC 6
- L1 Bed & Breakfast I · 10/2/6 · HC 6
- L1 Transit Hostel I · 10/2/6 · MA 6
- L1 Roadside Inn I · 10/2/6 · MA 6
- L1 Capsule Hotel I · 10/2/6 · RE 6
- L2 Business Hotel II · 15/4/10 · HC 6, MA 4
- L2 Resort Lodge II · 15/4/10 · HC 6, RE 4
- L2 Boutique Hotel II · 15/4/10 · MA 6, RE 4
- L3 Luxury Casino III · 25/8/16 · HC 6, MA 5, RE 5
- L3 Orbit Resort III · 25/8/16 · HC 6, MA 5, RE 5

**Manufacturing** (base $5, Horizontal)
- L1 Assembly Workshop I · 20/4/8 · HO 8
- L1 Parts Fabricator I · 20/4/8 · HO 8
- L1 Textile Mill I · 20/4/8 · TE 8
- L1 Canning Facility I · 20/4/8 · TE 8
- L1 Injection Molder I · 20/4/8 · UT 8
- L2 Auto Plant II · 35/8/14 · HO 8, TE 6
- L2 Microchip Foundry II · 35/8/14 · HO 8, UT 6
- L2 Chemical Plant II · 35/8/14 · TE 8, UT 6
- L3 Heavy Robotics III · 60/16/20 · HO 8, TE 6, UT 6
- L3 Orbital Shipyard III · 60/16/20 · HO 8, TE 6, UT 6

**Healthcare** (base $6, Vertical)
- L1 Urgent Care Clinic I · 20/3/10 · RE 10
- L1 Pharmacy I · 20/3/10 · RE 10
- L1 Dental Office I · 20/3/10 · UT 10
- L1 Wellness Center I · 20/3/10 · UT 10
- L1 Physical Therapy I · 20/3/10 · HO 10
- L2 General Hospital II · 35/6/18 · RE 10, UT 8
- L2 Trauma Center II · 35/6/18 · RE 10, HO 8
- L2 Specialized Clinic II · 35/6/18 · UT 10, HO 8
- L3 Biotech Campus III · 60/12/28 · RE 12, UT 8, HO 8
- L3 Cybernetics Inst. III · 60/12/28 · RE 12, UT 8, HO 8

**Technology** (base $6, Horizontal)
- L1 App Startup I · 10/2/8 · MA 8
- L1 Data Center I · 10/2/8 · MA 8
- L1 Server Farm I · 10/2/8 · RE 8
- L1 IT Support Firm I · 10/2/8 · RE 8
- L1 Cloud Provider I · 10/2/8 · HC 8
- L2 Software Campus II · 15/4/13 · MA 8, RE 5
- L2 Network Hub II · 15/4/13 · MA 8, HC 5
- L2 Telecom Provider II · 15/4/13 · RE 8, HC 5
- L3 Sentient AI Cluster III · 25/8/21 · MA 8, RE 7, HC 6
- L3 Quantum Computing III · 25/8/21 · MA 8, RE 7, HC 6

## Starting capital and draft

Seat order is randomised, and later seats get less cash but more starting cards:

| Players | Seat 1 | Seat 2 | Seat 3 | Seat 4 | Seat 5 | Seat 6 |
|---|---|---|---|---|---|---|
| 2 | $20 / 2 | $20 / 2 | — | — | — | — |
| 3 | $25 / 1 | $22 / 2 | $19 / 3 | — | — | — |
| 4 | $25 / 1 | $22 / 2 | $22 / 2 | $19 / 3 | — | — |
| 5 | $25 / 1 | $22 / 2 | $22 / 2 | $19 / 3 | $16 / 4 | — |
| 6 | $25 / 1 | $22 / 2 | $22 / 2 | $19 / 3 | $19 / 3 | $16 / 4 |

If you need a first deliverable to start from, do the **design system artboard
plus the Blueprint card template with all six industry variants** — that's the
component I'll be printing most of, and it settles the visual language for
everything else.
