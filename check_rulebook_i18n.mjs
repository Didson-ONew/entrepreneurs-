/* ============================================================================
   Do the translated rulebooks still describe the same game?

   The English book is the source of the RULES; every other language is a
   translation of it. Two things can drift apart without anyone noticing: the
   STRUCTURE (somebody adds a paragraph on one side only) and the NUMBERS
   (somebody corrects $20 to $25 in English and forgets the rest). Both are
   checked here, cell by cell, rather than by eye.

   What is NOT checked is the quality of the prose. That is a reader's job.

   Every language registered in i18n.js is checked, so adding a third one is a
   matter of writing rulebook.<code>.mjs and nothing else.

   Run:  node check_rulebook_i18n.mjs
   ========================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RULEBOOK } from "./rulebook.data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

/* The registry is the list of languages. English is the source and has no
   translation to check. */
const reg = fs.readFileSync(path.join(here, "i18n.js"), "utf8");
const CODES = [...reg.matchAll(/\{\s*code:\s*"(\w+)"/g)].map((m) => m[1]).filter((c) => c !== "en");

let fails = 0, n = 0;
const check = (what, ok, note = "") => {
  n++; if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
};

/* Every number, dollar figure, percentage, industry code and quarter label has
   to survive translation. The MULTISET is compared: the order may change
   (word order does), the count may not. */
const TOKENS = /\$?\d+(?:[.,]\d+)?%?|\b(?:UT|RE|HO|MA|HC|TE)\b|\bQ\d{1,2}\b/g;
/* The per-cent sign is dropped before comparing. English writes the same figure
   as "3%" and as "3 per cent" in neighbouring sentences, and a translation is
   free to pick either, so comparing the sign would report house style as drift.
   The figure itself is still compared, and so is a dollar sign. */
const tokensOf = (s) => (String(s).match(TOKENS) || []).map((x) => x.replace(/%$/, "")).sort();
const strings = (x, out = []) => {
  if (typeof x === "string") out.push(x);
  else if (Array.isArray(x)) x.forEach((v) => strings(v, out));
  else if (x && typeof x === "object") Object.entries(x).forEach(([k, v]) => { if (k !== "id" && k !== "only") strings(v, out); });
  return out;
};

/* "Is this actually the language it claims to be?" A block left in English is
   the failure this catches, and English function words are what give it away.
   Chinese gets a second test: a translated section is mostly Han characters, so
   a section that is not says so loudly. */
const CJK = /[㐀-鿿豈-﫿]/g;
const SCRIPT = {
  zh: (text) => {
    /* Only letters count, on both sides of the ratio: the Blueprint annex is
       mostly figures and industry codes, and counting those as "not Chinese"
       would fail a section that is perfectly translated. */
    const latin = (text.match(/[A-Za-z]/g) || []).length;
    const han = (text.match(CJK) || []).length;
    return [han / Math.max(1, han + latin) > 0.5, `${han} Han against ${latin} Latin letters`];
  },
};

for (const code of CODES) {
  const file = `rulebook.${code}.mjs`;
  if (!fs.existsSync(path.join(here, file))) {
    check(`${code}: ${file} exists`, false, "no rulebook in this language");
    continue;
  }
  const mod = await import("./" + file);
  const BOOK = mod[`RULEBOOK_${code.toUpperCase()}`];
  console.log(`\n--- ${code} (${mod[`EDITION_${code.toUpperCase()}`] || "no edition"}) ---`);
  if (!Array.isArray(BOOK)) { check(`${code}: ${file} exports RULEBOOK_${code.toUpperCase()}`, false); continue; }

  check(`${code}: same number of sections (${RULEBOOK.length})`, RULEBOOK.length === BOOK.length,
    `${code} has ${BOOK.length}`);

  RULEBOOK.forEach((en, i) => {
    const tr = BOOK[i];
    if (!tr) { check(`${code}: section ${en.id} exists`, false); return; }
    const problems = [];
    if (tr.id !== en.id) problems.push(`id ${tr.id} != ${en.id}`);
    if (tr.only !== en.only) problems.push(`only ${tr.only} != ${en.only}`);
    if (tr.blocks.length !== en.blocks.length) problems.push(`${tr.blocks.length} blocks != ${en.blocks.length}`);
    en.blocks.forEach((eb, j) => {
      const tb = tr.blocks[j];
      if (!tb) { problems.push(`block ${j} missing`); return; }
      const ek = Object.keys(eb).sort().join(","), tk = Object.keys(tb).sort().join(",");
      if (ek !== tk) problems.push(`block ${j}: ${tk} != ${ek}`);
      if (eb.table && tb.table) {
        if (eb.table.head.length !== tb.table.head.length) problems.push(`block ${j}: table is a different width`);
        if (eb.table.rows.length !== tb.table.rows.length) problems.push(`block ${j}: table has ${tb.table.rows.length} rows, not ${eb.table.rows.length}`);
        eb.table.rows.forEach((r, k) => {
          const tro = tb.table.rows[k];
          if (tro && r.length !== tro.length) problems.push(`block ${j} row ${k}: ${tro.length} cells != ${r.length}`);
        });
      }
      if (eb.ul && tb.ul && eb.ul.length !== tb.ul.length) problems.push(`block ${j}: list has ${tb.ul.length} items, not ${eb.ul.length}`);
    });
    check(`${code}/${en.id}: same structure`, problems.length === 0, problems.slice(0, 3).join("; "));

    const a = tokensOf(strings(en).join(" ")), b = tokensOf(strings(tr).join(" "));
    const miss = [], bag = b.slice();
    a.forEach((x) => { const k = bag.indexOf(x); if (k < 0) miss.push(x); else bag.splice(k, 1); });
    check(`${code}/${en.id}: same numbers and codes (${a.length})`, miss.length === 0 && bag.length === 0,
      [miss.length ? `missing ${miss.slice(0, 6).join(" ")}` : "", bag.length ? `extra ${bag.slice(0, 6).join(" ")}` : ""].filter(Boolean).join(" / "));
  });

  /* No section may have been left in English by accident. */
  BOOK.forEach((tr) => {
    const text = strings(tr).join(" ");
    const english = (text.match(/\b(?:the|and|with|that|which|your|from|their)\b/gi) || []).length;
    const words = text.split(/\s+/).length;
    check(`${code}/${tr.id}: is not still English`, english / Math.max(1, words) < 0.02,
      `${english} English words in ${words}`);
    const script = SCRIPT[code];
    if (script) {
      const [ok, note] = script(text);
      check(`${code}/${tr.id}: is written in the right script`, ok, note);
    }
  });
}

console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
process.exit(fails ? 1 : 0);
