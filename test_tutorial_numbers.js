/* The tutorial must quote the numbers the engine actually scores with.

   Every number in the "Winning" step had drifted: it promised 5 EP for entering an
   industry when INDUSTRY_DEBUT_EP is 3, 1 EP per company level "at the first year end
   after you build or upgrade it" when it is 2 and banked immediately, and 10 EP for
   each land award when LAND_AWARD.sole is 5. None of it was caught by anything,
   because an onboarding overlay is the one screen a designer stops reading.

   It also drew the supply web as a six-industry RING - UT to HO to MA to HC to RE to
   TE and back - which the card data has never supported.

   They are interpolated from the constants now, so the first half of this file checks
   they really are (a hardcoded number that happens to be right today would pass a
   "does it say 3" test forever after it went wrong). The second half recomputes the
   supply structure from the cards independently. */
const fs = require("fs"), vm = require("vm"), path = require("path");

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = src.indexOf("/* ============================== REACT UI ============================== */");
const engine = src.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");
const ui = src.slice(CUT);

let fails = 0;
function check(label, ok, detail) {
  if (!ok) fails++;
  console.log(` ${ok ? "ok  " : "FAIL"}  ${label}${detail !== undefined && detail !== "" ? "  [" + detail + "]" : ""}`);
}

/* Pull the TUTORIAL array and the consts it leans on out of the UI half and evaluate
   them against the real engine. Anchored by name, so a rename fails loudly. */
const slice = (startNeedle, endNeedle, keepEnd) => {
  const at = ui.indexOf(startNeedle);
  if (at < 0) { console.error(`${startNeedle} is gone - update this test`); process.exit(2); }
  const end = ui.indexOf(endNeedle, at + startNeedle.length);
  if (end < 0) { console.error(`end of ${startNeedle} not found - update this test`); process.exit(2); }
  return ui.slice(at, keepEnd ? end + endNeedle.length : end);
};
/* Up to but NOT including the TUTORIAL line, then TUTORIAL itself - otherwise the
   declaration lands in the source twice. */
const block = slice("const SUPPLY = (() => {", "const TUTORIAL = [", false)
  + slice("const TUTORIAL = [", "\n];", true);

/* The steps point at little SVG illustrations defined elsewhere in the UI half. They
   are values here, not behaviour, so stub whatever names the block mentions rather
   than dragging the components in - and derive the list so a new one cannot break it. */
const artStubs = [...new Set([...block.matchAll(/art:\s*([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))]
  .filter((n) => n !== "null")
  .map((n) => `const ${n} = null;`).join("\n");

const box = {}, sb = { console, Math, Set, Object, Array, JSON, String, box };
vm.createContext(sb);
vm.runInContext(engine + "\n" + artStubs + "\n" + block + `
  box.e = { TUTORIAL, SUPPLY, MEGACORP_EP, TUT_LEVEL_EP,
    INDUSTRY_DEBUT_EP, LAND_AWARD, levelEP, BP_DATA, INDUSTRIES, MEGACORP_TILES };`, sb);
const E = box.e;

const all = E.TUTORIAL.flatMap((s) => [s.title, s.body, ...(s.points || [])]).join("\n");

/* --- the scoring step quotes the engine --- */
check("the industry-debut bonus is the engine's",
  all.includes(`${E.INDUSTRY_DEBUT_EP} EP the first time you build in each industry`),
  `INDUSTRY_DEBUT_EP = ${E.INDUSTRY_DEBUT_EP}`);
check("it no longer promises the old 5 EP",
  !/5 EP the first time you build/.test(all));

check("company levels are worth what levelEP says",
  E.TUT_LEVEL_EP === E.levelEP({ variants: {} })
  && all.includes(`${E.TUT_LEVEL_EP} EP per company level`),
  `levelEP = ${E.TUT_LEVEL_EP}`);
check("and they are banked immediately, not at the next year end",
  all.includes("banked the moment you build or upgrade it")
  && !/at the first year end after you build/.test(all));

check("both land awards quote LAND_AWARD.sole",
  all.includes(`${E.LAND_AWARD.sole} EP for most plots and ${E.LAND_AWARD.sole} for most districts`),
  `LAND_AWARD.sole = ${E.LAND_AWARD.sole}`);
check("it no longer promises 10 EP for land",
  !/10 EP for most plots/.test(all));

/* --- the Megacorp range, recomputed from the tiles --- */
const eps = E.MEGACORP_TILES.map((t) => t[2]);
check("the Megacorp range is the real spread over all tiles",
  E.MEGACORP_EP.lo === Math.min(...eps) && E.MEGACORP_EP.hi === Math.max(...eps)
  && all.includes(`${E.MEGACORP_EP.lo}–${E.MEGACORP_EP.hi} EP`),
  `${E.MEGACORP_EP.lo}-${E.MEGACORP_EP.hi} over ${eps.length} tiles`);

/* --- the supply web, recomputed from the cards --- */
const buys = {};
for (const bp of E.BP_DATA) {
  const set = (buys[bp.ind] = buys[bp.ind] || new Set());
  (bp.deps || []).forEach((d) => set.add(d.ind));
}
const degrees = E.INDUSTRIES.map((i) => (buys[i] ? buys[i].size : 0));
const lines = degrees.reduce((a, b) => a + b, 0);
check("the supply-line count matches the cards",
  E.SUPPLY.lines === lines && all.includes(`${lines} supply lines`), `${lines} lines`);
check("every industry really does buy from the same number of others",
  degrees.every((d) => d === degrees[0]), JSON.stringify(degrees));
check("and the tutorial says that number",
  E.SUPPLY.each === String(degrees[0]) && all.includes(`buys from ${degrees[0]} others`),
  `each buys from ${degrees[0]}`);
check("the six-industry ring is gone",
  !/back to UT/.test(all) && !/UT → HO → MA/.test(all));

/* --- claims that were checked by hand and are correct; pinned so they stay that way --- */
check("Utilities and Retail still cannot use hubs",
  /Utilities and Retail can never use/.test(engine)
  && all.includes("Utilities and Retail can never use them"));
check("the board is still 16 districts of 4 plots",
  all.includes("16 districts, each with 4 plots"));

/* --- and nothing anywhere still quotes a number the engine disagrees with --- */
const STALE = [
  [/\b5 EP\b[^\n]*first time/, "the old industry-debut bonus"],
  [/\b10 EP for most\b/, "the old land award"],
  [/\b1 EP per company level\b/, "the old level rate"],
];
for (const [re, what] of STALE) check(`no trace of ${what}`, !re.test(all));

console.log(fails ? `\n${fails} check(s) failed` : "\nall checks passed");
process.exit(fails);
