# Game ideas

A notebook, not a specification. Nothing here is a commitment and nothing here is
part of Entrepreneurs.

It exists because a conversation is not storage. Ideas described in a chat live
only as long as that chat's memory of them, and a long session summarises its own
history to keep going, which quietly drops whatever did not look load-bearing at
the time. Four of these were lost that way once. A file in the repository is the
only durable place, so this is where they go from now on.

Each entry keeps the designer's own words first. Anything under **Open questions**
is a note from a reader, not a decision.

---

## 1. Entrepreneurs

The one being built. See `RULEBOOK.md`, and the game itself at
`EntrepreneursGame.jsx`.

A heavy economic euro for two to six players. Every industry is supplied by
exactly three others, so your operating costs are your rivals' income; you buy
land before you can build on it, and land keeps trading under standing buildings.

---

## 2. Parallel universes

> Multiple players play the game in the same board but as in parallel universes,
> where their actions can superposition with those from other players, and
> together they form a multidimensional pattern which molds the mechanics of the
> game as it progresses.

**Open questions.**
- What is the unit that superposes: a single placement, a resource, a whole turn?
- When two players act on the same space, does that reinforce, cancel, or produce
  a third state neither chose?
- "Molds the mechanics" can mean two very different games. Rules that rewrite
  themselves mid-game are hard to teach and harder to balance; a fixed rule set
  whose *payoffs* shift with the shared pattern is far easier to ship and may
  give the same feeling.
- Can a player see the other universes, or does each play in fog? Full
  information makes the pattern plannable; fog makes it a gamble.

---

## 3. Quality management

> Players may receive gratitude tokens, but if they get too many too fast they
> may face trouble for being bribed.

**Open questions.**
- Is the trouble a threshold (a cap per round) or a rate (tokens per unit of
  time)? A rate is more interesting, because it makes timing the whole game.
- Who raises the accusation: the game, or the other players? The second turns
  this into social deduction and changes the audience entirely.
- Can a token be refused, delayed, or passed on? A way to launder gratitude is
  what would give the push-your-luck its brake.
- The theme carries real texture: audits, certifications, inspectors, the
  difference between a gift and an inducement.

---

## 4. Invasion of buildings

> Special tactic forces need to penetrate a well guarded location that is
> randomly built at every game. Players define their success through collecting
> gear, and approaching methods for a selection of available cards.

**Open questions.**
- Cooperative against the building, or competitive teams racing into it?
- Is the location built and shown before play, so it is a puzzle to solve, or
  revealed as you enter, so it is an exploration?
- A randomly built location needs a generator that cannot produce an unwinnable
  layout. That generator is the hard engineering, and it is worth prototyping
  before anything else.
- Gear plus approach is a combination engine. The interesting question is whether
  a bad approach with great gear should beat a great approach with bad gear.

---

## 5. Space travel with time dilation

> Space travel with time dilation in its core mechanics.

**Open questions.**
- Dilation means players' clocks run at different rates. The design risk is
  downtime: whoever is travelling fast must still have something to do while the
  others take many turns.
- One shape that avoids it: a time track where a fast trip costs few of your own
  turns but lands you in a world many rounds older, changed by everyone else.
  That is a proven pattern in games with variable turn order, where the player
  furthest back always acts next.
- What is worth carrying across the gap: cargo, information, or a relationship
  with a colony that has aged without you?
