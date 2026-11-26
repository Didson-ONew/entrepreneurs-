#!/usr/bin/env node
/* ============================================================================
   PRINT-AND-PLAY COMPONENTS, generated from the engine.

   Every number on every component - a card's setup, a tile's demand rows, a band's
   threshold, a Megacorp tile's tier, the road prices, the buy-back rates - is read
   out of EntrepreneursGame.jsx when this runs, the same way check_rulebook.mjs reads
   the book's figures. A rule cannot change in the engine and stay on the table.

   WHAT A COMPONENT IS FOR, under the v23 rules. The quarter has three phases and the
   revenue step asks nobody anything: a company counts the demand icons it reaches,
   reads its band and multiplies the price. So the pieces are designed around that
   one reading:

     the Blueprint card    carries ITS OWN band row - the two thresholds and the three
                           multipliers for its level - and the whole ladder below it,
                           so a player never leaves the card to know what it pays
     the district tile     carries its demand grid in the middle of the district, so
                           the icons a company counts are the ones around it
     the market board      puts each industry's band ladder beside its price marker:
                           price x band, read in one line
     the player board      lists the Closing as a checklist, because nobody is handed
                           the board any more
     the road-price mat    is fixed by position since every game fills all sixteen
                           districts, so it is printed once

   Greyscale-safe: every industry has a colour AND a glyph AND its two-letter code on
   every component, so the whole game plays in black and white. The palette is the
   engine's, which audit_palette.js checks against the three dichromacies.

   Usage
     node make_components.mjs                  writes Entrepreneurs_Components_<edition>.html
     node make_components.mjs --pdf            ...and renders the PDF with Chromium
     node make_components.mjs --fonts=<dir>    embed f1..f4.ttf from <dir> (Bricolage
                                               Grotesque 500/800, IBM Plex Mono 400/600);
                                               otherwise a system font stack is used
   ========================================================================== */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EDITION } from "./rulebook.data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const WANT_PDF = ARGS.includes("--pdf");
const fontsArg = ARGS.find((a) => a.startsWith("--fonts="));
const VERSION = (EDITION.match(/v\d+/) || ["v?"])[0];
const OUT_HTML = path.join(here, `Entrepreneurs_Components_${VERSION}.html`);
const OUT_PDF = path.join(here, `Entrepreneurs_Components_${VERSION}.pdf`);

/* ------------------------------------------------------------------ the engine */
const src = readFileSync(path.join(here, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
if (cut < 0) { console.error("engine shape changed - the REACT UI marker is gone"); process.exit(2); }
const box = {};
const sandbox = { box, console, Math, Set, Map, Object, Array, JSON, String, Number };
createContext(sandbox);
runInContext(src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "") + `
  box.E = { BP_DATA, INDUSTRIES, IND_COLOR, IND_NAME, BASE_PRICE, SCALING, BAND_TABLE, BAND_LABEL,
    TILES, SUBURB_POOL, CENTER_POOL, DEMAND_ROWS, COORDS, districtFamily, PERSONAS, MEGACORP_TILES,
    MEGACORP_TIER, MEGACORP_TIER_MIN_PLAYERS, STARTING, PLAYER_COLORS, LOAN_REPAY_RATE, landAwardFor,
    LAND_AWARD_BASE, CASH_PER_EP, INDUSTRY_DEBUT_EP, DISCS_PER_PLAYER, COMPANY_SLOTS, RENT_PER_LEVEL,
    PRICE_MIN, PRICE_MAX, BP_SELL_PRICE, MEGACORPS_TO_END, MEGACORP_TITHE_EP, STANDARD_QUARTERS,
    LONG_GAME_QUARTERS, workingTrackSlots, levelEP, buildBoard, mulberry32, latticeKeyForCell, LOCAL5 };`, sandbox);
const E = box.E;
const LEVEL_EP = E.levelEP({});
/* The road prices: every game fills all sixteen districts, so the lattice a board
   computes is the same board after board. One build gives the printed numbers. */
const LATTICE = E.buildBoard(E.mulberry32(1)).priceLattice;

/* ------------------------------------------------------------------ helpers */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const GLYPH_PATH = {
  UT: "M6 1 L11 11 L1 11 Z",                                    // triangle
  RE: "M2 2 H10 V10 H2 Z",                                       // square
  HO: "M6 1.4 A4.6 4.6 0 1 1 5.99 1.4 Z",                        // circle
  MA: "M6 1 L10.3 3.5 L10.3 8.5 L6 11 L1.7 8.5 L1.7 3.5 Z",      // hexagon
  HC: "M4.5 1 H7.5 V4.5 H11 V7.5 H7.5 V11 H4.5 V7.5 H1 V4.5 H4.5 Z", // cross
  TE: "M6 1 L11 6 L6 11 L1 6 Z",                                 // diamond
};
const glyph = (ind, size = 4, fill = "#fff") =>
  `<svg class="g" viewBox="0 0 12 12" style="width:${size}mm;height:${size}mm" aria-label="${ind}"><path d="${GLYPH_PATH[ind]}" fill="${fill}"/></svg>`;
const chip = (ind, size = "m") =>
  `<span class="chip chip-${size}" style="background:${E.IND_COLOR[ind]}">${glyph(ind, size === "s" ? 2.6 : size === "l" ? 4.4 : 3.2)}<b>${ind}</b></span>`;
const icon = (ind, size = 4.4) =>
  `<span class="icon" style="background:${E.IND_COLOR[ind]};width:${size}mm;height:${size}mm">${glyph(ind, size * 0.62)}</span>`;
const scal = (ind) => (E.SCALING[ind] === "H" ? "&#8596; horizontal" : "&#8597; vertical");
const scalShort = (ind) => (E.SCALING[ind] === "H" ? "&#8596;" : "&#8597;");
const money = (n) => `$${n}`;
const FAMILY = { R: "Residential", C: "Commercial", A: "Academic", I: "Industrial", FC: "Financial Centre", IA: "Industrial Area", CC: "City Centre", LM: "Landmark" };
const FAMILY_TINT = { R: "#fbeee6", C: "#e9f0fb", A: "#e9f7ec", I: "#efefef", FC: "#fff4d6", IA: "#fff4d6", CC: "#fff4d6", LM: "#fff4d6" };
/* who pays into an industry's pot: every industry whose cards list it as a supplier */
const buyersOf = (ind) => E.INDUSTRIES.filter((i) => i !== ind && E.BP_DATA.some((bp) => bp.ind === i && bp.deps.some((d) => d.ind === ind)));
const suppliersOf = (ind) => E.INDUSTRIES.filter((i) => i !== ind && E.BP_DATA.some((bp) => bp.ind === ind && bp.deps.some((d) => d.ind === i)));
const bandRow = (ind, lvl) => E.BAND_TABLE[ind][Math.min(4, lvl)];
const combo = (c) => Object.entries(c).map(([lvl, n]) => `${n} &times; L${lvl}`).join(" + ");
const comboBlocks = (c) => Object.entries(c).flatMap(([lvl, n]) => Array.from({ length: n }, () => `<span class="lvlblk">L${lvl}</span>`)).join("");
const YEAR_ENDS = []; for (let q = 4; q <= E.LONG_GAME_QUARTERS; q += 4) YEAR_ENDS.push(q);
const award = (n) => E.landAwardFor(n).sole;

/* ------------------------------------------------------------------ fonts */
let fontCss = "";
if (fontsArg) {
  const dir = fontsArg.slice(8);
  const faces = [["f1.ttf", "Bricolage Grotesque", 500], ["f2.ttf", "Bricolage Grotesque", 800], ["f3.ttf", "IBM Plex Mono", 400], ["f4.ttf", "IBM Plex Mono", 600]];
  for (const [file, family, weight] of faces) {
    const p = path.join(dir, file);
    if (!existsSync(p)) { console.error(`font not found: ${p}`); process.exit(2); }
    const b64 = readFileSync(p).toString("base64");
    fontCss += `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/ttf;base64,${b64}) format("truetype");}\n`;
  }
}

/* ------------------------------------------------------------------ pages */
const pages = [];
const page = (title, body, cls = "") => pages.push({ title, body, cls });

/* ---- cover ---- */
page("Cover", `
  <div class="cover">
    <div class="cover-kicker">PRINT &amp; PLAY &middot; ${esc(EDITION)}</div>
    <h1>ENTREPRENEURS</h1>
    <p class="cover-sub">Buy land &middot; build industry &middot; supply your rivals &middot; corner the market</p>
    <p class="cover-lead">Every number on these sheets is read out of the game's rules engine when the file is
      generated, so the table plays exactly the edition in the rulebook. Under ${esc(EDITION)} a company is paid by the
      <b>band of demand it reaches</b>: count the icons, read the band on the card, multiply the price. The components
      are built around that one reading.</p>
    <div class="cover-cols">
      <div>
        <h3>What is in the file</h3>
        <ol class="toc" id="toc"></ol>
      </div>
      <div>
        <h3>How to print</h3>
        <ul>
          <li><b>A4, 100% scale, no fit-to-page.</b> On US Letter print at 94%. Everything sits inside a 10 mm margin.</li>
          <li>Cards and tiles on 200&ndash;250 gsm card; boards and aids on plain paper or 120 gsm.</li>
          <li>Cut on the printed outlines. Nothing bleeds, nothing needs a die.</li>
          <li>Colour is a convenience, not a requirement: each industry also carries its glyph and its two-letter code, so a greyscale print plays the same game.</li>
        </ul>
        <h3>How many copies</h3>
        <table class="t">
          <tr><td>Design system, setup, market, action board</td><td>1 each</td></tr>
          <tr><td>District tiles (${E.SUBURB_POOL.length + E.CENTER_POOL.length})</td><td>1 set</td></tr>
          <tr><td>Blueprint cards (${E.BP_DATA.length}), personas, Megacorp tiles</td><td>1 set</td></tr>
          <tr><td>Player boards</td><td>1 sheet per 2 players</td></tr>
          <tr><td>Player aid &amp; band reference</td><td>1 per player</td></tr>
          <tr><td>Money</td><td>see the money page</td></tr>
          <tr><td>Tokens</td><td>1 set (fallback for 3D-printed pieces)</td></tr>
        </table>
      </div>
    </div>
  </div>`);

/* ---- design system ---- */
{
  const rows = E.INDUSTRIES.map((ind) => `
    <tr>
      <td><span class="sw" style="background:${E.IND_COLOR[ind]}">${glyph(ind, 5)}</span></td>
      <td><b>${ind}</b><br>${E.IND_NAME[ind]}</td>
      <td class="num">${money(E.BASE_PRICE[ind])}</td>
      <td>${scal(ind)}</td>
      <td>${suppliersOf(ind).map((i) => chip(i, "s")).join(" ")}</td>
      <td>${buyersOf(ind).map((i) => chip(i, "s")).join(" ")}</td>
      <td class="ladder">${[1, 2, 3, 4].map((l) => { const r = bandRow(ind, l); return `<span>L${l} &ge;${r.a} / &ge;${r.b} &rarr; &times;${r.m.join(" &times;")}</span>`; }).join("")}</td>
    </tr>`).join("");
  page("Design system", `
    <h2>The design system</h2>
    <p class="lead">Six industries, each carrying three signals at once - a colour, a glyph and a two-letter code - on every component where it appears.
      The colours are the engine's own set, checked in CIE Lab against the three dichromacies; the glyph and the code are what carry the game in greyscale.</p>
    <table class="t ds">
      <tr><th></th><th>Industry</th><th>Base price</th><th>Grows</th><th>Pays its bill to</th><th>Its pot is paid by</th><th>Band ladder: $$ from / $$$ from &rarr; price &times; ($ / $$ / $$$)</th></tr>
      ${rows}
    </table>
    <div class="ds-row">
      <div>
        <h3>Greyscale proof</h3>
        <div class="grey">${E.INDUSTRIES.map((i) => chip(i, "l")).join(" ")}</div>
        <p class="small">The same six chips with the colour removed. A player reads the glyph and the code; the hue is a bonus.</p>
      </div>
      <div>
        <h3>Player colours</h3>
        <div>${E.PLAYER_COLORS.map((c, i) => `<span class="pc" style="background:${c}">${i + 1}</span>`).join(" ")}</div>
        <p class="small">A disc shows <b>who</b>; a block shows <b>what</b>. The two sets never share a hue.</p>
      </div>
    </div>
    <h3>Reading the board</h3>
    <table class="t">
      <tr><td><b>Disc under a block</b></td><td>who owns the land - the landlord, paid ${money(E.RENT_PER_LEVEL)} a level a quarter by whatever stands there</td></tr>
      <tr><td><b>Block</b></td><td>a company; its height is its level. A horizontal company puts one block on each plot it covers, a vertical one stacks them</td></tr>
      <tr><td><b>Disc on top of a block</b></td><td>who owns the business - not always the landlord</td></tr>
      <tr><td><b>Branch token</b></td><td>a Retail shopfront on somebody's plot: the chain counts that district's icons, the landlord collects ${money(E.RENT_PER_LEVEL)}</td></tr>
      <tr><td><b>Hub token</b></td><td>a Logistic Hub; the plot is filled for good and its district joins the network</td></tr>
      <tr><td><b>HQ marker</b></td><td>a Megacorp headquarters: it has stopped trading, banks its industry's price &divide; its tile's tier each quarter, and counts as a hub</td></tr>
      <tr><td><b>$ &middot; $$ &middot; $$$</b></td><td>the three revenue bands. A company is paid the current price of its industry &times; the multiplier of the band its icon count falls in</td></tr>
    </table>`);
}

/* ---- setup and the road-price mat ---- */
{
  const seats = Object.keys(E.STARTING).map(Number).sort((a, b) => b - a);
  const seatRows = seats.map((n) => `<tr><td class="num"><b>${n}</b></td>${Array.from({ length: 6 }, (_, i) => `<td class="num">${E.STARTING[n][i] ? `$${E.STARTING[n][i][0]} / ${E.STARTING[n][i][1]}` : "&mdash;"}</td>`).join("")}</tr>`).join("");
  /* the mat: 4x4 districts, road points on a 9x9 lattice */
  const D = 27, M = 9, W = 4 * D + 2 * M;
  let svg = `<svg viewBox="0 0 ${W} ${W}" style="width:${W}mm;height:${W}mm" class="mat">`;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const centre = r >= 1 && r <= 2 && c >= 1 && c <= 2;
    svg += `<rect x="${M + c * D}" y="${M + r * D}" width="${D}" height="${D}" fill="${centre ? "#fff4d6" : "#f6f6f6"}" stroke="#999" stroke-width="0.4"/>`;
    svg += `<text x="${M + c * D + D / 2}" y="${M + r * D + D / 2 + 1.2}" text-anchor="middle" font-size="3.4" fill="#bbb">${centre ? "centre" : "suburb"}</text>`;
    /* the four compass slots are not fixed - they are on the tile - so only the frame is drawn */
  }
  for (let r = 0; r <= 8; r++) for (let c = 0; c <= 8; c++) {
    const v = LATTICE[`${r},${c}`];
    if (v === undefined) continue;
    const x = M + (c / 2) * D, y = M + (r / 2) * D;
    const corner = r % 2 === 0 && c % 2 === 0;
    svg += `<circle cx="${x}" cy="${y}" r="${corner ? 3.2 : 2.6}" fill="${corner ? "#222" : "#555"}"/>`;
    svg += `<text x="${x}" y="${y + 1.3}" text-anchor="middle" font-size="${corner ? 3.8 : 3.2}" font-weight="700" fill="#fff">${v}</text>`;
  }
  svg += `</svg>`;
  page("Setup & road prices", `
    <h2>Setup</h2>
    <div class="two">
      <div>
        <h3>Seats: cash / Blueprints</h3>
        <table class="t"><tr><th>Players</th>${[1, 2, 3, 4, 5, 6].map((s) => `<th>Seat ${s}</th>`).join("")}</tr>${seatRows}</table>
        <p class="small">Seats are drawn at random. Blueprints are drafted in <b>reverse seat order</b> - the last seat picks first - from the face-up top cards of the six industry decks, which are shuffled whole.</p>
        <h3>On the table</h3>
        <ul class="small">
          <li>The four centre tiles shuffled into the middle 2&times;2; twelve of the ${E.SUBURB_POOL.length} suburb tiles drawn for the ring around them.</li>
          <li>Price markers on the base prices. Every pot empty.</li>
          <li>${E.DISCS_PER_PLAYER} discs and 2 workers each (3 each at two players); one persona each, face up.</li>
          <li>Megacorp tiles: two from each tier in play - tiers 4 and 3 always, tier 2 from ${E.MEGACORP_TIER_MIN_PLAYERS[2]} players, tier 1 from ${E.MEGACORP_TIER_MIN_PLAYERS[1]}; three per tier at five players, all sixteen at six.</li>
          <li>Working tracks: ${E.workingTrackSlots(4)} slots each at two to four players, ${E.workingTrackSlots(5)} at five, ${E.workingTrackSlots(6)} at six. Board Meeting: 2 seats, the second sealed until the IPO tile is claimed.</li>
          <li>The game is ${E.STANDARD_QUARTERS} quarters: two years. The three-year variant plays ${E.LONG_GAME_QUARTERS}.</li>
        </ul>
      </div>
      <div>
        <h3>The draft, then the first quarter</h3>
        <ul class="small">
          <li>Last seat picks first, one face-up top card at a time, until every seat has its count.</li>
          <li>Planning starts with the first seat. Two workers each, three at two players.</li>
          <li>Every company is paid at the Closing of the quarter it is built in - there is no waiting for a delivery.</li>
        </ul>
      </div>
    </div>
    <h3>Road prices</h3>
    <div class="matrow">
      ${svg}
      <div>
        <p class="small">A plot's road price is the number on the road point it touches: a <b>corner plot</b> (NW, NE, SW, SE) reads its district's corner, an <b>edge plot</b> (N, E, S, W) reads the middle of that edge.
          The price is fixed by position, so the mat is printed once; lay the sixteen tiles on it, or beside it.</p>
        <p class="small">A plot <b>costs its road price + ${money(3)} for every structure standing on it or orthogonally touching it</b>, and sells for the same. The centre is dear because the four centre districts meet there.</p>
        <p class="small">Prices run 1 on the outer edge to 6 in the dead centre, with 3s and 5s on the middles of the roads between districts.</p>
      </div>
    </div>`);
}

/* ---- district tiles ---- */
function tile(name) {
  const fam = E.districtFamily(name);
  const rows = E.DEMAND_ROWS[fam];
  const positions = new Set(E.TILES[name]);
  const cells = [];
  const POS = [["NW", 0, 0], ["N", 1, 0], ["NE", 2, 0], ["W", 0, 1], ["C", 1, 1], ["E", 2, 1], ["SW", 0, 2], ["S", 1, 2], ["SE", 2, 2]];
  for (const [pos, x, y] of POS) {
    if (pos === "C") {
      cells.push(`<div class="cell centre" style="grid-column:${x + 1};grid-row:${y + 1}">
        <div class="tname">${name}</div>
        <div class="tfam">${FAMILY[fam]}</div>
        <div class="dgrid">
          <div class="dhead"><span></span>${[1, 2, 3, 4].map((n) => `<span>${n}</span>`).join("")}</div>
          ${rows.map((ind) => `<div class="drow">${chip(ind, "s")}${[1, 2, 3, 4].map(() => icon(ind, 4.2)).join("")}</div>`).join("")}
        </div>
      </div>`);
    } else if (positions.has(pos)) {
      cells.push(`<div class="cell plot" style="grid-column:${x + 1};grid-row:${y + 1}"><span class="pos">${pos}</span></div>`);
    } else {
      cells.push(`<div class="cell noplot" style="grid-column:${x + 1};grid-row:${y + 1}"></div>`);
    }
  }
  return `<div class="tile" style="background:${FAMILY_TINT[fam]}">${cells.join("")}</div>`;
}
{
  const names = [...E.CENTER_POOL, ...E.SUBURB_POOL];
  for (let i = 0; i < names.length; i += 6) {
    page(`District tiles ${i / 6 + 1}`, `<div class="tiles">${names.slice(i, i + 6).map(tile).join("")}</div>
      <p class="small centred">Each tile is one district: four plots at their compass positions, the name and the demand grid in the middle. Rows 1 and 4 are always the same industry. All four rows are open from the first quarter; the columns are the company levels that count them.</p>`);
  }
}

/* ---- Blueprint cards ---- */
function card(bp) {
  const ind = bp.ind, col = E.IND_COLOR[ind];
  const r = bandRow(ind, bp.lvl);
  const rent = E.RENT_PER_LEVEL * bp.lvl, bill = bp.opex - rent;
  const ladder = [1, 2, 3, 4].map((l) => { const b = bandRow(ind, l); return `<div class="lrow ${l === bp.lvl ? "me" : ""}"><span>L${l}</span><span>&ge;${b.a}</span><span>&ge;${b.b}</span><span>&times;${b.m[0]} &middot; &times;${b.m[1]} &middot; &times;${b.m[2]}</span></div>`; }).join("");
  return `<div class="card" data-code="${bp.code}">
    <div class="chead" style="background:${col}">
      <span class="cind">${glyph(ind, 5)}<b>${ind}</b><i>${E.IND_NAME[ind]}</i></span>
      <span class="clvl">L${bp.lvl}<small>${scalShort(ind)}</small></span>
    </div>
    <div class="cname">${esc(bp.name)}</div>
    <div class="cstats">
      <div><small>SETUP</small><b>${money(bp.setup)}</b><em>build or upgrade</em></div>
      <div><small>OPEX / qtr</small><b>${money(bp.opex)}</b><em>rent ${money(rent)} &middot; bill ${money(bill)}</em></div>
      <div><small>SIZE</small><b>${bp.prod}</b><em>top band &asymp; icons</em></div>
    </div>
    <div class="cband" style="border-color:${col}">
      <div class="cbt"><span>PAID BY BAND</span><span>count the ${ind} icons you reach</span></div>
      <div class="cbrow">
        <div><small>$</small><b>&times;${r.m[0]}</b><em>${r.a === 1 ? "no icon" : `under ${r.a}`}</em></div>
        <div><small>$$</small><b>&times;${r.m[1]}</b><em>${r.b - r.a === 1 ? `${r.a} icon${r.a > 1 ? "s" : ""}` : `${r.a}&ndash;${r.b - 1} icons`}</em></div>
        <div><small>$$$</small><b>&times;${r.m[2]}</b><em>${r.b}+ icons</em></div>
      </div>
      <div class="cbx">&times; the current ${E.IND_NAME[ind]} price</div>
    </div>
    <div class="chint">Count the ${ind} icons in columns 1&ndash;${bp.lvl} of every district you reach${bp.lvl < 4 ? "; each upgrade adds a column" : ""}. Rows 1 and 4 of a district are the same industry.</div>
    <div class="cladder">${ladder}</div>
    <div class="csup"><small>BILL PAID TO</small>${bp.deps.map((d) => `<span class="dep">${chip(d.ind, "s")}<b>${d.val}</b></span>`).join("")}<em>built: ${ind} &minus;$1, each supplier +$1</em></div>
    <div class="cfoot"><span>+${LEVEL_EP * bp.lvl} EP built &middot; +${E.INDUSTRY_DEBUT_EP} first in ${ind}</span><span>sell ${money(E.BP_SELL_PRICE[bp.lvl])}</span><span class="code">${bp.code}</span></div>
  </div>`;
}
for (let i = 0; i < E.BP_DATA.length; i += 9) {
  page(`Blueprints ${i / 9 + 1}`, `<div class="cards">${E.BP_DATA.slice(i, i + 9).map(card).join("")}</div>`);
}

/* ---- personas, the IPO tile, two reminder cards ---- */
{
  const personas = Object.values(E.PERSONAS).map((p) => `<div class="card persona">
    <div class="chead" style="background:${E.IND_COLOR[p.ind]}"><span class="cind">${glyph(p.ind, 5)}<b>${p.ind}</b><i>persona</i></span></div>
    <div class="cname">${esc(p.name)}</div>
    <div class="ptext">${esc(p.blurb)}</div>
    <div class="cfoot"><span>one each &middot; public from the start</span></div>
  </div>`).join("");
  const ipo = `<div class="card ipo">
    <div class="chead dark"><span class="cind"><b>IPO</b><i>tile</i></span></div>
    <div class="cname">The first Megacorp</div>
    <div class="ptext">Claimed by the first player to go public. A <b>sixth company bay</b> for the rest of the game, and the second Board Meeting seat opens for everybody. No EP.</div>
  </div>`;
  const first = `<div class="card ipo">
    <div class="chead dark"><span class="cind"><b>1st</b><i>turn order</i></span></div>
    <div class="cname">First player</div>
    <div class="ptext">Places the first worker each Planning, chooses where the Logistic Hub goes each Closing. REPOSITION at the Board Meeting takes this card.</div>
  </div>`;
  const yearEnd = `<div class="card ipo">
    <div class="chead dark"><span class="cind"><b>Q4 &middot; Q8</b><i>year end</i></span></div>
    <div class="cname">At the end of a year</div>
    <div class="ptext"><b>Land awards:</b> ${E.LAND_AWARD_BASE} EP + the player count to the outright leader in plots built on, and again in districts stood in (${award(2)} at two seats, ${award(6)} at six; a two-way tie pays 40%, three or more 20%).<br><br>
      <b>Loan buy-back:</b> ${money(E.LOAN_REPAY_RATE[4])} at Year 1, ${money(E.LOAN_REPAY_RATE[8])} at Year 2 - ${money(E.LOAN_REPAY_RATE[12])} at Year 3 in the three-year game.</div>
  </div>`;
  page("Personas, IPO, reminders", `<div class="cards">${personas}${ipo}${first}${yearEnd}</div>`);
}

/* ---- Megacorp tiles ---- */
{
  const tiles = E.MEGACORP_TILES.map(([name, c, ep]) => {
    const tier = E.MEGACORP_TIER[name];
    return `<div class="mega">
      <div class="mtier"><small>TIER</small><b>${tier}</b><em>price &divide; ${tier}<br>EP each quarter</em></div>
      <div class="mbody"><div class="mname">${esc(name)}</div><div class="mcombo">${comboBlocks(c)}</div><div class="mtext">${combo(c)} &middot; from ${E.MEGACORP_TIER_MIN_PLAYERS[tier]} players</div></div>
      <div class="mep"><b>+${ep}</b><small>EP</small></div>
    </div>`;
  }).join("");
  page("Megacorp tiles", `<div class="megas">${tiles}</div>
    <p class="small centred">Merge exactly the combination printed - the merged companies go distressed, one stays as the headquarters. The tier is a divisor: tier 1 banks the most every quarter. A second Megacorp calls the next quarter as the last.</p>`);
}

/* ---- market board ---- */
{
  const prices = []; for (let p = E.PRICE_MIN; p <= E.PRICE_MAX; p++) prices.push(p);
  const track = E.INDUSTRIES.map((ind) => `<div class="trow">
      <div class="tlabel" style="background:${E.IND_COLOR[ind]}">${glyph(ind, 5)}<b>${ind}</b><i>${E.IND_NAME[ind]}</i></div>
      ${prices.map((p) => `<div class="tcell ${p === E.BASE_PRICE[ind] ? "base" : ""}">$${p}${p === E.BASE_PRICE[ind] ? "<small>base</small>" : ""}</div>`).join("")}
    </div>`).join("");
  const ladders = `<div class="ladders">${E.INDUSTRIES.map((ind) => `<div class="lad">
      <div class="ladh" style="background:${E.IND_COLOR[ind]}">${glyph(ind, 3.6)}<b>${ind}</b></div>
      ${[1, 2, 3, 4].map((l) => { const b = bandRow(ind, l); return `<div class="ladr"><span>L${l}</span><span>&ge;${b.a}</span><span>&ge;${b.b}</span><span>&times;${b.m[0]}&middot;${b.m[1]}&middot;${b.m[2]}</span></div>`; }).join("")}
    </div>`).join("")}</div>`;
  const pots = E.INDUSTRIES.map((ind) => `<div class="pot"><div class="poth" style="background:${E.IND_COLOR[ind]}">${glyph(ind, 4)}<b>${ind} POT</b></div>
      <div class="potb"><span>paid by the bills of</span>${buyersOf(ind).map((i) => chip(i, "s")).join(" ")}<em>split evenly among ${ind} companies each Closing; the remainder, or the whole pot if nobody is in ${ind}, waits here</em></div></div>`).join("");
  page("Market board", `
    <h2>Market <span class="hsub">price track &middot; band ladders &middot; industry pots</span></h2>
    <div class="track">${track}</div>
    <p class="small">A build moves its own industry <b>down $1</b> and each supplier on the card <b>up $1</b>. The ends are hard stops. A company is paid its band's multiplier &times; the price under its marker.</p>
    ${ladders}
    <div class="pots">${pots}</div>`);
}

/* ---- action board ---- */
{
  const n = E.workingTrackSlots(6);
  const slotNote = (i) => (i === 4 ? "5+ players" : i === 5 ? "6 players" : "");
  const trackRow = (label, acts) => `<div class="arow">
      <div class="alabel"><b>${label}</b><i>${acts}</i></div>
      <div class="aslots">${Array.from({ length: n }, (_, i) => `<div class="aslot ${i >= 4 ? "late" : ""}"><span>${i + 1}</span><small>${slotNote(i)}</small></div>`).join("")}</div>
    </div>`;
  const quarters = []; for (let q = 1; q <= E.LONG_GAME_QUARTERS; q++) quarters.push(q);
  page("Action board", `
    <h2>Action tracks <span class="hsub">place left to right &middot; resolve right to left</span></h2>
    <div class="arrow place">PLACE &rarr; one worker at a time, in turn order, until all are placed</div>
    ${trackRow("Raise Capital", "LOAN +$20 for a disc &middot; SELL a Blueprint, a company or a plot")}
    ${trackRow("M&amp;A", "BUY a plot or a distressed structure &middot; LAUNCH a Blueprint on owned ground")}
    ${trackRow("R&amp;D", "RESEARCH the top card of a deck &middot; UPGRADE a company you own")}
    <div class="arrow resolve">&larr; RESOLVE: the last worker placed acts first, and every worker takes one action <b>+1 for each worker placed after it</b></div>
    <div class="arow bm">
      <div class="alabel"><b>Board Meeting</b><i>both your workers &middot; GO PUBLIC (merge for a Megacorp tile) &middot; REPOSITION to first in turn order</i></div>
      <div class="aslots"><div class="aslot"><span>1</span></div><div class="aslot sealed"><span>2</span><small>opens with the IPO tile</small></div></div>
    </div>
    <h3>Quarters</h3>
    <div class="qtrack">${quarters.map((q) => `<div class="q ${q > E.STANDARD_QUARTERS ? "long" : ""} ${YEAR_ENDS.includes(q) ? "ye" : ""}"><b>Q${q}</b><small>${q > E.STANDARD_QUARTERS ? "3-year game" : ""}</small>${YEAR_ENDS.includes(q) ? `<em>YEAR END &middot; land awards &middot; loans ${money(E.LOAN_REPAY_RATE[q])}</em>` : ""}${q === E.STANDARD_QUARTERS ? `<strong>game ends</strong>` : ""}</div>`).join("")}</div>
    <p class="small">A second Megacorp calls the following quarter as the last one (capped at the final quarter). Final tie: most active companies, then most money, then fewest loan discs in the bank.</p>
    <h3>Turn order</h3>
    <div class="torder">${[1, 2, 3, 4, 5, 6].map((i) => `<div class="tslot"><span>${i}</span></div>`).join("")}<div class="tnote">REPOSITION moves a player to 1st; the hub placement and the first worker belong to 1st</div></div>
    <h3>Closing, in order <span class="hsub">nobody is handed the board</span></h3>
    <div class="closebox">
      <div><b>1</b>Persona choices: concession on? supply-chain step?</div>
      <div><b>2</b>Every company pays its bill: ${money(E.RENT_PER_LEVEL)} a level to each landlord, the rest into its suppliers' pots. Short? Sell at half.</div>
      <div><b>3</b><span><b>Count &middot; band &middot; multiply.</b> Each company counts the icons of its industry it reaches, reads its band on the card, and is paid that &times; the price. All at once.</span></div>
      <div><b>4</b>Each Megacorp HQ banks its price &divide; tier; each rival company beside it takes ${E.MEGACORP_TITHE_EP} EP off its owner.</div>
      <div><b>5</b>Each pot is split evenly among its industry's companies; what is left over, or a pot with nobody in its industry, waits.</div>
      <div><b>6</b>The first player places a Logistic Hub on an empty unowned plot.</div>
      <div><b>7</b>Q4 and Q8: the two land awards, then loans may be bought back.</div>
    </div>`);
}

/* ---- player boards ---- */
function playerBoard(i) {
  const col = E.PLAYER_COLORS[i];
  const discs = Array.from({ length: E.DISCS_PER_PLAYER }, (_, k) => `<span class="disc" style="border-color:${col}">${k + 1}</span>`).join("");
  const bays = Array.from({ length: E.COMPANY_SLOTS }, (_, k) => `<div class="bay"><span>company ${k + 1}</span></div>`).join("") + `<div class="bay ipo"><span>IPO bay</span><small>with the IPO tile</small></div>`;
  return `<div class="pboard">
    <div class="pbhead" style="background:${col}"><b>PLAYER ${i + 1}</b><span>${E.DISCS_PER_PLAYER} discs &middot; ${E.COMPANY_SLOTS} companies &middot; hand of 5 Blueprints</span></div>
    <div class="pbcols">
      <div class="pbleft">
        <h4>Discs <small>one on each plot you own, one on each company, one in the bank per loan</small></h4>
        <div class="discs">${discs}</div>
        <h4>Loans <small>$20 each for a disc &middot; &minus;5 EP each still in the bank at the end</small></h4>
        <div class="loans"><span>buy back at a year end: ${money(E.LOAN_REPAY_RATE[4])} &middot; ${money(E.LOAN_REPAY_RATE[8])} &middot; ${money(E.LOAN_REPAY_RATE[12])} (3-year game)</span></div>
        <h4>Companies</h4>
        <div class="bays">${bays}</div>
      </div>
      <div class="pbright">
        <h4>A quarter</h4>
        <ol class="phases">
          <li><b>PLANNING</b> place your workers, one at a time, in turn order.</li>
          <li><b>ACTION</b> the tracks resolve right to left; take your actions.</li>
          <li><b>CLOSING</b> everything settles, in this order:
            <ol class="closing">
              <li>Personas: concession on? supply-chain step?</li>
              <li>Every company pays its bill: ${money(E.RENT_PER_LEVEL)} a level to each landlord, the rest into its suppliers' pots. Short of cash? Sell at half.</li>
              <li><b>Every company is paid:</b> count the icons of its industry it reaches &rarr; read the band on the card &rarr; &times; the price. All at once.</li>
              <li>Megacorp HQs bank price &divide; tier; each rival company beside one takes ${E.MEGACORP_TITHE_EP} EP off its owner.</li>
              <li>Each pot is split evenly among its industry's companies.</li>
              <li>1st player places a Logistic Hub on an empty unowned plot.</li>
              <li>Year end (Q4, Q8): land awards; buy back loans.</li>
            </ol>
          </li>
        </ol>
        <h4>Score</h4>
        <ul class="score">
          <li>+${E.INDUSTRY_DEBUT_EP} EP the first time you build in each industry</li>
          <li>+${LEVEL_EP} EP a level, when built and again when upgraded</li>
          <li>Megacorp: the tile's EP, then price &divide; tier every quarter</li>
          <li>Land awards at each year end, outright leader only</li>
          <li>+1 EP per $${E.CASH_PER_EP} at the end &middot; &minus;5 EP per unpaid loan</li>
        </ul>
      </div>
    </div>
  </div>`;
}
for (let i = 0; i < 6; i += 2) page(`Player boards ${i / 2 + 1}`, `<div class="pboards">${playerBoard(i)}${playerBoard(i + 1)}</div>`);

/* ---- player aid: front and back ---- */
{
  const abilities = {
    UT: "counts a block of districts as wide as its level around it; never uses hubs",
    RE: "a chain is its level in shopfronts: a branch per level above the first, each on owned ground in a district it reaches; never uses hubs",
    HO: "counts each business or hub within its level in plots as an icon, on top of the grid",
    MA: "counts up to its level in icons from the other rows of its own district, on top of its own",
    HC: "reaches every district on the hub network without touching a hub",
    TE: "its band row is its own: the doubler is built into its multipliers",
  };
  /* the supply web as a graph: six nodes on a circle, an arrow from each industry to the pots it pays */
  const R = 26, CX = 36, CY = 34;
  const nodes = E.INDUSTRIES.map((ind, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 6; return { ind, x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }; });
  let web = `<svg viewBox="0 0 72 68" style="width:72mm;height:68mm"><defs><marker id="ah" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#555"/></marker></defs>`;
  for (const n of nodes) for (const s of suppliersOf(n.ind)) {
    const t = nodes.find((m) => m.ind === s);
    const dx = t.x - n.x, dy = t.y - n.y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
    web += `<line x1="${n.x + ux * 6.5}" y1="${n.y + uy * 6.5}" x2="${t.x - ux * 7}" y2="${t.y - uy * 7}" stroke="#555" stroke-width="0.5" marker-end="url(#ah)"/>`;
  }
  for (const n of nodes) web += `<circle cx="${n.x}" cy="${n.y}" r="6" fill="${E.IND_COLOR[n.ind]}"/><text x="${n.x}" y="${n.y + 1.6}" text-anchor="middle" font-size="4.2" font-weight="800" fill="#fff">${n.ind}</text>`;
  web += `</svg>`;
  const front = `<div class="aid">
    <div class="aidh">PLAYER AID &middot; a quarter in three phases</div>
    <div class="aidcols">
      <div>
        <h4>1 &middot; Planning</h4><p>Place your workers one at a time, in turn order. Early is more actions, late is better information.</p>
        <h4>2 &middot; Action</h4><p>Each track resolves <b>right to left</b>: the last worker placed acts first and takes 1 action + 1 per worker placed after it. Board Meeting takes both your workers for one action.</p>
        <h4>3 &middot; Closing <small>nobody is handed the board</small></h4>
        <ol class="closing">
          <li>Persona choices (concession, supply chain)</li>
          <li>Bills: ${money(E.RENT_PER_LEVEL)} a level to each landlord, the rest into the suppliers' pots</li>
          <li><b>Count &middot; band &middot; multiply</b> - every company at once</li>
          <li>HQs bank price &divide; tier; ${E.MEGACORP_TITHE_EP} EP tithe to each rival beside them</li>
          <li>Pots split evenly among each industry's companies</li>
          <li>1st player places a hub on an empty unowned plot</li>
          <li>Year end: land awards, loan buy-back</li>
        </ol>
      </div>
      <div>
        <h4>Count the icons you reach</h4>
        <ul>
          <li>Your industry's rows, columns up to your level, in every district you reach. Rows 1 and 4 are the same industry: two icons a column there.</li>
          <li>You reach the districts your plots stand in. A plot beside a hub puts you on the whole hub network; a Megacorp HQ counts as a hub.</li>
          <li>An icon is never used up - everyone who reaches it counts it.</li>
          <li>Read the band on your card: under the first threshold $, from it $$, from the second $$$. Multiply the price under your industry's marker.</li>
        </ul>
        <h4>Industry abilities</h4>
        <ul class="abil">${E.INDUSTRIES.map((i) => `<li>${chip(i, "s")} ${abilities[i]}</li>`).join("")}</ul>
      </div>
    </div>
  </div>`;
  const back = `<div class="aid">
    <div class="aidh">PLAYER AID &middot; the money and the score</div>
    <div class="aidcols">
      <div>
        <h4>The supply web <small>arrows: who pays whom</small></h4>
        ${web}
        <p class="small">Each industry pays three others and is paid by three. Building moves your own price down $1 and each supplier on the card up $1, on a $${E.PRICE_MIN}&ndash;$${E.PRICE_MAX} track with hard ends.</p>
      </div>
      <div>
        <h4>Score</h4>
        <table class="t small">
          <tr><td>First company in an industry</td><td class="num">+${E.INDUSTRY_DEBUT_EP}</td></tr>
          <tr><td>Each level, when built and again when upgraded</td><td class="num">+${LEVEL_EP}</td></tr>
          <tr><td>Megacorp tile, once</td><td class="num">+8 to +22</td></tr>
          <tr><td>Megacorp HQ, every quarter it stands</td><td class="num">price &divide; tier</td></tr>
          <tr><td>Land awards, each year end, outright leader in plots built on / districts stood in</td><td class="num">${E.LAND_AWARD_BASE} + players</td></tr>
          <tr><td>Cash at the end, per $${E.CASH_PER_EP}</td><td class="num">+1</td></tr>
          <tr><td>Each loan disc still in the bank</td><td class="num">&minus;5</td></tr>
        </table>
        <h4>Land</h4>
        <ul class="small">
          <li>A plot costs its road price + $3 per structure on or orthogonally beside it; it sells for the same.</li>
          <li>Rent ${money(E.RENT_PER_LEVEL)} a level to each landlord; nothing on your own ground. A company needs all its ground owned by somebody to be paid.</li>
          <li>Loans: $20 for a disc; buy back ${money(E.LOAN_REPAY_RATE[4])} / ${money(E.LOAN_REPAY_RATE[8])} at the year ends (${money(E.LOAN_REPAY_RATE[12])} at the third in the three-year game).</li>
          <li>Forced sales go at half. Sell a Blueprint for ${money(E.BP_SELL_PRICE[1])} / ${money(E.BP_SELL_PRICE[2])} / ${money(E.BP_SELL_PRICE[3])} by level.</li>
        </ul>
        <h4>The end</h4>
        <p class="small">After Q${E.STANDARD_QUARTERS}, or the quarter after anyone's ${E.MEGACORPS_TO_END}nd Megacorp. Ties: active companies, then cash, then fewer loan discs.</p>
      </div>
    </div>
  </div>`;
  page("Player aid (front / back)", `<div class="aids">${front}${back}</div>`);
}

/* ---- band reference ---- */
{
  const rows = E.INDUSTRIES.flatMap((ind) => [1, 2, 3, 4].map((l) => { const b = bandRow(ind, l); return `<tr class="${l === 1 ? "first" : ""}"><td>${l === 1 ? chip(ind, "s") + " " + E.IND_NAME[ind] : ""}</td><td class="num">L${l}</td><td class="num">${b.a}</td><td class="num">${b.b}</td><td class="num">&times;${b.m[0]}</td><td class="num">&times;${b.m[1]}</td><td class="num">&times;${b.m[2]}</td></tr>`; })).join("");
  const ref = `<div class="bref">
    <div class="aidh">BAND REFERENCE &middot; what a company is paid</div>
    <table class="t bt"><tr><th>Industry</th><th>Level</th><th>$$ from</th><th>$$$ from</th><th>$</th><th>$$</th><th>$$$</th></tr>${rows}</table>
    <p class="small">Revenue = the current price of the industry &times; the multiplier of the band your icon count falls in. A company that reaches no icon is still paid its $ band. Technology's doubler is folded into its own row.</p>
  </div>`;
  page("Band reference", `<div class="aids">${ref}${ref}</div>`);
}

/* ---- money ---- */
{
  const NOTES = [[1, "#9aa3ad", "#eef1f4"], [2, "#3fa36a", "#e8f6ec"], [5, "#3e73d0", "#e8eefb"], [10, "#e2892b", "#fcefe0"], [20, "#7d5bc2", "#efe9f9"], [50, "#c9a227", "#faf3d6"]];
  const SUGGEST = { 1: 1, 2: 2, 5: 3, 10: 3, 20: 2, 50: 4 };
  for (const [v, ink, paper] of NOTES) {
    const note = `<div class="note" style="background:${paper};border-color:${ink}"><div class="nv" style="color:${ink}">$${v}</div><div class="nt">ENTREPRENEURS<br>BANK NOTE</div><div class="nv r" style="color:${ink}">$${v}</div></div>`;
    page(`Money $${v}`, `<div class="notes">${Array.from({ length: 10 }, () => note).join("")}</div>
      <p class="small centred">Ten notes a sheet, 88 &times; 44 mm. Print ${SUGGEST[v]} ${SUGGEST[v] === 1 ? "copy" : "copies"} for a four-player game and add $20 and $50 sheets as the pots grow.</p>`);
  }
}

/* ---- tokens ---- */
{
  const discs = E.PLAYER_COLORS.map((c) => `<div class="trow2">${Array.from({ length: E.DISCS_PER_PLAYER }, () => `<span class="tok disc2" style="background:${c}"></span>`).join("")}</div>`).join("");
  const workers = E.PLAYER_COLORS.map((c) => Array.from({ length: 3 }, () => `<span class="tok worker" style="background:${c}">W</span>`).join(" ")).join(" ");
  const markers = E.INDUSTRIES.map((i) => `<span class="tok pm" style="background:${E.IND_COLOR[i]}">${glyph(i, 6)}</span>`).join("");
  const order = [1, 2, 3, 4, 5, 6].map((n) => `<span class="tok ord">${n}</span>`).join("");
  page("Tokens 1", `
    <h2>Tokens <span class="hsub">a fallback for the 3D-printed pieces</span></h2>
    <h4>Discs &middot; ${E.DISCS_PER_PLAYER} per player</h4>${discs}
    <h4>Workers &middot; 3 per player (2 are used from three players up)</h4><div class="trow2">${workers}</div>
    <h4>Price markers</h4><div class="trow2">${markers}</div>
    <h4>Turn order &middot; quarter marker</h4><div class="trow2">${order}<span class="tok ord">Q</span></div>`);
  const levels = [[1, 24], [2, 24], [3, 12], [4, 8]].map(([l, n]) => `<h4>Level ${l} &middot; ${n}</h4><div class="trow2">${Array.from({ length: n }, () => `<span class="tok lvl">L${l}</span>`).join("")}</div>`).join("");
  const hubs = Array.from({ length: E.LONG_GAME_QUARTERS }, () => `<span class="tok hub">HUB</span>`).join("");
  const hqs = Array.from({ length: 12 }, () => `<span class="tok hq">HQ</span>`).join("");
  const branches = Array.from({ length: 12 }, () => `<span class="tok br" style="background:${E.IND_COLOR.RE}">${glyph("RE", 4)}</span>`).join("");
  page("Tokens 2", `
    <h2>Tokens <span class="hsub">companies, hubs, headquarters, branches</span></h2>
    <p class="small">A company token sits on each plot of its footprint; a stack of them reads as the level. Horizontal companies put one on each plot they cover.</p>
    ${levels}
    <h4>Logistic Hubs &middot; one a quarter</h4><div class="trow2">${hubs}</div>
    <h4>Megacorp headquarters</h4><div class="trow2">${hqs}</div>
    <h4>Retail branches</h4><div class="trow2">${branches}</div>`);
}

/* ------------------------------------------------------------------ CSS */
const CSS = `
${fontCss}
:root { --ink: #16181d; --mute: #6b7280; --line: #c9ced6; --display: "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif; --mono: "IBM Plex Mono", Menlo, Consolas, monospace; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@page { size: A4; margin: 0; }
html, body { margin: 0; padding: 0; }
body { font-family: var(--display); color: var(--ink); font-size: 9pt; line-height: 1.3; background: #fff; }
.page { width: 210mm; height: 297mm; padding: 10mm; position: relative; overflow: hidden; page-break-after: always; break-after: page; background: #fff; }
.page:last-child { page-break-after: auto; }
@media screen { body { background: #6b7280; } .page { margin: 6mm auto; box-shadow: 0 2mm 8mm rgba(0,0,0,.4); } }
.ph { position: absolute; top: 4mm; left: 10mm; right: 10mm; display: flex; justify-content: space-between; font-size: 6.5pt; color: var(--mute); letter-spacing: .04em; text-transform: uppercase; }
.pf { position: absolute; bottom: 4mm; left: 10mm; right: 10mm; display: flex; justify-content: space-between; font-size: 6.5pt; color: var(--mute); }
h1 { font-size: 46pt; font-weight: 800; letter-spacing: .02em; margin: 2mm 0 1mm; line-height: 1; }
h2 { font-size: 16pt; font-weight: 800; margin: 0 0 2mm; }
h3 { font-size: 10.5pt; font-weight: 800; margin: 3mm 0 1.2mm; }
h4 { font-size: 8.5pt; font-weight: 800; margin: 2mm 0 1mm; text-transform: uppercase; letter-spacing: .04em; }
h4 small { font-weight: 500; text-transform: none; letter-spacing: 0; color: var(--mute); }
.hsub { font-size: 9pt; font-weight: 500; color: var(--mute); margin-left: 3mm; }
p { margin: 0 0 1.6mm; }
.lead { font-size: 9.5pt; }
.small { font-size: 7.6pt; color: #374151; }
.centred { text-align: center; margin-top: 2mm; }
.num { font-family: var(--mono); text-align: right; white-space: nowrap; }
.t { border-collapse: collapse; width: 100%; font-size: 8pt; }
.t th, .t td { border: 0.2mm solid var(--line); padding: 1mm 1.4mm; vertical-align: top; text-align: left; }
.t th { background: #f3f4f6; font-weight: 800; font-size: 7.4pt; }
.t.small { font-size: 7.2pt; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
.matrow { display: grid; grid-template-columns: auto 1fr; gap: 6mm; align-items: start; }
.g { vertical-align: middle; }
.chip { display: inline-flex; align-items: center; gap: 1mm; color: #fff; border-radius: 1.2mm; padding: 0.4mm 1.4mm 0.4mm 0.9mm; font-weight: 800; font-family: var(--mono); line-height: 1; vertical-align: middle; }
.chip-s { font-size: 6.6pt; padding: 0.3mm 1mm 0.3mm 0.7mm; }
.chip-l { font-size: 10pt; padding: 1mm 2mm 1mm 1.4mm; }
.icon { display: inline-flex; align-items: center; justify-content: center; border-radius: 0.8mm; }
.sw { display: inline-flex; width: 9mm; height: 9mm; align-items: center; justify-content: center; border-radius: 1.5mm; }
.pc { display: inline-flex; width: 9mm; height: 9mm; border-radius: 50%; align-items: center; justify-content: center; font-weight: 800; color: #111; border: 0.3mm solid #0003; }
.grey { filter: grayscale(1); }
.ds td.ladder span { display: block; font-family: var(--mono); font-size: 6.6pt; white-space: nowrap; }
.ds-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 2mm; }
/* cover */
.cover { padding-top: 14mm; }
.cover-kicker { font-size: 8pt; letter-spacing: .2em; color: var(--mute); }
.cover-sub { font-size: 11pt; color: var(--mute); margin-bottom: 6mm; }
.cover-lead { font-size: 10pt; max-width: 165mm; }
.cover-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin-top: 6mm; }
.toc { font-size: 8.4pt; padding-left: 5mm; margin: 0; }
.toc li { margin-bottom: 0.6mm; }
.cover ul { font-size: 8.4pt; padding-left: 4.5mm; }
/* tiles */
.tiles { display: grid; grid-template-columns: repeat(2, 84mm); gap: 4mm; justify-content: center; }
.tile { width: 84mm; height: 84mm; display: grid; grid-template-columns: repeat(3, 28mm); grid-template-rows: repeat(3, 28mm); border: 0.4mm solid #333; border-radius: 1.5mm; overflow: hidden; }
.cell { position: relative; }
.cell.plot { margin: 1.6mm; background: #fff; border: 0.35mm solid #444; border-radius: 1.2mm; }
.cell.plot .pos { position: absolute; top: 0.6mm; left: 0.9mm; font-size: 5.6pt; color: #9ca3af; font-family: var(--mono); }
.cell.noplot { background: repeating-linear-gradient(45deg, transparent 0 1.4mm, #0000000c 1.4mm 1.8mm); }
.cell.centre { display: flex; flex-direction: column; align-items: center; padding: 0.6mm 0.4mm; }
.tname { font-size: 13pt; font-weight: 800; line-height: 1; }
.tfam { font-size: 5.8pt; color: var(--mute); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 0.6mm; }
.dgrid { display: flex; flex-direction: column; gap: 0.35mm; }
.dhead { display: grid; grid-template-columns: 6.2mm repeat(4, 4.2mm); gap: 0.35mm; font-size: 5pt; color: var(--mute); text-align: center; font-family: var(--mono); }
.drow { display: grid; grid-template-columns: 6.2mm repeat(4, 4.2mm); gap: 0.35mm; align-items: center; }
.drow .chip-s { font-size: 5.2pt; padding: 0.25mm 0.5mm 0.25mm 0.4mm; gap: 0.5mm; }
/* cards */
.cards { display: grid; grid-template-columns: repeat(3, 63mm); grid-auto-rows: 88mm; gap: 0; justify-content: center; }
.card { width: 63mm; height: 88mm; border: 0.25mm solid #777; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
.chead { color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 1.2mm 2mm; height: 10mm; }
.chead.dark { background: #1f2937; }
.cind { display: flex; align-items: center; gap: 1.2mm; line-height: 1; }
.cind b { font-family: var(--mono); font-size: 11pt; }
.cind i { font-style: normal; font-size: 6.4pt; opacity: .9; }
.clvl { font-size: 15pt; font-weight: 800; line-height: 1; display: flex; align-items: baseline; gap: 0.8mm; }
.clvl small { font-size: 8pt; font-weight: 500; }
.cname { font-size: 10pt; font-weight: 800; padding: 1.4mm 2mm 0.6mm; line-height: 1.1; }
.cstats { display: grid; grid-template-columns: 1fr 1fr 1fr; padding: 0.6mm 1.4mm; gap: 0.8mm; }
.cstats div { border: 0.2mm solid var(--line); border-radius: 1mm; padding: 0.6mm 0.4mm 0.8mm; text-align: center; line-height: 1.05; }
.cstats small { display: block; font-size: 5.2pt; letter-spacing: .06em; color: var(--mute); }
.cstats b { display: block; font-size: 12.5pt; font-family: var(--mono); font-weight: 600; margin: 0.3mm 0; }
.cstats em { display: block; font-style: normal; font-size: 5.1pt; color: var(--mute); }
.cband { margin: 0.6mm 1.4mm; border: 0.45mm solid; border-radius: 1.2mm; padding: 0.7mm 1mm 0.8mm; }
.cbt { display: flex; justify-content: space-between; font-size: 5.4pt; letter-spacing: .05em; color: var(--mute); margin-bottom: 0.4mm; }
.cbt span:first-child { font-weight: 800; color: var(--ink); }
.cbrow { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.6mm; text-align: center; }
.cbrow div { background: #f3f4f6; border-radius: 0.8mm; padding: 0.5mm 0 0.6mm; line-height: 1.05; }
.cbrow small { display: block; font-size: 7pt; font-weight: 800; font-family: var(--mono); }
.cbrow b { display: block; font-size: 13pt; font-family: var(--mono); font-weight: 600; }
.cbrow em { display: block; font-style: normal; font-size: 5.2pt; color: var(--mute); }
.cbx { text-align: center; font-size: 5.8pt; margin-top: 0.5mm; color: #374151; }
.chint { padding: 0.4mm 1.8mm 0.2mm; font-size: 5.6pt; color: #374151; line-height: 1.25; }
.cladder { padding: 0.5mm 1.6mm 0.2mm; font-family: var(--mono); font-size: 5.6pt; color: #4b5563; }
.lrow { display: grid; grid-template-columns: 5mm 5.5mm 6mm 1fr; gap: 0.6mm; line-height: 1.35; }
.lrow.me { color: var(--ink); font-weight: 600; background: #f3f4f6; border-radius: 0.6mm; }
.csup { padding: 0.5mm 1.6mm; display: flex; align-items: center; gap: 1.2mm; flex-wrap: wrap; }
.csup small { font-size: 5.2pt; letter-spacing: .06em; color: var(--mute); width: 100%; }
.csup .dep { display: inline-flex; align-items: center; gap: 0.6mm; font-family: var(--mono); font-size: 7pt; }
.csup em { font-style: normal; font-size: 5.2pt; color: var(--mute); width: 100%; }
.cfoot { margin-top: auto; border-top: 0.2mm solid var(--line); padding: 0.8mm 1.6mm; display: flex; justify-content: space-between; gap: 1mm; font-size: 5.4pt; color: #374151; align-items: center; }
.cfoot .code { font-family: var(--mono); color: var(--mute); }
.persona .ptext, .ipo .ptext { padding: 1.4mm 2.2mm; font-size: 8pt; line-height: 1.35; }
/* megacorp */
.megas { display: grid; grid-template-columns: repeat(3, 63mm); grid-auto-rows: 44mm; justify-content: center; }
.mega { width: 63mm; height: 44mm; border: 0.25mm solid #777; display: grid; grid-template-columns: 15mm 1fr 13mm; background: #fff; }
.mtier { background: #1f2937; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; line-height: 1; }
.mtier small { font-size: 5.4pt; letter-spacing: .1em; }
.mtier b { font-size: 22pt; font-family: var(--mono); margin: 0.8mm 0; }
.mtier em { font-style: normal; font-size: 5.4pt; opacity: .9; }
.mbody { padding: 1.6mm 2mm; display: flex; flex-direction: column; justify-content: center; }
.mname { font-size: 10pt; font-weight: 800; line-height: 1.1; margin-bottom: 1.4mm; }
.mcombo { display: flex; gap: 0.8mm; flex-wrap: wrap; margin-bottom: 1mm; }
.lvlblk { display: inline-flex; width: 7mm; height: 7mm; border: 0.3mm solid #374151; border-radius: 0.8mm; align-items: center; justify-content: center; font-family: var(--mono); font-size: 7.5pt; font-weight: 600; background: #f3f4f6; }
.mtext { font-size: 6.4pt; color: var(--mute); }
.mep { display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 0.2mm solid var(--line); line-height: 1; }
.mep b { font-size: 16pt; font-family: var(--mono); font-weight: 600; }
.mep small { font-size: 6pt; color: var(--mute); }
/* market */
.track { display: flex; flex-direction: column; gap: 1.2mm; margin: 2mm 0; }
.trow { display: grid; grid-template-columns: 34mm repeat(11, 13.6mm); gap: 0.6mm; }
.tlabel { color: #fff; display: flex; align-items: center; gap: 1.4mm; padding: 0 1.6mm; border-radius: 1mm; line-height: 1; }
.tlabel b { font-family: var(--mono); font-size: 11pt; }
.tlabel i { font-style: normal; font-size: 6.6pt; }
.tcell { height: 14mm; border: 0.25mm solid #555; border-radius: 1mm; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: var(--mono); font-size: 10pt; font-weight: 600; }
.tcell.base { border-width: 0.7mm; background: #f3f4f6; }
.tcell small { font-size: 5pt; color: var(--mute); letter-spacing: .08em; }
.ladders { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1.6mm; margin: 2mm 0; }
.lad { border: 0.2mm solid var(--line); border-radius: 1mm; overflow: hidden; font-family: var(--mono); font-size: 6.4pt; }
.ladh { color: #fff; display: flex; align-items: center; gap: 1mm; padding: 0.8mm 1.4mm; font-size: 8pt; }
.ladr { display: grid; grid-template-columns: 5mm 5.6mm 6.4mm 1fr; padding: 0.5mm 1.2mm; border-top: 0.15mm solid var(--line); }
.pots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-top: 3mm; }
.pot { border: 0.35mm solid #444; border-radius: 1.5mm; height: 46mm; display: flex; flex-direction: column; overflow: hidden; }
.poth { color: #fff; display: flex; align-items: center; gap: 1.4mm; padding: 1.2mm 2mm; font-size: 9pt; }
.potb { padding: 1.4mm 2mm; font-size: 6.6pt; color: var(--mute); display: flex; flex-wrap: wrap; gap: 1mm; align-items: center; }
.potb span { width: 100%; }
.potb em { font-style: normal; width: 100%; margin-top: auto; }
/* action board */
.arrow { font-size: 8pt; padding: 1.2mm 2mm; border-radius: 1mm; margin: 1.2mm 0; }
.arrow.place { background: #e8eefb; }
.arrow.resolve { background: #fbeee6; }
.arow { display: grid; grid-template-columns: 46mm 1fr; gap: 2mm; align-items: center; margin: 1.4mm 0; }
.alabel b { display: block; font-size: 11pt; font-weight: 800; }
.alabel i { font-style: normal; font-size: 6.8pt; color: var(--mute); }
.aslots { display: flex; gap: 1.6mm; }
.aslot { width: 22mm; height: 18mm; border: 0.35mm solid #444; border-radius: 1.2mm; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: var(--mono); }
.aslot span { font-size: 11pt; font-weight: 600; }
.aslot small { font-size: 5.6pt; color: var(--mute); }
.aslot.late { border-style: dashed; }
.aslot.sealed { background: repeating-linear-gradient(45deg, transparent 0 1.4mm, #0000000c 1.4mm 1.8mm); }
.qtrack { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1mm; }
.q { border: 0.3mm solid #444; border-radius: 1mm; min-height: 24mm; padding: 1mm; text-align: center; font-size: 6pt; }
.q b { display: block; font-family: var(--mono); font-size: 10pt; }
.q small { display: block; color: var(--mute); font-size: 5.2pt; }
.q em { display: block; font-style: normal; margin-top: 1mm; }
.q strong { display: block; margin-top: 1mm; color: #b91c1c; }
.q.long { border-style: dashed; color: var(--mute); }
.q.ye { background: #fff4d6; }
.torder { display: flex; gap: 2mm; align-items: center; }
.tslot { width: 16mm; height: 14mm; border: 0.35mm solid #444; border-radius: 1.2mm; display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-size: 11pt; }
.tnote { font-size: 6.8pt; color: var(--mute); max-width: 60mm; }
.closebox { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6mm 4mm; font-size: 7.6pt; }
.closebox > div { display: flex; gap: 1.8mm; align-items: flex-start; border: 0.2mm solid var(--line); border-radius: 1mm; padding: 1.2mm 1.8mm; }
.closebox > div > b:first-child { font-family: var(--mono); font-size: 11pt; line-height: 1; min-width: 5mm; }
/* player boards */
.pboards { display: flex; flex-direction: column; gap: 5mm; }
.pboard { height: 134mm; border: 0.4mm solid #333; border-radius: 2mm; overflow: hidden; display: flex; flex-direction: column; }
.pbhead { color: #111; padding: 1.6mm 3mm; display: flex; justify-content: space-between; align-items: center; }
.pbhead b { font-size: 13pt; font-weight: 800; }
.pbhead span { font-size: 7pt; }
.pbcols { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; padding: 1.5mm 3mm; flex: 1; }
.pbleft h4, .pbright h4 { margin-top: 1.2mm; }
.discs { display: flex; flex-wrap: wrap; gap: 1.2mm; }
.disc { width: 10.5mm; height: 10.5mm; border-radius: 50%; border: 0.5mm dashed; display: inline-flex; align-items: center; justify-content: center; font-size: 6pt; color: var(--mute); font-family: var(--mono); }
.loans { border: 0.3mm dashed #666; border-radius: 1mm; height: 11mm; display: flex; align-items: flex-end; padding: 1mm 1.5mm; font-size: 6.4pt; color: var(--mute); }
.bays { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.4mm; }
.bay { height: 21mm; border: 0.3mm solid #444; border-radius: 1mm; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding: 1mm; font-size: 6.4pt; color: var(--mute); }
.bay.ipo { border-style: dashed; }
.bay small { font-size: 5.2pt; }
.phases { padding-left: 4mm; margin: 0; font-size: 7.4pt; }
.phases > li { margin-bottom: 1mm; }
.closing { padding-left: 4mm; margin: 0.6mm 0 0; font-size: 7pt; }
.closing li { margin-bottom: 0.4mm; }
.score { padding-left: 4mm; margin: 0; font-size: 7.2pt; }
/* aids */
.aids { display: flex; flex-direction: column; gap: 5mm; }
.aid, .bref { height: 136mm; border: 0.3mm solid #555; border-radius: 1.5mm; padding: 2.5mm 3mm; overflow: hidden; }
.aidh { font-size: 9pt; font-weight: 800; letter-spacing: .06em; border-bottom: 0.3mm solid #333; padding-bottom: 1mm; margin-bottom: 1.6mm; }
.aidcols { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; font-size: 7.4pt; }
.aidcols h4 { margin-top: 1.2mm; }
.aidcols ul, .aidcols ol { padding-left: 3.8mm; margin: 0 0 1mm; }
.aidcols li { margin-bottom: 0.5mm; }
.abil li { list-style: none; margin-left: -3.8mm; }
.bt { font-size: 6.6pt; }
.bt th, .bt td { padding: 0.45mm 1.2mm; line-height: 1.15; }
.bt tr.first td { border-top: 0.4mm solid #555; }
/* money */
.notes { display: grid; grid-template-columns: repeat(2, 88mm); grid-auto-rows: 44mm; gap: 2.5mm 6mm; justify-content: center; }
.note { border: 0.5mm solid; border-radius: 1.5mm; display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; padding: 2mm 3mm; }
.nv { font-family: var(--mono); font-size: 22pt; font-weight: 600; }
.nv.r { text-align: right; }
.nt { text-align: center; font-size: 7pt; letter-spacing: .12em; color: #374151; }
/* tokens */
.trow2 { display: flex; flex-wrap: wrap; gap: 1.4mm; margin: 0.8mm 0 1.6mm; }
.tok { display: inline-flex; align-items: center; justify-content: center; font-family: var(--mono); font-weight: 600; }
.disc2 { width: 14mm; height: 14mm; border-radius: 50%; border: 0.3mm solid #0004; }
.worker { width: 17mm; height: 11mm; border-radius: 3mm 3mm 1mm 1mm; border: 0.3mm solid #0004; color: #111; }
.pm { width: 13mm; height: 13mm; border-radius: 1.5mm; }
.ord { width: 13mm; height: 13mm; border: 0.4mm solid #333; border-radius: 1.5mm; font-size: 11pt; }
.lvl { width: 14mm; height: 14mm; border: 0.4mm solid #333; border-radius: 1mm; background: #f3f4f6; font-size: 8.5pt; }
.hub { width: 14mm; height: 14mm; clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); background: #4b5563; color: #fff; font-size: 7pt; }
.hq { width: 14mm; height: 14mm; clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); background: #c9a227; color: #111; font-size: 7pt; }
.br { width: 12mm; height: 12mm; border-radius: 50%; }
`;

/* ------------------------------------------------------------------ assemble */
const toc = pages.map((p, i) => `<li>${esc(p.title)} <span class="num">p.${i + 1}</span></li>`).join("");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Entrepreneurs - print &amp; play components (${esc(EDITION)})</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${CSS}</style></head>
<body>
${pages.map((p, i) => `<section class="page ${p.cls}">
  <div class="ph"><span>${esc(p.title)}</span><span>Entrepreneurs &middot; ${esc(EDITION)}</span></div>
  ${p.body.replace('<ol class="toc" id="toc"></ol>', `<ol class="toc">${toc}</ol>`)}
  <div class="pf"><span>cut on the printed outlines &middot; print at 100% on A4 (94% on Letter)</span><span>${i + 1} / ${pages.length}</span></div>
</section>`).join("\n")}
</body></html>`;
writeFileSync(OUT_HTML, html);
console.log(`wrote ${path.basename(OUT_HTML)}  (${Math.round(html.length / 1024)} kB, ${pages.length} pages)`);

if (WANT_PDF) {
  const { chromium } = await import("playwright-core");
  const exe = process.env.CHROMIUM || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const pg = await browser.newPage();
  await pg.goto("file://" + OUT_HTML, { waitUntil: "load" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.pdf({ path: OUT_PDF, format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();
  console.log(`wrote ${path.basename(OUT_PDF)}`);
}
