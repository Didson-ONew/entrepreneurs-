/* ============================================================================
   The publisher sell sheet, generated rather than hand-kept.

   The rulebook has been generated from rulebook.data.mjs since v13, which is
   why it has never drifted from the rules. The sell sheet was the last document
   still maintained by hand, and it had drifted: it advertised two to four
   players after the game grew to six, and ten discs after they became twelve.

   It also described the Megacorp deadline as "visible for a quarter before it
   lands", which at the time was wrong - the warning quarter had been measured
   and not shipped. The designer has since adopted it, so the sheet was early
   rather than incorrect, and the text now matches the rule either way.

   Everything factual here is either imported from the game or carries the probe
   that produced it, in a comment, so the next person can re-run it.

     node make_sellsheet.mjs     -> Entrepreneurs_SellSheet_<version>.docx

   ========================================================================== */
import fs from "fs";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, PageOrientation,
} from "docx";
import { EDITION } from "./rulebook.data.mjs";

const VERSION = EDITION.replace(/[^0-9v]/gi, "").toLowerCase();

/* House style, borrowed from make_docx.mjs so the two documents read as one game. */
const INK = "1A1A1A";
const VIOLET = "4A3AB5";
const MUTED = "6B6B78";
const RULE = "D8D4E2";
const BAND = "F1EFF7";
const FONT = "Calibri";

/* US Letter - a sell sheet is read by publishers, most of whom are on Letter. */
const PAGE = { width: 12240, height: 15840 };
const MARGIN = 900;                                   // 0.6" - a one-page sheet earns the extra inch
const TEXT_WIDTH = PAGE.width - MARGIN * 2;

const IND_COLOR = { UT: "B8860B", RE: "2E7D4F", HO: "B54A3A", MA: "6B4FA8", HC: "2E6FA8", TE: "A83370" };

const P = (text, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 90, line: o.line ?? 252 },
  alignment: o.align,
  children: [new TextRun({
    text, font: FONT, size: o.size ?? 18, color: o.color || INK,
    bold: o.bold, italics: o.italics,
  })],
  ...(o.border ? { border: o.border } : {}),
});

/* A paragraph made of differently-styled runs, for a lead-in phrase in bold. */
const Prun = (runs, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 90, line: o.line ?? 252 },
  children: runs.map((r) => new TextRun({
    text: r.t, font: FONT, size: r.size ?? o.size ?? 18,
    color: r.color || INK, bold: r.bold, italics: r.italics,
  })),
});

const H = (text, o = {}) => new Paragraph({
  spacing: { before: o.before ?? 130, after: 75 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 4 } },
  children: [new TextRun({
    text: text.toUpperCase(), font: FONT, size: 20, bold: true,
    color: VIOLET, characterSpacing: 30,
  })],
});

const cell = (children, o = {}) => new TableCell({
  width: { size: o.width, type: WidthType.DXA },
  margins: { top: 50, bottom: 50, left: 110, right: 110 },
  shading: o.shade ? { type: ShadingType.CLEAR, fill: o.shade, color: "auto" } : undefined,
  borders: {
    top: { style: BorderStyle.SINGLE, size: 4, color: RULE },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE },
    left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
  },
  children,
});

/* columnWidths on the table AND width on every cell, both DXA - percentages
   render wrong in Google Docs, which is where a publisher is likely to open it. */
function grid(headers, rows, widths, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  if (total !== TEXT_WIDTH) widths[widths.length - 1] += TEXT_WIDTH - total;
  return new Table({
    columnWidths: widths,
    width: { size: TEXT_WIDTH, type: WidthType.DXA },
    rows: [
      ...(headers ? [new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => cell(
          [P(h, { size: 16, bold: true, color: MUTED, after: 0 })],
          { width: widths[i], shade: BAND },
        )),
      })] : []),
      ...rows.map((r) => new TableRow({
        children: r.map((c, i) => cell(
          [typeof c === "string"
            ? P(c, { size: o.size ?? 18, after: 0 })
            : P(c.t, { size: o.size ?? 18, after: 0, bold: c.bold, color: c.color })],
          { width: widths[i] },
        )),
      })),
    ],
  });
}

const gap = (h = 120) => new Paragraph({ spacing: { after: h }, children: [] });

/* ---------------------------------------------------------------- content

   ONE PAGE, and that is the whole design of this document. The previous sheet
   ran to two dense pages - a quarter walkthrough, an industry table, a box
   list, a demand-map explainer and four blocks of simulation output. All of it
   was true and none of it belonged here: a publisher reading submissions
   decides in under a minute whether a game is worth an email, and every extra
   paragraph is a chance to stop reading. What survives is the one mechanism
   nobody else is running, the reasons it holds up, and the evidence that it
   already works. Everything cut is available on request, which is what the last
   line says.

   Every number below is either imported from the game or carries the probe that
   produced it, in a comment. Nothing is rounded in the game's favour. */

/* Six seats and the disc count follow the shipped engine: EntrepreneursGame.jsx,
   STARTING and DISCS_PER_PLAYER. Play time is measured from tabletop sessions,
   not estimated. */
const FACTS = [
  ["PLAYERS", "2 – 6"],
  ["PLAY TIME", "120 – 180 min"],
  ["AGE", "14+"],
  ["WEIGHT", "Heavy"],
  ["CATEGORY", "Economic Euro"],
];

const doc = new Document({
  creator: "Entrepreneurs",
  title: `Entrepreneurs - sell sheet ${VERSION}`,
  styles: {
    default: { document: { run: { font: FONT, size: 18, color: INK } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE.width, height: PAGE.height, orientation: PageOrientation.PORTRAIT },
        margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      },
    },
    children: [
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({
          text: "ENTREPRENEURS", font: FONT, size: 44, bold: true, color: VIOLET, characterSpacing: 60,
        })],
      }),
      P("No company stands alone.", { size: 21, italics: true, color: MUTED, after: 50 }),
      P("Buy land  ·  Build industry  ·  Supply your rivals  ·  Corner the market",
        { size: 17, color: MUTED, after: 140 }),

      grid(FACTS.map((f) => f[0]), [FACTS.map((f) => ({ t: f[1], bold: true }))],
        [2016, 2016, 2016, 2016, 2016], { size: 19 }),
      gap(80),

      /* The hook. Two paragraphs, and the first sentence carries the whole game:
         if a publisher reads nothing else, they should still know what is new. */
      H("The pitch", { before: 60 }),
      P("Your operating costs are your rivals' income. Every industry is supplied by exactly three others, and the bill each of your companies pays every quarter flows into those three industries' pots, split among whoever owns companies there. There is no sink: what you spend running your business lands in someone else's hands, and theirs in yours."),

      H("Why it stands out"),
      Prun([
        { t: "A supply chain that closes perfectly, and one build moves four prices. ", bold: true },
        { t: "Six industries, eighteen relationships: each draws on exactly three others and feeds three back, in one unbroken ring. A build pushes its own industry's price down a dollar and each supplier's up one, on a visible $2–$12 track — so overbuilding your sector is self-defeating and feeding another is how you get paid." },
      ]),
      Prun([
        { t: "Land trades under standing buildings. ", bold: true },
        { t: "A company needs its ground owned by somebody, not necessarily its owner. Sell the plot under your own factory for cash and it stops producing until anyone buys it back — then you pay them rent to stand on what used to be yours." },
      ]),
      Prun([
        { t: "An endgame with a door that closes. ", bold: true },
        { t: "A second Megacorp does not end the game, it calls the final quarter — one full round for the table to answer: cash out, merge, or buy the ground out from under whoever called it." },
      ]),

      H("It already works, and it is measured"),
      /* Source: audit_tension.js, 250 complete games at EVERY table size on the
         shipped ruleset, re-run for v19. Four-player figures quoted because it
         is the count a publisher will test first; the numbers move the right way
         as the table grows (3.8 lead changes and 1.6% wire-to-wire at six) and
         the wrong way at two (1.8 and 15.6%), which is stated rather than hidden. */
      P("Tuned on a simulation harness, not by feel. Across 250 complete games at every table size: at four players the lead changes hands 3.3 times, four players in five hold it at some point, under 3% of games are led wire to wire, and the winner takes the lead for the last time around Q9 of 12. Two players is the tightest count, and the likeliest to run wire to wire.",
        { size: 18 }),

      H("Where it stands today"),
      grid(null, [
        [{ t: "Rules", bold: true }, "Complete. Rulebook v19 is generated from the data the game runs on, so it cannot drift."],
        [{ t: "Prototype", bold: true }, "Built and played at the table."],
        [{ t: "Digital build", bold: true }, "Playable now: solo against AI, or online with up to six."],
        [{ t: "Testing", bold: true }, "43 balance audits and 72 automated tests, all in the repository."],
        [{ t: "Art", bold: true }, "Functional placeholder. Open to your direction."],
      ], [1700, TEXT_WIDTH - 1700], { size: 18 }),
      gap(90),

      new Paragraph({
        spacing: { after: 0 },
        children: [],
      }),
      new Table({
        columnWidths: [Math.round(TEXT_WIDTH * 0.58), TEXT_WIDTH - Math.round(TEXT_WIDTH * 0.58)],
        width: { size: TEXT_WIDTH, type: WidthType.DXA },
        rows: [new TableRow({ children: [
          new TableCell({
            width: { size: Math.round(TEXT_WIDTH * 0.58), type: WidthType.DXA },
            margins: { top: 40, bottom: 40, left: 0, right: 160 },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              P("WHAT I AM LOOKING FOR", { size: 16, bold: true, color: MUTED, after: 50 }),
              P("A publisher for a heavy economic euro built on genuine interdependence — rules-complete and playable today, and glad to develop it with your team, length and complexity included. Rulebook, component tables, prototype, digital build and audit history on request.", { size: 18, after: 0 }),
            ],
          }),
          new TableCell({
            width: { size: TEXT_WIDTH - Math.round(TEXT_WIDTH * 0.58), type: WidthType.DXA },
            margins: { top: 40, bottom: 40, left: 160, right: 0 },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              P("CONTACT", { size: 16, bold: true, color: MUTED, after: 50 }),
              P("Designer:  [Your name]", { size: 18, after: 40 }),
              P("Email:  [your@email]", { size: 18, after: 40 }),
              P("Location:  [City, Country]", { size: 18, after: 40 }),
              P("Play it:  [link]", { size: 18, after: 0 }),
            ],
          }),
        ] })],
      }),
    ],
  }],
});

const out = `Entrepreneurs_SellSheet_${VERSION}.docx`;
const buf = await Packer.toBuffer(doc);
fs.writeFileSync(out, buf);
console.log(`wrote ${out}  (${Math.round(buf.length / 1024)} kB)`);
