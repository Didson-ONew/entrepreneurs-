/* The rulebook is generated from rulebook.data.mjs, and the game is run from
   EntrepreneursGame.jsx. Nothing stops the two drifting except checking, so the
   suite checks: check_rulebook.mjs compares every number the book states that
   the engine also knows, table cell by table cell.

   It is deliberately NOT part of `npm run build`. Render runs that on every
   deploy, and a regex over prose should never be able to take the site down. It
   IS part of `npm run rulebook`, because generating a book from drifted data is
   exactly the moment to stop. */
const { execFileSync } = require("child_process");
try {
  const out = execFileSync("node", [`${__dirname}/check_rulebook.mjs`], { encoding: "utf8" });
  process.stdout.write(out.split("\n").filter((l) => /FAIL|passed|failed/.test(l)).join("\n") + "\n");
  process.exit(0);
} catch (e) {
  process.stdout.write((e.stdout || "") + (e.stderr || ""));
  process.exit(1);
}
