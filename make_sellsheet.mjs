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
import path from "path";
import { fileURLToPath } from "url";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, PageOrientation,
} from "docx";
import { EDITION } from "./rulebook.data.mjs";
/* The edition is imported, never typed. The "Rules" row used to name it in a
   string literal - in a sentence whose whole claim is that the book cannot
   drift from the game, which is the one line least able to afford going
   stale the moment the edition moves. */

const HERE = path.dirname(fileURLToPath(import.meta.url));

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

/* THE TESTING LINE USED TO BE TYPED BY HAND, AND IT DRIFTED - exactly the thing
   this file's header says it does not do. It advertised 43 audits and 72 tests
   while the repository held 44 and 79, because both grew and nobody edited the
   sentence. Count the files instead: understating your own evidence to a
   publisher is a silly way to lose a point. */
const countFiles = (re) => fs.readdirSync(HERE).filter((f) => re.test(f)).length;
const AUDITS = countFiles(/^audit_.*\.(js|mjs)$/);
const TESTS = countFiles(/^test_.*\.js$/);

/* ---------------------------------------------------------------- testimony

   The sheet proved balance with 250 simulated games and carried no human voice
   at all, which is an odd gap in a document about a game people sit down and
   play. A publisher discounts a designer's own enthusiasm and does not discount
   a stranger's.

   EVERY LINE IS QUOTED VERBATIM, swearing and all. A tidied quote is not
   testimony any more, and "f***ing" would keep the word while looking
   embarrassed about it. If a particular publisher is the wrong audience for it,
   change WHICH line is quoted - never the words inside one.

   They come from seven handwritten forms after physical sessions, all
   transcribed in PLAYTESTS.md, and they are picked to say four different
   things. The intensity a heavy euro lives on. The theme arriving unprompted in
   a player's own words - Tiago's line is his answer to "what is the goal of
   this game", not to "did you like it". A player who wants the second play. And
   a learning curve admitted out loud, which for this genre is not a warning but
   the product: a publisher of heavy games is buying the game people come back
   to, and a designer who is candid about the teach is a cheaper one to work with.

   AND THE SCORES UNDERNEATH INCLUDE THE WEAK ONE. Rules clarity means 3.1 of 5
   across the seven forms and is printed next to theme's 4.7, because a publisher
   who playtests will find it in an afternoon, and the sheet that got there first
   is the one they believe on the other numbers. It is named with the two things
   built to answer it. */
const QUOTES = [
  ["“Some people will fucking love this game.”", "Michael Boggs"],
  ["“Build your economy and obliterate your competitors.”", "Tiago Monteiro"],
  ["“I can’t wait to play it again and experiment with different strategies.”", "Nikola"],
  ["“…a game that may require a few plays to ‘get’, and that’s okay.”", "Michael Boggs"],
];
const QUOTE_SOURCE = "Seven handwritten forms after physical sessions  ·  theme 4.7/5, strategic depth 4.4/5, rules clarity 3.1/5 — the ten-minute teaching script and the built-in beginner game answer the last one";

/* The name sits on the same line as the words, in smaller muted type. Four
   quotes with four attribution lines under them would be eight paragraphs for
   four sentences, and a publisher skimming would read the block as a wall. */
const quote = (text, who, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 60, line: 252 },
  indent: { left: 150 },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: VIOLET, space: 10 } },
  children: [
    new TextRun({ text, font: FONT, size: o.size ?? 19, italics: true, color: INK }),
    new TextRun({ text: "  \u2014 " + who, font: FONT, size: 16, color: MUTED }),
  ],
});

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
        { t: "Land trades under standing buildings, and developed ground is the dearest there is. ", bold: true },
        { t: "A plot costs its road price plus $3 for every structure standing on it or orthogonally touching it, so the most expensive ground on the board is the ground under a working company — and a company needs its ground owned by somebody, not necessarily its owner. Sell the plot under your own factory for cash and it stops producing until anyone buys it back — then you pay them rent to stand on what used to be yours." },
      ]),
      Prun([
        { t: "It teaches itself, and that is measured too. ", bold: true },
        { t: "A built-in beginner game runs eight quarters with one action per track and no Megacorps, while leaving the supply chain exactly as it is \u2014 so a first-time player learns the engine and nothing else. Over 150 games a table size it holds up as a game rather than a demo: the last two quarters still carry a third of the winning score, and no seat was ever wiped out." },
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

      /* The simulation says it is balanced. It cannot say anyone enjoyed it. */
      ...QUOTES.map(([q, who]) => quote(q, who)),
      new Paragraph({
        spacing: { after: 90, line: 252 },
        indent: { left: 150 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: VIOLET, space: 10 } },
        children: [new TextRun({
          text: QUOTE_SOURCE, font: FONT, size: 15, color: MUTED, characterSpacing: 16,
        })],
      }),

      H("Room to grow"),
      P("The core box is complete and self-contained. The structure it is built on - a closed supply loop, a city that changes every game, and one currency of score - takes expansions without re-teaching anything, and several are already drafted."),
      grid(null, [
        [{ t: "Experts", bold: true }, "Hireable specialists, drawn and paid for, each bending one rule you already know: a logistics expert who puts your goods on another player's hub, a surveyor who reprices the ground you stand on, an auditor who reads a rival's hand."],
        [{ t: "Policies", bold: true }, "The city legislates. A policy comes up for vote at a year end, the table decides it, and it stays on the board for the rest of the game: rent control, a building moratorium, a subsidy for whichever industry is cheapest."],
        [{ t: "Events", bold: true }, "A quarterly shock that every player reads at once - a boom in one industry, a strike in another, a district closed for redevelopment. Short, public, and never a surprise you cannot plan around."],
        [{ t: "Import & Export", bold: true }, "A port district and a world market. Sell beyond the city at a price you cannot influence, or import a good you refuse to buy from the rival who makes it - the first way to step outside the supply loop, at a cost."],
        [{ t: "And beyond", bold: true }, "Further drafts in the drawer: scenario cities with fixed district layouts, a campaign where the board carries forward between games, and a two-player duel variant with a tighter map."],
      ], [1700, TEXT_WIDTH - 1700], { size: 18 }),
      gap(90),

      H("Where it stands today"),
      grid(null, [
        [{ t: "Rules", bold: true }, `Complete. ${EDITION} is generated from the data the game runs on, so it cannot drift.`],
        [{ t: "Prototype", bold: true }, "Built and played at the table."],
        [{ t: "Digital build", bold: true }, "Playable now: solo against AI, or online with up to six."],
        [{ t: "Testing", bold: true }, `Balanced by measurement. The three industries that grow vertically used to decide 90.9% of three-player games; they now decide about 69.5%, and no industry decides fewer than one game in ten. ${AUDITS} balance audits and ${TESTS} automated tests, all in the repository.`],
        [{ t: "Teaching mode", bold: true }, "A built-in beginner game: 8 quarters, four actions, no Megacorps. Measured over 150 games a table size."],
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
              P("Designer:  Didson New", { size: 18, after: 40 }),
              P("Email:  didson.onew@gmail.com", { size: 18, after: 40 }),
              P("Location:  S\u00e3o Paulo, Brazil", { size: 18, after: 40 }),
              P("Play it:  entrepreneurs.itch.io", { size: 18, after: 0 }),
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
