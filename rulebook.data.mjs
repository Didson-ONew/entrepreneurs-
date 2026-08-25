/* ============================================================================
   ENTREPRENEURS - the rulebook, as data.

   This file is the single source of truth for the rules text. Two things read it:

     Rulebook.jsx      the in-game rulebook, shown on every screen. It renders
                       every block EXCEPT `note`, so players never see the
                       designer's commentary.
     make_rulebook.mjs writes RULEBOOK.md (everything, notes included) and
                       RULEBOOK_PLAYERS.md (the same text the game shows).

   Keeping one copy is the point: a rule can never be right in the book and wrong
   in the game, because there is only one place to change it.

   Editions: a section or a block may carry `only: "digital"` or `only: "table"`.
   Anything unmarked appears in both. That is how one source produces a rulebook for
   the app - which has a host, bots and a waiting room - and a rulebook for a physical
   table, which has none of those things and should not mention them.

   Block kinds:
     { h }      sub-heading
     { p }      paragraph
     { ul }     bullet list
     { table }  { head: [...], rows: [[...]] }
     { note }   designer's note - PLAYERS NEVER SEE THIS
   ========================================================================== */

export const EDITION = "Rulebook v15";

/* Filter the book down to one edition. `edition` is "digital" (the app, which has a
   host, bots and a waiting room) or "table" (a physical game, which has none of them).
   Anything not marked `only` belongs to both. */
export function forEdition(book, edition) {
  return book
    .filter((s) => !s.only || s.only === edition)
    .map((s) => ({ ...s, blocks: s.blocks.filter((b) => !b.only || b.only === edition) }));
}

export const RULEBOOK = [

/* ------------------------------------------------------------------ */
{
  id: "overview",
  title: "The game in one minute",
  blocks: [
    { p: "You are a founder building a city's economy. You buy land, build companies on it, and sell what they produce to the districts around them. The player with the most Entrepreneurial Points (EP) at the end of Year 3 wins." },
    { ul: [
      "2 to 6 players.",
      "3 years of 4 quarters - 12 rounds at most. A second Megacorp ends it sooner.",
      "The board is 16 districts of 4 plots each.",
      "The coloured squares inside a district are its demand: what it will buy.",
    ] },
    { h: "The one idea underneath everything" },
    { p: "Every company pays OPEX each quarter, and that money does not vanish - it goes to the industries printed on its Blueprint as suppliers. So the industry nobody is building is quietly collecting everyone else's money, and its price is climbing while the crowded industries sink toward $1. Reading that pressure is the game." },
    { note: "The economy is a closed loop on purpose. There is no faucet other than the bank loan and the $1 recycling floor, so a table that all builds the same thing genuinely impoverishes itself. Every playtest that felt flat was a table that had not noticed this yet." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "setup",
  title: "Setup",
  blocks: [
    { p: "The board is built fresh every game: the four central districts are one each of Financial Centre, Industrial Area, Civic Centre and Landmark, shuffled between the four middle cells, and twelve of the sixteen suburb districts are drawn at random for the ring around them. No two games have the same map." },
    { h: "Seats, capital and starting hand" },
    { p: "Seating is randomised - you are not automatically first. Your starting money and number of Blueprints follow the seat you drew, not the player you are: later seats get less money but more cards. The table reads as money / Blueprints." },
    { table: {
      head: ["Players", "Seat 1", "Seat 2", "Seat 3", "Seat 4", "Seat 5", "Seat 6"],
      rows: [
        ["6", "$25 / 1", "$25 / 2", "$20 / 2", "$20 / 3", "$20 / 3", "$15 / 4"],
        ["5", "$25 / 1", "$25 / 2", "$20 / 2", "$20 / 3", "$15 / 4", "-"],
        ["4", "$25 / 1", "$25 / 2", "$20 / 2", "$20 / 3", "-", "-"],
        ["3", "$25 / 1", "$25 / 2", "$20 / 3", "-", "-", "-"],
        ["2", "$20 / 2", "$20 / 2", "-", "-", "-", "-"],
      ],
    } },
    { h: "The draft" },
    { p: "Each industry deck is shuffled whole, so any level can be sitting on top - a level 3 may be there from the very first pick. The top card of every deck is public all game." },
    { p: "Starting Blueprints are drafted in reverse seat order - the LAST seat picks first. On your pick you take the face-up top card of any industry deck. Watch what the others are taking: every card drafted is a company that will probably get built, which pushes that industry's price down and its suppliers' prices up before you have even started." },
    { note: "Shuffling the decks whole is what puts a big company within reach early, for a player willing to take the loan or sell hard to afford it. It also means the draft cannot be planned in advance: what is on top is luck, and what you do about it is not." },
    { h: "The rest" },
    { ul: [
      "Twelve discs each. Nothing else marks what you own.",
      "Megacorp tiles: sixteen exist in four tiers of four. Two are drawn from each tier that is in play - which is twice the number of players. Tiers 4 and 3 are always in; tier 2 joins at three players, tier 1 only at four.",
      "Personas are dealt to everyone by default - one each, drawn from six. Leave them out for a first game if you like.",
    ] },
    { note: "Reverse-order drafting is the only catch-up mechanism in the game, and it is deliberately small. Seat 4 in a four-player game opens with $20 and three cards against seat 1's $25 and one card - enough to matter in the first two quarters, not enough to decide a game." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "discs",
  title: "Your twelve discs",
  blocks: [
    { p: "Your discs are your entire footprint in the world. You have twelve, and every one of them is committed somewhere:" },
    { ul: [
      "one disc on each plot of land you own,",
      "one disc on each active company you run,",
      "one disc in the bank for each loan you have not repaid.",
    ] },
    { p: "If you have no free disc you cannot buy land, launch a company, take over a distressed structure, or take a loan - no matter how much cash you are holding. You free a disc by selling a plot, selling a company, or repaying a loan." },
    { p: "Separately, you have five company slots. Every active company fills one, and so does every Megacorp headquarters you have formed - a headquarters no longer trades, but it still stands on the board and still holds its disc." },
    { note: "The disc limit is the real brake on the game, not money. Cash arrives in floods once your pots start paying, and without a hard cap on presence the leader would simply buy the map. Twelve discs also makes selling land a genuine decision rather than a pure loss. It was ten until the count was measured: ten refused about a quarter of every sideways company's attempts to grow for want of a disc, which is most of why Manufacturing, Utilities and Technology spent whole games at level 1. Twelve takes that to 18%. Fifteen was tried and mostly bought land sprawl." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "quarter",
  title: "A quarter, step by step",
  blocks: [
    { p: "All twelve quarters run the same five phases. You only make decisions in the first two - the rest resolves around you." },
    { table: {
      head: ["Phase", "What happens"],
      rows: [
        ["1. Planning", "Everyone places their workers on the action tracks."],
        ["2. Action", "The tracks resolve and each worker takes its actions."],
        ["3. Production", "Every active company pays OPEX; rent and supplier pots are paid out of it."],
        ["4. Revenue", "You deliver production to demand icons for cash, then the industry pots are shared out."],
        ["5. Closing", "A new Logistic Hub opens. At the end of each year, the two land awards are paid."],
      ],
    } },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "planning",
  title: "Planning: placing workers",
  blocks: [
    { p: "You have two workers (three each in a two-player game). Players place one worker at a time in turn order, going round until everyone has placed all of theirs." },
    { h: "The four tracks" },
    { table: {
      head: ["Track", "Slots", "What it does"],
      rows: [
        ["Raise Capital", "4 / 5 / 6", "Turn assets into cash - LOAN or SELL."],
        ["M&A", "4 / 5 / 6", "Grow your footprint - LAUNCH or BUY."],
        ["R&D", "4 / 5 / 6", "Improve what you have - RESEARCH or UPGRADE."],
        ["Board Meeting", "2", "GO PUBLIC or REPOSITION. Takes all your workers."],
      ],
    } },
    { p: "The three working tracks have four slots at two, three or four players. A fifth player opens a fifth slot on each of them, and a sixth player a sixth. Board Meeting stays at two seats however many are playing - it is meant to be scarce." },
    { p: "The second Board Meeting seat is sealed under the IPO tile until somebody claims it by going public." },
    { h: "Last in, first out - the rule that catches everyone" },
    { p: "Workers fill a track from left to right, but the track resolves from RIGHT TO LEFT. Whoever placed LAST on a track acts FIRST on it." },
    { p: "Committing early is paid for in actions: your worker takes one action, plus one extra for every worker that lands after it in the same track. A worker alone in a track that then fills up completely takes as many actions as the track has slots - but everyone who landed after it will have acted first, and may have taken exactly what it was waiting for." },
    { p: "The tracks themselves resolve in a fixed order: Raise Capital, then M&A, then R&D, then Board Meeting." },
    { h: "Board Meeting" },
    { p: "Going to the Board Meeting costs ALL of your workers for the quarter and buys a single action. It is a real sacrifice, and it is meant to be." },
    { note: "First-in-last-out worker placement is the spine of the game. It is the only mechanism that makes the turn order matter continuously rather than once per round, and it is why Reposition is worth two workers to a player sitting at the back of the order." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "actions",
  title: "The actions",
  blocks: [
    { h: "Raise Capital" },
    { ul: [
      "LOAN - take $20 from the bank and pledge one disc. You may buy the disc back at a year end; if you never do, it costs you 5 EP at the end of the game.",
      "SELL - a Blueprint from your hand ($4 / $8 / $12 by level), a company (half its setup cost, or the full cost if it has been upgraded - the building goes to the bank as a Distressed Asset), or a plot of land at its current value.",
    ] },
    { h: "M&A" },
    { ul: [
      "LAUNCH - build a Blueprint from your hand onto empty plots, paying its setup cost. The first time you ever build in an industry you bank 3 EP immediately.",
      "BUY - take any unowned plot at its current value, or take over a Distressed Asset. You may buy a distressed structure as it stands for half its own setup cost, keeping its Blueprint and level, or renovate it with a card from your hand for half that card's setup cost. Any distressed structure is fair game, including one you sold yourself - buying it back as it stands needs no card at all.",
    ] },
    { p: "You may build on plots owned by another player. They collect the rent every quarter, but the company is yours." },
    { p: "A renovation has to fit the shell that is already standing. The card must match the distressed structure's level, and from level 2 upwards its scaling type as well: a level-2 or level-3 horizontal structure spreads across several plots and cannot be rebuilt as a vertical one, nor the other way round. At level 1 both kinds occupy a single plot, so a level-1 shell is open to any level-1 Blueprint." },
    { h: "R&D" },
    { ul: [
      "RESEARCH - draw the face-up top card of any industry deck. Hand limit is five cards.",
      "UPGRADE - pay a company's setup cost again. Its production and its OPEX both double and its level goes up by one.",
    ] },
    { p: "A horizontal company (Utilities, Manufacturing, Technology) grows sideways: upgrading needs an adjacent plot that you own and that is empty. A vertical company (Retail, Hospitality, Healthcare) stacks on the plot it already occupies. Each company may be upgraded once." },
    { p: "Adjacent means sharing an edge - up, down, left or right - whether the two plots are in the same district or across the border into the next one. Plots that meet only at a corner are not adjacent, so a company can never stand on both. The same rule decides where a multi-plot company may be built in the first place: its plots must form one connected shape." },
    { h: "Board Meeting" },
    { ul: [
      "GO PUBLIC - merge companies to claim a Megacorp tile. You may only take this action if you actually hold the exact combination one of the available tiles asks for.",
      "REPOSITION - move to first in turn order, and place both of your workers together at the start of next quarter's planning.",
    ] },
    { p: "The IPO tile is not an action you can take. It is the prize for being first: whoever forms the first Megacorp of the game also takes it. It is a SIXTH company bay - so being first to merge does not narrow how wide you can operate - and it is what opens the second Board Meeting seat for the rest of the game. Until then only one player can sit here each quarter, and a player who cannot form a Megacorp has only Reposition available." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "land",
  title: "Land and buildings",
  blocks: [
    { h: "What a plot costs" },
    { p: "A plot's value is its printed road price plus $1 for every occupied plot next to it, plus $1 if it touches a Logistic Hub. Road prices run from 1 at the outer edge to 6 in the dead centre of the city. You pay that to buy, and you receive it when you sell - so land near the action genuinely appreciates as the city fills in." },
    { h: "Footprints" },
    { p: "A vertical company always occupies exactly one plot, whatever its level. A horizontal company occupies one plot per level, and those plots must form a connected cluster of owned, empty land - it need not be your own, though its owner will collect the rent. A level-3 horizontal Blueprint therefore needs three connected empty plots before you can build it at all." },
    { p: "A plot can carry more than one level, and rent follows the levels rather than the plots: $2 for every level standing on a plot, paid to that plot's owner. Where a persona lets a company grow the other way - Technology stacking instead of spreading, Hospitality spreading instead of stacking - you choose which plot of the footprint the new level goes on. Stack it on land you own and the rent for those levels comes back to you." },
    { note: "Rent was $3 a level and is now $2. It is the one recurring cost NOT printed on a Blueprint, so it is the charge a small company cannot dodge by choosing a cheaper card, and it grows with level while a level-1 company's income does not. Cutting it is close to free because rent is a TRANSFER - every dollar a tenant keeps is a dollar a landlord does not collect - so the money on the table barely moves while margins improve: companies covering their OPEX and rent go from 91% to 94% at four players, with the winning score and the industry balance unchanged. It is also the only change measured that made the game LESS DECIDED rather than merely closer at the end - the player leading at the halfway mark goes on to win 36% of four-player games instead of 41%, and 28% of six-player games instead of 31%. THE TWO-PLAYER GAME IS THE EXCEPTION and moves the other way, 60% to 67%: with only two seats a cheaper cost base helps whoever is already ahead, because there is nobody else for the relief to spread across. See audit_rent_scaled.js." },
    { h: "Selling the ground out from under a building" },
    { p: "A company can only produce while every plot it stands on is owned by SOMEBODY - not necessarily by you. Selling one of those plots does not destroy the building, but it stops producing until somebody buys that ground, and whoever does collects its rent from then on." },
    { note: "That rule exists so a desperate player has one more thing to sell without immediately losing the company, and so an opponent's distressed land is worth watching. It is deliberately not a way to attack someone else's building - you can only sell your own." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "prices",
  title: "Prices, supply and demand",
  blocks: [
    { p: "Every industry has one market price that everybody sells at. It starts at its base price and moves as the city is built." },
    { table: {
      head: ["Industry", "Base price", "Scaling"],
      rows: [
        ["Utilities (UT)", "$2", "Horizontal"],
        ["Retail (RE)", "$2", "Vertical"],
        ["Hospitality (HO)", "$3", "Vertical"],
        ["Manufacturing (MA)", "$3", "Horizontal"],
        ["Healthcare (HC)", "$4", "Vertical"],
        ["Technology (TE)", "$4", "Horizontal"],
      ],
    } },
    { h: "How the price moves" },
    { p: "Launching a company puts one supply mark on its own industry, and one demand mark on every supplier industry printed on its Blueprint." },
    { p: "Two steps in either direction move the price by $1, and no price ever falls below $1." },
    { p: "A crowded industry can sink to $1 - exactly what you get for recycling goods you could not sell, so at that point selling and scrapping pay the same. A neglected one that half the table depends on can climb past $8 a unit." },
    { h: "What each company costs and produces" },
    { p: "Setup / OPEX / Production, by level." },
    { table: {
      head: ["Industry", "Level 1", "Level 2", "Level 3"],
      rows: [
        ["Utilities (UT)", "15 / 4 / 4", "20 / 7 / 8", "30 / 10 / 16"],
        ["Retail (RE)", "10 / 5 / 4", "15 / 9 / 8", "25 / 14 / 16"],
        ["Hospitality (HO)", "10 / 6 / 3", "15 / 10 / 6", "25 / 16 / 12"],
        ["Manufacturing (MA)", "20 / 4 / 3", "35 / 7 / 6", "60 / 10 / 12"],
        ["Healthcare (HC)", "20 / 5 / 2", "35 / 9 / 4", "60 / 14 / 8"],
        ["Technology (TE)", "15 / 6 / 2", "25 / 10 / 4", "40 / 16 / 8"],
      ],
    } },
    { h: "Who pays whom" },
    { p: "Every company pays OPEX to companies in other industries - its suppliers, printed on its Blueprint. The chain closes a loop, so no industry is ever a dead end. Level 1 cards have one supplier, level 2 have two, and level 3 have all three." },
    { table: {
      head: ["Industry", "Supplier 1", "Supplier 2", "Supplier 3"],
      rows: [
        ["Utilities", "HO", "TE", "HC"],
        ["Retail", "TE", "HO", "MA"],
        ["Hospitality", "MA", "HC", "RE"],
        ["Manufacturing", "HC", "RE", "UT"],
        ["Healthcare", "RE", "UT", "TE"],
        ["Technology", "UT", "MA", "HO"],
      ],
    } },
    { p: "The three are not equally common: across the ten Blueprints of an industry, the first supplier appears most often and the third least. Read the Blueprint in front of you rather than the table." },
    { note: "The asymmetry between demand (+1 per company, immediately) and supply (-1 per two companies) is what stops a runaway. It means being the second builder in an industry is much better than being the fifth, but it also means feeding a crowded industry pays more every time somebody joins it." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "production",
  title: "Production: paying the bills",
  blocks: [
    { p: "Every active company pays its OPEX, automatically, whether or not it sells anything afterwards. That money is immediately split:" },
    { ul: [
      "Rent - $2 for every level standing on a plot - goes to whoever owns that plot. A vertical company stacks all its levels on one plot, so its whole rent goes to one landlord; a horizontal one puts a level on each plot it covers, so each landlord collects $2. On your own land it comes straight back to you.",
      "Everything left over flows into the industry pots of that company's suppliers, divided in proportion to the dependency values on the Blueprint.",
    ] },
    { h: "If you cannot pay" },
    { p: "Before OPEX is charged, any player whose cash will not cover their whole bill gets a window to choose what to sell. This is a forced sale and everything in it goes at HALF what a planned sale through Raise Capital would fetch: Blueprints $2 / $4 / $6 by level, plots half their value, a company half what it would have paid voluntarily. What you keep control of is which assets go, not the price." },
    { p: "If the bill still cannot be met once a company's OPEX comes due, that company enters SOLVENCY: the bank sells for you, at those same half rates, and the company that triggered it goes to the bank as a Distressed Asset." },
    { note: "Selling at full price under duress made the shortfall window strictly better than planning ahead - you could ignore your OPEX, wait to be forced, and lose nothing. Halving it is what makes the Raise Capital track worth a worker." },
    { note: "Forced liquidation pays exactly half of a voluntary sale across the board. Being caught short is meant to hurt enough that players keep a buffer, without being a death spiral - a solvency event usually costs a player a quarter, not the game." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "revenue",
  title: "Revenue: selling what you produce",
  blocks: [
    { p: "Each company produces a number of units printed on its Blueprint, doubled if it has been upgraded. That number is all it has: every ability below is a route for those units, never a source of more. You deliver them to demand icons your company can reach, and every unit an icon takes is paid at the current market price for your industry." },
    { p: "Demand icons are first come, first served, and the businesses a Hospitality company sells to are not - so it is usually right to take the contested icons first and send whatever is left to the neighbours. Anything you still cannot place is recycled for $1 a unit." },
    { p: "Delivery goes in turn order. Every icon is first come, first served, so being early in the order is worth real money on a contested district - and it is the main thing REPOSITION buys you." },
    { h: "Which icons you may use" },
    { p: "Every district shows a 4x4 grid of demand. Each row is an industry; the four columns are levels 1 to 4. You may deliver to an icon if the row's industry is yours and the column is no higher than your company's level - so a bigger company reaches deeper into the same district, and the deeper icons are hungrier." },
    { ul: [
      "Rows 3 and 4 of every district stay closed until Quarter 5.",
      "At the end of Quarter 8 the entire demand grid is wiped clean and every icon reopens for Year 3.",
      "AN ICON TAKES ITS OWN COLUMN IN GOODS: the level-1 icon takes one unit, the level-2 icon two, the level-3 icon three, the level-4 icon four. A level-3 company reaching columns 1, 2 and 3 therefore sells 1 + 2 + 3 = 6 units into a single clean row of its industry.",
      "Each icon can be sold to once, by whoever gets there first - and it is filled whole, however many units it took.",
      "Anything you cannot sell is recycled for $1 a unit.",
    ] },
    { h: "How far a company reaches" },
    { p: "A company can always sell into the district or districts its own plots sit in. Beyond that:" },
    { ul: [
      "Logistic Hubs stand on plots. If any plot of your footprint is orthogonally beside a hub - up to four plots can be, since corners do not count - your company joins the network and reaches every district that any hub on the board stands in. A Megacorp headquarters counts as a hub for this, so building beside somebody else's monument puts you on the network too.",
      "Utilities and Retail can never use hubs at all.",
      "Healthcare is on the hub network natively - it reaches every hub district without needing to touch one.",
    ] },
    { h: "Industry abilities" },
    { table: {
      head: ["Industry", "Ability"],
      rows: [
        ["Utilities", "Reads demand across a block of districts as wide as its level, positioned anywhere that still covers its own footprint. Never uses hubs."],
        ["Retail", "Sells into one extra district of your choice per level. Never uses hubs."],
        ["Hospitality", "May sell to the businesses and hubs around it instead of to demand icons - one unit at market price for each business or hub within its level in plots, no icon needed. Those units come out of its production like any other."],
        ["Manufacturing", "May route up to its level in units into OTHER industries' rows in its own district. Those units come out of its production - cross-selling is a place to send goods, not extra goods."],
        ["Healthcare", "Reaches every district on the hub network without touching a hub."],
        ["Technology", "Delivers two units to every icon it reaches instead of one."],
      ],
    } },
    { h: "B2B: the pots pay out" },
    { p: "Each pot is split evenly among the companies of that industry - one equal share each, whatever size those companies are. It is the industry being paid, not the building. A Megacorp headquarters counts here: it produces nothing, but the sector still pays it its share." },
    { p: "Whatever will not divide cleanly stays in the pot and rides forward. A pot of $10 shared between three Healthcare companies pays $3 to each and carries $1 into next quarter." },
    { p: "A pot with no company of that type to pay carries over in full, growing quarter by quarter. An industry nobody serves is often the most profitable thing on the board." },
    { note: "Technology's doubler and Hospitality's neighbour bonus are the two abilities that scale with the board rather than with the card, and they are the reason those two industries look weak on paper and play strong. Utilities was originally 'distance less than level from any home district', which quietly let a level-3 utility see the entire city; it now reads an honest N x N block." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "closing",
  title: "Closing and the year end",
  blocks: [
    { p: "Every quarter ends with a new Logistic Hub being built on an empty plot. The first player in turn order chooses which one. That plot is filled for good - nothing can be built there afterwards - and the hub adds its own district to the network." },
    { h: "At the end of Quarter 4, 8 and 12" },
    { ul: [
      "The Real-Estate Mogul and The Omnipresent are awarded - 5 EP each, to the outright leader only.",
      "You may buy back loan discs: $30 at the end of Year 1, $35 at Year 2, $40 at Year 3.",
    ] },
    { p: "Companies do not wait for the year end. A company scores the moment it is finished - see below - so by the time a year ends its EP are already banked. What a year end decides is who is holding the city." },
    { h: "Companies score on completion" },
    { p: "The moment a company is built it scores 2 EP per level, straight into your bank. The moment it is upgraded it scores afresh at its new level, again straight into your bank. It is one score per build and one per upgrade - the same way entering an industry pays you the moment you build there, not at some later reckoning." },
    { p: "So a level-2 company built and then upgraded pays 4 EP on the day it opens and 6 more on the day it grows." },
    { p: "There is nothing held back and nothing to keep track of on the cards: every EP you have earned is banked, and the standings are the score. You never lose EP you have already scored - not when a company is sold, not when it goes distressed, not when it is merged into a Megacorp." },
    { note: "Two EP a level, paid on completion, is the change that made building feel like the point of the game rather than a way to fund the land awards. At 1 EP a level, paid a quarter or two later, a company had to survive to be worth anything and still lost to cash; now the act of building is the reward, and the risk of a late solvency event no longer eats it." },
    { note: "EP used to sit on the company's card until they vested - on upgrade, sale, merger or at the end of the game. It never changed a single final score, because the standings always counted the cards too and nothing could clear a card without vesting it first, so all it bought was a second pile to keep straight and a question - 'is that vested?' - with nothing riding on the answer. Now the EP go where they were always going to end up." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "megacorp",
  title: "Going public and Megacorps",
  blocks: [
    { p: "Going public always means merging companies to claim a Megacorp tile, from the very first time it is done. Each tile names an exact combination of company levels and pays between 8 and 22 EP, and you must hold precisely that combination of active companies." },
    { p: "Whoever forms the first Megacorp of the game also takes the IPO tile: a sixth company bay for the rest of the game, and the second Board Meeting seat opens for everyone." },
    { h: "What a merger does" },
    { ul: [
      "You choose one of the merged companies to become the Megacorp HQ. It keeps its building and returns its Blueprint to its industry deck.",
      "All the others go to the bank as Distressed Assets - anyone may take them over later.",
      "The HQ stops trading: with no Blueprint it produces nothing and pays no OPEX. It still draws its equal share of its industry's pot every B2B - a headquarters that has stopped building has not stopped collecting.",
      "Every quarter it stands, the HQ banks EP equal to the CURRENT PRICE of its industry DIVIDED BY THE TILE'S TIER, rounded down. A tier 1 headquarters in an industry at $3 banks 3 EP a quarter; a tier 4 headquarters in the same industry banks nothing at all until that industry reaches $4. A headquarters in an industry nobody serves is quietly earning while its price climbs, and one formed in Year 1 collects for eight more quarters than one formed in Year 3.",
      "It has no OPEX to pay its rent out of, so its owner pays the ground rent from pocket every quarter - $2 for every level standing on a plot, to that plot's owner. On your own land nothing moves.",
      "A headquarters is public infrastructure: it counts as a Logistic Hub. Any company built orthogonally beside one joins the network through it, whoever owns them. A monument that only collected would be a monument nobody wanted to build near - and the companies that gather round it are exactly the ones it scores 3 EP each for at the end.",
      "Sell a plot out from under a headquarters and it collects nothing at all - no pot share, no points, and it stops being a hub. A monument still needs its ground.",
      "It keeps its disc, and it permanently locks one of your five company slots. Every Megacorp you form narrows how wide you can operate.",
      "At the end of the game the HQ scores 3 EP for every OTHER company standing orthogonally beside it - the district that grew up around it. Counted at scoring, not when the Megacorp forms, so where you put your headquarters is a bet on where the city fills in.",
    ] },
    { p: "Twice the number of players are in play - eight at a four-player table - so a combination you are working toward is usually still there, but the best-paying ones are contested." },
    { h: "The tiles" },
    { table: {
      head: ["Megacorp", "Requires", "Companies", "Value"],
      rows: [
        ["Local Syndicate", "3 x L1", "3", "8 EP"],
        ["Founders\u2019 Pact", "2 x L1 + 1 x L2", "3", "9 EP"],
        ["Continental Holdings", "4 x L1", "4", "10 EP"],
        ["Twin Ventures", "1 x L1 + 2 x L2", "3", "10 EP"],
        ["Silent Merger", "3 x L2", "3", "11 EP"],
        ["Neighborhood Holdings", "3 x L1 + 1 x L2", "4", "12 EP"],
        ["Regional Consolidated", "2 x L2 + 1 x L3", "3", "13 EP"],
        ["Crosstown Alliance", "2 x L1 + 2 x L2", "4", "13 EP"],
        ["Metro Trust", "1 x L2 + 2 x L3", "3", "14 EP"],
        ["Crossroads Deal", "1 x L1 + 3 x L2", "4", "14 EP"],
        ["Skyline Consolidated", "3 x L3", "3", "15 EP"],
        ["Apex Group", "2 x L2 + 2 x L3", "4", "16 EP"],
        ["Titan Industries", "2 x L3 + 1 x L4", "3", "17 EP"],
        ["Colossus Group", "4 x L3", "4", "19 EP"],
        ["Empire Holdings", "1 x L2 + 2 x L3 + 1 x L4", "4", "20 EP"],
        ["Omnicorp", "3 x L3 + 1 x L4", "4", "22 EP"],
      ],
    } },
    { p: "A level-4 company is one that has been upgraded from level 3, so the richest tiles need companies you have already paid to grow." },
    { h: "The four tiers" },
    { p: "The sixteen tiles are four tiers of four. Tier 4 is the four cheapest to assemble and tier 1 the four hardest, and the tier does two things: it decides which tiles are in the box, and it divides what the headquarters earns." },
    { table: {
      head: ["Tier", "Tiles", "In play from", "A $3 industry banks", "A $6 industry banks"],
      rows: [
        ["4", "Local Syndicate, Founders\u2019 Pact, Continental Holdings, Twin Ventures", "2 players", "0 EP", "1 EP"],
        ["3", "Silent Merger, Neighborhood Holdings, Regional Consolidated, Crosstown Alliance", "2 players", "1 EP", "2 EP"],
        ["2", "Metro Trust, Crossroads Deal, Skyline Consolidated, Apex Group", "3 players", "1 EP", "3 EP"],
        ["1", "Titan Industries, Colossus Group, Empire Holdings, Omnicorp", "4 players", "3 EP", "6 EP"],
      ],
    } },
    { p: "Tiles are drawn from every tier that is in play, and how many depends on the table: TWO from each tier at two, three or four players, THREE at five, and at six players every tile in the game is available. So the box holds four tiles at two players, six at three, eight at four, twelve at five and all sixteen at six." },
    { note: "The wider draw at five and six is not variety for its own sake. A second Megacorp calls the final quarter, and the biggest tables are the ones with most reason to want that door open - twelve quarters with six people deliberating is a long evening. With the full box in play a second merger becomes findable rather than a matter of whether the two tiles you could use happened to be drawn: games ending early go from 7% at four players to 22% at five and 34% at six, and the average six-player game ends about two thirds of a quarter sooner." },
    { note: "Before the tiers, a Local Syndicate built out of three level-1 companies earned exactly as much every quarter as an Omnicorp built out of four level-3s, and the Megacorp had grown to 33% of a winning score - the largest single bucket in the game, ahead of companies. Dividing the brand by the tier halved that to 17% and took the winner\u2019s lead over last from 58.6 EP to 48.7, without making the merger itself any rarer. The draw rule barely registers at four players, where eight random tiles out of sixteen already average two per tier; it earns its keep at two, where it took the unclaimable tiles out of the box and Megacorps formed rose from 1.00 a game to 1.26." },
    { note: "A merger is meant to be a real decision, not a free bonus: you are trading away the companies' production and their remaining upgrades for a lump sum now, a headquarters that collects without trading, and a district that scores around it. Every EP those companies already scored is banked and stays banked. It is strongest in Year 3 and usually a mistake in Year 1." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "scoring",
  title: "Winning",
  blocks: [
    { p: "Score steadily rather than chasing one big move. Breadth pays early, size pays late." },
    { table: {
      head: ["Source", "EP"],
      rows: [
        ["Entering an industry for the first time", "+5 each, once per industry per game, banked immediately"],
        ["Each company, when it is built - and again when it is upgraded", "+2 per level"],
        ["Megacorp tile", "+8 to +22 as printed"],
        ["Megacorp HQ, each quarter it stands", "+ its industry's price / its tile's tier, rounded down"],
        ["Megacorp HQ, at the end", "+3 for each other company beside it"],
        ["The Real-Estate Mogul - most plots owned, at every year end", "+5 to the leader alone"],
        ["The Omnipresent - most districts you are present in, at every year end", "+5 to the leader alone"],
        ["Cash on hand at the end", "+1 per full $10"],
        ["Each loan disc still in the bank", "-5"],
      ],
    } },
    { p: "For The Omnipresent, a district counts if you own a plot in it or one of your active companies stands in it." },
    { p: "Ground rent is simply money. It is collected as it is earned and scores inside your cash at the end like every other dollar - there is nothing separate to track. What is worth knowing is how much of your income it quietly becomes: a plot with somebody else\u2019s building on it pays you every quarter, and by six players half the plots a player owns carry a rival\u2019s building." },
    { note: "Rent was briefly given its own scoring line while the balance of land was being investigated. It has been folded back into cash: the split changed no totals, and asking a table to keep a running rent tally all game to divide one number into two halves that add back to it is bookkeeping without a decision. The digital build still shows the flow, where it costs nothing. Land plus rent is about 27% of a winning score at two seats and 14% at six - see audit_idle_land.js." },
        { p: "Only the outright leader scores a land award, and a shared lead pays badly: 5 EP alone, 2 EP each if two players tie, 1 EP each if three or more do. Second place gets nothing." },
    { note: "The awards used to pay 10 and 5 and split between ties, which meant almost everybody collected something and holding land was never really a contest - it was 21% of an average seat's score for very little decision-making. Paying only the leader, and paying badly for a draw, drops it to about 9% and turns it back into a race." },
    { h: "When the game ends" },
    { p: "The game ends at the close of Quarter 12, OR at the close of the quarter AFTER any player launches their SECOND Megacorp - whichever comes first. The second Megacorp does not end the game; it CALLS the final quarter, and everyone gets that quarter to answer it. If it is launched in Q11 or later the game simply ends at Q12 as usual." },
    { p: "Most EP wins. If the final scores tie, the player still running more ACTIVE COMPANIES wins - headquarters do not count, because a headquarters has stopped trading. If that is level too, the player with more money; and if they are still tied, the player with fewer loan discs left in the bank." },
    { note: "The second Megacorp is a deadline rather than a shortcut. A player who can assemble two of them has spent the game merging, and the rest of the table would otherwise have four more quarters to be run away from. In practice it fires in about one game in eight and almost always in Quarter 11 or 12, so it shortens the average game by only a few weeks of board time - what it really does is put a clock on the leader\u2019s last merger." },
    { note: "The two dials were set together against 300 games a case. At 3 EP a level, companies were 32% of an average seat's score and everything else faded behind them; at 1 EP an upgrade stopped being worth paying the setup cost twice and upgraded companies fell from 5.1 a game to 3.1, while the 5 EP entry bonus swelled to 27% of a score for a decision that is barely one. Two and three put companies at 30%, Megacorps at 24%, cash at 22%, entry at 15% and land at 10% - nothing over a third, and building is still the biggest single thing." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "personas",
  title: "Personas",
  blocks: [
    { p: "Personas are asymmetric powers, one tied to each industry. They are dealt by default - leave them out for a first game if you like - and only as many as there are players are dealt, so at least two always sit out. Everyone's persona is public from the start, so you can weigh your own specialism and everybody else's while drafting." },
    { table: {
      head: ["Persona", "Power"],
      rows: [
        ["Systems Architect (TE)", "Your Technology companies upgrade vertically, stacking on one plot instead of needing a free neighbour."],
        ["Public Health Director (HC)", "Your Healthcare companies ignore the level restriction: a level-1 clinic may serve any column of a Healthcare row."],
        ["White-Label Supplier (MA)", "When your Manufacturing cross-sells into another industry's row, it is paid that industry's price instead of its own."],
        ["Resort Developer (HO)", "Your Hospitality companies upgrade horizontally, spreading across plots so more businesses and hubs sit next to them."],
        ["Supply Chain Expert (RE)", "At the start of Revenue, raise one industry you do NOT operate by one step; your Retail then reaches one extra district this quarter."],
        ["Concession Holder (UT)", "Your Utilities production sells for $1 above the current price."],
      ],
    } },
    { note: "Each persona is a tilt, not a cage. They all deliberately point at doing more of one industry, and the entry bonus deliberately points the other way, so a persona changes your best line without collapsing it to one." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "variants",
  title: "Rule variants (optional)",
  blocks: [
    { p: "Every one of these is off by default, and a table that leaves them alone plays exactly the rules in this book. They can be combined freely." },
    { p: "They all read as playing it the older way, because that is what they are. Five rules that were optional in v12 became standard in v13, and what remains switchable is the game as it was before." },
    { table: {
      head: ["Variant", "What changes"],
      rows: [
        ["Score at the year end", "A company waits for the next year end to take its EP, instead of scoring the moment it is built or upgraded. It still scores once per build or upgrade."],
        ["Levels score heavy", "A company level is worth 3 EP instead of 2. Building tall becomes the biggest single thing on the scoreboard, at the cost of pushing land, cash and the entry bonuses into the background."],
        ["Ordered decks", "Each industry deck runs level 1 on top down to level 3 at the bottom, instead of being shuffled whole. No level 3 can be drafted, and the early game holds no surprises."],
        ["Hubs on the road", "A Logistic Hub straddles a border and joins the two districts either side, instead of standing on a plot and reaching only its own. No plot is consumed, and every hub is worth two districts rather than one."],
        ["Land awards at the end only", "The Real-Estate Mogul and The Omnipresent are paid once, after Quarter 12, instead of at every year end. Land becomes a late-game race rather than something to hold all game."],
      ],
    } },
    { p: "Agree which of them are on before the draft. Several change what a Blueprint is worth, so choosing halfway through is not a neutral act.", only: "table" },
    { p: "Whichever are on is shown in the waiting room before the game starts, and recorded with the finished game, so a variant table is never mistaken for a standard one in the records.", only: "digital" },
    { note: "These are kept switchable so the two versions can be played side by side, not because the older ones are balanced against the new. Turning all five on plays v12 almost exactly." },
    { note: "Hubs on plots is a genuine constriction: a quarter of the plots on the board have no orthogonal neighbour at all, so a badly placed hub connects nobody. That is the rule working as intended - it is why the hub picker tells you how many plots a spot would connect before you commit to it - but it is also the rule most likely to need another look after a few tables." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "online",
  title: "Playing online",
  only: "digital",
  blocks: [
    { p: "Create a room and share the six-character code. Anyone who enters it joins your table." },
    { ul: [
      "2 to 6 seats in any mix of people and bots. Bots fill any seat you do not want to wait for.",
      "If the table is full or the game has already started, latecomers join as watchers: they see the whole board and can chat and talk, but cannot act.",
      "Text chat and voice chat are built in. Voice runs peer to peer - the server only introduces you.",
      "Refreshing or losing your connection does not lose your seat. Come back to the same address and you are put straight back in.",
      "If someone leaves for good, the host can hand their seat to a bot so the table is not held up.",
    ] },
    { p: "The server is authoritative: it runs the same rules engine and rejects anything that is not your move, so nobody can act out of turn." },
  ],
},

/* ------------------------------------------------------------------ */
{
  id: "quickref",
  title: "Quick reference",
  blocks: [
    { table: {
      head: ["", ""],
      rows: [
        ["Game length", "12 quarters (3 years of 4), or until someone launches a 2nd Megacorp"],
        ["Players", "2 to 6"],
        ["Workers", "2 each, or 3 each in a two-player game"],
        ["Discs", "12, covering plots owned + active companies + unpaid loans"],
        ["Company slots", "5, counting Megacorp headquarters"],
        ["Hand limit", "5 Blueprints"],
        ["Loan", "+$20 and one disc; buy back for $30 / $35 / $40 at year ends; -5 EP if unpaid"],
        ["Sell a Blueprint", "$4 / $8 / $12 by level; $2 / $4 / $6 in a forced sale"],
        ["Sell a company", "half its setup, or the full setup if upgraded; halved again in a forced sale"],
        ["Plot value", "road price (1-6) + $1 per occupied neighbour + $1 if it touches a hub"],
        ["Upgrade", "pay the setup cost again; production and OPEX double; level +1"],
        ["Rent", "$2 per company level, to the owners of the plots it stands on"],
        ["Unsold production", "$1 per unit"],
        ["Industry pot", "split evenly among that industry's active companies; the remainder rides forward"],
        ["Renovation", "card must match the shell's level; from level 2 up, its scaling type too"],
        ["Final tie", "most money, then fewest loan discs in the bank"],
        ["Demand rows 3-4", "closed until Quarter 5"],
        ["Demand grid", "wiped clean at the end of Quarter 8"],
        ["Company scoring", "2 EP per level, the moment it is built - and again when it is upgraded"],
        ["Industry debut", "3 EP the first time you build in each industry, banked at once"],
        ["Land awards", "5 EP to the outright leader in plots, and in districts, at every year end"],
        ["Logistic Hub", "one per quarter, on an empty plot; reaches its own district; joins orthogonally"],
      ],
    } },
  ],
},

];
