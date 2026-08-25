/* ============================================================================
   Can a human actually use Supply Chain Expert (RE)?

   THE REPORT. "I wasn't prompted to increase the price of an industry so I
   could choose one extra district to sell to."

   THE ANSWER: NO, ON BOTH HALVES OF THE ABILITY. The persona reads:

     "At the start of Revenue, raise one industry you do NOT operate by one
      step; your Retail then reaches one extra district this quarter."

   That is a choice followed by a reward. A human gets neither the choice nor
   the reward. Two separate defects, measured below.

   DEFECT 1 - THE CHOICE IS NEVER OFFERED. applySupplyChainBump runs over every
   player at the top of Production and picks for them:

       const pick = options.sort((a,b) => price(pm,a) - price(pm,b))[0];

   with the comment "bots take the top one". But the loop does not distinguish
   bots from humans, so a human's industry is chosen by the same rule - always
   the CHEAPEST outside industry. The bump does happen and is logged, but the
   player is never asked. Naming the industry is the interesting half of the
   ability: lifting a rival's market is a real cost, and which rival you help is
   the decision. Auto-picking the cheapest also picks the market where a step is
   worth least, so the ability quietly plays itself badly.

   DEFECT 2 - THE REWARD IS SILENTLY THROWN AWAY. This is the one that makes the
   ability worthless rather than merely automatic. reachableDistricts computes:

       const explicit = chosenExtra || state.reChoices[biz.id];
       const extra = explicit || bestExtraDistrictsForRE(state, biz, biz.level + bonus, home);

   The bonus district exists only in the FALLBACK branch. The moment a human
   confirms a pick, `explicit` wins and `biz.level + bonus` is never evaluated.
   And the picker caps the human at `deliveringBiz.level` flat - it never adds
   the bonus - so a human Supply Chain Expert selects exactly as many districts
   as a Retail company with no persona at all.

   NET EFFECT FOR A HUMAN: you pay the cost (a rival's market goes up a step,
   chosen for you, badly) and receive nothing. A BOT gets the full ability,
   because a bot never sets reChoices and so always takes the fallback branch
   that reads the bonus. The persona is strictly worse in human hands.

   This probe drives the real reachableDistricts both ways and fails if the
   human path does not reach one district further than the no-persona path.

   Run: node audit_supply_chain.js
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }

/* Shape guards: this probe is only meaningful against the code it describes. */
const NEEDLES = [
  ["the bonus lives only in the fallback branch",
   "const extra = explicit || bestExtraDistrictsForRE(state, biz, biz.level + bonus, home);"],
  ["the bump auto-picks for everyone",
   "const pick = options.sort((a, b) => price(state.pm, a) - price(state.pm, b))[0];"],
  ["the bump loop does not branch on bot vs human",
   "if (!hasPersona(p, \"supply_chain\")) continue;"],
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
  box.E = { initGame, reachableDistricts, applySupplyChainBump, hasPersona,
            activeBiz, bizInd, allDistrictKeys, footprintDistricts, INDUSTRIES };
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
  id: "probe-re", bp: { name: "Probe Retail", ind: "RE", lvl: 2, opex: 6, prod: 4 },
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

/* 3. Bonus granted, and the human confirms a pick capped at biz.level - exactly
      what the picker in the UI allows (it passes deliveringBiz.level as max). */
const offered = E.allDistrictKeys(st.board).filter((d) => !home.has(d));
st.reExtraDistrict = { [p.id]: true };
st.reChoices = { [reBiz.id]: offered.slice(0, reBiz.level) };   // level, not level+1
const humanPath = E.reachableDistricts(st, reBiz);

const beyond = (set) => [...set].filter((d) => !home.has(d)).length;
const pad = (s, n) => String(s).padEnd(n);
console.log("  " + pad("no persona (baseline)", 34) + beyond(plain));
console.log("  " + pad("persona, BOT path (no reChoice)", 34) + beyond(botPath));
console.log("  " + pad("persona, HUMAN path (picker cap)", 34) + beyond(humanPath));

console.log("");
check("a bot with the persona reaches further than the baseline",
  beyond(botPath) > beyond(plain),
  `${beyond(plain)} -> ${beyond(botPath)}`);
check("a HUMAN with the persona reaches further than the baseline",
  beyond(humanPath) > beyond(plain),
  `${beyond(plain)} -> ${beyond(humanPath)} - the picker caps at biz.level, so the bonus is lost`);
check("human and bot get the same reach from the same persona",
  beyond(humanPath) === beyond(botPath),
  `human ${beyond(humanPath)} vs bot ${beyond(botPath)}`);

console.log("\nIS THE INDUSTRY CHOICE EVER OFFERED?");
/* Run the bump on a fresh game and see whether it asks anybody anything: the
   only signal a choice exists would be a phase change or an awaiting flag. */
const st2 = E.initGame(3, 11, ["Probe"], 0, true, {});
const p2 = st2.players[0];
p2.persona = "supply_chain";
p2.plots = [Object.keys(st2.board.graph)[0]];
p2.businesses = [{ ...reBiz, footprint: [p2.plots[0]] }];
const phaseBefore = st2.phase, awaitBefore = st2.awaitingPlayerId;
const before = { ...st2.pm.demand };
const lines = [];
E.applySupplyChainBump(st2, (m) => lines.push(m));
const moved = E.INDUSTRIES.filter((i) => st2.pm.demand[i] !== before[i]);

console.log(`  industries whose demand moved: ${moved.join(", ") || "none"}`);
console.log(`  phase after the bump:          ${st2.phase} (was ${phaseBefore})`);
console.log(`  awaiting a player:             ${st2.awaitingPlayerId ?? "nobody"} (was ${awaitBefore ?? "nobody"})`);
lines.forEach((l) => console.log(`  log: ${l}`));

check("the bump fires for a human-seated player", moved.length === 1,
  `${moved.length} industries moved`);
check("but it NEVER pauses to ask which industry",
  st2.phase === phaseBefore && st2.awaitingPlayerId === awaitBefore,
  "no phase change, no awaiting flag - the engine picks the cheapest and moves on");

console.log("\nA NOTE ON THE ONLINE PATH");
console.log("  server.js case \"reChoice\" stores whatever the client sends:");
console.log("    st.reChoices[d.bizId] = Array.isArray(d.districts) ? d.districts : [];");
console.log("  There is no cap and no membership test, so the district limit is enforced");
console.log("  only by the button in the browser. Any fix to the cap belongs on BOTH");
console.log("  sides, or the rule is advisory in multiplayer.");

console.log(fails ? `\n${fails} FAILED - this is the bug report, not a regression\n`
                  : "\nall good\n");
process.exit(fails ? 1 : 0);
