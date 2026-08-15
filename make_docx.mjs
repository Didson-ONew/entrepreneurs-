/* ============================================================================
   Writes the printed rulebook as a .docx, from the same rulebook.data.mjs that
   the in-game rulebook and both markdown editions read.

   That is the whole point: the printed book used to be a hand-written .docx and
   the authority over everything else, which meant the game could quietly drift
   away from it. Now there is one source and four outputs.

     node make_docx.mjs --table   -> ..._Tabletop.docx        the physical game
     node make_docx.mjs           -> Entrepreneurs_Rulebook_v13.docx      (the app)
     node make_docx.mjs --full    -> ..._Designers_Edition.docx           (+ notes)
     node make_docx.mjs --all     -> all three

   The tabletop edition is the same rules with every trace of the app taken out - no
   host, no bots, no waiting room, no "Playing online" chapter - because a rulebook
   that mentions things a physical table does not have is a rulebook people distrust.

   Needs the `docx` package, which is a build-time tool like esbuild - the game
   server itself still has no runtime dependencies.
   ========================================================================== */
import fs from "fs";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, LevelFormat,
  TableOfContents, Footer, PageNumber,
} from "docx";
import { EDITION, RULEBOOK, forEdition } from "./rulebook.data.mjs";

const args = process.argv.slice(2);
const all = args.includes("--all") || args.includes("--both");
const wantTable = args.includes("--table") || all;
const wantFull = args.includes("--full") || all;
const wantPlayers = all || (!args.includes("--full") && !args.includes("--table"));

const VERSION = EDITION.replace(/[^0-9v]/gi, "").toLowerCase();   // "Rulebook v13" -> "v13"

/* ---------- house style ----------
   The components are near-black with a violet cast and the industries carry fixed
   colours; the printed book stays black on white for legibility and cost, and
   borrows only the violet for headings so it reads as the same game. */
const INK = "1A1A1A";
const VIOLET = "4A3AB5";
const MUTED = "6B6B78";
const RULE = "D8D4E2";
const BAND = "F1EFF7";

const FONT = "Calibri";
const MONO = "Consolas";

/* A4, which is what the prototype is printed on. */
const PAGE = { width: 11906, height: 16838 };
const MARGIN = 1134;                          // 2cm
const TEXT_WIDTH = PAGE.width - MARGIN * 2;

const P = (text, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 120, line: 276 },
  alignment: opts.align,
  children: [new TextRun({
    text,
    font: opts.font || FONT,
    size: opts.size ?? 21,                    // half-points: 21 = 10.5pt
    color: opts.color || INK,
    bold: opts.bold,
    italics: opts.italics,
  })],
  ...(opts.border ? { border: opts.border } : {}),
});

const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 160 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 6 } },
  children: [new TextRun({ text, font: FONT, size: 30, bold: true, color: VIOLET })],
});

const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 100 },
  children: [new TextRun({ text, font: FONT, size: 23, bold: true, color: INK })],
});

/* Designer's notes only appear in the full edition, and are set apart so nobody
   mistakes commentary for a rule. */
const NOTE = (text) => new Paragraph({
  spacing: { before: 120, after: 160 },
  indent: { left: 240 },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: VIOLET, space: 10 } },
  children: [
    new TextRun({ text: "Designer's note   ", font: MONO, size: 16, bold: true, color: VIOLET }),
    new TextRun({ text, font: FONT, size: 19, italics: true, color: MUTED }),
  ],
});

const cell = (text, { header = false, width, bold = false } = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  shading: header ? { type: ShadingType.CLEAR, fill: BAND, color: "auto" } : undefined,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  children: [new Paragraph({
    spacing: { after: 0, line: 252 },
    children: [new TextRun({
      text: String(text),
      font: FONT,
      size: 19,
      bold: header || bold,
      color: header ? INK : INK,
    })],
  })],
});

function makeTable({ head, rows }) {
  const n = head.length;
  /* A table whose headings are all blank is a two-column reference list, not a
     table with a header - printing an empty shaded band above it just looks broken. */
  const headless = head.every((h) => !String(h).trim());
  /* First column carries the label and gets more room; the rest divide what is
     left. Column widths must add up to the table width or Word re-flows them. */
  const first = n <= 2 ? Math.round(TEXT_WIDTH * 0.38) : Math.round(TEXT_WIDTH * 0.28);
  const rest = Math.floor((TEXT_WIDTH - first) / (n - 1 || 1));
  const widths = n === 1 ? [TEXT_WIDTH] : [first, ...Array(n - 1).fill(rest)];
  widths[widths.length - 1] += TEXT_WIDTH - widths.reduce((a, b) => a + b, 0);

  return new Table({
    width: { size: TEXT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: RULE },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE },
      left:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right:  { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      insideVertical:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      ...(headless ? [] : [new TableRow({
        tableHeader: true,
        children: head.map((h, i) => cell(h, { header: true, width: widths[i] })),
      })]),
      ...rows.map((r) => new TableRow({
        children: r.map((c, i) => cell(c, { width: widths[i], bold: i === 0 && n > 2 })),
      })),
    ],
  });
}

const bullet = (text) => new Paragraph({
  numbering: { reference: "rule-bullets", level: 0 },
  spacing: { after: 60, line: 276 },
  children: [new TextRun({ text, font: FONT, size: 21, color: INK })],
});

function build({ withNotes, edition = "digital", label }) {
  const BOOK = forEdition(RULEBOOK, edition);
  const body = [];

  /* ---- title page ---- */
  body.push(new Paragraph({ spacing: { before: 2200, after: 0 }, children: [] }));
  body.push(new Paragraph({
    spacing: { after: 60 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "ENTREPRENEURS", font: FONT, size: 72, bold: true, color: INK })],
  }));
  body.push(new Paragraph({
    spacing: { after: 500 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: "Build the city. Read the market. Own the skyline.",
      font: FONT, size: 24, color: MUTED,
    })],
  }));
  body.push(new Paragraph({
    spacing: { after: 40 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: EDITION.toUpperCase(), font: MONO, size: 22, bold: true, color: VIOLET,
    })],
  }));
  body.push(new Paragraph({
    spacing: { after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: label,
      font: MONO, size: 17, color: MUTED,
    })],
  }));
  body.push(new Paragraph({ children: [new PageBreak()] }));

  /* ---- contents ---- */
  body.push(H1("Contents"));
  body.push(new TableOfContents("Contents", { hyperlinks: true, headingStyleRange: "1-1" }));
  body.push(new Paragraph({
    spacing: { before: 200 },
    children: [new TextRun({
      text: "Right-click the table above and choose Update Field to fill in the page numbers.",
      font: FONT, size: 17, italics: true, color: MUTED,
    })],
  }));
  body.push(new Paragraph({ children: [new PageBreak()] }));

  /* ---- the rules ---- */
  for (const section of BOOK) {
    body.push(H1(section.title));
    for (const block of section.blocks) {
      if (block.note) { if (withNotes) body.push(NOTE(block.note)); continue; }
      if (block.h) { body.push(H2(block.h)); continue; }
      if (block.p) { body.push(P(block.p)); continue; }
      if (block.ul) { block.ul.forEach((li) => body.push(bullet(li))); continue; }
      if (block.table) {
        body.push(makeTable(block.table));
        body.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
      }
    }
  }

  return new Document({
    creator: "Entrepreneurs",
    title: `Entrepreneurs - ${EDITION}`,
    description: label,
    numbering: {
      config: [{
        reference: "rule-bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 420, hanging: 220 } } },
        }],
      }],
    },
    styles: {
      default: {
        document: { run: { font: FONT, size: 21, color: INK } },
      },
    },
    sections: [{
      properties: {
        page: { size: PAGE, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              children: [`ENTREPRENEURS  ·  ${EDITION}  ·  `, PageNumber.CURRENT],
              font: MONO, size: 15, color: MUTED,
            })],
          })],
        }),
      },
      children: body,
    }],
  });
}

async function write(doc, file) {
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(file, buf);
  console.log(`wrote ${file}  (${Math.round(buf.length / 1024)} kB)`);
}

if (wantTable) {
  await write(build({ withNotes: false, edition: "table", label: "Tabletop edition" }),
    `Entrepreneurs_Rulebook_${VERSION}_Tabletop.docx`);
}
if (wantPlayers) {
  await write(build({ withNotes: false, edition: "digital", label: "Players' edition - the app" }),
    `Entrepreneurs_Rulebook_${VERSION}.docx`);
}
if (wantFull) {
  await write(build({ withNotes: true, edition: "digital", label: "Designer's edition - includes the notes" }),
    `Entrepreneurs_Rulebook_${VERSION}_Designers_Edition.docx`);
}
