/* ============================================================================
   Draft the ranged payout table from the shipped engine's own sales.

   The designer's Revenue proposal pays by BAND: count the units of demand a company
   reaches, and pay $ / $$ / $$$ of the price by where that count falls between two
   thresholds, with a floor so that a company reaching nothing still earns its
   lowest multiplier. This script writes that table - two thresholds and three
   multipliers for every industry and level - from the real distribution of reach,
   so the draft is read off the game rather than typed.

   HOW. audit_revenue.js --dump writes every sale under the shipped rule: units
   reached, price, production, revenue. For each industry and level with enough
   sales, the top threshold b is where a company is FULLY SERVED - its production or
   the 90th percentile of reach, whichever is lower - and a sits at 60% of b, which
   is the designer's own shape (Retail L3: 10 / 15 on production 16). Each
   multiplier is the mean revenue the shipped rule pays inside that band divided by
   the mean price there, rounded to a whole number and never below 1: the floor is
   deliberate, and is what pays an empty-reach company its price instead of $1 a
   unit of recycling. Levels with under thirty sales double the level below, as
   production does. By construction the draft pays within a dollar of today at
   every industry and level; what the bots then do with it is measured separately,
   with audit_revenue.js --ranged, which reads ranged_table.json.

   TECHNOLOGY'S THRESHOLDS ARE IN ICONS, not units: its icons take two units each,
   so a count in units only ever lands on even numbers and a band between two of
   them can be empty. Its rows carry "unit": "icons", and the audit halves its units
   before reading the band. The multipliers are of the price either way.

   Run: node audit_revenue.js 300 3 4 --current --dump reach_sales.json
        node draft_ranged_table.js reach_sales.json ranged_table.json
   ========================================================================== */
const fs = require("fs");
const [,, IN, OUT] = process.argv;
const D = JSON.parse(fs.readFileSync(IN, "utf8"));
const IND = ["UT", "RE", "HO", "MA", "HC", "TE"];
const q = (a, f) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(f * b.length))]; };
const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const mode = (a) => { const c = {}; a.forEach((x) => (c[x] = (c[x] || 0) + 1)); return +Object.entries(c).sort((x, y) => y[1] - x[1])[0][0]; };
const table = {}, rows = [];
for (const i of IND) {
  table[i] = {};
  for (const L of [1, 2, 3, 4]) {
    const sales = (D[i] && D[i][L]) || [];
    const n = sales.length;
    let a, b, m, note = "";
    if (n >= 30) {
      const icons = i === "TE";                                  // reach in icons, not doubled units
      const u = sales.map((s) => (icons ? s[0] / 2 : s[0])), prod = mode(sales.map((s) => s[2])) / (icons ? 2 : 1);
      b = Math.max(2, Math.min(prod, q(u, 0.9)));
      a = Math.max(1, Math.min(b - 1, Math.round(0.6 * b)));
      const reach = (s) => (icons ? s[0] / 2 : s[0]);
      const band = (x) => (x < a ? 0 : x >= b ? 2 : 1);
      m = [0, 1, 2].map((k) => {
        const inBand = sales.filter((s) => band(reach(s)) === k);
        if (!inBand.length) return null;
        return Math.max(1, Math.round(mean(inBand.map((s) => s[3])) / mean(inBand.map((s) => s[1]))));
      });
      /* an empty band inherits its neighbour, so the ladder stays monotone */
      if (m[1] === null) m[1] = m[0] !== null && m[2] !== null ? Math.round((m[0] + m[2]) / 2) : (m[0] ?? m[2]);
      if (m[0] === null) m[0] = Math.max(1, m[1] - 1);
      if (m[2] === null) m[2] = m[1] + 1;
      for (let k = 1; k < 3; k++) if (m[k] < m[k - 1]) m[k] = m[k - 1];
      const share = [0, 1, 2].map((k) => (100 * sales.filter((s) => band(reach(s)) === k).length / n).toFixed(0) + "%");
      const nowRev = mean(sales.map((s) => s[3]));
      const draftRev = mean(sales.map((s) => m[band(reach(s))] * s[1]));
      rows.push({ i, L, n, prod, p: [q(u, .25), q(u, .5), q(u, .75), q(u, .9)], a, b, m, share, nowRev, draftRev, note: icons ? "thresholds in icons" : note });
    } else {
      /* too few to read: double the level below, which is what production does */
      const below = table[i][L - 1];
      if (!below) continue;
      const prod = (n ? mode(sales.map((s) => s[2])) : 2 * (rows.find((r) => r.i === i && r.L === L - 1) || { prod: 0 }).prod) / (i === "TE" && n ? 2 : 1);
      b = Math.min(prod, 2 * below.b); a = Math.max(1, Math.min(b - 1, Math.round(0.6 * b)));
      m = below.m.map((x) => 2 * x);
      note = `extrapolated from level ${L - 1} (${n} sales)`;
      rows.push({ i, L, n, prod, p: ["-", "-", "-", "-"], a, b, m, share: ["-", "-", "-"], nowRev: n ? mean(sales.map((s) => s[3])) : NaN, draftRev: NaN, note });
    }
    table[i][L] = i === "TE" ? { a, b, m, unit: "icons" } : { a, b, m };
  }
}
fs.writeFileSync(OUT, JSON.stringify(table, null, 1));
const pad = (s, n) => String(s).padEnd(n), rp = (s, n) => String(s).padStart(n);
console.log("\nDRAFT RANGED PAYOUT TABLE - thresholds in units reached, multipliers of the price");
console.log(pad("", 8) + rp("sales", 6) + rp("prod", 5) + rp("p25/50/75/90", 16) + rp("a", 4) + rp("b", 4) + rp("$ / $$ / $$$", 14) + rp("share in bands", 18) + rp("now", 7) + rp("draft", 7) + "  note   (TE: reach and production in icons)");
for (const r of rows) console.log(pad(r.i + " L" + r.L, 8) + rp(r.n, 6) + rp(r.prod, 5) + rp(r.p.join("/"), 16) + rp(r.a, 4) + rp(r.b, 4) + rp(r.m.join(" / "), 14) + rp(r.share.join(" "), 18) + rp(isFinite(r.nowRev) ? "$" + r.nowRev.toFixed(0) : "-", 7) + rp(isFinite(r.draftRev) ? "$" + r.draftRev.toFixed(0) : "-", 7) + "  " + r.note);
console.log("\nwritten to " + OUT);
