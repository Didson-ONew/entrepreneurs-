/* ============================================================================
   Writes the two markdown rulebooks out of rulebook.data.js.

     RULEBOOK.md          everything, designer's notes included
     RULEBOOK_PLAYERS.md  exactly what the game shows players - no notes

   Usage:  node make_rulebook.mjs
   ========================================================================== */
import { writeFileSync } from "node:fs";
import { RULEBOOK, EDITION } from "./rulebook.data.mjs";

const esc = (s) => String(s).replace(/\|/g, "\\|");

function render(blocks, withNotes) {
  const out = [];
  for (const b of blocks) {
    if (b.h) out.push(`### ${b.h}`);
    else if (b.p) out.push(b.p);
    else if (b.ul) out.push(b.ul.map((li) => `- ${li}`).join("\n"));
    else if (b.table) {
      const { head, rows } = b.table;
      out.push([
        `| ${head.map(esc).join(" | ")} |`,
        `| ${head.map(() => "---").join(" | ")} |`,
        ...rows.map((r) => `| ${r.map(esc).join(" | ")} |`),
      ].join("\n"));
    } else if (b.note && withNotes) out.push(`> **Designer's note.** ${b.note}`);
  }
  return out.join("\n\n");
}

function document(withNotes) {
  const title = withNotes ? "Entrepreneurs - Rulebook" : "Entrepreneurs - How to play";
  const sub = withNotes
    ? `${EDITION}. The complete rules, with the designer's notes on why each one exists.`
    : `${EDITION}. Everything you need to play, and nothing you don't.`;
  const toc = RULEBOOK.map((s, i) => `${i + 1}. [${s.title}](#${s.id})`).join("\n");
  const body = RULEBOOK.map((s) =>
    `<a id="${s.id}"></a>\n\n## ${s.title}\n\n${render(s.blocks, withNotes)}`).join("\n\n---\n\n");
  return `# ${title}\n\n*${sub}*\n\n${toc}\n\n---\n\n${body}\n`;
}

writeFileSync("RULEBOOK.md", document(true));
writeFileSync("RULEBOOK_PLAYERS.md", document(false));
console.log("wrote RULEBOOK.md and RULEBOOK_PLAYERS.md");
