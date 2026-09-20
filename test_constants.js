/* Every ALL_CAPS constant the source uses is defined somewhere in it.

   A constant removed with the rule it served, but still read by a screen nobody
   reached for weeks, is a ReferenceError waiting for one click - and a render error
   blanks the whole page. MEGACORP_NEIGHBOUR_EP went that way: the district award was
   dropped, the HQ-choice card kept printing it, and the first player to go public
   afterwards got a black screen. esbuild does not resolve free identifiers, so this
   does, for the one naming convention that is always a constant.

   Run: node test_constants.js */
const fs = require("fs");
const path = require("path");

const FILES = ["EntrepreneursGame.jsx", "OnlineApp.jsx", "Rulebook.jsx", "Records.jsx", "Feedback.jsx", "ErrorShield.jsx", "server.js"];
const KNOWN = new Set(["JSON", "NET", "URL", "UTC", "ISO", "TE", "UT", "RE", "HO", "MA", "HC", "PORT", "BASE", "HTTP", "HTTPS", "TLS", "SIGTERM", "SIGINT", "EPIPE", "ECONNRESET", "ECONNREFUSED", "ENOENT", "EEXIST", "EADDRINUSE", "NaN", "UI", "EP", "IPO", "BP", "HQ", "LH", "OPEX", "ID", "CSS", "HTML", "SVG", "PNG", "API", "OK", "GET", "POST", "L", "D", "R", "B", "V", "H", "S", "I", "N", "Q", "A", "C", "M"]);

/* Strip comments, string literals and JSX text in one pass, so a constant's NAME in
   prose does not count as a use. A single scanner rather than a stack of regexes: a
   "//" inside a string, or a quote inside a comment, desyncs any regex approach and
   swallows whole functions. Regex literals are not handled - none in these files
   contains an all-caps word with an underscore. */
function code(src) {
  let out = "", i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") { const j = src.indexOf("*/", i + 2); i = j < 0 ? n : j + 2; out += " "; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === "\\") j++; if (c !== "`" && src[j] === "\n") break; j++; }
      out += c + c; i = j + 1; continue;
    }
    out += c; i++;
  }
  // JSX text: whatever sits between a closing '>' and the next '<' with no braces in it
  return out.replace(/>[^<>{}]*</g, "><");
}

let failures = 0;
const check = (label, cond) => { console.log(`${cond ? "  ok  " : " FAIL "} ${label}`); if (!cond) failures++; };

const sources = Object.fromEntries(FILES.filter((f) => fs.existsSync(path.join(__dirname, f))).map((f) => [f, code(fs.readFileSync(path.join(__dirname, f), "utf8"))]));
const defined = new Set();
for (const f of Object.keys(sources)) {
  const raw = fs.readFileSync(path.join(__dirname, f), "utf8");
  for (const m of raw.matchAll(/\b([A-Z][A-Z0-9_]*_[A-Z0-9_]*)\s*=[^=]/g)) defined.add(m[1]);           // any assignment
  for (const m of raw.matchAll(/\b(?:function|class)\s+([A-Z][A-Z0-9_]*_[A-Z0-9_]*)\b/g)) defined.add(m[1]);
  for (const m of raw.matchAll(/import\s*\{([^}]*)\}/g)) for (const nm of m[1].split(",")) { const k = nm.trim().split(/\s+as\s+/).pop(); if (/_/.test(k)) defined.add(k); }
  for (const m of raw.matchAll(/(?:const|let|var)\s*\{([^}]*)\}/g)) for (const nm of m[1].split(",")) { const k = nm.trim().split(/[:\s=]/)[0]; if (/^[A-Z][A-Z0-9_]*_[A-Z0-9_]*$/.test(k)) defined.add(k); }
}
for (const [f, src] of Object.entries(sources)) {
  const used = new Set();
  /* Only names with an underscore: that is the constant convention here, and it keeps
     a shouted word in prose (THE, RIVAL) out of the count. Not preceded by a dot, so
     process.env.ENT_ADMINS is a property, not a free identifier. */
  for (const m of src.matchAll(/(?<![.\w$])([A-Z][A-Z0-9_]*_[A-Z0-9_]*)\b(?!\s*:)/g)) used.add(m[1]);
  const missing = [...used].filter((n) => !defined.has(n) && !KNOWN.has(n) && !(n in globalThis));
  check(`${f}: every constant it reads is defined${missing.length ? " - missing " + missing.join(", ") : ""}`, missing.length === 0);
}
console.log(failures ? `\n${failures} check(s) failed\n` : "\nall checks passed\n");
process.exit(failures ? 1 : 0);
