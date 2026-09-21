/* Which player-facing strings are still English?

   t() is keyed by the English source, so a missing translation is not a crash -
   it is an English sentence in a Portuguese game. That is the right failure, and
   it is also invisible, which is why this exists: it walks every t("...") call
   in the app, plus the text tables the UI translates at render time, and reports
   what the dictionary has no entry for.

   Run: node check_i18n.js            (lists what is missing)
        node check_i18n.js --strict   (exit 1 if anything is missing)
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const FILES = ["EntrepreneursGame.jsx", "OnlineApp.jsx", "Rulebook.jsx", "Records.jsx", "Feedback.jsx"];
const STRICT = process.argv.includes("--strict");

/* the dictionary, read as source so this needs no bundler */
const ptSrc = fs.readFileSync(path.join(__dirname, "i18n.pt.js"), "utf8");
const dict = vm.runInNewContext("(" + ptSrc.slice(ptSrc.indexOf("export default {") + "export default ".length).replace(/;\s*$/, "") + ")");

const wanted = new Set();
for (const f of FILES) {
  const s = fs.readFileSync(path.join(__dirname, f), "utf8");
  for (const m of s.matchAll(/\bt\("((?:[^"\\]|\\.)*)"[,)]/g)) wanted.add(JSON.parse('"' + m[1] + '"'));
}

/* the tables the UI translates by value rather than by literal */
const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const MARK = "/* ============================== REACT UI ============================== */";
const cut = src.indexOf(MARK);
const logic = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");
const ui = src.slice(cut);
const grab = (name) => {
  const i = ui.indexOf("const " + name + " =");
  if (i < 0) return "";
  const j = ui.indexOf("\n})();", i);
  return j > 0 ? ui.slice(i, j + 6) : ui.slice(i, ui.indexOf("\n", i) + 1);
};
const tutI = ui.indexOf("const TUTORIAL = ["), tutJ = ui.indexOf("\n];", tutI);
const tut = ui.slice(tutI, tutJ + 3).replace(/art:\s*\w+/g, "art: null");
const box = {};
vm.runInNewContext(logic + grab("SUPPLY") + "\n" + grab("MEGACORP_EP") + "\n" + grab("TUT_LEVEL_EP") + "\n" + tut + `
  box.exports = { PERSONAS, VARIANTS, TRACK_HELP, TRACK_LABEL, IND_NAME, IND_ABILITY, TUTORIAL };`,
  { console, Math, Set, Object, Array, JSON, box });
const E = box.exports;
const add = (s) => { if (typeof s === "string" && s.trim()) wanted.add(s); };
Object.values(E.PERSONAS).forEach((p) => { add(p.name); add(p.blurb); });
E.VARIANTS.forEach((v) => { add(v.name); add(v.blurb); });
[E.TRACK_HELP, E.TRACK_LABEL, E.IND_NAME, E.IND_ABILITY].forEach((o) => Object.values(o).forEach(add));
E.TUTORIAL.forEach((s) => { add(s.title); add(s.body); (s.points || []).forEach(add); });

/* Tables the UI hands to t() by value rather than by literal, so the scan above
   cannot see them: Records' scoring-source labels and tabs, the feedback kinds,
   and the district type names. Their strings live in English in the table and
   are translated where they are drawn. */
const TABLES = [
  ["Records.jsx", "const SOURCE_LABEL = {"], ["Records.jsx", "const TABS = ["],
  ["Feedback.jsx", "const KINDS = ["], ["EntrepreneursGame.jsx", "const DIST_TYPE_LABEL = {"],
];
for (const [file, anchor] of TABLES) {
  const text = fs.readFileSync(path.join(__dirname, file), "utf8");
  const i = text.indexOf(anchor);
  if (i < 0) continue;
  /* stop at the first close of the table itself - these are all short literals,
     and running past the end swept half the stylesheet into the report */
  const ends = ["\n};", "\n];", "}];"].map((e) => text.indexOf(e, i)).filter((x) => x > 0);
  const end = ends.length ? Math.min(...ends) : i + 600;
  const body = text.slice(i, Math.min(end, i + 900));
  for (const m of body.matchAll(/"((?:[^"\\\n]|\\.)+)"/g)) {
    let v; try { v = JSON.parse('"' + m[1] + '"'); } catch (_) { continue; }
    // labels only: real words, not class names, district codes or CSS
    if (!/[A-Za-z]{3,}/.test(v)) continue;
    if (/^[a-z-]+(\s+[a-z0-9:/\[\]#-]+)*$/.test(v)) continue;
    if (/\b(flex|text-|bg-|rounded|items-|justify-|font-|select-none|tracking-|w-full|h-full)\b/.test(v)) continue;
    if (/^[A-Z]{2,3}$/.test(v)) continue;
    add(v);
  }
}

const missing = [...wanted].filter((s) => !Object.prototype.hasOwnProperty.call(dict, s)).sort();
const stale = Object.keys(dict).filter((s) => !wanted.has(s)).sort();
const pct = Math.round(((wanted.size - missing.length) / wanted.size) * 100);

console.log(`pt-BR: ${wanted.size - missing.length}/${wanted.size} strings translated (${pct}%)`);
if (missing.length) {
  console.log(`\n${missing.length} still English:`);
  missing.forEach((s) => console.log("   " + JSON.stringify(s.slice(0, 100))));
}
if (stale.length) {
  console.log(`\n${stale.length} dictionary entries no longer used by the app:`);
  stale.slice(0, 20).forEach((s) => console.log("   " + JSON.stringify(s.slice(0, 80))));
}
process.exit(STRICT && missing.length ? 1 : 0);
