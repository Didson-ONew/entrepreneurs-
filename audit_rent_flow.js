/* ============================================================================
   Where rent actually comes from - and why raising it would break the loop.

   THE QUESTION. Would charging more rent to bigger companies - $2/$3/$4/$5 per
   level by company level - tax the leader? And the designer's own suspicion:
   "this might not change anything since rent is coming from the unaltered OPEX
   anyway."

   THE SUSPICION IS CORRECT, and it matters more than it first appears. Reading
   runProduction: a company pays `p.cash -= cost` where cost is bizOpex(b), and
   NOTHING ELSE. Rent is then carved OUT of that payment - `rentTotal` goes to
   the plot owners and `toPots = cost - rentTotal` goes to the supplier pots. So
   the rent rate does not change what a tenant pays at all. It only decides how
   the money it already paid is SPLIT between landlords and the industry pots.

   Three consequences follow, and they are the whole answer:

     RAISING RENT COSTS A TENANT NOTHING. Their outlay is their OPEX either way.
     A level-3 company paying $12 of rent instead of $6 is not poorer by a
     dollar.

     IT PAYS THE SELF-LANDLORD. Rent onto ground you own comes straight back, so
     your net cost is opex minus rentTotal. Raise the rate and that rebate GROWS.
     The players most able to own the ground under their own buildings are the
     ones with the most land - so a rent rise is a transfer TO the leader, not
     from them.

     IT STARVES THE POTS, WHICH ARE THE EGALITARIAN CHANNEL. A pot is split
     evenly among the active businesses of its industry - one equal share each,
     whatever their size - while land income is concentrated in whoever owns
     land. Moving money from pots to rent is therefore regressive by
     construction. Measured below: the proposed ladder cuts the money reaching
     the pots by 38%.

   AND IT WOULD CREATE MONEY. `toPots = Math.max(0, cost - rentTotal)` floors at
   zero, but the landlords are still paid `rentTotal` in full. If rentTotal ever
   exceeds the company's OPEX, more money leaves the bank than the tenant paid
   in - and the closed loop, which is the whole premise of the game, stops being
   closed. At the shipped flat $2 this never happens. Under the ladder it
   happens on four of the sixty cards at level 3, and on most level-4 companies.

   THIS FILE ALSO GUARDS THE INVARIANT. It fails if any card in the shipped game
   can be charged more rent than its OPEX, so the loop cannot be quietly broken
   by a future change to either number.

   Run: node audit_rent_flow.js
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }

const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, box };
vm.createContext(sandbox);
vm.runInContext(SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "") + `
  box.exports = { BP_DATA, INDUSTRIES, RENT_PER_LEVEL, IND_NAME };
`, sandbox);
const E = box.exports;

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};

/* Every distinct (industry, level) shape in the deck, plus the level-4 shape an
   upgrade produces: level doubles and OPEX doubles with it. */
function shapes() {
  const out = [];
  const seen = new Set();
  for (const b of E.BP_DATA) {
    const k = `${b.ind}${b.lvl}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ ind: b.ind, lvl: b.lvl, opex: b.opex, upgraded: false });
    if (b.lvl === 2) out.push({ ind: b.ind, lvl: 4, opex: b.opex * 2, upgraded: true });
  }
  return out.sort((a, b) => a.ind.localeCompare(b.ind) || a.lvl - b.lvl);
}

const LADDER = { 1: 2, 2: 3, 3: 4, 4: 5 };
const flatRent = (s) => E.RENT_PER_LEVEL * s.lvl;
const ladderRent = (s) => LADDER[s.lvl] * s.lvl;

console.log("Entrepreneurs - where rent comes from\n");
console.log("A company pays its OPEX and nothing else. Rent is carved out of that payment;");
console.log("whatever survives goes to the supplier pots. So the rent RATE decides a SPLIT,");
console.log("not a cost.\n");

console.log(pad("  company", 16) + rp("OPEX", 7) + rp("rent @$2", 10) + rp("to pots", 9)
  + rp("ladder rent", 14) + rp("to pots", 9) + "   verdict");
console.log("  " + "─".repeat(70));
let flatPots = 0, ladderPots = 0, flatOver = 0, ladderOver = 0;
for (const s of shapes()) {
  const fr = flatRent(s), lr = ladderRent(s);
  const fp = Math.max(0, s.opex - fr), lp = Math.max(0, s.opex - lr);
  flatPots += fp; ladderPots += lp;
  if (fr > s.opex) flatOver++;
  if (lr > s.opex) ladderOver++;
  console.log(pad(`  ${s.ind} L${s.lvl}${s.upgraded ? "*" : " "}`, 16)
    + rp(`$${s.opex}`, 7) + rp(`$${fr}`, 10) + rp(`$${fp}`, 9)
    + rp(`$${lr}`, 14) + rp(`$${lp}`, 9)
    + (lr > s.opex ? `   MONEY CREATED +$${lr - s.opex}` : ""));
}
console.log("  (* = the level-4 shape an upgrade produces)\n");

console.log("THE INVARIANT: rent must never exceed the OPEX it is carved from,");
console.log("or the landlords are paid money the tenant never handed over.\n");
check(`shipped rate ($${E.RENT_PER_LEVEL}/level) keeps the loop closed on every card`,
  flatOver === 0, `${flatOver} card shape(s) over`);
check("the proposed $2/$3/$4/$5 ladder does NOT",
  ladderOver > 0, `${ladderOver} card shape(s) would create money`);

console.log("\nWHAT THE LADDER WOULD DO TO THE POTS");
console.log(`  money reaching the pots, shipped:  $${flatPots} per full round of these shapes`);
console.log(`  money reaching the pots, ladder:   $${ladderPots}`
  + `   (${(100 * (ladderPots - flatPots) / flatPots).toFixed(0)}%)`);
console.log("  Pots are split EVENLY among the active businesses of an industry - one equal");
console.log("  share each, whatever their size - so they are the game's redistributive");
console.log("  channel. Land income is concentrated in whoever owns land. Shifting money");
console.log("  from pots to rent therefore favours the biggest landowner by construction.");

console.log("\nWHO A RENT RISE ACTUALLY PAYS");
console.log("  tenant on somebody else's ground: pays OPEX. Unchanged by the rate.");
console.log("  tenant on their OWN ground:       pays OPEX, receives the rent back.");
console.log("                                    Net cost = OPEX - rent, so a HIGHER rate");
console.log("                                    makes their company CHEAPER to run.");
console.log("  Owning the ground under your own buildings is what the rate rewards, and");
console.log("  that is easiest for whoever already holds the most land.");

console.log(fails ? `\n${fails} FAILED\n` : "\nall good\n");
process.exit(fails ? 1 : 0);
