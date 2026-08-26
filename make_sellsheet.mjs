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
const MARGIN = 1080;                                  // 0.75"
const TEXT_WIDTH = PAGE.width - MARGIN * 2;

const IND_COLOR = { UT: "B8860B", RE: "2E7D4F", HO: "B54A3A", MA: "6B4FA8", HC: "2E6FA8", TE: "A83370" };

const P = (text, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 100, line: o.line ?? 264 },
  alignment: o.align,
  children: [new TextRun({
    text, font: FONT, size: o.size ?? 19, color: o.color || INK,
    bold: o.bold, italics: o.italics,
  })],
  ...(o.border ? { border: o.border } : {}),
});

/* A paragraph made of differently-styled runs, for a lead-in phrase in bold. */
const Prun = (runs, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 100, line: o.line ?? 264 },
  children: runs.map((r) => new TextRun({
    text: r.t, font: FONT, size: r.size ?? o.size ?? 19,
    color: r.color || INK, bold: r.bold, italics: r.italics,
  })),
});

const H = (text, o = {}) => new Paragraph({
  spacing: { before: o.before ?? 220, after: 110 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 4 } },
  children: [new TextRun({
    text: text.toUpperCase(), font: FONT, size: 20, bold: true,
    color: VIOLET, characterSpacing: 30,
  })],
});

const cell = (children, o = {}) => new TableCell({
  width: { size: o.width, type: WidthType.DXA },
  margins: { top: 70, bottom: 70, left: 110, right: 110 },
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

/* ---------------------------------------------------------------- content */

/* Player count, discs and component counts all follow the shipped engine.
   Six seats and twelve discs: EntrepreneursGame.jsx, STARTING and
   DISCS_PER_PLAYER. */
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
    default: { document: { run: { font: FONT, size: 19, color: INK } } },
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
          text: "ENTREPRENEURS", font: FONT, size: 52, bold: true, color: VIOLET, characterSpacing: 60,
        })],
      }),
      P("No company stands alone.", { size: 24, italics: true, color: MUTED, after: 60 }),
      P("Buy land  ·  Build industry  ·  Supply your rivals  ·  Corner the market",
        { size: 18, color: MUTED, after: 180 }),

      grid(FACTS.map((f) => f[0]), [FACTS.map((f) => ({ t: f[1], bold: true }))],
        [2016, 2016, 2016, 2016, 2016], { size: 19 }),
      gap(160),

      H("The pitch", { before: 60 }),
      P("A city rises one business at a time — and no business stands alone. Every company you found is supplied by three others, and every dollar of operating cost you pay flows straight into those industries' pots, to be split among whoever owns them. Your rivals' costs are your income, and yours are theirs."),
      P("Build where everyone is building and your price sinks toward a dollar. Build what everyone depends on and nobody supplies, and its pot climbs quarter after quarter — untouched, because a pot is split only among companies in that industry, and there are none. Whoever builds there first collects all of it."),
      P("And you must buy the land before you can build on it. Sell that land later to raise cash and your own factory stops producing until somebody buys the ground back — which anybody may do, and then you are the tenant, paying them rent every quarter to stand on what used to be yours."),

      H("Why it stands out"),
      Prun([
        { t: "A supply chain that closes perfectly. ", bold: true },
        { t: "Six industries, eighteen supply relationships. Every industry draws on exactly three others and feeds exactly three in return — none over-connected, none stranded. Take each industry's largest supplier and you get a single unbroken ring through all six: Utilities to Hospitality to Manufacturing to Healthcare to Retail to Technology, and back to Utilities." },
      ]),
      Prun([
        { t: "Costs that become someone else's revenue. ", bold: true },
        { t: "Operating expense is never a sink. It pays rent to whoever owns your land, then fills the pots of your supplier industries. One new company pushes its own price down once and up to three others' prices up. Overbuilding your sector is self-defeating; feeding it is lucrative." },
      ]),
      Prun([
        { t: "Worker placement that punishes hesitation — and rewards it. ", bold: true },
        { t: "Tracks fill left to right and resolve right to left. Commit early and you gain an extra action for every player who lands after you, but all of them act first, and may take exactly what you were waiting for." },
      ]),
      Prun([
        { t: "Land that pays whether or not you build on it. ", bold: true },
        { t: "You buy a plot before you build, and plots appreciate as the neighbours fill in. But a company only needs its ground owned by SOMEBODY — not by its owner — so land changes hands under standing buildings, and $2 a level a quarter goes to whoever holds the deed. By six players half the plots a person owns carry somebody else's factory, and only a quarter of a company's ground belongs to the company." },
      ]),
      Prun([
        { t: "Twelve discs, one footprint. ", bold: true },
        { t: "Plots owned, companies run and loans outstanding all draw on the same twelve markers. Every loan you take shrinks how much city you can hold — credit line, capacity limit and endgame penalty in a single component." },
      ]),
      Prun([
        { t: "Megacorps in four tiers. ", bold: true },
        { t: "Sixteen merger tiles, four tiers of four, and two are drawn from every tier that is in play — four tiles at two players, six at three, eight from four upward. The hardest tiers only come out at a bigger table, and a headquarters earns its industry's price divided by its tier, so a cheap merger of three level-1 companies no longer pays what an Omnicorp pays." },
      ]),
      Prun([
        { t: "A marathon with a door that can close. ", bold: true },
        { t: "Three fiscal years, or less: forming a second Megacorp does not end the game, it CALLS the final quarter — everyone gets one more full round to answer it. Each headquarters permanently locks a company slot, so the ending is bought with capacity, announced before it lands, and never a certain win." },
      ]),

      H("Development status"),
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
              P(`Rules complete — full rulebook ${VERSION}`, { size: 18, after: 50 }),
              P("Physical prototype built and played", { size: 18, after: 50 }),
              P("Playable digital build, solo vs. AI and online", { size: 18, after: 50 }),
              P("Tuned against a simulation harness — 30+ audits in repo", { size: 18, after: 50 }),
              P("Art is functional placeholder — open to your direction", { size: 18, after: 0 }),
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
              P("Web / BGG:  [link]", { size: 18, after: 0 }),
            ],
          }),
        ] })],
      }),
      gap(120),
      P("Seeking a publisher for a heavy economic euro built on a genuine interdependence engine — rules-complete and digitally playable today, and glad to develop further with your team, including trimming length or complexity for a particular line. Rulebook, component tables, prototype, digital build and the full audit history are available on request.",
        { size: 18, italics: true, color: MUTED }),

      /* ---------------------------------------------------------- page 2 */
      new Paragraph({ pageBreakBefore: true, spacing: { after: 40 },
        children: [new TextRun({ text: "ENTREPRENEURS", font: FONT, size: 34, bold: true, color: VIOLET, characterSpacing: 40 })] }),
      P("Supplementary detail for publishers", { size: 19, italics: true, color: MUTED, after: 160 }),

      H("How a quarter plays", { before: 60 }),
      grid(null, [
        [{ t: "1. Planning", bold: true }, "Place two workers (three in a two-player game) across four action tracks."],
        [{ t: "2. Action", bold: true }, "Tracks resolve right to left: Raise Capital, M&A, R&D, Board Meeting."],
        [{ t: "3. Production", bold: true }, "Every company pays OPEX; rent to the landowner, the remainder into supplier pots."],
        [{ t: "4. Revenue", bold: true }, "Sell into the city's demand grid (B2C), then split each industry pot (B2B)."],
        [{ t: "5. Closing", bold: true }, "The lead player sites a new Logistic Hub. Years end with land awards and loan repayment."],
      ], [1900, TEXT_WIDTH - 1900]),
      gap(140),

      P("The three working tracks carry four slots at two, three or four players; a fifth player opens a fifth slot on each and a sixth player a sixth. Board Meeting stays at two seats at every count.",
        { size: 17, italics: true, color: MUTED }),

      H("The six industries"),
      grid(["Industry", "Scaling", "Price", "Signature ability"], [
        [{ t: "Utilities", bold: true, color: IND_COLOR.UT }, "Horizontal", "$2", "Reads demand across a block of districts as wide as its level. No hubs."],
        [{ t: "Retail", bold: true, color: IND_COLOR.RE }, "Vertical", "$2", "Sells into one extra district per level, owner's choice. No hubs."],
        [{ t: "Hospitality", bold: true, color: IND_COLOR.HO }, "Vertical", "$3", "One extra unit per adjacent business or hub, per level. Thrives in density."],
        [{ t: "Manufacturing", bold: true, color: IND_COLOR.MA }, "Horizontal", "$3", "The only industry that can fill another industry's demand row."],
        [{ t: "Healthcare", bold: true, color: IND_COLOR.HC }, "Vertical", "$4", "Uses the whole hub network natively, without touching a hub."],
        [{ t: "Technology", bold: true, color: IND_COLOR.TE }, "Horizontal", "$4", "Delivers 2 units per icon, paid for both — clears production on half the demand."],
      ], [2100, 1500, 900, TEXT_WIDTH - 4500], { size: 17 }),

      H("In the box"),
      P("1 city board · 20 district tiles · 60 Blueprint cards · 16 Megacorp tiles · 1 IPO tile · 6 portfolio boards · 3 auxiliary boards · 270 cubes · 12 hub discs · 72 player discs (12 each) · EP tokens · currency.",
        { size: 18, after: 60 }),
      P("Cube counts and auxiliary boards are what I would expect to negotiate first. The Blueprint deck is the component that sets the player ceiling: at six players 72% of the sixty cards are consumed by the end of Year 3, which is why six is the maximum rather than an arbitrary choice.",
        { size: 17, italics: true, color: MUTED }),

      H("The map does the balancing"),
      P("Every district shows four demand rows drawn from the six industries, one of which it wants twice — so each district has an appetite of its own. Where an industry can sell at all is deliberately uneven.", { size: 18 }),
      grid(["Industry", "Where its demand lives", "Price"], [
        ["Utilities · Retail", "Almost everywhere, including the cheap outer ring", "$2"],
        ["Hospitality · Manufacturing", "Spread across both suburbs and centre", "$3"],
        ["Healthcare · Technology", "City Centre, plus one suburb row each — both locked until Q5", "$4"],
      ], [3100, TEXT_WIDTH - 4000, 900], { size: 17 }),
      gap(120),
      P("For all of Year 1 the $4 industries can only sell in the centre, where land runs $4–$6 a plot against $1 at the rim. The premium is paid twice: in land, and in waiting.", { size: 18 }),

      H("Balance, measured"),
      /* Source: 250 complete games at EVERY table size (2-6), on the shipped
         ruleset, re-measured after rent moved to $2 and demand icons began
         absorbing their own column. Reproduce with audit_state_of_play.js.
         The bars are the mean across all five counts; the per-count spreads
         quoted underneath are the finding that matters. */
      P("Tuned against a simulation harness rather than by feel. Across 250 complete games at every table size from two to six, how often each industry appeared in the winner's portfolio, averaged over all five counts. Two standard errors is about ±6 points, so most of this list is one flat band — the point is that none of the six is dead.",
        { size: 18 }),
      grid(null, [
        ["Hospitality", "████████████████", "60%"],
        ["Retail", "██████████████", "55%"],
        ["Manufacturing", "██████████████", "53%"],
        ["Healthcare", "█████████████", "49%"],
        ["Utilities", "███████████", "42%"],
        ["Technology", "███████████", "42%"],
      ], [2600, TEXT_WIDTH - 3500, 900], { size: 17 }),
      gap(120),
      P("The spread narrows as the table fills. At six players the six industries sit inside 10 points of each other — entirely within the noise, so they are interchangeable. At two players they are 30 points apart, with Utilities and Technology measurably weaker: both are the industries that want a big board and other people's demand to sell into, and a two-player city has neither.",
        { size: 17, italics: true, color: MUTED }),

      H("What the harness says about table size"),
      P("The economy scales itself. Cash on the table grows almost exactly linearly with the player count — $195 at two seats to $525 at six — while cash per seat stays flat at $80–$98 and the mean industry price rises from $3 in Year 1 to $4 in Year 3 from three seats up. No rule needs to change with the number of players except the two extra track slots and which Megacorp tiers come out.",
        { size: 18 }),
      P("What binds first changes at five seats. Below that it is the twelve discs; at five and six it is the Blueprint deck, which is what sets the player ceiling at six — 72% of the sixty cards are consumed by the end of Year 3. The city itself is never the limit: at most 38% of plots are ever owned and at most 21% of the open demand slots ever filled. Two players play in a noticeably empty city, which is the one count where a smaller map would tighten the game.",
        { size: 18, after: 40 }),

      H("No runaway winners"),
      P("The player leading at the halfway mark goes on to win 65% of two-player games, 35% of four-player and 20% of six-player ones — against the 50%, 25% and 17% that chance alone would give. Holding a lead the whole way is rarer still: leading at both Q4 and Q8 and going on to win happens in 49% of two-player games but only 11% of six-player ones. An early lead is worth having and never close to decisive.",
        { size: 18, after: 40 }),

      P("Full figures: audit_state_of_play.js and audit_economy_size.js.", { size: 17, italics: true, color: MUTED }),
    ],
  }],
});

const out = `Entrepreneurs_SellSheet_${VERSION}.docx`;
const buf = await Packer.toBuffer(doc);
fs.writeFileSync(out, buf);
console.log(`wrote ${out}  (${Math.round(buf.length / 1024)} kB)`);
