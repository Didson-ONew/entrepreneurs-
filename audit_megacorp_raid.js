/* ============================================================================
   Can neighbours raid a Megacorp? A catch-up mechanic, measured.

   THE PROPOSAL. A Megacorp headquarters is the biggest single thing on the board
   and one of the biggest things on the scoresheet. The idea is to make standing
   next to one worth something to the NEIGHBOUR: a player with a company adjacent
   to somebody else's Megacorp takes 3 EP off it at final scoring.

   WHAT IT COLLIDES WITH. The rule it modifies already exists and it points the
   other way. finalizeGame pays the Megacorp's owner MEGACORP_NEIGHBOUR_EP (3) for
   every distinct live business touching the headquarters - INCLUDING opponents'.
   Today a crowded district is a reward for merging in the middle of the map. So
   there are two honest readings of "steal 3 from it", and they are very different
   sizes:

     RAID     the opponent's neighbour stops paying the Megacorp and pays the
              opponent instead. Owner nets 0 on it, neighbour nets +3.
              A 3 EP swing per touching building.
     SEIZE    the owner keeps nothing and is charged as well: -3 to the owner,
              +3 to the neighbour. A 6 EP swing per touching building, and the
              owner can end up paying to have merged at all.

   Both are run with the bots BLIND and AWARE. mergeWorth prices a merge partly on
   MEGACORP_NEIGHBOUR_EP * hqNeighbours, so under either rule a bot that has not
   been told still walks into crowded districts on purpose. The blind arm is the
   control that shows how much of any effect is just that.

   WHAT WOULD MAKE IT A GOOD RULE, and what this probe therefore measures:
     1. it has to actually catch up  - the halfway leader should convert less
        often, and the winner's margin over second should narrow
     2. it must not kill merging     - Megacorps call the endgame deadline. If
        merging stops paying, games stop ending early and the back half sags
     3. it must not just move points to whoever happens to be adjacent - so the
        share of raid EP that lands on the eventual WINNER is printed. A catch-up
        mechanic that pays the leader is a leader bonus with a friendly name.

   Run: node audit_megacorp_raid.js [games a table size] [seats...]
        node audit_megacorp_raid.js 250 4 5 6
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "250", 10);
const seedArg = process.argv.find((a) => a.startsWith("--seeds="));
const SEED0 = seedArg ? parseInt(seedArg.slice(8), 10) : 1;
const SEATS = process.argv.slice(3).filter((a) => !a.startsWith("--")).map(Number).filter(Boolean);
const SIZES = SEATS.length ? SEATS : [3, 4, 5, 6];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const base = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const NEEDLES = {
  /* The award being rewritten, exactly as finalizeGame spells it. */
  payout: `  for (const p of state.players) {
    for (const hq of megacorpHQs(p)) {
      const n = hqNeighbours(state, hq);
      if (n) addEP(p, MEGACORP_NEIGHBOUR_EP * n, \`Megacorp district: \${hq.megacorpName}\`, state.quarter);
    }
  }`,
  /* Where a bot decides a merge is worth it. */
  botPrice: "  const districtEP = MEGACORP_NEIGHBOUR_EP * hqNeighbours(state, hq);",
  helper: "function hqNeighbours(state, hq) {",
};
for (const [k, v] of Object.entries(NEEDLES)) {
  if (!base.includes(v)) { console.error(`the engine changed shape around ${k} - update this probe`); process.exit(2); }
}

/* Who is standing next to this headquarters, counted per owner. Same walk as
   hqNeighbours - same exclusions, same distressed-shell rule - but it keeps the
   owner of each neighbouring business instead of collapsing them to a count. */
const OWNER_HELPER = `
function hqNeighbourOwners(state, hq) {
  const seen = new Set(), byOwner = {};
  hq.footprint.forEach((pk) => orthOf(state.board, pk).forEach((n) => {
    if (hq.footprint.includes(n)) return;
    const id = state.board.occupiedBy[n];
    if (id === undefined || id === hq.id || seen.has(id)) return;
    for (const q of state.players) {
      const b = q.businesses.find((x) => x.id === id);
      if (b && !b.distressed) { seen.add(id); byOwner[q.id] = (byOwner[q.id] || 0) + 1; return; }
    }
  }));
  return byOwner;
}
`;

/* RAID: the owner is paid only for its own buildings; every opponent building
   touching the HQ pays its own owner instead. SEIZE: the same, and the owner is
   charged for each of them too. */
const payoutFor = (seize) => `  for (const p of state.players) {
    for (const hq of megacorpHQs(p)) {
      const byOwner = hqNeighbourOwners(state, hq);
      let mine = 0, raided = 0;
      for (const [id, n] of Object.entries(byOwner)) {
        if (String(id) === String(p.id)) { mine += n; continue; }
        raided += n;
        const q = state.players.find((x) => String(x.id) === String(id));
        if (q) addEP(q, MEGACORP_NEIGHBOUR_EP * n, \`Megacorp raid: \${hq.megacorpName}\`, state.quarter);
      }
      if (mine) addEP(p, MEGACORP_NEIGHBOUR_EP * mine, \`Megacorp district: \${hq.megacorpName}\`, state.quarter);
      ${seize ? `if (raided) addEP(p, -MEGACORP_NEIGHBOUR_EP * raided, \`Megacorp tithe: \${hq.megacorpName}\`, state.quarter);` : ""}
    }
  }`;

/* Telling the bots. Under RAID an opponent's building next door is worth nothing to
   the merging player; under SEIZE it is worth minus three. Either way the bot has to
   count its OWN neighbours separately, which is what this line does. */
const botPriceFor = (seize) => `  const __nb = hqNeighbourOwners(state, hq);
  const __mine = __nb[p.id] || 0;
  const __theirs = Object.entries(__nb).reduce((a, [id, n]) => a + (String(id) === String(p.id) ? 0 : n), 0);
  const districtEP = MEGACORP_NEIGHBOUR_EP * (__mine ${seize ? "- __theirs" : ""});`;

/* --dump prints the code each arm splices in. A probe that rewrites an engine is only
   as honest as the text it writes, and reading it beats inferring it from the totals. */
if (process.argv.includes("--dump")) {
  for (const seize of [false, true]) {
    console.log(`\n===== payout, ${seize ? "SEIZE" : "RAID"} =====\n` + payoutFor(seize));
    console.log(`\n===== bot price, ${seize ? "SEIZE" : "RAID"} =====\n` + botPriceFor(seize));
  }
  process.exit(0);
}

const ARMS = [
  { key: "current", name: "as it ships (owner +3 per neighbour)" },
  { key: "raid-blind", name: "RAID, bots blind", raid: true },
  { key: "raid", name: "RAID, bots aware", raid: true, aware: true },
  { key: "seize-blind", name: "SEIZE, bots blind", raid: true, seize: true },
  { key: "seize", name: "SEIZE, bots aware", raid: true, seize: true, aware: true },
];

/* A replace that matches nothing returns the string unchanged and says nothing, which
   is how an arm ends up quietly measuring the shipped rule under a different name. */
function splice(src, find, put, what) {
  const out = src.replace(find, put);
  if (out === src) { console.error(`the ${what} splice changed nothing - update this probe`); process.exit(2); }
  return out;
}
function engineFor(arm) {
  let logic = splice(base, NEEDLES.helper, OWNER_HELPER + NEEDLES.helper, "neighbour-owner helper");
  if (arm.raid) logic = splice(logic, NEEDLES.payout, payoutFor(arm.seize), "final payout");
  if (arm.aware) logic = splice(logic, NEEDLES.botPrice, botPriceFor(arm.seize), "bot merge price");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, String, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
      epTotal, finalRank, megacorpHQs };
  `, sandbox);
  return box.exports;
}

function run(E, seats) {
  const T = { games: 0, winnerEP: 0, margin: 0, endQ: 0, early: 0, deadline: 0, hqs: 0,
    q6Known: 0, q6Won: 0, bottomWon: 0, raidEP: 0, raidToWinner: 0, titheEP: 0, mcEP: 0, mcTot: 0, tot: 0 };
  for (let s = SEED0; s < SEED0 + GAMES; s++) {
    const st = E.initGame(seats - 1, s, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    const snap = {};
    E.advancePlanning(st, E.mulberry32(s + 777), (msg) => {
      const m = /^▶ Year \d+, Quarter (\d+)/.exec(String(msg));
      if (m) snap[+m[1]] = st.players.map((p) => ({ id: p.id, ep: E.epTotal(p) }));
    });
    if (st.phase !== "gameover") continue;
    T.games++;
    const ranked = [...st.players].sort(E.finalRank);
    const winner = ranked[0];
    const eps = st.players.map((p) => E.epTotal(p)).sort((a, b) => b - a);
    T.winnerEP += eps[0];
    T.margin += eps[0] - (eps[1] !== undefined ? eps[1] : eps[0]);
    T.endQ += st.quarter;
    if (st.quarter < 12) T.early++;
    if (st.finalQuarter) T.deadline++;
    for (const p of st.players) T.hqs += E.megacorpHQs(p).length;
    const s6 = snap[6] && [...snap[6]].sort((a, b) => b.ep - a.ep);
    if (s6 && s6.filter((x) => x.ep === s6[0].ep).length === 1) {
      T.q6Known++;
      if (s6[0].id === winner.id) T.q6Won++;
      const half = Math.floor(s6.length / 2);
      if (new Set(s6.slice(s6.length - half).map((x) => x.id)).has(winner.id)) T.bottomWon++;
    }
    for (const p of st.players) {
      for (const line of (p.epLog || [])) {
        const L = String(line.label);
        T.tot += line.amount;
        if (L.startsWith("Megacorp")) T.mcTot += line.amount;
        /* "Megacorp raid:" and "Megacorp tithe:" have to be told apart exactly: an
           earlier version matched both on a shared prefix, so the raider's +3 and the
           owner's -3 cancelled and the SEIZE arms reported no raiding at all. */
        if (L.startsWith("Megacorp raid:")) {
          T.raidEP += line.amount;
          if (p.id === winner.id) T.raidToWinner += line.amount;
        }
        if (L.startsWith("Megacorp tithe:")) T.titheEP += line.amount;
        if (p.id === winner.id && L.startsWith("Megacorp")) T.mcEP += line.amount;
      }
    }
  }
  return T;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const pc = (x, tot) => (tot > 0 ? (100 * x / tot).toFixed(1) + "%" : "-");

const R = {};
for (const arm of ARMS) { const E = engineFor(arm); R[arm.key] = {}; for (const n of SIZES) R[arm.key][n] = run(E, n); }

console.log(`\n${GAMES} games a table size, seeds ${SEED0}..${SEED0 + GAMES - 1}, all-bot tables.`);
console.log(`Arms: ${ARMS.map((a) => a.key).join(", ")}\n`);

const block = (title, fn) => {
  console.log("  " + title);
  for (const arm of ARMS) console.log("    " + pad(arm.key, 14) + SIZES.map((n) => rp(fn(R[arm.key][n], n), 9)).join(""));
};
console.log("  " + pad("", 14) + SIZES.map((n) => rp(n + "p", 9)).join(""));
block("DOES IT CATCH ANYONE UP? the Q6 leader goes on to win", (T) => pc(T.q6Won, T.q6Known));
console.log("    " + pad("chance", 14) + SIZES.map((n) => rp((100 / n).toFixed(1) + "%", 9)).join(""));
block("a seat in the bottom half at Q6 comes back to win", (T) => pc(T.bottomWon, T.q6Known));
block("the winner's margin over second (EP)", (T) => (T.margin / Math.max(1, T.games)).toFixed(1));
block("winning score (EP)", (T) => (T.winnerEP / Math.max(1, T.games)).toFixed(1));
block("DOES MERGING SURVIVE? Megacorps formed a game", (T) => (T.hqs / Math.max(1, T.games)).toFixed(2));
block("the deadline was called", (T) => pc(T.deadline, T.games));
block("the game ended before Q12", (T) => pc(T.early, T.games));
block("WHO GETS PAID? Megacorp EP as a share of the winner", (T) => pc(T.mcEP, T.winnerEP));
block("raid EP paid to neighbours a game", (T) => (T.raidEP / Math.max(1, T.games)).toFixed(1));
block("...charged to Megacorp owners (SEIZE only)", (T) => (T.titheEP / Math.max(1, T.games)).toFixed(1));
block("...of which went to the eventual winner", (T) => pc(T.raidToWinner, T.raidEP));
console.log("    " + pad("a fair share is", 14) + SIZES.map((n) => rp((100 / n).toFixed(1) + "%", 9)).join(""));
console.log("");
