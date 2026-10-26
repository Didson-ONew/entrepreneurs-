/* ============================================================================
   WHAT BECOMES OF A SOLD OR MERGED COMPANY - and whether the bank's shells get used.

   A company that is sold, liquidated or merged into a Megacorp leaves a DISTRESSED
   shell on the board. Anybody may RECLAIM it as it stands, or RENOVATE it with a
   card from hand of the same level - and, from level 2 up, the same scaling type,
   because a stacked plot and a row of plots are different shapes. A Retail chain's
   branches come down when the chain is sold.

   THREE QUESTIONS FROM THE DESIGNER, after a playtest:
     1. When a Retail chain is sold or merged, should its shopfronts be renovatable
        too, instead of coming down?
     2. Or should everything but one building come down, so the renovation has one
        place to happen (which is what a SALE does today)?
     3. Should ANY distressed structure be open to any same-level card, whatever its
        shape - letting a stacked shell become a spread industry and a spread shell a
        stacked one, "cross-breeding" hybrids across all six?

   AND ONE THING THE ENGINE DOES THAT NOBODY DECIDED: a MERGE does not take a chain's
   branches down. The shell goes to the bank with its shopfronts still standing,
   occupying plots and counting for The Omnipresent under the old owner's name.
   Measured here as `current`, and fixed in the `mergeDrop` baseline.

   THE ARMS
     current       as it ships (merge keeps branches standing)
     mergeDrop     a merge takes branches down exactly as a sale does - the baseline
     anyShape      mergeDrop + a shell is open to any card of its level, any shape
     branchShells  mergeDrop + on sale or merge, every branch becomes a level-1
                   distressed Retail shell: reclaimable as a one-shop Retail for the
                   usual half setup, renovatable by any level-1 card (level 1 is
                   already open to every industry)

   WHAT IS MEASURED, a game: shells created and by what (sale / solvency / merge),
   renovations and reclaims, shells still derelict at the end, renovation offers
   blocked by the shape rule (same-level card in hand, wrong shape), hybrids formed,
   branch shells made and revived, merged chains that left ghost branches - and the
   balance figures, so a change here is read against the last fortnight's work.

   WHAT IT FOUND - 300 games an arm a table size, three and four players.

   THE BANK IS A REAL MARKET. Seven shells a game at three players (1.2 by sale, 3.2
   by solvency, 2.5 by merger) and nine and a half at four, and 84-88% of them are
   revived - roughly half renovated, half reclaimed. About one a game is still
   derelict at the end. Whatever the rule is here, it is used every game.

   THE GHOST BRANCHES ARE REAL AND RARE: 0.13 merges a game at three players and
   0.22 at four leave a chain's shopfronts standing under the old owner's name.
   Taking them down as a sale does (mergeDrop) changes nothing measurable - every
   balance figure is identical to the decimal - so it is a free consistency fix.

   OPENING EVERY SHELL TO EVERY SAME-LEVEL CARD (anyShape) IS THE BEST BALANCE MOVE
   MEASURED THIS WEEK, and it costs nothing. Renovations rise 43% (2.5 -> 3.6 a game
   at three players, 3.8 -> 5.4 at four) and reclaims fall as players renovate
   instead; about one hybrid a game is formed and stands at the end. Who gains is
   the horizontal group: renovations INTO Utilities nearly double (117 -> 222 over
   300 games), Technology likewise (115 -> 215), Manufacturing +60% - because the
   common shell is a stacked plot, and a horizontal card may now take it without
   finding two or three adjacent plots of its own. Vertical industries bank most EP
   in 66.7% of three-player games against 69.8%, and 72.7% against 76.3% at four;
   the most-EP spread tightens a point at each end; winning scores rise 2-4 EP on
   the extra renovations. The shape rule was blocking six offers a game at three
   players and nine at four.

   TURNING BRANCHES INTO SHELLS (branchShells) IS NOT WORTH THE PIECES. A chain with
   branches is sold or merged rarely - 0.6 branch shells a game at three players,
   0.9 at four - and they are revived more than once each, because a one-plot
   level-1 shell is the cheapest thing on the board. The balance nudges the WRONG
   way, vertical 69.7% -> 72.0% at three players, because a reclaimed branch is a
   Retail; derelict shells at the end rise from 1.1 to 1.4. Everything but the home
   coming down - what a sale does today - is the right answer, and a merge should
   do the same.

   Run: node audit_renovation.js [games a table size] [seats...]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "300", 10);
const SEATS = process.argv.slice(3).map(Number).filter(Boolean);
const SIZES = SEATS.length ? SEATS : [3, 4];
const ARMS = ["current", "mergeDrop", "anyShape", "branchShells"];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const need = (src, s, what) => { if (!src.includes(s)) { console.error(`the engine changed shape around ${what} - update this probe`); process.exit(2); } };
const splice = (src, from, to, what) => { need(src, from, what); return src.replace(from, to); };

const N = {
  sale: "  p.cash += recv; b.distressed = true;",
  saleBranches: "  removeBranches(state, b);",
  merge: "  match.have.forEach((b) => {\n    if (b === hq) return;\n    b.distressed = true;\n  });",
  eligible: "  if (distressedBiz.level === 1) return true;            // one plot either way: anything fits\n  return SCALING[bizInd(distressedBiz)] === SCALING[bp.ind];",
  renoLog: '  log(logMsg("{0} renovates a distressed structure{1} into {2} ({3} L{4}) (cash: ${5}).", p.name, from, bp.name, bp.ind, bp.lvl, Math.round(p.cash)), p.id);',
  reclaim: "  biz.distressed = false;",
  botLook: "    const distressed = findDistressedTargets(state);",
  land: "    addEP(p, share, label, state.quarter);",
};
for (const [k, v] of Object.entries(N)) need(BASE, v, k);

const PRELUDE = `
/* A branch becomes a one-plot distressed Retail shell in its old owner's ledger, where
   the bank's other shells live. Reclaim gives a one-shop Retail; any level-1 card
   renovates it. */
function __branchesToShells(state, b, owner) {
  const board = state.board;
  const RE1 = BP_DATA.find((x) => x.ind === "RE" && x.lvl === 1);
  for (const k of branchPlotsOf(board, b)) {
    delete board.branches[k];
    const shell = { id: nextBizId(state), bp: RE1, footprint: [k], levels: { [k]: 1 }, level: 1,
      upgraded: false, distressed: true, scored: true, quarterBuilt: state.quarter,
      distressPayout: Math.floor(RE1.setup / 2), __branchShell: true };
    board.occupiedBy[k] = shell.id;
    owner.businesses.push(shell);
    __probe.branchShell();
  }
}
`;
const LAND_PROBE = `    __probe.land(label, share, (() => {
      const w = {};
      const mine = activeBiz(p);
      if (label === "The Real-Estate Mogul") {
        mine.forEach((b) => { w[bizInd(b)] = (w[bizInd(b)] || 0) + b.footprint.length; });
      } else {
        const touch = {};
        const mark = (plot, who) => { const c = state.board.cellOf[plot]; if (!c) return;
          const k = c.r + "," + c.c; (touch[k] = touch[k] || new Set()).add(who); };
        mine.forEach((b) => b.footprint.forEach((plot) => mark(plot, bizInd(b))));
        Object.keys(touch).forEach((k) => { const set = Array.from(touch[k]);
          set.forEach((who) => { w[who] = (w[who] || 0) + 1 / set.length; }); });
      }
      return w; })());
    addEP(p, share, label, state.quarter);`;

function engine(arm) {
  let L = PRELUDE + BASE;
  L = splice(L, N.sale, `  p.cash += recv; b.distressed = true;\n  __probe.shell(solvency ? "solvency" : "sale", b);`, "sale");
  if (arm === "branchShells") L = splice(L, N.saleBranches, "  __branchesToShells(state, b, p);", "sale branches");
  const mergeBody = arm === "current" ? "" : arm === "branchShells" ? "\n    __branchesToShells(state, b, p);" : "\n    removeBranches(state, b);";
  L = splice(L, N.merge, `  match.have.forEach((b) => {\n    if (b === hq) return;\n    __probe.shell("merge", b, branchPlotsOf(state.board, b).length);\n    b.distressed = true;${mergeBody}\n  });`, "merge");
  if (arm === "anyShape") L = splice(L, N.eligible, "  return true;   // any shape: a shell of the level is open to any card of the level", "eligibility");
  L = splice(L, N.renoLog, `  __probe.reno(displaced, bp, distressedBiz);\n` + N.renoLog, "renovation");
  L = splice(L, N.reclaim, `  biz.distressed = false;\n  __probe.reclaim(biz);`, "reclaim");
  L = splice(L, N.botLook, N.botLook + `\n    __probe.blocked(distressed.reduce((n, db) => n + p.hand.filter((bp) => db.level === bp.lvl && db.level > 1 && SCALING[bizInd(db)] !== SCALING[bp.ind]).length, 0));`, "bot look");
  L = splice(L, N.land, LAND_PROBE, "land award");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, String, box, __probe: PROBE };
  vm.createContext(sandbox);
  vm.runInContext(L + `
    box.e = { initGame, advanceDraft, startPlanning, advancePlanning, epTotal, finalRank, activeBiz, bizInd, mulberry32,
              INDUSTRIES, SCALING, BP_DATA };
  `, sandbox);
  return box.e;
}

let CUR = null;
const PROBE = {
  shell: (kind, b, branches) => { if (!CUR) return; CUR.shells[kind] = (CUR.shells[kind] || 0) + 1; if (kind === "merge" && branches > 0) CUR.ghost++; },
  reno: (displaced, bp, biz) => { if (!CUR) return; CUR.reno++; if (biz.__branchShell) CUR.branchRevived++;
    if (displaced && bp && displaced.lvl > 1 && CUR.SCALING[displaced.ind] !== CUR.SCALING[bp.ind]) { CUR.hybrids++; CUR.hybridInto[bp.ind] = (CUR.hybridInto[bp.ind] || 0) + 1; }
    CUR.renoInto[bp.ind] = (CUR.renoInto[bp.ind] || 0) + 1; },
  reclaim: (biz) => { if (!CUR) return; CUR.reclaim++; if (biz.__branchShell) CUR.branchRevived++; },
  blocked: (n) => { if (CUR) CUR.blocked += n; },
  branchShell: () => { if (CUR) CUR.branchShells++; },
  land: (label, share, w) => { if (CUR) CUR.land.push({ share, w }); },
};

const quiet = () => {};
function run(E, arm, seats) {
  const IND = E.INDUSTRIES;
  const bpInd = Object.fromEntries(E.BP_DATA.map((b) => [b.name, b.ind]));
  const T = { games: 0, sale: 0, solvency: 0, merge: 0, ghost: 0, reno: 0, reclaim: 0, left: 0, blocked: 0, hybrids: 0,
    hybridInto: {}, renoInto: {}, branchShells: 0, branchRevived: 0, hybridsStanding: 0, vTop: 0, hTop: 0, winnerEP: 0, topShare: Object.fromEntries(IND.map((i) => [i, 0])) };
  for (let g = 1; g <= GAMES; g++) {
    CUR = { shells: {}, ghost: 0, reno: 0, reclaim: 0, blocked: 0, hybrids: 0, hybridInto: {}, renoInto: {}, branchShells: 0, branchRevived: 0, land: [], SCALING: E.SCALING };
    let st;
    try {
      st = E.initGame(seats - 1, g, ["Seat"], undefined, true, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, quiet); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(g + 777), quiet);
    } catch (e) { CUR = null; continue; }
    if (!st || st.phase !== "gameover") { CUR = null; continue; }
    const C = CUR; CUR = null;
    T.games++;
    T.sale += C.shells.sale || 0; T.solvency += C.shells.solvency || 0; T.merge += C.shells.merge || 0; T.ghost += C.ghost;
    T.reno += C.reno; T.reclaim += C.reclaim; T.blocked += C.blocked; T.hybrids += C.hybrids;
    T.branchShells += C.branchShells; T.branchRevived += C.branchRevived;
    for (const [i, n] of Object.entries(C.hybridInto)) T.hybridInto[i] = (T.hybridInto[i] || 0) + n;
    for (const [i, n] of Object.entries(C.renoInto)) T.renoInto[i] = (T.renoInto[i] || 0) + n;
    for (const p of st.players) for (const b of p.businesses) {
      if (b.distressed) T.left++;
      else if (b.level > 1 && !b.isHQ) {
        const shape = b.footprint.length > 1 ? "H" : "V";
        if (shape !== E.SCALING[E.bizInd(b)]) T.hybridsStanding++;
      }
    }
    const epBy = Object.fromEntries(IND.map((i) => [i, 0]));
    for (const p of st.players) for (const e of (p.epLog || [])) {
      const s = String((e.label && e.label.k) || e.label);
      let m = /^Company: (.+) L\d+$/.exec(s); if (m && bpInd[m[1]]) { epBy[bpInd[m[1]]] += e.amount; continue; }
      m = /^Entered (\w\w)/.exec(s); if (m && epBy[m[1]] !== undefined) epBy[m[1]] += e.amount;
    }
    for (const a of C.land) { const tot = Object.values(a.w).reduce((x, y) => x + y, 0); if (tot > 0) for (const i of IND) if (a.w[i]) epBy[i] += (a.share * a.w[i]) / tot; }
    const best = Math.max(...IND.map((i) => epBy[i])); const tops = IND.filter((i) => epBy[i] === best);
    for (const i of tops) { T.topShare[i] += 1 / tops.length; if (E.SCALING[i] === "V") T.vTop += 1 / tops.length; else T.hTop += 1 / tops.length; }
    T.winnerEP += E.epTotal([...st.players].sort(E.finalRank)[0]);
  }
  return T;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const pct = (x, t) => (t > 0 ? (100 * x / t).toFixed(1) + "%" : "-");
console.log(`\n${GAMES} games an arm a table size, seeds 1..${GAMES}, all-bot tables.`);
console.log("  current       as it ships - a merge leaves a chain's branches standing\n  mergeDrop     a merge takes branches down, as a sale does\n  anyShape      mergeDrop + any same-level card renovates any shell, whatever its shape\n  branchShells  mergeDrop + branches become level-1 distressed Retail shells");
const R = {};
for (const arm of ARMS) { const E = engine(arm); R[arm] = {}; for (const n of SIZES) R[arm][n] = run(E, arm, n); }
for (const n of SIZES) {
  console.log("\n" + "=".repeat(76) + `\n${n} PLAYERS\n` + "=".repeat(76));
  const line = (label, f) => console.log("  " + pad(label, 40) + ARMS.map((a) => rp(f(R[a][n]), 9)).join(""));
  console.log("  " + pad("", 40) + ARMS.map((a) => rp(a, 9)).join(""));
  const per = (T, x) => (x / Math.max(1, T.games)).toFixed(2);
  console.log("  SHELLS, A GAME");
  line("left by a sale", (T) => per(T, T.sale));
  line("left by a solvency", (T) => per(T, T.solvency));
  line("left by a merge", (T) => per(T, T.merge));
  line("  merges that left ghost branches", (T) => per(T, T.ghost));
  line("branch shells made", (T) => per(T, T.branchShells));
  console.log("  WHAT HAPPENED TO THEM");
  line("renovated", (T) => per(T, T.reno));
  line("reclaimed", (T) => per(T, T.reclaim));
  line("  share of shells ever revived", (T) => pct(T.reno + T.reclaim, T.sale + T.solvency + T.merge + T.branchShells));
  line("  branch shells revived", (T) => per(T, T.branchRevived));
  line("still derelict at the end", (T) => per(T, T.left));
  line("offers blocked by the shape rule", (T) => per(T, T.blocked));
  line("hybrids formed by renovation", (T) => per(T, T.hybrids));
  line("hybrids standing at the end", (T) => per(T, T.hybridsStanding));
  console.log("  " + pad("renovated into, UT/RE/HO/MA/HC/TE", 40) + ARMS.map((a) => rp(["UT", "RE", "HO", "MA", "HC", "TE"].map((i) => R[a][n].renoInto[i] || 0).join("/"), 20)).join(""));
  console.log("  BALANCE");
  line("vertical RE HO HC bank most EP", (T) => pct(T.vTop, T.games));
  line("most-EP share, min / max", (T) => { const v = Object.values(T.topShare).map((x) => 100 * x / Math.max(1, T.games)); return Math.min(...v).toFixed(0) + "/" + Math.max(...v).toFixed(0) + "%"; });
  line("winning score", (T) => (T.winnerEP / Math.max(1, T.games)).toFixed(1));
}
console.log("");
