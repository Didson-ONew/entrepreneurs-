/* The English rulebook is the source of the rules; every other language is a
   translation of it, in a file of its own. Nothing stops a translation drifting
   from the English except checking, so the suite checks: check_rulebook_i18n.mjs
   compares every section's structure and every number it states, cell by cell,
   in every language registered in i18n.js.

   This existed once as check_rulebook_pt.mjs and nothing ran it. A check the
   suite never runs is a check that has already stopped working; it is in here
   now so a rule corrected in English cannot ship with a translation that still
   states the old number. */
const { execFileSync } = require("child_process");
try {
  const out = execFileSync("node", [`${__dirname}/check_rulebook_i18n.mjs`], { encoding: "utf8" });
  process.stdout.write(out.split("\n").filter((l) => /FAIL|passed|failed|^---/.test(l)).join("\n") + "\n");
  process.exit(0);
} catch (e) {
  process.stdout.write((e.stdout || "") + (e.stderr || ""));
  process.exit(1);
}
