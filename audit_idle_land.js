/* ============================================================================
   Does giving people more discs just buy them empty fields?

   THE OBJECTION, and it is the right one to raise. Land buying at five and six
   seats is capped by discs, not by appetite - so handing out more discs does
   move plots per seat from 6.0 to 7.6. But a plot is not a company. Money spent
   on ground that never gets built on is money that did not launch, did not
   upgrade and was not there when a solvency bill landed. If the extra plots
   turn out to be bare, the disc bump has not made the board livelier: it has
   invented a way to sit on land for eight quarters doing nothing, and the bots
   would only be doing it because landEPWeight pays them to.

   So the question is not how many plots get bought. It is WHAT IS ON THEM.

   Every owned plot at every quarter boundary is sorted into three piles:

     BUILT BY ME     a company or headquarters of mine stands on it. The plot is
                     working: it saves the $3-a-level ground rent I would owe
                     somebody else, and it is the ground my production needs.

     RENTED OUT      somebody else's company stands on it. Also working - it
                     pays me $3 per level per quarter, which is the one way an
                     unbuilt plot earns.

     IDLE            nothing stands on it at all. Scores for the land awards and
                     nothing else. This is the pile the objection is about.

   The idle share is tracked ACROSS THE GAME, not just at the end, because a
   plot bought in Q3 and built on in Q9 was idle for six quarters and an
   end-of-game snapshot would score it as working the whole time.

   Read the IDLE column across 12 / 14 / 16 discs. If it holds roughly flat, the
   extra discs are buying companies and the ground under them. If it climbs, the
   objection is right and the disc bump is buying empty fields.

   WHAT IT FOUND

   THE OBJECTION IS RIGHT, and it is about two thirds right. At six seats the
   extra discs take plots per seat from 4.09 to 4.61 - but idle plots per seat go
   from 1.42 to 1.78, so roughly 69% of the land the extra discs buy is bare
   ground. Plots that were NEVER built on by anybody all game climb from 23% to
   30%. Five seats is the same story at 63%. Add that cash in hand RISES rather
   than falls and the winner's lead over last goes from 57.1 to 64.7, and the
   disc bump fails on its own terms. It should not be shipped.

   Two caveats on how far this generalises to people. The bots are PAID for bare
   ground - landEPWeight scores a plot for the award whether or not anything ever
   stands on it - so they are the most willing land-hoarders the rules allow, and
   a human who sees no point in an empty field would buy less than this. That
   cuts both ways: it makes the idle share an upper bound, and it means the
   number is measuring the incentive rather than the psychology.

   BUT THE PREMISE UNDERNEATH THE WHOLE QUESTION IS WRONG, and this is the more
   useful finding. Land at a big table is not idle capital that failed to become
   a company. It is a RENT ENGINE, and it is already working:

     at six seats 50% of every player's owned plots carry SOMEBODY ELSE'S
     building, against 46% at five. Only 15% carry their own.

     only 26% of a company's plots stand on ground its owner holds, down from
     52% at two seats. The bigger the table, the more everybody is building on
     everybody else's land.

     which moves $9.5 per seat per quarter at six seats against $5.3 at two -
     about $114 over a game, against $184 of terminal cash.

   So land's share of a winning score did not fall from 21% to 9% because land
   stopped mattering. It fell because land stopped paying in AWARDS and started
   paying in RENT, and rent arrives as cash, where it scores at the $10 floor and
   gets counted in the "cash" bucket. Land is roughly as valuable at six seats as
   at two; the audit page was just reading it under a different name.

   That also explains the cash pile without any of the theories that were tried
   on it. It is not hoarding, it is not a failed land race, and audit_liquidation
   already ruled out fire-sales. It is largely rent income sitting where rent
   income ends up.

   Run: node audit_idle_land.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "200", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const DISC_NEEDLE = "const DISCS_PER_PLAYER = 12;";
if (!BASE.includes(DISC_NEEDLE)) { console.error("the disc constant changed shape - update this probe"); process.exit(2); }

function loadEngine(discs) {
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(BASE.replace(DISC_NEEDLE, `const DISCS_PER_PLAYER = ${discs};`) + `
    box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
      epTotal, finalRank, activeBiz, megacorpHQs, plotCount, discsFree, byId };
  `, sandbox);
  return box.exports;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);

/* Sort one player's plots into the three piles, as the board stands right now. */
function classify(st, p) {
  let built = 0, rented = 0, idle = 0;
  for (const [plot, ownerId] of Object.entries(st.board.owner)) {
    if (ownerId !== p.id) continue;
    const bizId = st.board.occupiedBy[plot];
    if (bizId === undefined) { idle++; continue; }
    /* whose building is it? a distressed shell belongs to nobody and pays no rent */
    let found = null;
    for (const q of st.players) {
      const b = q.businesses.find((x) => x.id === bizId);
      if (b) { found = { q, b }; break; }
    }
    if (!found || found.b.distressed) { idle++; continue; }
    if (found.q === p) built++;
    else rented++;
  }
  return { built, rented, idle };
}

const SIZES = [5, 6];
const DISCS = [12, 14, 16];
const rows = [];

for (const seats of SIZES) {
  for (const discs of DISCS) {
    const E = loadEngine(discs);
    const T = {
      seats, discs, games: 0, samples: 0,
      built: 0, rented: 0, idle: 0,
      endBuilt: 0, endRented: 0, endIdle: 0, endPlayers: 0,
      companies: 0, cash: 0, winnerEP: 0, spread: 0,
      neverBuilt: 0, plotsSeen: 0,
    };
    for (let seed = 1; seed <= SEEDS; seed++) {
      const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }

      /* Sample the board every time a new quarter is announced. The log fires while
         `st` is live, so this reads the real mid-game board rather than the wreck
         left at the end. */
      const everBuilt = new Map();   // plot -> was anything ever standing on it
      const sample = () => {
        for (const p of st.players) {
          const c = classify(st, p);
          T.built += c.built; T.rented += c.rented; T.idle += c.idle;
          T.samples++;
        }
        for (const [plot, bizId] of Object.entries(st.board.occupiedBy)) {
          if (bizId !== undefined) everBuilt.set(plot, true);
        }
      };
      E.advancePlanning(st, E.mulberry32(seed + 777), (msg) => {
        if (/^▶ Year \d+, Quarter \d+/.test(String(msg))) sample();
      });
      if (st.phase !== "gameover") continue;
      sample();
      T.games++;

      /* plots that were owned at the end and NEVER had anything on them, all game */
      for (const [plot, ownerId] of Object.entries(st.board.owner)) {
        if (ownerId === undefined) continue;
        T.plotsSeen++;
        if (!everBuilt.has(plot)) T.neverBuilt++;
      }

      for (const p of st.players) {
        const c = classify(st, p);
        T.endBuilt += c.built; T.endRented += c.rented; T.endIdle += c.idle;
        T.endPlayers++;
        T.companies += E.activeBiz(p).length;
        T.cash += p.cash;
      }
      const ranked = [...st.players].sort(E.finalRank);
      T.winnerEP += E.epTotal(ranked[0]);
      T.spread += E.epTotal(ranked[0]) - E.epTotal(ranked[ranked.length - 1]);
    }
    rows.push(T);
  }
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - what is standing on the land people buy");
console.log(`${SEEDS} games per row, personas on. Plots sampled at every quarter boundary.\n`);

console.log(pad("  table / discs", 18)
  + rp("plots/seat", 12) + rp("BUILT BY ME", 14) + rp("RENTED OUT", 13) + rp("IDLE", 8)
  + rp("idle plots/seat", 18));
console.log("  " + "─".repeat(81));
for (const T of rows) {
  const tot = T.built + T.rented + T.idle;
  const perSeat = tot / Math.max(1, T.samples);
  console.log(pad(`  ${T.seats}p, ${T.discs} discs`, 18)
    + rp(perSeat.toFixed(2), 12)
    + rp(`${(100 * T.built / Math.max(1, tot)).toFixed(0)}%`, 14)
    + rp(`${(100 * T.rented / Math.max(1, tot)).toFixed(0)}%`, 13)
    + rp(`${(100 * T.idle / Math.max(1, tot)).toFixed(0)}%`, 8)
    + rp((T.idle / Math.max(1, T.samples)).toFixed(2), 18)
    + (T.discs === 16 ? "" : ""));
  if (T.discs === DISCS[DISCS.length - 1]) console.log("");
}

console.log("\nAt the final board, and plots that were NEVER built on all game");
console.log(pad("  table / discs", 18)
  + rp("built", 10) + rp("rented", 10) + rp("idle", 10)
  + rp("never built on", 17) + rp("companies", 12) + rp("cash", 9) + rp("lead", 8));
console.log("  " + "─".repeat(81));
for (const T of rows) {
  const tot = T.endBuilt + T.endRented + T.endIdle;
  console.log(pad(`  ${T.seats}p, ${T.discs} discs`, 18)
    + rp(`${(100 * T.endBuilt / Math.max(1, tot)).toFixed(0)}%`, 10)
    + rp(`${(100 * T.endRented / Math.max(1, tot)).toFixed(0)}%`, 10)
    + rp(`${(100 * T.endIdle / Math.max(1, tot)).toFixed(0)}%`, 10)
    + rp(`${(100 * T.neverBuilt / Math.max(1, T.plotsSeen)).toFixed(0)}%`, 17)
    + rp((T.companies / Math.max(1, T.endPlayers)).toFixed(2), 12)
    + rp(`$${Math.round(T.cash / Math.max(1, T.endPlayers))}`, 9)
    + rp((T.spread / Math.max(1, T.games)).toFixed(1), 8));
  if (T.discs === DISCS[DISCS.length - 1]) console.log("");
}
console.log("");

/* ------------------------------------------------------------------ control
   The premise check: if the land people own is bare, is it at least earning?
   Who is standing on whose ground, and what does the rent move. */
console.log("\n" + "=".repeat(83));
console.log("CONTROL: whose building stands on whose land, at the shipped 12 discs");
console.log("=".repeat(83));
{
  const E = loadEngine(12);
  console.log(pad("  table", 12) + rp("company plots on own ground", 29)
    + rp("wholly self-owned co.", 24) + rp("rent moved /seat /quarter", 27));
  console.log("  " + "\u2500".repeat(78));
  for (const seats of [2, 4, 5, 6]) {
    let own = 0, tot = 0, full = 0, nco = 0, rent = 0, n = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
      if (st.phase !== "gameover") continue;
      for (const p of st.players) {
        n++;
        for (const b of [...E.activeBiz(p), ...E.megacorpHQs(p)]) {
          nco++;
          let mine = 0;
          for (const pk of b.footprint) {
            tot++;
            const o = st.board.owner[pk];
            if (o === p.id) { own++; mine++; }
            else if (o !== undefined) rent += 3;
          }
          if (b.footprint.length && mine === b.footprint.length) full++;
        }
      }
    }
    console.log(pad(`  ${seats} players`, 12)
      + rp(`${(100 * own / Math.max(1, tot)).toFixed(0)}%`, 29)
      + rp(`${(100 * full / Math.max(1, nco)).toFixed(0)}%`, 24)
      + rp(`$${(rent / Math.max(1, n)).toFixed(1)}`, 27));
  }
}
console.log("");
