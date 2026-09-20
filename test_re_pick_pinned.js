/* A bot's Retail company picks its extra districts once per delivery. It used to
   re-pick on every slot, by open-icon count, so filling one district's icons moved the
   pick elsewhere and the rest of that district became unreachable mid-delivery - a
   third of the units Retail left over had enough capacity in reach when it started. */
const fs = require("fs"), path = require("path"), vm = require("vm");
let fails = 0, n = 0;
const check = (w, ok, note = "") => { n++; if (!ok) fails++; console.log(`${ok ? " ok  " : " FAIL"} ${w}${note ? `  [${note}]` : ""}`); };
const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const engine = src.slice(0, src.indexOf("/* ============================== REACT UI ============================== */")).replace(/^\s*(import|export)\s.*$/gm, "");
const box = {}; const sb = { console, Math, Set, Object, Array, JSON, String, box };
vm.createContext(sb);
vm.runInContext(engine + `box.E = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning, activeBiz, bizInd, autoDeliver, reAllowance, businessCanProduce };`, sb);
const E = box.E;

/* Find a seeded game where a bot holds a producing Retail company by Q6. */
let found = null;
for (let seed = 1; seed <= 60 && !found; seed++) {
  const st = E.initGame(3, seed, ["Seat 1"], undefined, true, undefined);
  st.players[0].isHuman = false;
  if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
  E.advancePlanning(st, E.mulberry32(seed + 777), (m) => {
    if (found) return;
    if (!/Quarter 6/.test(String(m))) return;
    for (const p of st.players) for (const b of E.activeBiz(p)) if (E.bizInd(b) === "RE" && E.businessCanProduce(st, b)) { found = { seed, st: JSON.parse(JSON.stringify(st)), pid: p.id, bid: b.id }; return; }
  });
}
check("a bot with a producing Retail company was found by Q6", !!found, found && `seed ${found.seed}`);
if (found) {
  const st = found.st; const p = st.players.find((x) => x.id === found.pid); const b = p.businesses.find((x) => x.id === found.bid);
  st.reChoices = {};
  E.autoDeliver(st, p, b);
  const pick = st.reChoices[b.id];
  check("after the delivery the company's extra districts are pinned in reChoices", Array.isArray(pick), JSON.stringify(pick));
  check("and never more than its allowance", Array.isArray(pick) && pick.length <= E.reAllowance(st, b, p), `${pick && pick.length} of ${E.reAllowance(st, b, p)}`);
  // an explicit pick - a human's, or a previous pin - is left alone
  const st2 = found.st; const p2 = st2.players.find((x) => x.id === found.pid); const b2 = p2.businesses.find((x) => x.id === found.bid);
  st2.reChoices = { [b2.id]: ["9,9"] };
  E.autoDeliver(st2, p2, b2);
  check("an explicit pick already in reChoices is not overwritten", JSON.stringify(st2.reChoices[b2.id]) === JSON.stringify(["9,9"]));
}
console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
process.exit(fails ? 1 : 0);
