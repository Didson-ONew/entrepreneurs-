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

   It also reports text that never reached t() in the first place - see the
   bottom of this file - because a string nobody wrapped is a string nobody can
   see is missing.
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

/* Every string literal in the FIRST ARGUMENT of a t(...) call. Not just
   t("plain string"): a count and its noun are one string per number, so the
   call site is often t(n === 1 ? "{0} disc" : "{0} discs", n) and both arms
   need translating. Scanning only the literal that follows `t(` missed every
   one of those, silently. */
function firstArgLiterals(src, fn = "t") {
  const out = [];
  for (const m of src.matchAll(new RegExp(`\\b${fn}\\(`, "g"))) {
    let i = m.index + m[0].length, depth = 0;
    const lits = [];
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") { if (depth === 0) break; depth--; }
      else if (c === "," && depth === 0) break;
      else if (c === '"') {
        const j = i + 1, k = readString(src, i);
        if (k < 0) break;
        try { lits.push(JSON.parse(src.slice(i, k + 1))); } catch (_) {}
        i = k;
      } else if (c === "'" || c === "`") {
        const k = readString(src, i);
        if (k < 0) break;
        i = k;              // a template or single-quoted string is not a key
      }
    }
    out.push(...lits);
  }
  return out;
}
/* Where the string starting at `i` ends, or -1. */
function readString(src, i) {
  const q = src[i];
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === "\\") { j++; continue; }
    if (src[j] === q) return j;
  }
  return -1;
}

const wanted = new Set();
for (const f of FILES) {
  const s = fs.readFileSync(path.join(__dirname, f), "utf8");
  for (const lit of firstArgLiterals(s)) if (lit.trim()) wanted.add(lit);
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
  /* Read the whole first argument, the same way t() is read: a log line whose
     key is a ternary - logMsg(n === 1 ? "..." : "...", n) - has two keys. */
  for (const lit of firstArgLiterals(text, "logMsg")) add(lit);
  /* Fragments that ride INTO a log line as an argument rather than being one:
     a scan for them picks up half the surrounding expression, so they are named. */
  for (const frag of [" (SOLVENCY - half price)", " (SOLVENCY)",
       " \u2014 Healthcare can now reach it.",
       "The Real-Estate Mogul", "The Omnipresent",
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
  ["EntrepreneursGame.jsx", "const SCALING_NAME = {"], ["EntrepreneursGame.jsx", "const SCALING_BLURB = {"],
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

/* ---------------------------------------------------------------------------
   Text that never reached t() at all.

   Everything above finds strings the dictionaries are missing. This finds the
   other half of the problem, which was invisible for far longer: JSX text that
   was never wrapped in t(), so it was never a string anybody could translate
   and never showed up as missing. About 150 fragments were sitting in the game
   that way - the Upgrade and Sell buttons on every company card, the Records
   table headers, "You are seated 1st this game" on the draft screen - reading
   as English in a Portuguese game and in a Chinese one.

   The scan blanks comments and string literals first, so a format string like
   logMsg("{0} enters {1}") cannot be mistaken for markup, and then looks for
   text sitting directly between tags or beside an expression.
   --------------------------------------------------------------------------- */
const ALLOWED = new Set();       // nothing is exempt: even the game's own name is translated
function blankNonMarkup(src) {
  const out = src.split("");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    let end = -1;
    if (c === "/" && src[i + 1] === "*") { end = src.indexOf("*/", i + 2); end = end < 0 ? src.length : end + 2; }
    else if (c === "/" && src[i + 1] === "/") { end = src.indexOf("\n", i); end = end < 0 ? src.length : end; }
    else if (c === '"' || c === "`" || (c === "'" && !/[A-Za-z]/.test(src[i - 1] || ""))) {
      /* an apostrophe inside prose ("quarter's") is not a string opening */
      const k = readString(src, i);
      if (k > 0) { for (let j = i + 1; j < k; j++) if (out[j] !== "\n") out[j] = " "; i = k; }
      continue;
    }
    if (end > 0) { for (let j = i; j < end; j++) if (out[j] !== "\n") out[j] = " "; i = end - 1; }
  }
  return out.join("");
}
const CODEY = /[={}()\[\];$]|&&|\|\||=>|\.\w|\b(?:const|return|else|try|finally|typeof|new|function|export|await|import)\b/;
/* A bracket at either END of a text node is prose whose other half is on the far
   side of an expression - ">Megacorp tiles (" and ") left<" around {count}. A
   bracket in the MIDDLE is a function call. Trimming the ends before the test
   keeps both readings: that distinction is what hid the tile counter here. */
const unbracket = (s) => s.replace(/^[()\s]+|[()\s]+$/g, "");
/* Only the half of the file that contains markup. Everything above the REACT UI
   marker is engine code with no JSX in it, and `if (a > bestScore)` reads as a
   text node to any scan this simple. */
const markupOf = (raw) => {
  const cut = raw.indexOf(MARK);
  /* blanked, not cut, so the line numbers it reports are the file's */
  return cut < 0 ? raw : raw.slice(0, cut).replace(/[^\n]/g, " ") + raw.slice(cut);
};
const bare = [];
for (const f of FILES) {
  const raw = fs.readFileSync(path.join(__dirname, f), "utf8");
  const src = blankNonMarkup(markupOf(raw));
  for (const m of src.matchAll(/[>}]([^<>{}]+)[<{]/g)) {
    const txt = m.group ? m.group(1) : m[1];
    const one = txt.replace(/\s+/g, " ").trim();
    if (!one || !/[A-Za-z]{3,}/.test(one)) continue;
    if (CODEY.test(unbracket(one)) || ALLOWED.has(one)) continue;
    /* a bare camelCase or snake_case identifier is a variable, not a sentence */
    if (/^[a-z][A-Za-z0-9]*[A-Z_]/.test(unbracket(one))) continue;
    /* one word with a bracket hanging off it is a call, not a label with a count:
       "clamp(" against "Megacorp tiles (". A colon or question mark at either end
       is a ternary someone wrote across two lines. And a comma then one word is
       the middle of a list. */
    const core = unbracket(one);
    if (/^\S+$/.test(core) && /[()]$/.test(one.trim())) continue;
    if (/^[:?]|[?:]$/.test(core)) continue;
    if (/^,\s*\w+$/.test(core)) continue;
    if (/^(?:&\w+;|[\s\d\W])*$/.test(one)) continue;
    /* Two shapes of JavaScript that survive the blanking and are not markup:
       the tail of an object literal spread over lines, and a ternary whose
       branches were strings. */
    if (/^,\s*\w+\s*:$/.test(one)) continue;
    if (/^[\d\s]*\?.*:/.test(one)) continue;
    bare.push(`${f}:${src.slice(0, m.index).split("\n").length}  ${JSON.stringify(one.slice(0, 90))}`);
  }
}
/* ---------------------------------------------------------------------------
   The other half of that problem: English written as a VALUE rather than as
   markup.

   "Waiting on other players…" and every reason an action is refused sat in
   string literals that are returned, stored, then rendered - never text between
   tags, so the scan above could not see them, and never inside t(), so nothing
   else could either.

   The rule is a cross-check rather than a guess: a multi-word English literal
   that is not in `wanted` is one that neither a t() call nor any of the tables
   the UI translates by value knows about. Data tables stay English on purpose
   and are translated where they are drawn, and they are all in `wanted`, so
   they do not show up here.
   --------------------------------------------------------------------------- */
const norm = (x) => x.replace(/\s+/g, " ").trim();
const known = new Set([...wanted].map(norm));
const NOT_PROSE = /\b(px|solid|dashed|ease-in-out|infinite|calc|rgba?|translate|blur|linear|inset|repeat|sans-serif|system-ui|monospace)\b|#[0-9a-fA-F]{3,6}\b|^https?:|^\/|^[a-z-]+\/[a-z+-]+$/;
/* Values the game SENDS rather than shows: they travel to the server as the
   context a note was written in, and translating them would make the record
   depend on who wrote it. */
const EXEMPT = new Set(["end of game", "waiting room"]);
/* A list of utility classes reads like lowercase prose to any test that only
   looks for letters and spaces. What gives it away is the shape of its tokens:
   every one of them lowercase, and at least one of them a known utility. */
const UTILITY = /^(?:flex|grid|block|inline|hidden|italic|underline|truncate|uppercase|lowercase|capitalize|shrink|grow|absolute|relative|fixed|sticky|sr-only|monospace|ui-monospace,?)$|-\[|-\d|^(?:text|bg|border|rounded|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|w|h|min|max|gap|space|font|leading|tracking|opacity|z|top|left|right|bottom|overflow|items|justify|self|order|col|row|cursor|select|whitespace|shadow|ring|outline|transition|duration|ease|animate|pointer|board|gameover|tut)(?:-|$)/;
const isClassList = (one) => {
  const toks = one.split(" ");
  return toks.every((x) => /^-?[a-z0-9][a-z0-9:./\[\]#%,-]*$/.test(x)) && toks.some((x) => UTILITY.test(x.replace(/^-/, "")));
};
const loose = [];
for (const f of FILES) {
  const raw = markupOf(fs.readFileSync(path.join(__dirname, f), "utf8"));
  const blanked = blankNonMarkup(raw);            // comments gone, strings still there
  for (let i = 0; i < raw.length; i++) {
    if (blanked[i] === " " && raw[i] !== " ") continue;   // inside a comment
    if (raw[i] !== '"') continue;
    const end = readString(raw, i);
    if (end < 0) break;
    let val; try { val = JSON.parse(raw.slice(i, end + 1)); } catch (_) { i = end; continue; }
    const start = i;
    i = end;
    const one = norm(val);
    if (!one.includes(" ") || !/[A-Za-z]{4,}/.test(one)) continue;
    if (!/^[A-Za-z(\u2014\u2026$]/.test(one)) continue;
    if (NOT_PROSE.test(one) || isClassList(one) || known.has(one) || EXEMPT.has(one)) continue;
    /* The message of an Error nobody prints: every one of these is caught and
       replaced with a sentence that IS translated. */
    if (/new Error\(\s*$/.test(raw.slice(Math.max(0, start - 40), start))) continue;
    /* A fragment of a string that is already known: the tutorial builds some of
       its longer lines by concatenation, and the whole line is what t() sees. */
    if ([...known].some((k) => k.length > one.length && k.includes(one))) continue;
    loose.push(`${f}:${raw.slice(0, i).split("\n").length}  ${JSON.stringify(one.slice(0, 90))}`);
  }
}
/* ---------------------------------------------------------------------------
   A local named `t`.

   This has now broken the game three times, and it never reads as a
   translation bug: a variable called t shadows the imported translate
   function, the call throws, React catches it and the error boundary quietly
   replaces the screen. The last one took out the whole board. It is a
   one-line mistake and a two-line check.
   --------------------------------------------------------------------------- */
const shadows = [];
for (const f of FILES) {
  const raw = markupOf(fs.readFileSync(path.join(__dirname, f), "utf8"));
  const src = blankNonMarkup(raw);
  for (const re of [/\b(?:const|let|var)\s+t\s*=[^=>]/g, /\(\s*t\s*(?:,\s*\w+\s*)*\)\s*=>/g, /\bfunction\s*\w*\s*\(\s*t\b/g]) {
    for (const m of src.matchAll(re)) {
      shadows.push(`${f}:${src.slice(0, m.index).split("\n").length}  ${JSON.stringify(m[0].trim().slice(0, 40))}`);
    }
  }
}
if (shadows.length) {
  console.log(`${shadows.length} local(s) named t, which shadow the translate function:`);
  shadows.forEach((l) => console.log("   " + l));
  console.log("");
}

if (loose.length) {
  console.log(`${loose.length} English literal(s) nothing translates:`);
  loose.forEach((l) => console.log("   " + l));
  console.log("");
}

if (bare.length) {
  console.log(`${bare.length} piece(s) of text are not going through t() at all:`);
  bare.forEach((b) => console.log("   " + b));
  console.log("");
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
process.exit(STRICT && (short || bare.length || loose.length || shadows.length) ? 1 : 0);
