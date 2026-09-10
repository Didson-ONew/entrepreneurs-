# Prompt for Claude Design — physical prototype components

Copy everything below the line into Claude Design. Every number in it is read
from the shipped engine (`EntrepreneursGame.jsx`) as of Rulebook v13 with the
$2–$12 economy, so the components it produces will match the game that is
actually playable at entrepreneurs.boardgame.

Regenerate this file after any rules change — or at minimum re-check the
constants block, which is the part that goes stale.

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
the sum of what everyone at the table has built. It runs 12 quarters over 3
fiscal years, or ends early when someone claims a second Megacorp.

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
| UT | Utilities | `#E8B330` | $4 | Horizontal |
| RE | Retail | `#3FAE6A` | $4 | Vertical |
| HO | Hospitality | `#D65B4A` | $5 | Vertical |
| MA | Manufacturing | `#9066C8` | $5 | Horizontal |
| HC | Healthcare | `#3E8FD0` | $6 | Vertical |
| TE | Technology | `#D6428B` | $6 | Horizontal |

**Critical accessibility requirement:** these six hues are not distinguishable
by every player, and two of them (HO and TE, RE and UT) are close in value. Give
every industry a **second, redundant channel** — a distinct geometric glyph, or
a distinct fill pattern, used consistently on every component where the industry
appears. A player must be able to play the whole game in greyscale. This is the
single most important constraint in the brief.

**Price track:** $2 to $12, one marker per industry, one cell per whole dollar
(11 cells). No blank cells. $1 is *not* a price — it's what the bank pays for
goods that couldn't be sold, so the track's floor deliberately sits a dollar
above it.

**Player colours** (up to 6): `#22D3EE` `#FB923C` `#A78BFA` `#FB7185` `#4ADE80`
`#FACC15`. These must not be confusable with the six industry colours — that
distinction carries real information on the board, since a disc shows *who* and a
block shows *what*.

**Other values:** 12 discs per player · max 5 active companies (6 with the IPO
tile) · rent $2 per company level · cash scores 1 EP per full $50 · 2 Megacorps
ends the game · a Megacorp scores 3 EP per adjacent company at the end.

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

### 2. Demand board — 16 district demand tiles
One per district. Each tile is a **4×4 grid of demand icons**: 4 rows, each row
labelled with one industry (randomly assigned at setup), and 4 columns per row.
**Rows 3 and 4 are locked until Quarter 5** — show that visually, e.g. a printed
band or a different ground, so players can see at a glance what's open.

Players deliver production into these icons for cash. Design the icon cells so a
small token or cube sits in them clearly and a filled row reads instantly.

### 3. Sixty Blueprint cards
Standard poker size (63×88 mm) so they fit sleeves. Ten per industry: five level
1, three level 2, two level 3.

Each card shows: company name, industry (colour + glyph), **level**, **setup
cost**, **production**, **OPEX**, and its **suppliers** (1 supplier at L1, 2 at
L2, 3 at L3 — each is another industry, and this is the single most-consulted
number on the card because OPEX is paid *to those industries' pots*).

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

- **Systems Architect** (TE) — Your Technology companies upgrade vertically, stacking on one plot instead of needing a free neighbour.
- **Public Health Director** (HC) — Your Healthcare companies ignore the level restriction: a level-1 clinic may serve any column of a Healthcare row.
- **White-Label Supplier** (MA) — When your Manufacturing cross-sells into another industry's row, it is paid that industry's price rather than its own.
- **Resort Developer** (HO) — Your Hospitality companies upgrade horizontally, spreading across plots so more businesses and hubs sit adjacent to them.
- **Supply Chain Expert** (RE) — At the start of Revenue, raise one industry you do NOT operate by one step; your Retail then reaches one extra district this quarter.
- **Concession Holder** (UT) — Your Utilities production sells for $1 above the current price.

### 6. Money
Printed notes, not chips — I measured it and the chip equivalent weighs 2.6 kg,
heavier than a whole retail box, where notes are 0.21 kg.

Six denominations: **$1, $2, $5, $10, $20, $50**. The bank needs about $8,000 in
total; a working split is roughly 60 × $1, 40 × $2, 50 × $5, 40 × $10, 30 × $20,
130 × $50. Design them at about 44 × 88 mm, 8 or 12 to an A4 sheet.

The $1 and $2 get used constantly — recycling pays $1 a unit and the price floor
is $2 — so make the small denominations the *easiest* to tell apart at a glance,
not an afterthought. Differentiate by colour, size and number position together.

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
Front: the five phases of a quarter — Planning, Action, Production, Revenue,
Closing — with what happens in each and which two the player actually decides in.
Back: the supply web (who buys from whom), the price track rules, and the scoring
summary.

The supply web, read off the real cards:

```
UT buys from  HO, TE, HC        RE buys from  TE, HO, MA
HO buys from  MA, HC, RE        MA buys from  HC, RE, UT
HC buys from  RE, UT, TE        TE buys from  UT, MA, HO
```

Every industry buys from exactly three others and sells to exactly three others —
18 supply lines, and no industry is anyone's only customer or only source. Draw
this as a real graph, not a ring; a ring would be wrong and a player would notice.

### 10. Small bits
A **quarter/year tracker** (3 years × 4 quarters, with Q5 marked as when demand
rows 3–4 unlock, and Q12 as the last), an **EP scoring track**, **loan tokens**,
and the **IPO tile** (+5 EP to the first player to form a Megacorp; grants a sixth
company bay and opens Board Meeting's second seat).

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

Format: `Name · setup / production / OPEX · suppliers`

**Utilities** (base $4, Horizontal)
- L1 Solar Field I · 15/4/4 · HO
- L1 Hydro-Farm Initiative I · 15/4/4 · HO
- L1 Wind Farm I · 15/4/4 · TE
- L1 Biomass Plant I · 15/4/4 · TE
- L1 Tidal Generator I · 15/4/4 · HC
- L2 Fusion Conduit Hub II · 20/8/7 · HO, TE
- L2 Smart Grid Node II · 20/8/7 · HO, HC
- L2 Oceanic Turbine II · 20/8/7 · TE, HC
- L3 Geothermal Supernode III · 30/16/10 · HO, TE, HC
- L3 Antimatter Reactor III · 30/16/10 · HO, TE, HC

**Retail** (base $4, Vertical)
- L1 Corner Store I · 10/4/5 · TE
- L1 Pop-Up Kiosk I · 10/4/5 · TE
- L1 Local Market I · 10/4/5 · HO
- L1 Strip Mall I · 10/4/5 · HO
- L1 Vending Network I · 10/4/5 · MA
- L2 Supermarket II · 15/8/9 · TE, HO
- L2 Department Store II · 15/8/9 · TE, MA
- L2 Outlet Center II · 15/8/9 · HO, MA
- L3 Mega-Mall III · 25/16/14 · TE, HO, MA
- L3 Omni-Channel Hub III · 25/16/14 · TE, HO, MA

**Hospitality** (base $5, Vertical)
- L1 Motel I · 10/3/6 · MA
- L1 Bed & Breakfast I · 10/3/6 · MA
- L1 Transit Hostel I · 10/3/6 · HC
- L1 Roadside Inn I · 10/3/6 · HC
- L1 Capsule Hotel I · 10/3/6 · RE
- L2 Business Hotel II · 15/6/10 · MA, HC
- L2 Resort Lodge II · 15/6/10 · MA, RE
- L2 Boutique Hotel II · 15/6/10 · HC, RE
- L3 Luxury Casino III · 25/12/16 · MA, HC, RE
- L3 Orbit Resort III · 25/12/16 · MA, HC, RE

**Manufacturing** (base $5, Horizontal)
- L1 Assembly Workshop I · 20/3/4 · HC
- L1 Parts Fabricator I · 20/3/4 · HC
- L1 Textile Mill I · 20/3/4 · RE
- L1 Canning Facility I · 20/3/4 · RE
- L1 Injection Molder I · 20/3/4 · UT
- L2 Auto Plant II · 35/6/7 · HC, RE
- L2 Microchip Foundry II · 35/6/7 · HC, UT
- L2 Chemical Plant II · 35/6/7 · RE, UT
- L3 Heavy Robotics III · 60/12/10 · HC, RE, UT
- L3 Orbital Shipyard III · 60/12/10 · HC, RE, UT

**Healthcare** (base $6, Vertical)
- L1 Urgent Care Clinic I · 20/2/5 · RE
- L1 Pharmacy I · 20/2/5 · RE
- L1 Dental Office I · 20/2/5 · UT
- L1 Wellness Center I · 20/2/5 · UT
- L1 Physical Therapy I · 20/2/5 · TE
- L2 General Hospital II · 35/4/9 · RE, UT
- L2 Trauma Center II · 35/4/9 · RE, TE
- L2 Specialized Clinic II · 35/4/9 · UT, TE
- L3 Biotech Campus III · 60/8/14 · RE, UT, TE
- L3 Cybernetics Inst. III · 60/8/14 · RE, UT, TE

**Technology** (base $6, Horizontal)
- L1 App Startup I · 15/2/6 · UT
- L1 Data Center I · 15/2/6 · UT
- L1 Server Farm I · 15/2/6 · MA
- L1 IT Support Firm I · 15/2/6 · MA
- L1 Cloud Provider I · 15/2/6 · HO
- L2 Software Campus II · 25/4/10 · UT, MA
- L2 Network Hub II · 25/4/10 · UT, HO
- L2 Telecom Provider II · 25/4/10 · MA, HO
- L3 Sentient AI Cluster III · 40/8/16 · UT, MA, HO
- L3 Quantum Computing III · 40/8/16 · UT, MA, HO

## Starting capital and draft

Seat order is randomised, and later seats get less cash but more starting cards:

| Players | Seat 1 | Seat 2 | Seat 3 | Seat 4 | Seat 5 | Seat 6 |
|---|---|---|---|---|---|---|
| 2 | $20 / 2 | $20 / 2 | — | — | — | — |
| 3 | $25 / 1 | $25 / 2 | $20 / 3 | — | — | — |
| 4 | $25 / 1 | $25 / 2 | $20 / 2 | $20 / 3 | — | — |
| 5 | $25 / 1 | $25 / 2 | $20 / 2 | $20 / 3 | $15 / 4 | — |
| 6 | $25 / 1 | $25 / 2 | $20 / 2 | $20 / 3 | $20 / 3 | $15 / 4 |

If you need a first deliverable to start from, do the **design system artboard
plus the Blueprint card template with all six industry variants** — that's the
component I'll be printing most of, and it settles the visual language for
everything else.
