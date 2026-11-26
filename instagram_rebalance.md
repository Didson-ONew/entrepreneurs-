# Entrepreneurs — the rebalance, as a posting sequence

A second Instagram sequence, about how the game got balanced rather than what it
is. The launch sequence in `instagram_captions.md` sells the game; this one
sells the *process*, which is the thing a designer audience actually wants to
watch.

Every number below is measured, and every one comes from a named audit in the
repository. Nothing here is a rounded-up marketing figure — if a post says 78%,
`audit_setup.js --tails` printed 78%.

> **Before posting, fix one thing in the old sequence.** `instagram_captions.md`
> prints the supply web as it was: `UT buys from HO, TE, HC` and so on. The
> rebalance re-pointed it. The matrix is now
> `UT→TE,HC,MA · RE→UT,HO,TE · HO→HC,MA,RE · MA→HO,TE,UT · HC→RE,UT,HO · TE→MA,RE,HC`,
> and fourteen of the eighteen links run both ways. Re-run
> `make_instagram.mjs` and the images follow; the prose in that file needs a
> hand edit.

---

## Post 1 — "I found out my game had a favourite"

**Carousel, 5 slides.**

1. `THREE INDUSTRIES WERE WINNING 83% OF GAMES.` / small: *and it wasn't the obvious three*
2. The six industries in two columns. Left: **Retail, Hospitality, Healthcare — 82.6%**. Right: **Utilities, Manufacturing, Technology — 17.4%**.
3. `The split isn't about the cards.` / `RE, HO and HC grow UPWARDS — one plot, any level.` / `UT, MA and TE grow SIDEWAYS — a plot for every level.`
4. `I had been tuning setup costs for weeks. The gap barely moved.` / `Because I was measuring the wrong thing.`
5. `Next: what a spread of averages can't tell you.`

**Caption.**
> I've been balancing this game by comparing averages — this industry earns
> that much, that one earns this much, bring them closer together. Six months
> of it.
>
> Then I measured something different: not what each industry earns on
> average, but **how often it decides the game**. Different question, very
> different answer. Three of the six were taking 82.6% of games between them,
> and they were exactly the three that grow vertically — one plot whatever the
> level — against the three that need a new plot for every level they add.
>
> No card number I'd touched had moved that by more than a couple of points,
> because it was never a card problem.
>
> 1500 games a table size, with a second disjoint block of 1500 as a control.
> `audit_setup.js --tails`

---

## Post 2 — "The measurement that was lying to me"

**Carousel, 4 slides.**

1. `MY SCOREBOARD WAS MISSING A THIRD OF THE SCORE.`
2. `EP comes from three places:` / `• every company you build` / `• every industry you enter` / `• the two land awards, every year end`
3. `I was counting the first two.` / big: `THE LAND AWARDS ARE 33% OF THE SCORE AT THREE PLAYERS.`
4. `And they're the half built to pay the industries I thought were losing.`

**Caption.**
> Embarrassing one. My analysis read EP out of the game log by matching
> "Company: …" and "Entered …" lines. Land awards didn't match either pattern,
> so they fell on the floor.
>
> That's not a rounding error. At three players the two land awards —
> The Real-Estate Mogul and The Omnipresent — are a third of a winning score.
> At two players it's 37%. And they're specifically the mechanism that pays
> back the sprawling industries, because a company spread across several
> districts is present in more of them.
>
> So I had been measuring the half of the score where the vertical industries
> are strong, and dropping the half written to compensate the horizontal ones.
>
> Fixing it didn't rescue the result — the gap was still there — but every
> number I'd said out loud for two days was computed on two thirds of the game.
> Check what your instrument isn't counting.

---

## Post 3 — "78%"

**Carousel, 5 slides.**

1. big: `78%` / `of all land-award points were going to empty ground`
2. `The Real-Estate Mogul pays the player holding the most land.` / `It counted plots you OWN.`
3. `So the winning move was to buy ground and never build on it.`
4. `A land award had become a land-banking dividend.` / `Not a race to develop the city.`
5. `One line changed: count what's BUILT.` / `Bare ground now earns $0.2 of a $40 award.`

**Caption.**
> This one I didn't go looking for. I was splitting the land awards across
> whatever earned them, to see whether the sprawling industries were actually
> getting paid — and found that 78% of the money wasn't going to companies at
> all. It was going to plots somebody had bought and left empty.
>
> The award text says it rewards holding the most land. The intent was that
> spreading a company across districts is worth something. What it actually
> rewarded was buying deeds.
>
> Both counts now read built ground: a plot scores for the Mogul when a company
> stands on it, and a district scores for The Omnipresent when you have
> something there. Empty ground earns $0.2 of a $40 award instead of $31.9.
>
> It gave Utilities, Manufacturing and Technology 6–9 points of games back at
> every table size. `audit_setup.js --builtland`

---

## Post 4 — "Retail was getting its land for free"

**Carousel, 5 slides.**

1. `EVERY INDUSTRY PAYS FOR ITS GROUND.` / `Except one.`
2. `A Retail branch picked an empty plot and simply took it.` / `Price: one disc.` / `Buying that same plot: cash AND a disc.`
3. `Retail was decided 26% of games.` / `and took the largest share of the land awards`
4. `Now a branch opens only on ground somebody already owns —` / `and on a rival's plot it pays them rent, every quarter.`
5. `Retail: 26% → 20.4% of games.` / `Still opens 1.85 branches a game.` / `The character survives. The subsidy doesn't.`

**Caption.**
> Retail scales differently from everything else in the game: it opens
> branches, one shopfront per level, each in a new district. I like the
> mechanic — reach is what retail *is*.
>
> What I hadn't noticed is that a branch was taking its plot for nothing. The
> code looked for ground nobody owned, then wrote the player in as the owner.
> One disc, no cash. Every other industry pays for land.
>
> Two readings of the fix, both measured. Making branches **pay** for the plot
> does almost nothing — the plot price is a rounding error against a Retail
> chain's cash flow. Making them open only on ground that's **already owned**,
> and pay rent on a rival's, does the work.
>
> It's where a branch may go that matters, not what it costs. That surprised
> me; I'd assumed the opposite and wrote the "just charge for it" version
> first. `audit_setup.js --branchrent`

---

## Post 5 — "Three fixes that did nothing"

**Carousel, 6 slides.**

1. `THE NEGATIVE RESULTS` / *the ones that don't make the trailer*
2. `Split the supplier pot by company size?` / `Dead. Pots are shared between 1.3 companies. There's nobody to split with.`
3. `Stop headquarters drawing a share they didn't pay into?` / `Dead — and slightly backwards. Fewer splitters means bigger shares.`
4. `Make the supply web fully reciprocal — everyone supplies whoever supplies them?` / big red: `3.46× → 6.81×` / `Twice as unfair.`
5. `Flatten the cost of growing a company?` / `Halved the entire B2B economy. Bought nothing.`
6. `Four good ideas. Four measurements. Four noes.`

**Caption.**
> The honest part of balancing: most of what you try doesn't work, and you only
> find out because you measured it.
>
> The one that stung was reciprocity. The supply web had ten one-way links —
> A pays B, B pays someone else. Making every link mutual felt obviously
> right, and it was a five-slot edit. It nearly doubled the imbalance, to
> 6.81×, and collapsed Healthcare to a fifth of its income.
>
> A return path is worth nothing when the industry at the other end never gets
> built. Reciprocity wasn't the virtue — *which* industries the big payers
> point at was.
>
> All four are still in the repository as arms you can run, with the numbers
> that killed them written into the file header. A negative you can't reproduce
> gets re-tried in six months.

---

## Post 6 — "What actually shipped"

**Carousel, 6 slides.**

1. `THE REBALANCE` / small: *three changes, measured together*
2. `1. Land awards pay for BUILT ground.`
3. `2. Retail branches stand on ground somebody owns, and pay rent.`
4. `3. New cards: entry paired at $10 / $15 / $20.` / `Five of six pay back in the same 2.50 quarters.`
5. Before/after table: `Vertical industries 82.6% → 71.4%` · `Most-dominant industry 36.5% → 34.9%` · `Least-represented 5.1% → 8.1%` · `Empty ground $31.9 → $0.1`
6. `Separately: 8.8 points, 1.8 points, and a little.` / big: `TOGETHER: 15.4` / `They only work as a set.`

**Caption.**
> Shipped. Three changes, and the thing I want to point at is the last slide.
>
> Measured on its own, the branch rule moves the industry split by **1.8
> points**. The land-award rule moves it by **8.8**. Together they move it by
> **15.4** — far more than the sum.
>
> They compound because they're the same mechanism seen twice: counting built
> ground is what makes a branch worth having, and charging for a branch is
> what stops the player who benefits most from running away with it. Either
> alone leaves the loop half-closed.
>
> If I'd tested them one at a time and taken the first answer, I'd have thrown
> the branch rule away as useless. It was useless, until the other one existed.

---

## Post 7 — "Each industry should feel like itself"

**Carousel, 6 slides.**

1. `BALANCE ISN'T SAMENESS.`
2. Table: `Retail — profit $6 at base, −$2 two steps down. Dies first.`
3. `Manufacturing — $12 at base, still +$4 two steps down. Rides to the floor.`
4. `Hospitality & Technology — cheapest to enter, smallest output.`
5. `Five of six pay back in 2.50 quarters.` / `What differs is HOW FAR THE PRICE CAN FALL.`
6. `Same fairness. Six different fears.`

**Caption.**
> The goal was never six identical industries. If they're identical there's
> nothing to read and no reason to prefer one board over another.
>
> So the cards are level on one axis and deliberately unequal on another. Five
> of the six pay back their setup in the same 2.50 quarters at base price. What
> differs is price headroom — how far their market can sour before they stop
> making money. Retail turns the most goods and is underwater two steps down.
> Manufacturing costs twice as much to enter and is still profitable at the
> very bottom of the track.
>
> That's a real decision at the table: cheap and fragile, or expensive and
> durable. And it's reachable, because payback and headroom are tied —
> headroom is profit over production, payback is setup over profit — so level
> payback with graded headroom only works when setup rises with production
> times headroom. The pairing does exactly that.

---

## Post 8 — "How it's measured"

**Carousel, 4 slides.**

1. `51 BALANCE AUDITS. 82 AUTOMATED TESTS.`
2. `Every change is a flag you can run:` / `--builtland · --branchrent · --tails · --v6`
3. `Every run has a control block —` / `1500 games on different seeds, same rules.` / `If the control disagrees, it was luck.`
4. `The failures are written into the files too.`

**Caption.**
> How this works, if you're building something similar.
>
> Each proposed rule is a flag on an audit script that splices the change into
> the real engine at run time — not a copy of the rules, the actual game code.
> So a measurement can't drift away from what ships.
>
> Every result gets a control: the same 1500 games on a disjoint block of
> seeds. If the control doesn't agree within a point, the result was seed luck
> and it doesn't go in. That caught at least two things I'd have otherwise
> believed — a 100-game run told me the "just charge for the branch" fix
> worked, and 1500 games with a control said it does nothing.
>
> And the negatives live in the file headers with their numbers, so nobody —
> me, six months from now — retries them from scratch.

---

# The video

A single piece, roughly 2:40. Three movements: you, the game, the work. Shoot
the first on camera, the second over the board, the third over the screen.

**Tone:** you're not pitching. You're showing someone a thing you've been
taking apart. Let the surprise in Act 3 be a real surprise — it was one.

---

### Act 1 — who you are · 0:00–0:25 · on camera

> "I design board games. This one's called Entrepreneurs, and I've been
> building it for [X] years.
>
> It's a heavy economic game about running companies in a city you build
> together. And the premise is simple: **your running costs are somebody
> else's income.** Every bill you pay each quarter lands in a rival's pocket.
> There's no bank soaking it up. It all goes somewhere, and somewhere is
> always a person at the table.
>
> I want to show you something that went wrong with it, and how I found out."

*Shot: you, mid-shot, the board visible but out of focus behind. Cut on
"went wrong".*

---

### Act 2 — the game · 0:25–1:10 · over the board

> "Six industries. Utilities, Retail, Hospitality, Manufacturing, Healthcare,
> Technology. Each one buys from exactly three of the others — printed on the
> card, no hidden information.
>
> *(place a company)* Build here, and my own industry's price drops a dollar —
> more supply. And every supplier I just named goes **up** a dollar, because I'm
> buying from them now.
>
> *(tap the track)* So the whole table reads the same board and gets different
> answers from it. That's the game: not 'which industry is best', but 'which
> industry is best **right now, on this board, in this seat**.'
>
> Which is exactly why it's so hard to tell when something's broken."

*Shot: top-down, hands only. One real build, one real price move. Nothing
staged beyond the one placement.*

---

### Act 3 — what went wrong · 1:10–2:25 · over the screen

> "Here's what I'd been doing. Compare the averages — what each industry earns
> over a few hundred games — and nudge the card costs until they line up.
>
> *(numbers on screen)* They lined up fine. And the game still felt like it had
> a favourite.
>
> So I asked a different question. Not 'what does each industry earn', but
> **'how often does each one decide the game'**. Fifteen hundred games, every
> table size.
>
> *(the 82.6 / 17.4 split)* Three industries were taking 82.6% of games. And it
> was the three that grow *upwards* — one plot, however big they get — against
> the three that need a new plot for every level. Nothing on the cards. The
> shape of the city.
>
> *(the 78%)* Then it got worse. There's an award every year for holding the
> most land. I checked where that money was actually going, and 78% of it was
> going to plots people had bought and left **empty**. It was paying for
> speculation, not for building.
>
> *(the fix)* So: the land awards count what you've built, not what you own.
> And Retail — which had been taking its land for free, the only industry
> that did — now has to buy it like everyone else.
>
> *(the after numbers)* 82.6 down to 71.4. The most dominant industry down,
> the quietest one up by half again.
>
> And the part I didn't expect: **neither change is worth much alone.** One's
> worth 1.8 points, the other 8.8. Together they're worth 15.4. I nearly threw
> the first one away as useless — it was useless, until the second one existed."

*Shot: screen capture of the audit output, real terminal, real numbers
scrolling. Don't prettify it — the rawness is the credibility.*

---

### Close · 2:25–2:40 · back on camera

> "Fifty-one audits, eighty-two tests, all of it in the repo. Every rule I
> tried that **didn't** work is written in there too, with the numbers that
> killed it — because otherwise I'll try it again in six months.
>
> If you design games and you're tuning by feel: measure the thing you think
> you're measuring. Mine was quietly ignoring a third of the score."

*Shot: you, same framing as Act 1. End on the board, no logo card.*

---

### Production notes

- **Act 3 is the piece.** If you have to cut, cut Act 2 to 30 seconds. Nobody
  stays for the premise; they stay for the 78%.
- **Caption the numbers on screen** — most viewing is muted, and 82.6 / 17.4 /
  78% / 15.4 are the four that have to land visually.
- **Hook in the first three seconds.** Open on "three industries were winning
  83% of my game and I couldn't see it", then cut back to the introduction.
- **Reusable cutdowns:** Act 3's 78% section stands alone as a 40-second Reel
  (Post 3). The compounding ending stands alone as a 25-second Reel (Post 6).
