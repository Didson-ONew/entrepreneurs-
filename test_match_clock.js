/* The match clock, and two UI rules that were wrong in ways no engine test could
   see. Everything here lives in the REACT UI half of EntrepreneursGame.jsx, past
   the point the engine loader cuts, so each piece is lifted out by name and
   checked on its own rather than by standing a browser up. */
const fs = require("fs");
const vm = require("vm");

const SRC = fs.readFileSync(require("path").join(__dirname, "EntrepreneursGame.jsx"), "utf8");
let fails = 0, n = 0;
function check(what, ok, note = "") {
  n++; if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
}
function section(t) { console.log(`\n${t}`); }

/* ------------------------------------------------------------------ clock */
/* Pull formatElapsed out of the file and run it. If it is ever renamed or
   inlined again this fails loudly rather than quietly testing nothing. */
const m = SRC.match(/function formatElapsed\(seconds\) \{[\s\S]*?\n\}/);
if (!m) { console.error("formatElapsed is gone from EntrepreneursGame.jsx"); process.exit(2); }
const box = {};
vm.createContext(box);
vm.runInContext(m[0] + "\nthis.f = formatElapsed;", box);
const f = box.f;

section("The clock reads as a time");
{
  check("under a minute", f(45) === "00:45", f(45));
  check("minutes and seconds", f(125) === "02:05", f(125));
  check("exactly one hour rolls the minutes over", f(3600) === "1:00:00", f(3600));
  check("an hour and a half", f(5400) === "1:30:00", f(5400));

  /* The bug, in the exact shape it was seen in: two hours ten minutes forty-five
     rendered as "2:130:45", because the minutes were TOTAL minutes and the hours
     were therefore counted twice - once as the 2, and again inside the 130. */
  check("two hours ten minutes is not 2:130:45", f(7845) === "2:10:45", f(7845));
  check("the minutes never exceed 59",
    [0, 59, 60, 3599, 3600, 7845, 86399, 90061].every((s) => {
      const parts = f(s).split(":");
      const mm = Number(parts.length === 3 ? parts[1] : parts[0]);
      return mm >= 0 && mm <= 59;
    }));
  check("the seconds never exceed 59",
    [0, 59, 60, 3661, 7845, 86399, 123456].every((s) => Number(f(s).split(":").pop()) <= 59));
}

section("Left open for days it still reads as a time");
{
  check("a day is named as one", f(86400) === "1d 0:00:00", f(86400));
  check("a day and change", f(90061) === "1d 1:01:01", f(90061));
  check("hours reset inside a day, not counted twice", f(2 * 86400 + 3 * 3600) === "2d 3:00:00", f(2 * 86400 + 3 * 3600));
  check("no run of three-plus digit minutes at any duration",
    ![600, 3600, 7200, 50000, 86400, 200000, 1000000].some((s) => /:\d{3,}/.test(f(s))));
}

section("Nonsense in, a clock out");
{
  check("zero", f(0) === "00:00", f(0));
  check("undefined does not throw", f(undefined) === "00:00", f(undefined));
  check("a negative reads as zero rather than counting backwards", f(-90) === "00:00", f(-90));
  check("a fraction is floored", f(59.9) === "00:59", f(59.9));
}

/* ----------------------------------------------------- the HQ choice gate */
section("Forming a Megacorp always asks which company keeps the building");
{
  /* The chooser used to be gated on state.ipoTileClaimed, so the FIRST player to
     go public never saw it and had pickHQ decide for them - which is precisely
     the player the IPO tile is waiting for. */
  const gate = /if \(state\.ipoTileClaimed && megacorpMatch\) return setMode\("hq"\)/.test(SRC);
  check("the ipoTileClaimed gate is gone", !gate);
  check("a match still opens the chooser",
    /if \(megacorpMatch\) return setMode\("hq"\)/.test(SRC));
}

section("The HQ cards quote what the brand actually banks");
{
  /* A Megacorp banks its industry's price DIVIDED BY THE TILE'S TIER, floored.
     The cards used to print the undivided price, which can rank the choices
     wrongly: on a tier 2 tile a $7 good and a $6 good both pay 3. */
  check("the card divides by the tile's tier",
    /const perQ = brandEPFor\(price\(state\.pm, b\.bp\.ind\), tier\);/.test(SRC));
  check("and no longer prints the raw price as the per-quarter figure",
    !/\{price\(state\.pm, b\.bp\.ind\)\} EP\/quarter/.test(SRC));

  // the arithmetic that makes the old display misleading
  const brandEP = (price, tier) => Math.floor(price / tier);
  check("$7 and $6 both bank 3 on a tier 2 tile",
    brandEP(7, 2) === 3 && brandEP(6, 2) === 3, "so the raw price ranked them apart when they are equal");
  check("they separate again on a tier 1 tile",
    brandEP(7, 1) === 7 && brandEP(6, 1) === 6);
  check("a tier 4 tile banks nothing from either", brandEP(7, 4) === 1 && brandEP(3, 4) === 0);
}

/* --------------------------------------------------- the standings figures */
section("Standings count Megacorps and label discs honestly");
{
  check("the old activeBiz-only line is gone",
    !/\{activeBiz\(p\)\.length\}biz &middot; \{p\.hand\.length\}BP &middot; \{p\.discsInBank\}disc/.test(SRC));
  check("Megacorp HQs are shown", /\+\{megacorpHQs\(p\)\.length\}MC/.test(SRC));
  check("the disc figure is the same used-of-twelve the player board shows",
    /\{discsUsed\(state, p\)\}\/\{DISCS_PER_PLAYER\} discs/.test(SRC));
  check("loan discs are still called out separately",
    /\(\{p\.discsInBank\} loan\)/.test(SRC));
}

console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
process.exit(fails ? 1 : 0);
