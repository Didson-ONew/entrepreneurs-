/* ============================================================================
   Does the rulebook still describe the game the engine actually runs?

   The rulebook is prose and the engine is code, and they drift in one
   direction: a constant is changed, measured, shipped, and the paragraph that
   quotes it is left behind. That is not a documentation problem, it is a rules
   problem - the printed book is what people at the table will believe.

   So every number the rulebook states that the engine also knows is checked
   here against the engine, and the tables are checked cell by cell rather than
   by eye. Prose that cannot be checked mechanically is left to the writer; what
   this catches is the arithmetic.

   Usage:  node check_rulebook.mjs
   ========================================================================== */
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { RULEBOOK, EDITION } from "./rulebook.data.mjs";

/* ---- the engine, loaded the way server.js loads it ---- */
const src = readFileSync("EntrepreneursGame.jsx", "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
if (cut < 0) { console.error("engine shape changed - the REACT UI marker is gone"); process.exit(2); }
const box = {};
createContext(box);
runInContext(
  src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "") + `
  this.E = { BASE_PRICE, PRICE_MIN, PRICE_MAX, SUPPLIER_CELLS, BUILT_CELLS, CASH_PER_EP,
             DISCS_PER_PLAYER, MEGACORPS_TO_END, COMPANY_SLOTS, MEGACORP_TIER,
             MEGACORP_NEIGHBOUR_EP, INDUSTRIES, BP_DATA, STARTING, MEGACORP_TILES,
             PERSONAS, IND_NAME: typeof IND_NAME !== "undefined" ? IND_NAME : null,
             makePriceMatrix, price };`, box);
const E = box.E;

let fails = 0, n = 0;
const check = (what, ok, note = "") => {
  n++; if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
};
const section = (t) => console.log(`\n${t}`);

/* ---- find blocks by the table they carry, so a moved section still matches ---- */
const allBlocks = RULEBOOK.flatMap((s) => s.blocks.map((b) => ({ ...b, section: s.id })));
const prose = allBlocks.filter((b) => b.p).map((b) => b.p);
const notes = allBlocks.filter((b) => b.note).map((b) => b.note);
const everyString = [...prose, ...notes, ...allBlocks.filter((b) => b.ul).flatMap((b) => b.ul)];
const tableByHead = (re) => {
  const b = allBlocks.find((x) => x.table && re.test(x.table.head.join(" | ")));
  return b ? b.table : null;
};
const money = (s) => Number(String(s).replace(/[^0-9.]/g, ""));
/* The book writes an industry as "Utilities (UT)" in some tables and plain
   "Utilities" in others, so build one lookup off the table that prints both. */
const NAME_TO_CODE = {};
{
  const b = allBlocks.find((x) => x.table && /Industry \| Base price/.test(x.table.head.join(" | ")));
  if (b) for (const r of b.table.rows) {
    const mm = String(r[0]).match(/^(.*?)\s*\(([A-Z]{2})\)$/);
    if (mm) NAME_TO_CODE[mm[1].trim()] = mm[2];
  }
}
const codeOf = (cell) => {
  const s = String(cell).trim();
  const mm = s.match(/\(([A-Z]{2})\)$/);
  return mm ? mm[1] : (NAME_TO_CODE[s] || s);
};

console.log(`${EDITION} vs engine\n`);

/* ------------------------------------------------------------ price track */
section("The price track");
{
  check(`the track runs $${E.PRICE_MIN} to $${E.PRICE_MAX}`,
    everyString.some((s) => s.includes(`$${E.PRICE_MIN} to $${E.PRICE_MAX}`)),
    "no sentence states the two ends");

  /* SUPPLIER_CELLS/BUILT_CELLS are in half-dollar cells: 2 cells is a whole
     dollar. The book used to describe the half-dollar step and the blank cells
     that went with it. */
  const wholeDollar = Math.abs(E.SUPPLIER_CELLS) === 2 && Math.abs(E.BUILT_CELLS) === 2;
  check("the step is a whole dollar in the engine", wholeDollar,
    `supplier ${E.SUPPLIER_CELLS}, built ${E.BUILT_CELLS} half-dollar cells`);
  if (wholeDollar) {
    const halfTalk = everyString.filter((s) =>
      /two of either to move a whole dollar|goes UP one cell|goes DOWN one cell|half a dollar|blank reads as/i.test(s));
    check("no paragraph still describes the half-dollar step", halfTalk.length === 0,
      halfTalk.length ? halfTalk[0].slice(0, 90) + "…" : "");
    const blankTalk = everyString.filter((s) => /blank cell|a blank|blanks/i.test(s));
    check("no paragraph still describes blank cells", blankTalk.length === 0,
      blankTalk.length ? blankTalk[0].slice(0, 90) + "…" : "");
  }
}

/* ------------------------------------------------------------ base prices */
section("Base prices");
{
  const t = tableByHead(/Industry \| Base price/);
  check("the base-price table is there", !!t);
  if (t) {
    for (const row of t.rows) {
      const code = codeOf(row[0]);
      check(`${row[0]} base is $${E.BASE_PRICE[code]}`,
        money(row[1]) === E.BASE_PRICE[code], `book says ${row[1]}`);
    }
    check("every industry has a row", t.rows.length === E.INDUSTRIES.length);
  }
}

/* -------------------------------------------------- setup / opex / output */
section("Setup, OPEX and production");
{
  const t = tableByHead(/Industry \| Level 1 \| Level 2 \| Level 3/);
  check("the cost table is there", !!t);
  if (t) {
    for (const row of t.rows) {
      const code = codeOf(row[0]);
      for (let lvl = 1; lvl <= 3; lvl++) {
        const bps = E.BP_DATA.filter((b) => b.ind === code && b.lvl === lvl);
        const want = [...new Set(bps.map((b) => `${b.setup} / ${b.opex} / ${b.prod}`))];
        const got = row[lvl].replace(/\s+/g, " ").trim();
        check(`${code} L${lvl} is ${want.join(" or ")}`,
          want.length === 1 && want[0] === got, `book says ${got}`);
      }
    }
  }
}

/* ------------------------------------------------------------- the supply web */
section("Who supplies whom");
{
  const t = tableByHead(/Industry \| Supplier 1/);
  check("the supply table is there", !!t);
  if (t) {
    for (const row of t.rows) {
      const code = codeOf(row[0]);
      // the level-3 card of an industry carries all three suppliers
      const l3 = E.BP_DATA.find((b) => b.ind === code && b.lvl === 3);
      const want = l3 ? l3.deps.map((d) => d.ind) : [];
      const got = row.slice(1).map((c) => (String(c).match(/[A-Z]{2}/) || [""])[0]).filter(Boolean);
      check(`${code} is supplied by ${want.join(", ")}`,
        want.length === got.length && want.every((w, i) => w === got[i]),
        `book says ${got.join(", ")}`);
    }
  }
}

/* -------------------------------------------------------- starting capital */
section("Starting capital");
{
  const t = tableByHead(/Players \| Seat 1/);
  check("the starting-capital table is there", !!t);
  if (t) {
    for (const row of t.rows) {
      const seats = Number(String(row[0]).replace(/[^0-9]/g, ""));
      const want = E.STARTING[seats];
      if (!want) { check(`${seats} seats exists in the engine`, false); continue; }
      const got = row.slice(1).filter((c) => String(c).trim() !== "-")
        .map((c) => String(c).split("/").map((x) => Number(x.replace(/[^0-9]/g, ""))));
      const same = got.length === want.length
        && got.every(([c, b], i) => c === want[i][0] && b === want[i][1]);
      check(`${seats} seats start on ${want.map(([c, b]) => `$${c}/${b}`).join(", ")}`, same,
        `book says ${got.map(([c, b]) => `$${c}/${b}`).join(", ")}`);
    }
    check("every table size the engine supports has a row",
      Object.keys(E.STARTING).length === t.rows.length,
      `engine ${Object.keys(E.STARTING).join(",")}`);
  }
}

/* -------------------------------------------------------------- Megacorps */
section("Megacorp tiles");
{
  const t = tableByHead(/Megacorp \| Requires/);
  check("the tile table is there", !!t);
  if (t) {
    check(`all ${E.MEGACORP_TILES.length} tiles are listed`, t.rows.length === E.MEGACORP_TILES.length,
      `book lists ${t.rows.length}`);
    for (const row of t.rows) {
      const name = String(row[0]).trim();
      const tile = E.MEGACORP_TILES.find((x) => x[0] === name);
      if (!tile) { check(`"${name}" is a real tile`, false); continue; }
      check(`"${name}" is worth ${tile[2]} EP`, money(row[3]) === tile[2], `book says ${row[3]}`);
    }
  }
  const tiers = tableByHead(/Tier \| Tiles/);
  check("the tier table is there", !!tiers);
  if (tiers) {
    for (const row of tiers.rows) {
      const tier = Number(String(row[0]).replace(/[^0-9]/g, ""));
      const want = Object.keys(E.MEGACORP_TIER).filter((k) => E.MEGACORP_TIER[k] === tier);
      const got = String(row[1]).split(",").map((x) => x.trim()).filter(Boolean);
      check(`tier ${tier} lists exactly its ${want.length} tiles`,
        got.length === want.length && want.every((w) => got.includes(w)),
        `book says ${got.join(", ")}`);
      // "A $6 industry banks" - price divided by tier, floored
      for (const p of [3, 6]) {
        const col = tiers.head.findIndex((h) => new RegExp(`\\$${p} industry`).test(h));
        if (col > 0) check(`tier ${tier}: a $${p} good banks ${Math.floor(p / tier)} EP`,
          money(row[col]) === Math.floor(p / tier), `book says ${row[col]}`);
      }
    }
  }
  check(`a second Megacorp ends the game (engine: ${E.MEGACORPS_TO_END})`,
    everyString.some((s) => /second Megacorp/i.test(s)) && E.MEGACORPS_TO_END === 2);
  check(`a neighbour is worth ${E.MEGACORP_NEIGHBOUR_EP} EP`,
    everyString.some((s) => new RegExp(`${E.MEGACORP_NEIGHBOUR_EP} EP for every ?(OTHER|other)? ?company`).test(s)));
}

/* --------------------------------------------------------------- personas */
section("Personas");
{
  const t = tableByHead(/Persona \| Power/);
  check("the persona table is there", !!t);
  if (t) {
    const keys = Object.keys(E.PERSONAS);
    check(`all ${keys.length} personas are listed`, t.rows.length === keys.length,
      `book lists ${t.rows.length}`);
    for (const row of t.rows) {
      const name = String(row[0]).replace(/\s*\([A-Z]{2}\)\s*$/, "").trim();
      const per = keys.map((k) => E.PERSONAS[k]).find((x) => x.name === name);
      if (!per) { check(`"${name}" is a real persona`, false); continue; }
      check(`"${name}" is quoted verbatim`, String(row[1]).trim() === per.blurb.trim(),
        String(row[1]).trim().slice(0, 60) + "…");
    }
  }
}

/* --------------------------------------------------------- loose numbers */
section("Numbers quoted in the prose");
{
  check(`cash converts at $${E.CASH_PER_EP} per EP`,
    everyString.some((s) => new RegExp(`\\$${E.CASH_PER_EP}\\b`).test(s) && /EP/.test(s)),
    "no sentence states the rate");
  check(`there is no stale $20-per-EP or $10-per-EP line`,
    !everyString.some((s) => /\$(10|20) = 1 EP|per full \$(10|20)\b/.test(s)));
  /* The prose spells small numbers out, so accept either form. */
  const WORD = { 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 10: "ten", 12: "twelve" };
  const states = (v, unit) => {
    const w = WORD[v];
    const re = new RegExp(`\\b(${v}${w ? `|${w}` : ""})\\s+${unit}`, "i");
    return everyString.some((s) => re.test(s));
  };
  check(`each player has ${E.DISCS_PER_PLAYER} discs`, states(E.DISCS_PER_PLAYER, "discs"));
  check(`the company cap is ${E.COMPANY_SLOTS}`,
    states(E.COMPANY_SLOTS, "(active )?compan(y|ies)? ?(slots)?"));
}

/* --------------------------------------- the floor, the rate, and the rent */
section("The floor, the recycling rate and the rent");
{
  /* PRICE_MIN and the $1 recycling rate used to be the same number, and a lot of
     prose leaned on that. They are not the same number any more, and every
     sentence that treats $1 as the bottom of the track is now wrong. */
  const floorTalk = everyString.filter((s) =>
    /sink (toward|to) \$1\b|recycling floor|bottoms? out at \$1|floor of \$1/i.test(s));
  check(`nothing calls $1 the price floor (it is $${E.PRICE_MIN})`, floorTalk.length === 0,
    floorTalk.length ? floorTalk[0].slice(0, 100) + "…" : "");
  check(`the book says a crowded industry sinks to $${E.PRICE_MIN}`,
    everyString.some((s) => new RegExp(`sink (toward|to) \\$${E.PRICE_MIN}\\b`).test(s)));

  const RENT = 2;   // RENT_PER_LEVEL, which the engine does not export by name here
  const rentTalk = everyString.filter((s) => /\$\d+ (a|per) level/i.test(s) && !/was \$/.test(s));
  for (const t of rentTalk) {
    const got = Number((t.match(/\$(\d+) (?:a|per) level/i) || [])[1]);
    check(`rent quoted as $${got} a level is right`, got === RENT, t.slice(0, 80) + "…");
  }
}

/* ------------------------------------------------ reclaim and renovation */
section("Reclaiming and renovating a distressed structure");
{
  /* reclaimCost returns what the bank actually paid - full setup for an
     upgraded company, half for one that was not, a quarter on a forced sale.
     The book used to say a flat "half its own setup cost". */
  const flatHalf = everyString.filter((s) =>
    /distressed structure as it stands for half its own setup cost/i.test(s));
  check("no paragraph still says a shell costs a flat half setup", flatHalf.length === 0,
    flatHalf.length ? flatHalf[0].slice(0, 100) + "…" : "");
  check("the book says a buy-back costs what the bank paid",
    everyString.some((s) => /exactly what the bank paid|what the bank handed over|what it was sold for/i.test(s)),
    "the reclaim price rule is not stated anywhere");
  check("renovating is half the setup of the card you play",
    everyString.some((s) => /half that card's setup cost/i.test(s)));
  check("the book says renovating moves the price markers and reclaiming does not",
    everyString.some((s) => /renovat/i.test(s) && /price|marker/i.test(s) && /reclaim|buy(ing)? it back|as it stands/i.test(s)),
    "the difference is not stated anywhere");
}

console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
process.exit(fails ? 1 : 0);
