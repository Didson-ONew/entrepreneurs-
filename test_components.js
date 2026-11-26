/* The print-and-play file says what the engine says.

   make_components.mjs reads every number off the engine when it runs, so the only
   way for a component to lie is for the generator to drop something on the floor -
   a card, a tile, a band row - or to format it wrong. This runs the generator and
   reads the HTML back: sixty cards, each with its own setup, OPEX and band row;
   twenty district tiles, each with its four demand rows; sixteen Megacorp tiles
   with their tier; the six personas quoting the engine's own words; the buy-back
   rates; the road-price lattice the engine computes.

   Run: node test_components.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const { execFileSync } = require("child_process");

let fails = 0;
const check = (w, ok, note = "") => { if (!ok) fails++; console.log(`${ok ? "  ok  " : " FAIL "} ${w}${note ? `  [${note}]` : ""}`); };

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const box = {};
const sandbox = { console, Math, Set, Map, Object, Array, JSON, String, Number, box };
vm.createContext(sandbox);
vm.runInContext(src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "") + `
  box.E = { BP_DATA, INDUSTRIES, BAND_TABLE, TILES, DEMAND_ROWS, districtFamily, PERSONAS, MEGACORP_TILES, MEGACORP_TIER,
    LOAN_REPAY_RATE, STARTING, PLAYER_COLORS, buildBoard, mulberry32, STANDARD_QUARTERS, LONG_GAME_QUARTERS, PRICE_MIN, PRICE_MAX };`, sandbox);
const E = box.E;

const out = execFileSync("node", [path.join(__dirname, "make_components.mjs")], { encoding: "utf8" });
const m = out.match(/wrote (Entrepreneurs_Components_v\d+\.html)/);
check("the generator ran and named its file", !!m, out.trim().slice(0, 120));
const file = m ? path.join(__dirname, m[1]) : null;
const html = file && fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
check("the file exists and is a whole page", html.startsWith("<!doctype html>") && html.trim().endsWith("</html>"));
const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/&times;/g, "\u00d7").replace(/&ge;/g, "\u2265").replace(/&middot;/g, "\u00b7").replace(/&ndash;/g, "\u2013").replace(/&amp;/g, "&").replace(/&[a-z]+;|&#\d+;/g, " ").replace(/\s+/g, " ");

console.log("\nSixty Blueprint cards, each with its own numbers and its band row");
{
  const cards = [...html.matchAll(/<div class="card" data-code="([A-Z]{2}-\d\d)">/g)].map((x) => x[1]);
  check(`every card is on a sheet (${cards.length})`, cards.length === E.BP_DATA.length && new Set(cards).size === cards.length, `${cards.length} of ${E.BP_DATA.length}`);
  let bad = [];
  for (const bp of E.BP_DATA) {
    const hit = html.indexOf(`data-code="${bp.code}"`);
    if (hit < 0) { bad.push(`${bp.code} missing`); continue; }
    const text = strip(html.slice(hit, hit + 6000));
    const r = E.BAND_TABLE[bp.ind][bp.lvl];
    const want = [bp.name, `$${bp.setup}`, `$${bp.opex}`, `×${r.m[0]}`, `×${r.m[1]}`, `×${r.m[2]}`, `${r.b}+ icons`];
    for (const w of want) if (!text.includes(w)) { bad.push(`${bp.code} lacks ${w}`); break; }
    for (const d of bp.deps) if (!new RegExp(`${d.ind}\\s*${d.val}\\b`).test(text)) { bad.push(`${bp.code} lacks supplier ${d.ind} ${d.val}`); break; }
  }
  check("every card carries its name, setup, OPEX, three multipliers, top threshold and suppliers", bad.length === 0, bad.slice(0, 3).join("; "));
}

console.log("\nTwenty district tiles with their demand rows");
{
  const names = [...Object.keys(E.TILES)];
  let bad = [];
  for (const name of names) {
    const hit = html.indexOf(`<div class="tname">${name}</div>`);
    if (hit < 0) { bad.push(`${name} missing`); continue; }
    const start = html.lastIndexOf('<div class="tile"', hit);
    const next = html.indexOf('<div class="tile"', hit);
    const tileHtml = html.slice(start, next < 0 ? start + 20000 : next);
    const rows = E.DEMAND_ROWS[E.districtFamily(name)];
    const chips = [...tileHtml.matchAll(/<span class="chip chip-s" style="background:[^"]+"><svg[^>]*aria-label="([A-Z]{2})"/g)].map((x) => x[1]).slice(0, 4);
    if (chips.join() !== rows.join()) bad.push(`${name} rows ${chips.join()} != ${rows.join()}`);
    for (const pos of E.TILES[name]) if (!tileHtml.includes(`<span class="pos">${pos}</span>`)) bad.push(`${name} lacks plot ${pos}`);
  }
  check(`all ${names.length} tiles are drawn with the right rows and plots`, bad.length === 0, bad.slice(0, 3).join("; "));
  check("rows 1 and 4 of every family are the same industry, as the tiles print them", Object.values(E.DEMAND_ROWS).every((r) => r[0] === r[3]));
}

console.log("\nMegacorp tiles, personas, rates");
{
  const text = strip(html);
  let bad = [];
  for (const [name, , ep] of E.MEGACORP_TILES) {
    const tier = E.MEGACORP_TIER[name];
    const hit = html.indexOf(`<div class="mname">${name.replace(/&/g, "&amp;")}</div>`);
    if (hit < 0) { bad.push(`${name} missing`); continue; }
    const t = strip(html.slice(hit - 400, hit + 600));
    if (!t.includes(`TIER ${tier}`) || !t.includes(`+${ep} EP`)) bad.push(`${name}: tier ${tier} / +${ep} not printed`);
  }
  check(`the ${E.MEGACORP_TILES.length} Megacorp tiles carry their tier and EP`, bad.length === 0, bad.slice(0, 3).join("; "));
  const personas = Object.values(E.PERSONAS);
  check("every persona card quotes the engine's blurb verbatim",
    personas.every((p) => text.includes(strip(p.blurb.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")).trim())),
    personas.filter((p) => !text.includes(strip(p.blurb).trim())).map((p) => p.name).join(", "));
  const rates = Object.keys(E.LOAN_REPAY_RATE).map((q) => `$${E.LOAN_REPAY_RATE[q]}`);
  check(`the buy-back rates ${rates.join(" / ")} are on the player board`, text.includes(`${rates[0]} \u00b7 ${rates[1]} \u00b7 ${rates[2]}`));
  check(`the quarter track runs to Q${E.LONG_GAME_QUARTERS} and marks Q${E.STANDARD_QUARTERS} as the end`,
    text.includes(`Q${E.LONG_GAME_QUARTERS}`) && /game ends/.test(text));
  check(`the price track runs $${E.PRICE_MIN} to $${E.PRICE_MAX}`, text.includes(`$${E.PRICE_MIN}`) && text.includes(`$${E.PRICE_MAX}`));
  const seats = Object.keys(E.STARTING).length;
  check(`the seats table lists all ${seats} table sizes`, Object.values(E.STARTING).every((row) => row.every(([c, b]) => text.includes(`$${c} / ${b}`))));
}

console.log("\nThe road-price mat is the engine's lattice");
{
  const lat = E.buildBoard(E.mulberry32(7)).priceLattice;
  const matHit = html.indexOf('class="mat"');
  const mat = html.slice(matHit, html.indexOf("</svg>", matHit));
  const printed = [...mat.matchAll(/<text[^>]*>(\d)<\/text>/g)].map((x) => +x[1]);
  const wanted = Object.values(lat);
  const count = (xs) => xs.reduce((o, v) => { o[v] = (o[v] || 0) + 1; return o; }, {});
  check(`the mat prints the ${wanted.length} road points of the lattice`, printed.length === wanted.length, `${printed.length} printed`);
  check("with the same multiset of prices", JSON.stringify(count(printed)) === JSON.stringify(count(wanted)), JSON.stringify(count(printed)));
  const lat2 = E.buildBoard(E.mulberry32(99)).priceLattice;
  check("and the lattice does not depend on the draw, so it can be printed once", JSON.stringify(lat) === JSON.stringify(lat2));
}

console.log("\nGreyscale: every industry chip carries its glyph and its code");
{
  const chips = [...html.matchAll(/<span class="chip[^"]*" style="background:#[0-9A-Fa-f]{6}"><svg[^>]*aria-label="([A-Z]{2})"[^>]*>[\s\S]*?<\/svg><b>([A-Z]{2})<\/b><\/span>/g)];
  check(`${chips.length} chips, each glyph matching its code`, chips.length > 100 && chips.every((c) => c[1] === c[2]));
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
