/* ============================================================================
   Supply Chain Expert (RE) in human hands - the bug, and the guard.

   THE REPORT. "I wasn't prompted to increase the price of an industry so I
   could choose one extra district to sell to."

   Correct on both counts. The persona reads:

     "At the start of Revenue, raise one industry you do NOT operate by one
      step; your Retail then reaches one extra district this quarter."

   That is a choice followed by a reward, and a human used to get neither.

   DEFECT 1 - THE CHOICE WAS NEVER OFFERED. applySupplyChainBump ran over every
   player at the top of Production and picked for them:

       const pick = options.sort((a,b) => price(pm,a) - price(pm,b))[0];

   with a comment saying "bots take the top one" - but nothing in the loop
   distinguished a bot from a human, so a human was never asked and always
   lifted the CHEAPEST outside industry, which is the market where a step is
   worth least. Fixed by splitting the loop: bots still resolve inline, humans
   go into state.scQueue and the game pauses in a new "supplyChain" phase until
   each has named an industry.

   DEFECT 2 - THE REWARD WAS SILENTLY THROWN AWAY, which is what made the
   persona worthless rather than merely automatic. reachableDistricts read:

       const explicit = chosenExtra || state.reChoices[biz.id];
       const extra = explicit || bestExtraDistrictsForRE(state, biz, biz.level + bonus, home);

   The bonus existed only in the FALLBACK branch, so the moment a human
   confirmed a pick, `explicit` won and `biz.level + bonus` was never
   evaluated. The picker compounded it by capping the human at biz.level flat.
   A human paid the cost and got nothing; a bot got the whole ability, because
   a bot never sets reChoices and so always took the fallback. Fixed by giving
   both sides one number, reAllowance(state, biz, owner).

   The server also stored reChoice unvalidated, so the district cap was
   enforced only by the button in the browser. It now trims to reAllowance.

   THIS FILE IS NOW A REGRESSION GUARD. It fails if a human's reach stops
   matching a bot's, or if the industry choice stops being offered.

   Run: node test_supply_chain.js
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }

/* Shape guards: this probe is only meaningful against the code it describes. */
const NEEDLES = [
  ["one shared allowance feeds both the picker and the engine",
   "function reAllowance(state, biz, owner) {"],
  ["the explicit branch is trimmed to that allowance",
   "const extra = explicit ? explicit.slice(0, allow) : bestExtraDistrictsForRE(state, biz, allow, home);"],
  ["humans are queued rather than auto-picked for",
   "function humansNeedingSupplyChain(state) {"],
  ["the bump loop skips humans",
   "if (p.isHuman) continue;"],
  ["a persona is a single field, so this probe sets p.persona not p.personas",
   "const hasPersona = (p, key) => !!p && p.persona === key;"],
];
for (const [what, needle] of NEEDLES) {
  if (!SRC.includes(needle)) {
    console.error(`the engine changed shape - ${what} is no longer written as this probe expects`);
    process.exit(2);
  }
}

const box = {};
const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
vm.createContext(sandbox);
vm.runInContext(SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "") + `
  box.E = { initGame, reachableDistricts, applySupplyChainBump, hasPersona, reAllowance,
            activeBiz, bizInd, allDistrictKeys, footprintDistricts, INDUSTRIES,
            supplyChainOptions, humansNeedingSupplyChain, chooseSupplyChain, price, mulberry32 };
`, sandbox);
const E = box.E;

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};

console.log("Entrepreneurs - is Supply Chain Expert reachable by a human?\n");

/* Find a seeded game with a Retail company we can hand the persona to. */
function findREGame() {
  for (let seed = 1; seed < 400; seed++) {
    const st = E.initGame(3, seed, ["Probe"], 0, true, {});
    for (const p of st.players) {
      const re = E.activeBiz(p).find((b) => E.bizInd(b) === "RE" && b.level >= 1);
      if (re) return { st, p, re };
    }
  }
  return null;
}

/* initGame does not hand out companies, so build the situation directly: take a
   game, give a player the persona, and put a Retail business in front of it. */
const found = findREGame();
if (!found) {
  console.log("  no seeded start produced a Retail company - this probe drives the");
  console.log("  reach function directly instead.\n");
}

const st = E.initGame(3, 7, ["Probe"], 0, true, {});
const p = st.players[0];

/* Force the persona on, whatever the seed dealt. */
p.persona = "supply_chain";   // hasPersona reads p.persona, singular
check("the player now has Supply Chain Expert", E.hasPersona(p, "supply_chain"));

/* Give them a level-2 Retail company on a plot they own, and a company in some
   OTHER industry so at least one industry counts as "operated". */
const plot = Object.keys(st.board.graph)[0];
p.plots = [plot];
const reBiz = {
  // deps matters: continueProduction runs real production, which reads it
  id: "probe-re", bp: { name: "Probe Retail", ind: "RE", lvl: 2, opex: 6, prod: 4, deps: [] },
  level: 2, footprint: [plot], active: true,
};
p.businesses = [reBiz];

const home = E.footprintDistricts(st.board, reBiz.footprint);

console.log("\nWHAT THE ABILITY IS WORTH, MEASURED THREE WAYS");
console.log("  (districts a level-2 Retail company can reach, minus its own)\n");

/* 1. No persona bonus at all - the plain Retail baseline. */
st.reExtraDistrict = {};
st.reChoices = {};
const plain = E.reachableDistricts(st, reBiz);

/* 2. Bonus granted, and NOTHING chosen - the path a bot takes. */
st.reExtraDistrict = { [p.id]: true };
st.reChoices = {};
const botPath = E.reachableDistricts(st, reBiz);

/* 3. Bonus granted, and the human confirms a pick sized by the SHARED allowance -
      which is exactly what the picker now passes as its max. */
const allow = E.reAllowance(st, reBiz, p);
const offered = E.allDistrictKeys(st.board).filter((d) => !home.has(d));
st.reExtraDistrict = { [p.id]: true };
st.reChoices = { [reBiz.id]: offered.slice(0, allow) };
const humanPath = E.reachableDistricts(st, reBiz);

/* 4. A client that ignores the cap and sends more than the allowance. */
st.reChoices = { [reBiz.id]: offered.slice(0, allow + 3) };
const overreach = E.reachableDistricts(st, reBiz);

const beyond = (set) => [...set].filter((d) => !home.has(d)).length;
const pad = (s, n) => String(s).padEnd(n);
console.log("  " + pad("no persona (baseline)", 36) + beyond(plain));
console.log("  " + pad("persona, BOT path (no reChoice)", 36) + beyond(botPath));
console.log("  " + pad("persona, HUMAN path (picker cap)", 36) + beyond(humanPath));
console.log("  " + pad("persona, client sends 3 too many", 36) + beyond(overreach));

console.log("");
console.log(`  reAllowance for a level-${reBiz.level} Retail with the bump live: ${allow}\n`);
check("a bot with the persona reaches further than the baseline",
  beyond(botPath) > beyond(plain), `${beyond(plain)} -> ${beyond(botPath)}`);
check("a HUMAN with the persona reaches further than the baseline",
  beyond(humanPath) > beyond(plain), `${beyond(plain)} -> ${beyond(humanPath)}`);
check("human and bot get the same reach from the same persona",
  beyond(humanPath) === beyond(botPath), `human ${beyond(humanPath)} vs bot ${beyond(botPath)}`);
check("the allowance is level + 1 while the bump is live",
  allow === reBiz.level + 1, `level ${reBiz.level}, allowance ${allow}`);
check("a client sending more districts than allowed is trimmed, not obeyed",
  beyond(overreach) === beyond(humanPath),
  `sent ${allow + 3}, honoured ${beyond(overreach)}`);

console.log("\nIS THE INDUSTRY CHOICE OFFERED NOW?");
/* A human seat with the persona and a Retail company must stop the game and be asked;
   the bump must NOT have been applied on their behalf before they answer. */
const st2 = E.initGame(3, 11, ["Probe"], 0, true, {});
const p2 = st2.players.find((x) => x.isHuman);
p2.persona = "supply_chain";
p2.plots = [Object.keys(st2.board.graph)[0]];
p2.businesses = [{ ...reBiz, footprint: [p2.plots[0]] }];
st2.reExtraDistrict = {};

const before = { ...st2.pm.demand };
const lines = [];
const lg = (m) => lines.push(m);

/* Bots resolve inline; the human must not. */
E.applySupplyChainBump(st2, lg);
const movedByBump = E.INDUSTRIES.filter((i) => st2.pm.demand[i] !== before[i]);
check("the bump no longer fires for a human seat on its own",
  !st2.reExtraDistrict[p2.id],
  st2.reExtraDistrict[p2.id] ? "the human was auto-bumped" : "human left for the prompt");

const queue = E.humansNeedingSupplyChain(st2);
console.log(`  humans queued to be asked: ${queue.length} (seat ${queue.join(", ") || "-"})`);
check("the human with the persona is queued for a prompt", queue.includes(p2.id));

const opts = E.supplyChainOptions(st2, p2);
console.log(`  industries offered to them: ${opts.join(", ")}`);
check("they are offered only industries they do NOT operate",
  opts.length > 0 && !opts.includes("RE"), opts.join(",") || "none");

/* Now answer it, and make sure the answer is honoured rather than overridden by the
   cheapest-industry rule. Deliberately pick the MOST expensive option - the opposite of
   what the old auto-pick would have chosen. */
const dearest = opts.slice().sort((a, b) => E.price(st2.pm, b) - E.price(st2.pm, a))[0];
const cheapest = opts.slice().sort((a, b) => E.price(st2.pm, a) - E.price(st2.pm, b))[0];
st2.phase = "supplyChain";
st2.scQueue = queue;
st2.awaitingPlayerId = queue[0];
const demandBefore = { ...st2.pm.demand };
E.chooseSupplyChain(st2, p2, dearest, lg, E.mulberry32(11));
const movedByChoice = E.INDUSTRIES.filter((i) => st2.pm.demand[i] !== demandBefore[i]);

console.log(`  they chose ${dearest} ($${E.price(demandBefore ? st2.pm : st2.pm, dearest)}); the old rule would have taken ${cheapest}`);
console.log(`  industries that moved: ${movedByChoice.join(", ") || "none"}`);
lines.forEach((l) => console.log(`  log: ${l}`));

check("the industry the human named is the one that moves",
  movedByChoice.length === 1 && movedByChoice[0] === dearest,
  `moved ${movedByChoice.join(",") || "nothing"}, wanted ${dearest}`);
check("and the Retail bonus is granted in exchange", !!st2.reExtraDistrict[p2.id]);
check("answering the last human resumes the quarter",
  st2.phase !== "supplyChain" && !st2.scQueue.length,
  `phase ${st2.phase}, ${st2.scQueue.length} still queued`);

console.log("\nTHE ONLINE PATH");
console.log("  server.js used to store the reChoice districts verbatim, so the cap was");
console.log("  enforced only by the button in the browser and was advisory in multiplayer.");
console.log("  It now trims to E.reAllowance, and the engine trims again on read - the");
console.log("  check above sends three too many and gets exactly the allowance back.");
console.log("  The \"supplyChain\" action is validated the same way: it is refused unless");
console.log("  the game is in that phase and the sender is at the head of scQueue.");

console.log(fails ? `\n${fails} FAILED - this is the bug report, not a regression\n`
                  : "\nall good\n");
process.exit(fails ? 1 : 0);
