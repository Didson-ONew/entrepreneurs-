/* ============================================================================
   THE INDUSTRY PALETTE, read the way a player's eye reads it.

   Six industries, six colours, and every one of them has to be told apart from
   the other five - on a board, at arm's length, under whatever light the table
   has. That is a measurable property, not a matter of taste, so it is measured
   here rather than argued about.

   HOW FAR APART IS FAR ENOUGH. Colours are compared in CIE Lab, where distance
   is meant to track what the eye actually notices, and the separation is the
   plain Euclidean distance between two Lab points. A floor of 15 is the working
   number: below about 10 two swatches read as shades of one colour at a glance,
   and 15 leaves room for print drift and bad lighting.

   AND NOT ONLY IN NORMAL VISION. Roughly one man in twelve has some form of
   colour vision deficiency, which is more than one player at a full table. Each
   pair is therefore checked four times: as seen normally, and through the three
   dichromacies, simulated with the Viénot-Brettel-Mollon linear transform in
   LMS space. A palette that separates beautifully for most people and collapses
   into two muddy pairs for one of them has not been checked.

   Run: node audit_palette.js            report the shipped palette
        node audit_palette.js --solve    search for the smallest set of moves
                                         that clears the floor everywhere
   ========================================================================== */
const fs = require("fs");
const path = require("path");

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const m = SRC.match(/const IND_COLOR = \{([^}]*)\};/);
if (!m) { console.error("IND_COLOR moved - update this probe"); process.exit(2); }
const PAL = {};
for (const part of m[1].split(",")) {
  const t = part.match(/(\w+):\s*"(#[0-9A-Fa-f]{6})"/);
  if (t) PAL[t[1]] = t[2].toUpperCase();
}
const IND = Object.keys(PAL);
const FLOOR = 15;

/* ---- colour maths ---- */
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const rgb2hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const toLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const toSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055);
function lab(hex) {
  const [r, g, b] = hex2rgb(hex).map(toLin);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const dE = (a, b) => { const x = lab(a), y = lab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

/* Viénot, Brettel & Mollon (1999): to LMS, flatten the missing axis, back again. */
const RGB2LMS = [[0.31399, 0.63951, 0.04649], [0.15537, 0.75789, 0.08670], [0.01775, 0.10945, 0.87258]];
const LMS2RGB = [[5.47221, -4.64196, 0.16963], [-1.12524, 2.29317, -0.16789], [0.02980, -0.19318, 1.16364]];
const CVD = {
  protanopia:   [[0, 1.05118294, -0.05116099], [0, 1, 0], [0, 0, 1]],
  deuteranopia: [[1, 0, 0], [0.9513092, 0, 0.04866992], [0, 0, 1]],
  tritanopia:   [[1, 0, 0], [0, 1, 0], [-0.86744736, 1.86727089, 0]],
};
const mul = (M, v) => M.map((row) => row.reduce((s, k, i) => s + k * v[i], 0));
function simulate(hex, kind) {
  if (kind === "normal") return hex;
  const lin = hex2rgb(hex).map(toLin);
  return rgb2hex(mul(LMS2RGB, mul(CVD[kind], mul(RGB2LMS, lin))).map(toSrgb));
}
const VIEWS = ["normal", "protanopia", "deuteranopia", "tritanopia"];

/* ---- the report ---- */
const pad = (s, w) => String(s).padEnd(w), rp = (s, w) => String(s).padStart(w);
function worstOf(pal) {
  let worst = { d: Infinity };
  for (const view of VIEWS) {
    for (let i = 0; i < IND.length; i++) for (let j = i + 1; j < IND.length; j++) {
      const d = dE(simulate(pal[IND[i]], view), simulate(pal[IND[j]], view));
      if (d < worst.d) worst = { d, a: IND[i], b: IND[j], view };
    }
  }
  return worst;
}
function report(pal, label) {
  console.log(`\n${"=".repeat(78)}\n${label}\n${"=".repeat(78)}`);
  console.log("  " + IND.map((i) => `${i} ${pal[i]}`).join("   "));
  let fails = 0;
  for (const view of VIEWS) {
    console.log(`\n  ${view.toUpperCase()}`);
    console.log("  " + pad("", 6) + IND.map((i) => rp(i, 8)).join(""));
    for (let i = 0; i < IND.length; i++) {
      let row = "  " + pad(IND[i], 6);
      for (let j = 0; j < IND.length; j++) {
        if (j <= i) { row += rp("", 8); continue; }
        const d = dE(simulate(pal[IND[i]], view), simulate(pal[IND[j]], view));
        if (d < FLOOR) fails++;
        row += rp(d.toFixed(1) + (d < FLOOR ? "!" : " "), 8);
      }
      console.log(row);
    }
  }
  const w = worstOf(pal);
  console.log(`\n  worst pair anywhere: ${w.a}/${w.b} at ${w.d.toFixed(1)} in ${w.view}` +
    `  (floor ${FLOOR})  -  ${fails} pair-view(s) under the floor`);
  return fails;
}

if (!process.argv.includes("--solve")) {
  const fails = report(PAL, "AS IT SHIPS");
  console.log(fails ? "\nrun with --solve to find the smallest set of moves that clears it\n" : "\nthe palette clears the floor in every vision\n");
  process.exit(0);
}

/* ---- --solve: nudge hues, keep every industry recognisably its own colour ----
   A palette is only useful if players still call Utilities "the gold one", so the
   search moves hue, saturation and lightness within a short leash of where each
   colour already sits and takes the arrangement whose worst pair is highest. */
function hsl(hex) {
  const [r, g, b] = hex2rgb(hex);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hsl2hex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m2 = l - c / 2;
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
          : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgb2hex(t.map((v) => v + m2));
}
const BASE = Object.fromEntries(IND.map((i) => [i, hsl(PAL[i])]));
const HUE = 26, SAT = 0.16, LIG = 0.13;        // the leash, in degrees and fractions
let best = { d: worstOf(PAL).d, pal: { ...PAL } };
const rnd = (() => { let s = 20251015; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
for (let step = 0; step < 240000; step++) {
  const pal = {};
  for (const i of IND) {
    const [h, s, l] = BASE[i];
    pal[i] = hsl2hex(h + (rnd() * 2 - 1) * HUE, s + (rnd() * 2 - 1) * SAT, l + (rnd() * 2 - 1) * LIG);
  }
  const w = worstOf(pal).d;
  if (w > best.d) best = { d: w, pal };
}
console.log(`\nsearched 240000 palettes within ${HUE} degrees of hue, ${SAT} saturation and ${LIG} lightness of the printed ones.`);
report(PAL, "AS IT SHIPS");
report(best.pal, "BEST FOUND");
console.log("  const IND_COLOR = { " + IND.map((i) => `${i}: "${best.pal[i]}"`).join(", ") + " };\n");
