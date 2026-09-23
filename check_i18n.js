/* Which player-facing strings are still English?

   t() is keyed by the English source, so a missing translation is not a crash -
   it is an English sentence in a Chinese game. That is the right failure, and it
   is also invisible, which is why this exists: it walks every t("...") call in
   the app, plus the text tables the UI translates at render time, and reports
   what each dictionary has no entry for.

   Every language registered in i18n.js is checked, so adding a third one does
   not mean editing this file.

   Run: node check_i18n.js                (lists what is missing, per language)
        node check_i18n.js --strict       (exit 1 if anything is missing)
        node check_i18n.js --dump f.json  (write the English catalogue out)
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const FILES = ["EntrepreneursGame.jsx", "OnlineApp.jsx", "Rulebook.jsx", "Records.jsx", "Feedback.jsx"];
const STRICT = process.argv.includes("--strict");

/* Which languages exist, straight out of the registry, so this file never has
   to be told about a new one. English is the source and needs no dictionary. */
const reg = fs.readFileSync(path.join(__dirname, "i18n.js"), "utf8");
const LANGS = [...reg.matchAll(/\{\s*code:\s*"(\w+)"\s*,\s*label:\s*"((?:[^"\\]|\\.)*)"/g)]
  .map((m) => ({ code: m[1], label: JSON.parse('"' + m[2] + '"') }))
  .filter((l) => l.code !== "en");

/* the dictionaries, read as source so this needs no bundler */
const readDict = (code) => {
  const src = fs.readFileSync(path.join(__dirname, `i18n.${code}.js`), "utf8");
  const body = src.slice(src.indexOf("export default {") + "export default ".length).replace(/;\s*$/, "");
  return vm.runInNewContext("(" + body + ")");
};
const DICTS = Object.fromEntries(LANGS.map((l) => [l.code, readDict(l.code)]));

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
  box.exports = { PERSONAS, VARIANTS, TRACK_HELP, TRACK_LABEL, IND_NAME, IND_ABILITY, TUTORIAL,
                  BP_DATA, MEGACORP_TILES };`,
  { console, Math, Set, Object, Array, JSON, box });
const E = box.exports;
const add = (s) => { if (typeof s === "string" && s.trim()) wanted.add(s); };
Object.values(E.PERSONAS).forEach((p) => { add(p.name); add(p.blurb); });
E.VARIANTS.forEach((v) => { add(v.name); add(v.blurb); });
[E.TRACK_HELP, E.TRACK_LABEL, E.IND_NAME, E.IND_ABILITY].forEach((o) => Object.values(o).forEach(add));
E.TUTORIAL.forEach((s) => { add(s.title); add(s.body); (s.points || []).forEach(add); });
/* Card and tile names: the UI draws them through t(b.bp.name), so no literal to
   scan - the names themselves are the keys. */
E.BP_DATA.forEach((b) => add(b.name));
E.MEGACORP_TILES.forEach((tile) => add(tile[0]));
/* The five phase names on the quarter strip, which the strip holds as data. */
["Planning", "Action", "Production", "Revenue", "Closing"].forEach(add);
/* Every log line shape, and the fragments that get slotted into one. The engine
   writes these as logMsg("...", args) - the string is the key. */
for (const f of ["EntrepreneursGame.jsx", "server.js"]) {
  const text = fs.readFileSync(path.join(__dirname, f), "utf8");
  for (const m of text.matchAll(/logMsg\("((?:[^"\\]|\\.)*)"/g)) add(JSON.parse('"' + m[1] + '"'));
  /* Fragments that ride INTO a log line as an argument rather than being one:
     a scan for them picks up half the surrounding expression, so they are named. */
  for (const frag of [" (SOLVENCY - half price)", " (SOLVENCY)",
       "company", "companies", "company goes", "companies go", "business", "businesses",
       "bot", "bots", "has", "have", "1st", "2nd", "3rd"]) {
    if (text.includes(JSON.stringify(frag).slice(1, -1))) add(frag);
  }
  /* `${seat}th` builds 4th, 5th and 6th at run time, so they never appear as
     literals for the scan above to find. */
  for (const n of ["4th", "5th", "6th"]) {
    if (/\$\{seat\}th/.test(text)) add(n);
  }
}

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

const dumpAt = process.argv.indexOf("--dump");
if (dumpAt > 0 && process.argv[dumpAt + 1]) {
  fs.writeFileSync(process.argv[dumpAt + 1], JSON.stringify([...wanted].sort(), null, 1));
  console.log(`${wanted.size} strings written to ${process.argv[dumpAt + 1]}`);
}

let short = 0;
for (const { code, label } of LANGS) {
  const dict = DICTS[code];
  const missing = [...wanted].filter((s) => !Object.prototype.hasOwnProperty.call(dict, s)).sort();
  const stale = Object.keys(dict).filter((s) => !wanted.has(s)).sort();
  const pct = Math.round(((wanted.size - missing.length) / wanted.size) * 100);
  short += missing.length;

  console.log(`${code}: ${wanted.size - missing.length}/${wanted.size} strings translated (${pct}%)  ${label}`);
  if (missing.length) {
    console.log(`\n${missing.length} still English:`);
    missing.forEach((s) => console.log("   " + JSON.stringify(s.slice(0, 100))));
  }
  if (stale.length) {
    console.log(`\n${stale.length} dictionary entries no longer used by the app:`);
    stale.slice(0, 20).forEach((s) => console.log("   " + JSON.stringify(s.slice(0, 80))));
  }
  if (missing.length || stale.length) console.log("");
}
process.exit(STRICT && short ? 1 : 0);
