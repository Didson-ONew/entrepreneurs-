/* ============================================================================
   ENTREPRENEURS - the Instagram kit.

   Renders every still frame for the launch sequence, and writes the animated
   pages the Reels are screen-recorded from.

   EVERYTHING HERE READS THE ENGINE. Industry names, colours, base prices,
   persona powers, the supply web, the card count - all of it is pulled out of
   EntrepreneursGame.jsx at build time rather than typed into a design file. A
   marketing asset that contradicts the rules is worse than no asset, and the
   only way to be sure it never does is to give it one source.

   OUTPUT  instagram/
     01-4_what-is/*.png     carousel slides, 1080x1350
     ...
     reels/*.html           1080x1920 animated pages to screen-record
     CAPTIONS.md            every caption, with the corrections marked

   ON VIDEO. There is no ffmpeg on this machine, so nothing here can produce an
   .mp4. The Reels are delivered as self-contained animated HTML at exactly
   1080x1920: open one, screen-record it, and the loop is the Reel. Each also
   writes its frames as PNGs for anyone who would rather cut it in an editor.

   Run: node make_instagram.mjs
   ========================================================================== */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "instagram");

/* ---------------------------------------------------------------- engine */
const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this script"); process.exit(2); }
/* MARK THE COMPANIES A MEGACORP EATS.

   Forming a Megacorp sets `distressed` on every company it absorbs except the
   one that becomes the HQ - exactly the flag a voluntary SALE sets. Nothing
   distinguishes them afterwards, so reel 12 was painting a merger and a sale
   identically: four companies vanishing into a Megacorp looked like four
   companies being sold off, which is close to the opposite story.

   The engine has no field for it, so the flag is added here, in the sandbox
   copy. The repo file is never touched. The needle is asserted before it is
   replaced, so this stops rather than silently rendering the old picture if the
   merge is ever rewritten. */
const MERGE_NEEDLE = `  match.have.forEach((b) => {
    if (b === hq) return;
    b.distressed = true;
  });`;
if (!SRC.includes(MERGE_NEEDLE)) {
  console.error("the Megacorp merge has changed shape - update this script");
  process.exit(2);
}
const MERGE_PATCH = `  match.have.forEach((b) => {
    if (b === hq) return;
    b.distressed = true;
    b.absorbedBy = name;
  });`;

const box = {};
const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
vm.createContext(sandbox);
vm.runInContext(SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "")
  .replace(MERGE_NEEDLE, MERGE_PATCH) + `
  box.E = { BP_DATA, INDUSTRIES, IND_NAME, IND_COLOR, BASE_PRICE, PERSONAS,
            MEGACORPS_TO_END, DISCS_PER_PLAYER, CASH_PER_EP, SCALING,
            PRICE_MIN, PRICE_MAX, RENT_PER_LEVEL, PLAYER_COLORS, COORDS };
  box.E2 = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
             activeBiz, megacorpHQs, bizInd, price };
`, sandbox);
const E = box.E;
const E2 = box.E2;      // the parts needed to actually play a game for reel 12

/* Who buys from whom, straight off the cards. */
const SUPPLIES = {};      // ind -> the industries that list it as a supplier
const BUYS = {};          // ind -> the industries it lists as suppliers
E.INDUSTRIES.forEach((i) => { SUPPLIES[i] = new Set(); BUYS[i] = new Set(); });
for (const bp of E.BP_DATA) {
  for (const d of bp.deps) { BUYS[bp.ind].add(d.ind); SUPPLIES[d.ind].add(bp.ind); }
}

/* ---------------------------------------------------------------- styling */
const INK = "#0E1013", CARD = "#14161A", LINE = "#2A2F38";
const CREAM = "#F3F4F6", MUTE = "#8B93A3", GOLD = "#F5A623", MINT = "#8FD3B6";
const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif`;

const shell = (w, h, body, extraCss = "") => `<!doctype html><html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${w}px;height:${h}px;background:${INK};color:${CREAM};font-family:${FONT};overflow:hidden}
  .stage{width:${w}px;height:${h}px;position:relative;display:flex;flex-direction:column}
  .pad{padding:78px 76px}
  .kicker{font-size:24px;font-weight:800;letter-spacing:4px;color:${GOLD};text-transform:uppercase}
  h1{font-size:82px;line-height:1.02;font-weight:850;letter-spacing:-2px}
  h2{font-size:56px;line-height:1.08;font-weight:820;letter-spacing:-1px}
  p{font-size:30px;line-height:1.5;color:#C9CFDA}
  .big{font-size:120px;font-weight:880;letter-spacing:-4px;line-height:1}
  .mono{font-variant-numeric:tabular-nums}
  .foot{position:absolute;left:76px;bottom:52px;font-size:22px;color:${MUTE};letter-spacing:2px;font-weight:700}
  .pageno{position:absolute;right:76px;bottom:52px;font-size:22px;color:${MUTE};font-weight:700}
  ${extraCss}
</style></head><body><div class="stage">${body}</div></body></html>`;

const foot = (n, total) =>
  `<div class="foot">ENTREPRENEURS</div>${n ? `<div class="pageno">${n}/${total}</div>` : ""}`;

/* An industry chip, coloured the way the game colours it. */
const chip = (ind, size = 1) => `
  <div style="display:flex;align-items:center;gap:${14 * size}px">
    <div style="width:${34 * size}px;height:${34 * size}px;border-radius:${8 * size}px;
                background:${E.IND_COLOR[ind]}"></div>
    <span style="font-size:${30 * size}px;font-weight:750">${E.IND_NAME[ind]}</span>
  </div>`;

/* ---------------------------------------------------------------- slides */
const slides = [];   // { file, w, h, html }
const add = (file, html, w = 1080, h = 1350) => slides.push({ file, w, h, html });

/* ---- 1. What is Entrepreneurs? --------------------------------------- */
add("01_what-is/1.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="kicker">A game about a city that pays for itself</div>
    <h1 style="margin-top:28px">Six industries.<br>One city.</h1>
    <p style="margin-top:34px;font-size:34px">Every company you build<br>pays another company's bills.</p>
  </div>
  ${foot(1, 4)}`));

add("01_what-is/2.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:26px">
    <div class="kicker">The six</div>
    ${E.INDUSTRIES.map((i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;
                  border-bottom:1px solid ${LINE};padding-bottom:20px">
        ${chip(i, 1.15)}
        <div style="text-align:right">
          <div class="mono" style="font-size:38px;font-weight:820;color:${E.IND_COLOR[i]}">$${E.BASE_PRICE[i]}</div>
          <div style="font-size:19px;color:${MUTE};letter-spacing:1px">BASE PRICE</div>
        </div>
      </div>`).join("")}
  </div>
  ${foot(2, 4)}`));

add("01_what-is/3.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="kicker">The catch</div>
    <h2 style="margin-top:26px">Your operating costs<br>don't vanish.</h2>
    <p style="margin-top:30px">They land in a rival industry's pocket.</p>
    <div style="margin-top:44px;display:flex;flex-direction:column;gap:22px">
      <div style="background:${CARD};border:1px solid ${LINE};border-radius:18px;padding:28px 30px">
        <div style="font-size:26px;color:${MUTE};letter-spacing:1px;font-weight:700">BUILD IN A CROWDED SECTOR</div>
        <div style="font-size:36px;font-weight:800;margin-top:8px">You push its price down.</div>
      </div>
      <div style="background:${CARD};border:1px solid ${GOLD};border-radius:18px;padding:28px 30px">
        <div style="font-size:26px;color:${GOLD};letter-spacing:1px;font-weight:700">SERVE ONE NOBODY'S TOUCHED</div>
        <div style="font-size:36px;font-weight:800;margin-top:8px">You collect what's piled up.</div>
      </div>
    </div>
  </div>
  ${foot(3, 4)}`));

add("01_what-is/4.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="kicker">Where it is</div>
    <h2 style="margin-top:26px">Months of it.<br>Posted here.</h2>
    <p style="margin-top:30px">Digital prototype. Print-and-play.<br>3D-printed pieces.</p>
    <p style="margin-top:26px;color:${GOLD};font-weight:700">Including the parts that didn't work.</p>
    <div style="margin-top:56px;display:flex;gap:18px;flex-wrap:wrap">
      ${["2–6 PLAYERS", "120–180 MIN", "AGE 14+", "ECONOMIC EURO"].map((t) => `
        <span style="border:1px solid ${LINE};border-radius:999px;padding:14px 24px;
                     font-size:23px;font-weight:750;color:${MINT}">${t}</span>`).join("")}
    </div>
  </div>
  ${foot(4, 4)}`));

/* ---- 3. the price mechanic ------------------------------------------- */
/* The track, drawn honestly: 19 cells, blanks between the numbers. */
/* Where a marker sits for a given price, the way the engine lays the track out.
   Typing cell numbers by hand is how a slide ends up contradicting the rules. */
const cellOf = (price) => (price - E.PRICE_MIN) * 2;
function trackRow(ind, cell, label) {
  const cells = [];
  for (let c = 0; c <= (E.PRICE_MAX - E.PRICE_MIN) * 2; c++) {
    const isNum = c % 2 === 0;
    const here = c === cell;
    cells.push(`<div style="flex:1;height:${isNum ? 54 : 34}px;border-radius:6px;
      background:${here ? E.IND_COLOR[ind] : isNum ? "#1C1F26" : "#15181D"};
      border:1px solid ${here ? E.IND_COLOR[ind] : LINE};display:flex;align-items:center;
      justify-content:center;font-size:19px;font-weight:800;
      color:${here ? "#0E1013" : "#5A616E"}">${isNum ? "$" + (1 + c / 2) : ""}</div>`);
  }
  return `<div style="margin-bottom:34px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
        ${chip(ind, 0.9)}
        <span style="font-size:23px;color:${MUTE};font-weight:700">${label}</span>
      </div>
      <div style="display:flex;gap:5px;align-items:center">${cells.join("")}</div>
    </div>`;
}

add("03_prices/1.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="kicker">Prices</div>
    <h2 style="margin-top:26px">Not a track that drifts.</h2>
    <p style="margin-top:24px">The sum of what everyone<br>at the table has built.</p>
    <div style="margin-top:56px">
      ${trackRow("RE", cellOf(E.BASE_PRICE.RE) - 2, "two shops built → down $1")}
      ${trackRow("TE", cellOf(E.BASE_PRICE.TE) + 2, "needed twice → up $1")}
    </div>
    <p style="margin-top:10px;font-size:26px;color:${MUTE}">
      Nineteen cells. A blank between every number.<br>Two moves either way is a dollar.</p>
  </div>
  ${foot(1, 3)}`));

add("03_prices/2.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:30px">
    <div class="kicker">Both directions</div>
    <div style="background:${CARD};border:1px solid ${LINE};border-radius:20px;padding:34px">
      <div style="font-size:34px;font-weight:820;color:${E.IND_COLOR.RE}">Build two Retail shops</div>
      <div style="font-size:30px;color:#C9CFDA;margin-top:10px">Retail's marker slides down a dollar.<br>More supply.</div>
    </div>
    <div style="background:${CARD};border:1px solid ${LINE};border-radius:20px;padding:34px">
      <div style="font-size:34px;font-weight:820;color:${E.IND_COLOR.TE}">Those shops pay Technology, every quarter</div>
      <div style="font-size:30px;color:#C9CFDA;margin-top:10px">Technology's marker climbs.<br>More demand.</div>
    </div>
    <p style="font-size:27px;color:${MUTE}">An industry built as often as it's needed<br>doesn't move at all.</p>
  </div>
  ${foot(2, 3)}`));

add("03_prices/3.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
    <div class="big" style="color:${GOLD}">$1</div>
    <h2 style="margin-top:30px">The floor.</h2>
    <p style="margin-top:26px;max-width:760px">Flood an industry and it collapses here — where selling is worth
      exactly what throwing the goods away is worth.</p>
    <p style="margin-top:40px;font-size:32px;font-weight:800;color:${MINT}">Read the market before you commit.</p>
  </div>
  ${foot(3, 3)}`));

/* ---- 5. balance, measured -------------------------------------------- */
add("05_balance/1.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="kicker">Balance</div>
    <h1 style="margin-top:26px">I don't guess<br>whether it's<br>balanced.</h1>
    <div class="big" style="margin-top:40px;color:${GOLD}">I measure it.</div>
  </div>
  ${foot(1, 4)}`));

/* The win-rate table, from a live 400-game run of tourney_personas.js. Parsed
   rather than typed: this is the one slide whose whole point is that the numbers
   are real and current, so it must not be possible to leave a stale one here. */
const TOURNEY = fs.existsSync("/tmp/personas.txt")
  ? fs.readFileSync("/tmp/personas.txt", "utf8") : "";
const winRows = [...TOURNEY.matchAll(/^\s{2}([A-Za-z\- ]+?)\s{2,}(UT|RE|HO|MA|HC|TE)\s+(\d+)%\s+(\d+)%/gm)]
  .map((m) => ({ name: m[1].trim(), ind: m[2], win: +m[3] }));
if (winRows.length !== 6) {
  console.error(`the tournament output has ${winRows.length} rows, not 6 - `
    + "re-run tourney_personas.js > /tmp/personas.txt before building the balance slide");
  process.exit(2);
}
const best = Math.max(...winRows.map((r) => r.win)), worst = Math.min(...winRows.map((r) => r.win));
add("05_balance/2.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="kicker">400 four-player games</div>
    <h2 style="margin-top:20px">Every persona,<br>every seat.</h2>
    <div style="margin-top:44px;display:flex;flex-direction:column;gap:16px">
      ${winRows.map((r) => `
        <div style="display:flex;align-items:center;gap:20px">
          <div style="width:22px;height:22px;border-radius:6px;background:${E.IND_COLOR[r.ind]};flex:none"></div>
          <div style="flex:1;font-size:26px;font-weight:730">${r.name}</div>
          <div style="width:330px;height:26px;background:#171A20;border-radius:6px;overflow:hidden">
            <div style="width:${(r.win / 40 * 100).toFixed(1)}%;height:100%;background:${E.IND_COLOR[r.ind]}"></div>
          </div>
          <div class="mono" style="width:76px;text-align:right;font-size:30px;font-weight:830">${r.win}%</div>
        </div>`).join("")}
    </div>
    <div style="margin-top:38px;display:flex;align-items:center;gap:16px">
      <div style="flex:1;height:1px;background:${LINE}"></div>
      <div style="font-size:25px;color:${GOLD};font-weight:780">fair share is 25%</div>
      <div style="flex:1;height:1px;background:${LINE}"></div>
    </div>
    <p style="margin-top:26px;font-size:26px;color:${MUTE}">
      ${best - worst}-point spread, against ±5 points of noise<br>on every one of those numbers.</p>
  </div>
  ${foot(2, 4)}`));

add("05_balance/3.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="kicker">What the data caught</div>
    <div style="margin-top:34px;display:flex;flex-direction:column;gap:24px">
      ${[
        ["A persona that did the opposite of what I predicted", "Post 6"],
        ["Utilities reaching four times the districts they should", "Post 8"],
        ["Bots that never noticed reach at all — hiding the first bug", "Post 8"],
        ["A price rule that doubled the winner's margin", "measured, then halved"],
      ].map(([t, tag]) => `
        <div style="background:${CARD};border:1px solid ${LINE};border-radius:18px;padding:26px 28px">
          <div style="font-size:30px;font-weight:780;line-height:1.3">${t}</div>
          <div style="font-size:21px;color:${MUTE};margin-top:10px;letter-spacing:1px">${tag.toUpperCase()}</div>
        </div>`).join("")}
    </div>
  </div>
  ${foot(3, 4)}`));

add("05_balance/4.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <h2>None of this<br>came from<br>playtesting.</h2>
    <p style="margin-top:32px">Six people around a table would need a year of
      evenings to see what a laptop sees in ten minutes.</p>
    <p style="margin-top:28px;color:${GOLD};font-weight:750">Playtesting tells you how it feels.<br>Simulation tells you if it's fair.</p>
    <p style="margin-top:28px;font-size:26px;color:${MUTE}">You need both. They answer different questions.</p>
  </div>
  ${foot(4, 4)}`));

/* ---- 6. I was wrong --------------------------------------------------- */
add("06_wrong/1.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="kicker" style="color:${E.IND_COLOR.HO}">I was wrong about this one</div>
    <div style="margin-top:36px">${chip("HO", 1.6)}</div>
    <p style="margin-top:44px;font-size:33px">I predicted horizontal upgrading would make
      Hospitality overpowered. It's the strongest industry in the game — spreading it across
      more plots should have compounded that.</p>
    <div style="margin-top:44px;background:${CARD};border:1px solid ${E.IND_COLOR.HO};
                border-radius:20px;padding:34px">
      <div style="font-size:44px;font-weight:850;color:${E.IND_COLOR.HO}">It finished third from bottom.</div>
    </div>
    <p style="margin-top:36px;font-size:29px;color:${MUTE}">Spreading dilutes the per-neighbour bonus
      instead of concentrating it — and every extra plot is a disc that can't hold a company.</p>
    <p style="margin-top:26px;font-size:31px;font-weight:800;color:${MINT}">Test the thing.</p>
  </div>
  ${foot(0, 0)}`));

/* ---- 8. the bug ------------------------------------------------------- */
function grid(nHighlight, label, color) {
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const on = r < nHighlight && c < nHighlight;
    cells.push(`<div style="aspect-ratio:1;border-radius:8px;
      background:${on ? color : "#171A20"};border:1px solid ${on ? color : LINE}"></div>`);
  }
  return `<div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;width:380px">${cells.join("")}</div>
    <div style="margin-top:16px;font-size:24px;color:${MUTE};font-weight:700">${label}</div>
  </div>`;
}

add("08_bug/1.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="kicker">The bug that hid another bug</div>
    <h2 style="margin-top:26px">Utilities were meant<br>to see N×N districts.</h2>
    <p style="margin-top:24px">My code gave them (2N−1)×(2N−1).</p>
    <div style="margin-top:50px;display:flex;gap:60px;align-items:flex-start">
      ${grid(2, "level 2 · intended · 4", E.IND_COLOR.UT)}
      ${grid(3, "level 2 · actual · 9", GOLD)}
    </div>
  </div>
  ${foot(1, 3)}`));

add("08_bug/2.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="big" style="color:${GOLD};font-size:150px">45</div>
    <h2 style="margin-top:20px">demand icons.<br>For 16 production.</h2>
    <p style="margin-top:32px">A level-3 Utility was seeing the entire city. The best reach in the
      game — on the one industry that isn't allowed to use logistics hubs at all.</p>
  </div>
  ${foot(2, 3)}`));

add("08_bug/3.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="kicker">The strange part</div>
    <h2 style="margin-top:26px">Nobody was<br>building it anyway.</h2>
    <p style="margin-top:32px">The bots valued cards by production ÷ cost.
      They never looked at reach at all.</p>
    <div style="margin-top:46px;background:${CARD};border:1px solid ${LINE};border-radius:20px;padding:34px">
      <div style="font-size:34px;font-weight:820;line-height:1.3">Two bugs pointing opposite directions,
        hiding each other for months.</div>
    </div>
  </div>
  ${foot(3, 3)}`));

/* ---- 10. the ask ------------------------------------------------------ */
add("10_ask/1.png", shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="kicker">Playable right now</div>
    <h1 style="margin-top:26px">In your<br>browser.</h1>
    <div style="margin-top:44px;display:flex;flex-direction:column;gap:20px">
      ${["Solo against bots", "Or online with up to five other people", "Chat and voice included",
         "No sign-up. No purchase. Nothing to install."].map((t) => `
        <div style="display:flex;gap:18px;align-items:center">
          <span style="color:${MINT};font-size:34px;font-weight:800">✓</span>
          <span style="font-size:31px">${t}</span>
        </div>`).join("")}
    </div>
    <p style="margin-top:50px;font-size:31px;font-weight:800;color:${GOLD}">
      Comment or DM and I'll send the link.</p>
  </div>
  ${foot(0, 0)}`));

/* ---- 11. the personas ------------------------------------------------- */
const PERSONA_ORDER = ["sys_arch", "preventive", "product_mgr", "customer_or", "supply_chain", "gov_rel"];
const personaKeys = Object.keys(E.PERSONAS);
const order = PERSONA_ORDER.filter((k) => personaKeys.includes(k))
  .concat(personaKeys.filter((k) => !PERSONA_ORDER.includes(k)));
order.forEach((key, n) => {
  const p = E.PERSONAS[key];
  const col = E.IND_COLOR[p.ind];
  add(`11_personas/${n + 1}.png`, shell(1080, 1350, `
    <div style="position:absolute;inset:0;background:
      radial-gradient(circle at 50% 22%, ${col}22, transparent 62%)"></div>
    <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center;position:relative">
      <div style="width:74px;height:74px;border-radius:18px;background:${col}"></div>
      <div style="margin-top:30px;font-size:22px;letter-spacing:3px;font-weight:800;color:${col}">
        ${E.IND_NAME[p.ind].toUpperCase()}</div>
      <h2 style="margin-top:14px">${p.name}</h2>
      <p style="margin-top:30px;font-size:32px">${p.blurb}</p>
    </div>
    ${foot(n + 1, order.length + 1)}`));
});
add(`11_personas/${order.length + 1}.png`, shell(1080, 1350, `
  <div class="pad" style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <h2>Six specialists.</h2>
    <p style="margin-top:30px">Only as many as there are players get dealt —
      so at least two sit out every game.</p>
    <p style="margin-top:30px;font-size:27px;color:${MUTE}">Which changes what's on the table
      before anyone has placed a worker.</p>
    <div class="big" style="margin-top:52px;color:${GOLD};font-size:78px">Which<br>would you<br>pick?</div>
  </div>
  ${foot(order.length + 1, order.length + 1)}`));

/* ---------------------------------------------------------------- reels */
/* Self-contained animated pages at Reel size. Screen-record to get the video. */
const REEL_CSS = `
  @keyframes fadeUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
  .cap{position:absolute;left:70px;right:70px;bottom:220px;font-size:46px;line-height:1.28;
       font-weight:800;letter-spacing:-.5px}
  .sub{position:absolute;left:70px;right:70px;bottom:150px;font-size:29px;color:${MUTE};font-weight:650}
`;

/* Reel 2 - the supply web. Drawn from the real dependency graph. */
function reelSupplyWeb() {
  const n = E.INDUSTRIES.length, R = 330, CXY = 540;
  const pos = E.INDUSTRIES.map((ind, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { ind, x: CXY + R * Math.cos(a), y: CXY + R * Math.sin(a) };
  });
  const at = (ind) => pos.find((p) => p.ind === ind);
  const edges = [];
  E.INDUSTRIES.forEach((from) => {
    [...SUPPLIES[from]].forEach((to) => {
      const a = at(from), b = at(to);
      edges.push({ from, to, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    });
  });
  const dur = 12;                       // seconds for a full pass
  const per = dur / n;
  const svgEdges = edges.map((e, i) => {
    const step = E.INDUSTRIES.indexOf(e.from);
    return `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}"
      stroke="${E.IND_COLOR[e.from]}" stroke-width="4" stroke-linecap="round"
      style="opacity:0;animation:edge${step} ${dur}s ${(step * per).toFixed(2)}s infinite"/>`;
  }).join("");
  const edgeKeyframes = E.INDUSTRIES.map((_, s) => `
    @keyframes edge${s}{0%{opacity:0}${(100 / n * 0.15).toFixed(1)}%{opacity:.95}
      ${(100 / n * 0.9).toFixed(1)}%{opacity:.35}100%{opacity:.12}}`).join("");
  const nodes = pos.map((p, i) => `
    <g style="animation:pulse ${dur}s ${(i * per).toFixed(2)}s infinite">
      <circle cx="${p.x}" cy="${p.y}" r="62" fill="${E.IND_COLOR[p.ind]}"/>
      <text x="${p.x}" y="${p.y + 13}" text-anchor="middle" font-size="38" font-weight="850"
        fill="#0E1013" font-family='${FONT}'>${p.ind}</text>
    </g>`).join("");
  return shell(1080, 1920, `
    <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-start;padding-top:150px">
      <div style="text-align:center">
        <div class="kicker">The supply web</div>
        <div style="font-size:60px;font-weight:850;margin-top:16px;letter-spacing:-1px">No dead ends.</div>
      </div>
      <svg width="1080" height="1080" viewBox="0 0 1080 1080" style="margin-top:40px">
        ${svgEdges}${nodes}
      </svg>
      <div class="cap">Every industry buys from three others<br>and sells to three others.</div>
      <div class="sub">Six industries · eighteen supply lines · no safe corner</div>
    </div>`, `
    ${REEL_CSS}
    ${edgeKeyframes}
    @keyframes pulse{0%,100%{opacity:.55}8%{opacity:1}30%{opacity:.75}}
  `);
}

/* Reel 7 - placement order AND what it costs you in actions.

   Two earlier problems, both about the same confusion. The first cut drew the
   order but not the cost. The second put the numbers in, and because the resolve
   row counts DOWN while the placement row counts UP, it read as though the
   fourth player to commit was the one acting last with four actions - the exact
   opposite of the rule.

   The fix is that a player is a COLOUR, not a number. The same coloured disc
   sits in the same column in both rows, so the eye tracks one player straight
   down: the cyan disc committed first, and the cyan disc acts last, four times.
   The numbers then annotate that instead of carrying it. */
function reelTurnOrder() {
  const N = 4;
  const PC = E.PLAYER_COLORS;
  const T = (n) => 0.5 + n * 0.62;                    // placement beat
  const R = (n) => 3.6 + n * 0.78;                    // resolution beat, right to left
  const cell = (i, phase) => {
    const col = PC[i];
    const actNo = N - i;                               // rightmost acts first
    const actions = N - i;                             // and takes that many actions
    const delay = phase === "place" ? T(i) : R(N - 1 - i);
    const ord = ["1st", "2nd", "3rd", "4th"];
    return `
      <div class="cell" style="animation-delay:${delay}s">
        <div class="disc" style="background:${col};box-shadow:0 0 0 6px ${col}22">
          ${phase === "place" ? i + 1 : actNo}
        </div>
        <div class="under" style="color:${col}">
          ${phase === "place" ? `committed ${ord[i]}` : `acts ${ord[actNo - 1]} · ${actions} action${actions > 1 ? "s" : ""}`}
        </div>
      </div>`;
  };
  return shell(1080, 1920, `
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:64px;padding:0 62px">
      <div style="text-align:center">
        <div class="kicker">One track, four seats</div>
        <div style="font-size:58px;font-weight:850;margin-top:12px;letter-spacing:-1.2px">
          Last in, first out.</div>
      </div>

      <div>
        <div class="rowlbl" style="color:${MINT}">Planning &nbsp;→&nbsp; workers go down left to right</div>
        <div class="row">${[0, 1, 2, 3].map((i) => cell(i, "place")).join("")}</div>
      </div>

      <div class="linkrow">${[0, 1, 2, 3].map((i) =>
        `<div class="linkcol"><div class="link" style="background:linear-gradient(${PC[i]}00,${PC[i]}cc)"></div></div>`).join("")}</div>

      <div>
        <div class="rowlbl" style="color:${GOLD}">Action &nbsp;←&nbsp; the track resolves right to left</div>
        <div class="row">${[0, 1, 2, 3].map((i) => cell(i, "resolve")).join("")}</div>
      </div>

      <div style="background:${CARD};border:1px solid ${GOLD};border-radius:22px;padding:32px 34px">
        <div style="font-size:36px;font-weight:850;color:${GOLD};line-height:1.3">
          Commit first — act most, but last.<br>Join late — act first, but least.</div>
        <div style="font-size:27px;color:#C9CFDA;margin-top:14px">
          One action, plus one more for every worker that lands after yours.</div>
      </div>
    </div>`, `
    ${REEL_CSS}
    .rowlbl{font-size:28px;font-weight:800;letter-spacing:.4px;margin-bottom:18px}
    .row{display:flex;gap:18px}
    .cell{flex:1;display:flex;flex-direction:column;align-items:center;gap:12px;
          opacity:0;animation:fadeUp .45s forwards}
    .disc{width:118px;height:118px;border-radius:999px;display:flex;align-items:center;
          justify-content:center;font-size:52px;font-weight:870;color:#0E1013}
    .under{font-size:20px;font-weight:750;text-align:center;line-height:1.25}
    .linkrow{display:flex;gap:18px;margin:-30px 0 -30px}
    .linkcol{flex:1;display:flex;justify-content:center}
    .link{width:7px;height:56px;border-radius:4px;opacity:.75}
  `);
}

/* Reel 4 - what a piece tells you. */
function reelPieces() {
  const row = (art, title, sub, delay) => `
    <div style="display:flex;align-items:center;gap:34px;opacity:0;animation:fadeUp .6s ${delay}s forwards">
      <div style="width:190px;display:flex;justify-content:center">${art}</div>
      <div>
        <div style="font-size:40px;font-weight:840">${title}</div>
        <div style="font-size:27px;color:${MUTE};margin-top:8px">${sub}</div>
      </div>
    </div>`;
  const stack = (n) => `<div style="display:flex;flex-direction:column-reverse;gap:6px">
    ${Array.from({ length: n }).map(() => `<div style="width:96px;height:34px;border-radius:6px;
      background:${E.IND_COLOR.HO}"></div>`).join("")}</div>`;
  const disc = (c) => `<div style="width:96px;height:96px;border-radius:999px;background:${c}"></div>`;
  const pyramid = `<div style="width:0;height:0;border-left:56px solid transparent;
    border-right:56px solid transparent;border-bottom:96px solid #0B0D10;filter:drop-shadow(0 0 2px #444)"></div>`;
  return shell(1080, 1920, `
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:70px;padding:0 70px">
      <div style="opacity:0;animation:fadeUp .6s .2s forwards">
        <div class="kicker">No text on the board</div>
        <div style="font-size:58px;font-weight:850;margin-top:14px;letter-spacing:-1px">
          Every piece tells you<br>something.</div>
      </div>
      ${row(stack(3), "Stack height", "the company's level", 1.0)}
      ${row(disc("#22D3EE"), "Disc underneath", "who owns the land", 1.8)}
      ${row(disc("#FB923C"), "Disc on top", "who owns the business", 2.6)}
      ${row(pyramid, "Black pyramid", "a Megacorp headquarters", 3.4)}
    </div>`, REEL_CSS);
}

/* Reel 12 - twelve quarters of a REAL game, with what actually happened in it.

   The first cut was an 8x8 grid lighting up in colours picked by `i % 6`: not
   the real board, not real companies, not a real order. The second played a real
   game but flattened it - every plot looked like a level-1 company sitting beside
   another, and the two things a viewer would most want to see, the Megacorps and
   the prices moving, were not on screen at all.

   This records, at every quarter boundary, the industry AND LEVEL standing on
   each plot, which plots carry a Megacorp headquarters, and the price of all six
   goods. Then it draws the city filling and the price chart moving on the same
   clock, because those two things are the same event seen twice: every company
   that goes up is a supplier bill somebody now pays, and the chart is where that
   shows. */
/* WHICH QUARTER A FRAME IS. The hook fires on the log line that OPENS a
   quarter, so the state it sees is everything the previous quarter finished
   with: the frame taken as Quarter N begins is the end of Quarter N-1. Then one
   final snapshot after the game returns is the end of the last quarter. So
   twelve frames are the ends of quarters 1 through 12, evenly spaced - but only
   if the axis is labelled from the quarter each frame actually carries, which
   is why `qEnd` is recorded here instead of being assumed downstream. */
/* `seats` is the TABLE SIZE. initGame's first argument is the number of BOTS
   and it adds one seat per human name, so a table of six is five bots plus the
   one nominal human seat below - which is then handed to a bot as well, because
   the reel wants a game that plays itself. Passing the table size straight
   through asked for a seven player game, and STARTING has no row past six. */
function playOneGame(seed, seats) {
  const st = E2.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
  if (st.players.length !== seats) throw new Error(`asked for ${seats} seats, got ${st.players.length}`);
  st.players[0].isHuman = false;
  if (st.phase === "drafting") { E2.advanceDraft(st, () => {}); E2.startPlanning(st); }
  const frames = [];        // per quarter: { qEnd, plots:{plot:{ind,lvl,hq,sold}}, prices:{ind:$} }
  const snapshot = (qEnd) => {
    const meta = {};
    for (const p of st.players) {
      /* A company that has been SOLD is not gone. `sellCompany` only sets
         `distressed`, so the structure keeps standing on its plots and can be
         taken over and renovated later - which is why it is recorded here as a
         state of its own rather than being dropped. Reading only activeBiz left
         a sold company frozen on the board at full strength, showing a city
         fuller than the one the players were actually running.

         MERGED is the other way a company goes distressed, and it is a
         different event: it was eaten to form a Megacorp rather than sold off.
         Both leave a shell anyone can renovate, so both draw at half strength -
         but the merged ones are outlined in the Megacorp's gold, because they
         are the price somebody paid for the star on the board. */
      for (const b of p.businesses) {
        const shell = !b.isHQ && !!b.distressed;
        meta[b.id] = { id: b.id, ind: E2.bizInd(b), lvl: b.level,
                       hq: !!b.isHQ, sold: shell && !b.absorbedBy,
                       merged: shell && !!b.absorbedBy };
      }
    }
    const plots = {};
    for (const [plot, bizId] of Object.entries(st.board.occupiedBy || {})) {
      if (bizId === undefined || bizId === null) continue;
      if (meta[bizId]) plots[plot] = meta[bizId];
    }
    const prices = {};
    for (const ind of E.INDUSTRIES) prices[ind] = E2.price(st.pm, ind);
    frames.push({ qEnd, plots, prices });
  };
  E2.advancePlanning(st, E2.mulberry32(seed + 777), (msg) => {
    if (/^▶ Year \d+, Quarter \d+/.test(String(msg))) snapshot(st.quarter - 1);
  });
  snapshot(st.quarter);
  const hqs = new Set(), sold = new Set(), merged = new Set();
  for (const f of frames) for (const [plot, m] of Object.entries(f.plots)) {
    if (m.hq) hqs.add(plot);
    if (m.sold) sold.add(plot);
    if (m.merged) merged.add(plot);
  }
  /* A quarter in which neither the city nor the chart moved is a quarter the
     reel spends showing a still image. Counting them - especially the ones near
     the end, where a viewer reads a flat run as "the game stopped" - is how a
     seed gets rejected below. */
  let dead = 0, deadLate = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1], b = frames[i];
    const cityMoved = Object.keys(a.plots).length !== Object.keys(b.plots).length
      || Object.keys(b.plots).some((k) => !a.plots[k] || a.plots[k].lvl !== b.plots[k].lvl
        || a.plots[k].hq !== b.plots[k].hq || a.plots[k].sold !== b.plots[k].sold
        || a.plots[k].merged !== b.plots[k].merged);
    const priceMoved = E.INDUSTRIES.some((ind) => a.prices[ind] !== b.prices[ind]);
    if (!cityMoved && !priceMoved) { dead++; if (i >= frames.length - 4) deadLate++; }
  }
  return { st, frames, dead, deadLate, hqCount: hqs.size, soldCount: sold.size,
           mergedCount: merged.size,
           built: new Set(frames.flatMap((f) => Object.keys(f.plots))).size };
}

function reelTwelveQuarters(seats) {
  /* CHOOSING THE GAME.

     A game worth showing needs Megacorps in it - they are the endgame, and a
     reel that never shows one is describing a different game. But the previous
     search asked for nothing else, and the seed it settled on filled only 20 of
     the 64 plots and then stopped dead: the last four quarters built nothing
     and moved no price, so the whole of the third year was a still image.

     So the ranking is now, in order: a game that runs the full twelve quarters,
     then no dead quarters in the closing stretch, then the fullest city, then
     the most Megacorps.

     TABLE SIZE, measured over the same 200 seeds rather than guessed:

       seats   plots built   Megacorps   sold   price moves   ends early
         2         8.5          1.3       3.1       7.5          9%
         3        12.6          2.0       4.5      10.6          3%
         4        18.3          3.2       6.4      14.8          7%
         5        23.1          5.1       9.8      17.7         23%
         6        27.0          6.6      12.0      18.9         41%

     Every seat added builds more, merges more and sells more, so six is the
     fullest city on offer. The chart is the flatter return: price movement
     gains only 7% from five to six, because the extra builds push prices down
     roughly as fast as the extra supplier appearances push them up.

     The cost of six is that 41% of those games end before Quarter 12 - somebody
     claims a second Megacorp and the deadline fires. A reel titled "Twelve
     quarters" cannot show a game that stopped at ten, so the search requires
     the full twelve and simply skips the rest. There are plenty left.

     Six is the flagship, but the same reel is cut for every table size, because
     "what does a two player game look like" is a question a buyer actually
     asks, and the honest answer is a much emptier board. */
  const SEATS = seats;
  let best = null;
  const better = (g, b) => !b || g.deadLate < b.deadLate
    || (g.deadLate === b.deadLate && (g.built > b.built
      || (g.built === b.built && g.hqCount > b.hqCount)));
  /* Every seed, no early exit. Two hundred games is nineteen seconds and the
     result is the best one rather than the first acceptable one - the previous
     search stopped as soon as a seed cleared a low bar, which is how it settled
     on a game that filled a third of the board. */
  for (let seed = 1; seed <= 200; seed++) {
    const g = playOneGame(seed, SEATS);
    if (g.frames[g.frames.length - 1].qEnd < 12) continue;   // ended on the Megacorp deadline
    if (better(g, best)) best = { ...g, seed };
  }
  if (!best) { console.error("no seed ran the full twelve quarters"); process.exit(2); }
  const { st, frames, seed } = best;
  console.log(`  reel 12 (${SEATS}p): seed ${seed} - ${best.built} plots built, `
    + `${best.hqCount} Megacorp HQ(s), ${best.soldCount} sold, ${best.mergedCount} merged away, `
    + `${best.dead} quarter(s) with nothing happening (${best.deadLate} of them late)`);

  const rs = [...new Set(Object.values(st.board.cellOf).map((c) => c.r))].sort((a, b) => a - b);
  const cs = [...new Set(Object.values(st.board.cellOf).map((c) => c.c))].sort((a, b) => a - b);
  const byDistrict = {};
  for (const [plot, c] of Object.entries(st.board.cellOf)) {
    const k = `${c.r},${c.c}`;
    (byDistrict[k] = byDistrict[k] || []).push(plot);
  }
  Object.values(byDistrict).forEach((a) => a.sort());

  const PER_Q = 1.15, LEAD = 0.7;
  const tOf = (q) => (LEAD + q * PER_Q).toFixed(2);

  /* Each plot as a list of states with the quarter each began, so an upgrade
     shows as the level changing rather than as a second company appearing. */
  const timeline = {};
  frames.forEach((f, q) => {
    for (const [plot, m] of Object.entries(f.plots)) {
      const seq = (timeline[plot] = timeline[plot] || []);
      const last = seq[seq.length - 1];
      if (!last || last.id !== m.id || last.ind !== m.ind || last.lvl !== m.lvl
          || last.hq !== m.hq || last.sold !== m.sold || last.merged !== m.merged) {
        if (last) last.until = q;
        seq.push({ ...m, from: q });
      }
    }
  });

  /* THE REAL GEOMETRY. A district is a 3x3 block with four of its eight compass
     positions carrying a plot and the centre always empty - COORDS in the engine
     is the authority. Drawing each district as a tidy 2x2 was wrong: it put
     plots next to each other that are not neighbours on the board, and separated
     ones that are. A horizontal company's footprint has to be orthogonally
     connected, so the layout has to be the board's own or the outline would be a
     lie. The whole city is therefore one 12x12 grid, and adjacency across a
     district boundary is real adjacency. */
  /* Level as a SHADE as well as a number: light at level 1, darker as it grows.
     The number alone made a level-4 company look identical to a level-1 beside
     it at a glance, which is the opposite of what the board does - a tall stack
     reads instantly. Mixing toward white and then toward black keeps every step
     inside the industry's own hue, so the colour still says WHICH industry. */
  const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgb2hex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v)))
    .toString(16).padStart(2, "0")).join("");
  const mix = (h, target, amt) => rgb2hex(hex2rgb(h).map((v, i) => v + (target[i] - v) * amt));
  const LEVEL_MIX = { 1: 0.46, 2: 0.22, 3: 0, 4: -0.26 };     // + toward white, - toward black
  const shadeOf = (ind, lvl) => {
    const amt = LEVEL_MIX[Math.min(4, Math.max(1, lvl))] ?? 0;
    return amt >= 0 ? mix(E.IND_COLOR[ind], [255, 255, 255], amt)
                    : mix(E.IND_COLOR[ind], [0, 0, 0], -amt);
  };
  /* Dark text on a light block, light text on a dark one. */
  const inkOn = (hexColor) => {
    const [r, g, b] = hex2rgb(hexColor);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 140 ? "#0E1013" : "#F3F4F6";
  };

  const CO = E.COORDS;                       // pos -> [x, y] inside a 3x3
  const GR = rs.length * 3, GC = cs.length * 3;
  const cellOfPlot = {};                     // plot -> {gr, gc}
  for (const [plot, c] of Object.entries(st.board.cellOf)) {
    const [dx, dy] = CO[c.pos];
    cellOfPlot[plot] = { gr: (rs.indexOf(c.r)) * 3 + dy, gc: (cs.indexOf(c.c)) * 3 + dx };
  }

  /* Which plots each company stood on, quarter by quarter, so the outline drawn
     for a state is the footprint that company actually had at that moment. */
  const footprintAt = frames.map((f) => {
    const byBiz = {};
    for (const [plot, m] of Object.entries(f.plots)) (byBiz[m.id] = byBiz[m.id] || []).push(plot);
    return byBiz;
  });

  /* A cell draws a border only on the sides where the neighbouring cell is not
     part of the same company. Do that for every plot of a footprint and the
     union is one unbroken outline around the whole company, however it sprawls. */
  const outlineFor = (plot, bizId, q, style = "solid") => {
    const mine = new Set(footprintAt[q][bizId] || [plot]);
    const at = {};
    for (const pl of mine) { const g = cellOfPlot[pl]; if (g) at[`${g.gr},${g.gc}`] = true; }
    const g = cellOfPlot[plot];
    if (!g) return "";
    const has = (dr, dc) => !!at[`${g.gr + dr},${g.gc + dc}`];
    const w = `3px ${style}`;
    return [
      has(-1, 0) ? "" : `border-top:${w} var(--oc);`,
      has(1, 0) ? "" : `border-bottom:${w} var(--oc);`,
      has(0, -1) ? "" : `border-left:${w} var(--oc);`,
      has(0, 1) ? "" : `border-right:${w} var(--oc);`,
    ].join("");
  };

  /* District plates sit behind the plots, so the districts still read as areas
     without pretending to be the grid. The centre of a 3x3 never holds a plot,
     which is exactly where the district's name goes. */
  const plates = rs.map((r, ri) => cs.map((c, ci) => {
    const tname = (Object.values(st.board.cellOf).find((x) => x.r === r && x.c === c) || {}).tname || "";
    return `<div class="plate" style="grid-row:${ri * 3 + 1}/span 3;grid-column:${ci * 3 + 1}/span 3"></div>
            <div class="dname" style="grid-row:${ri * 3 + 2};grid-column:${ci * 3 + 2}">${tname}</div>`;
  }).join("")).join("");

  const plotCells = Object.keys(cellOfPlot).map((plot) => {
    const g = cellOfPlot[plot];
    const seq = timeline[plot] || [];
    const layers = seq.map((sState) => {
      const col = sState.hq ? "#0B0D10" : shadeOf(sState.ind, sState.lvl);
      /* Gold ties a plot to a Megacorp: the HQ itself, and the companies that
         were eaten to build it. */
      const oc = (sState.hq || sState.merged) ? GOLD : "#F3F4F6";
      const ink = sState.hq ? GOLD : inkOn(col);
      /* A SOLD company sits at half strength: same hue, same level, visibly
         switched off. It is not removed, because it has not left the board -
         the shell stands there until somebody renovates it, and when they do
         the plot simply comes back to full shade. Half opacity says "still
         there, not trading" in a way that neither deleting it nor greying it to
         a neutral colour would.

         Opacity alone was not enough, though. Half of a light mint over a near
         black page is a mid grey-green, which a viewer reads as a DIFFERENT
         industry rather than a dimmed one - it loses exactly the information
         the colour is carrying. So the footprint outline goes dashed as well:
         a broken border says shell whatever the fill happens to look like. */
      const shell = sState.sold || sState.merged;
      const fo = shell ? ".5" : "1";
      const fadeOut = sState.until === undefined ? "" : `,fadeOut .3s ${tOf(sState.until)}s forwards`;
      return `<div class="fill" style="--oc:${oc};--fo:${fo};background:${col};
          ${outlineFor(plot, sState.id, sState.from, shell ? "dashed" : "solid")}
          animation:pop .45s ${tOf(sState.from)}s forwards${fadeOut}">
          ${sState.hq ? `<span class="hq">★</span>`
            : `<span class="lvl" style="color:${ink}">${sState.lvl}</span>`}
        </div>`;
    }).join("");
    return `<div class="plot" style="grid-row:${g.gr + 1};grid-column:${g.gc + 1}">${layers}</div>`;
  }).join("");

  const districts = plates + plotCells;

  /* The price chart, on the same clock. One polyline an industry, revealed by
     stroke-dashoffset so the line draws as the quarters pass. */
  /* PADR is a gutter for the end-of-line labels. Without it they were drawn
     past the right edge of the viewBox and never appeared at all. */
  const W = 956, H = 300, PADL = 54, PADR = 132, PADB = 26, PADT = 12;
  const nQ = frames.length;
  const xOf = (q) => PADL + (W - PADL - PADR) * (nQ === 1 ? 0 : q / (nQ - 1));
  const yOf = (v) => PADT + (H - PADT - PADB) * (1 - (v - E.PRICE_MIN) / (E.PRICE_MAX - E.PRICE_MIN));
  const totalT = LEAD + (nQ - 1) * PER_Q;
  /* The chart is revealed by a CLIP that sweeps left to right on exactly the
     clock the city fills on: at the instant quarter q pops on the map, the chart
     is revealed to quarter q. It used to animate stroke-dashoffset from a fixed
     dash length of 2400 for every line - but each polyline is a different real
     length, so every line revealed at its own wrong speed, finished early, and
     the last quarter arrived as a jump. A clip has no length to guess at. */
  const lines = E.INDUSTRIES.map((ind) => {
    const pts = frames.map((f, q) => `${xOf(q).toFixed(1)},${yOf(f.prices[ind]).toFixed(1)}`).join(" ");
    return `<polyline points="${pts}" fill="none" stroke="${E.IND_COLOR[ind]}" stroke-width="4"
      stroke-linejoin="round" stroke-linecap="round" clip-path="url(#reveal)"/>`;
  }).join("");
  const sweep = `<defs><clipPath id="reveal"><rect x="0" y="0" height="${H}"
      style="width:${xOf(0).toFixed(1)}px;
             animation:sweep ${((nQ - 1) * PER_Q).toFixed(2)}s ${LEAD}s linear forwards"/>
    </clipPath></defs>`;
  /* Industries that finish on the same price land on the same line, and the
     labels print on top of each other. Walk them top to bottom and push each one
     down until it clears the last, then draw a leader back to the real value so
     a nudged label still points at its own line. */
  const LBL_GAP = 26;
  const ordered = E.INDUSTRIES
    .map((ind) => ({ ind, v: frames[nQ - 1].prices[ind], y: yOf(frames[nQ - 1].prices[ind]) }))
    .sort((a, b) => a.y - b.y);
  let lastY = -Infinity;
  for (const o of ordered) { o.ly = Math.max(o.y, lastY + LBL_GAP); lastY = o.ly; }
  const endLabels = ordered.map((o) => {
    const x = xOf(nQ - 1);
    const leader = Math.abs(o.ly - o.y) > 2
      ? `<path d="M${(x + 4).toFixed(1)},${o.y.toFixed(1)} L${(x + 12).toFixed(1)},${o.ly.toFixed(1)}"
           stroke="${E.IND_COLOR[o.ind]}" stroke-width="2" fill="none" opacity=".7"/>` : "";
    return `<g style="opacity:0;animation:fadeIn .5s ${totalT.toFixed(2)}s forwards">
      ${leader}
      <text x="${(x + 16).toFixed(1)}" y="${(o.ly + 7).toFixed(1)}"
        fill="${E.IND_COLOR[o.ind]}" font-size="21" font-weight="800">${o.ind} $${o.v}</text>
    </g>`;
  }).join("");
  /* A key for a state that never occurs in THIS game is worse than no key: the
     two player cut has no sales in it at all, and a "sold" swatch sends the
     viewer hunting the board for something that is not there. So the legend is
     built from what this particular game contains. */
  const legend = [
    `<span><i class="sw" style="background:${E.IND_COLOR.RE}"></i>a company</span>`,
    `<span><i class="sw lv">2</i>its level</span>`,
    best.soldCount ? `<span><i class="sw soldsw" style="background:${E.IND_COLOR.HO}"></i>sold</span>` : "",
    best.mergedCount ? `<span><i class="sw mergedsw" style="background:${E.IND_COLOR.MA}"></i>merged away</span>` : "",
    best.hqCount ? `<span><i class="sw hqsw">★</i>Megacorp HQ</span>` : "",
  ].filter(Boolean).join("");

  const gridY = [1, 4, 7, 10].map((v) => `
    <line x1="${PADL}" y1="${yOf(v)}" x2="${W - PADR + 8}" y2="${yOf(v)}" stroke="${LINE}" stroke-width="1"/>
    <text x="14" y="${(yOf(v) + 7).toFixed(1)}" fill="${MUTE}" font-size="19" font-weight="700">$${v}</text>`).join("");

  /* THE YEARS, DRAWN WHERE THE YEARS ACTUALLY ARE.

     These used to be four words in a flex row under the chart - "Y1 Q1, Y2, Y3,
     Q12" - spread evenly across the full width of the container. The chart is
     not that wide: it reserves 54px on the left for the dollar scale and 132px
     on the right for the end labels. So "Y3" sat roughly above quarter ten and
     "Q12" hung out past the end of the data entirely, and a run of flat
     quarters at the close of a game read as the whole of the third year being
     flat. The x scale is the same one the polylines are plotted on, and every
     boundary is placed from the quarter its frame really carries, so the label
     cannot drift from the line above it again. */
  const xAtQ = (q) => {
    const i = frames.findIndex((f) => f.qEnd >= q);
    return xOf(i < 0 ? nQ - 1 : i);
  };
  const lastQ = frames[nQ - 1].qEnd;
  const yearMarks = [4, 8].filter((q) => q < lastQ).map((q) => `
    <line x1="${xAtQ(q).toFixed(1)}" y1="${PADT}" x2="${xAtQ(q).toFixed(1)}" y2="${H - PADB}"
      stroke="${LINE}" stroke-width="1" stroke-dasharray="4 6"/>`).join("");
  const yearLabels = [{ q: 1, t: "Y1" }, { q: 5, t: "Y2" }, { q: 9, t: "Y3" }]
    .filter((m) => m.q <= lastQ)
    .map((m) => `<text x="${(xAtQ(m.q) + 4).toFixed(1)}" y="${H - 6}"
        fill="${MUTE}" font-size="19" font-weight="800">${m.t}</text>`)
    .join("")
    + `<text x="${xAtQ(lastQ).toFixed(1)}" y="${H - 6}" text-anchor="end"
        fill="${MUTE}" font-size="19" font-weight="800">Q${lastQ}</text>`;

  return shell(1080, 1920, `
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 62px;gap:30px">
      <div style="text-align:center">
        <div class="kicker">One real game &middot; ${SEATS} players</div>
        <div style="font-size:58px;font-weight:850;margin-top:10px;letter-spacing:-1.4px">
          Twelve quarters.</div>
      </div>

      <div class="city">${districts}</div>

      <div class="legend">${legend}</div>

      <div style="margin-top:2px">
        <div class="chartlbl">What that did to the price of every good</div>
        <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block">
          ${sweep}${gridY}${yearMarks}${lines}${endLabels}${yearLabels}
        </svg>
      </div>

      <div style="text-align:center;font-size:30px;font-weight:780;color:#C9CFDA;line-height:1.35">
        Every company that goes up is a bill<br>
        <span style="color:${GOLD}">somebody else now collects.</span>
      </div>
    </div>`, `
    ${REEL_CSS}
    .city{display:grid;grid-template-columns:repeat(${GC},1fr);
          grid-template-rows:repeat(${GR},1fr);gap:3px;aspect-ratio:${GC}/${GR}}
    .plate{background:#12151A;border:1px solid ${LINE};border-radius:10px;
           margin:-2px;z-index:0}
    .plot{border-radius:5px;background:#1B1F27;position:relative;z-index:1}
    .fill{position:absolute;inset:-1px;opacity:0;--fo:1;display:flex;align-items:center;
          justify-content:center;border-radius:5px;box-sizing:border-box}
    .lvl{font-size:23px;font-weight:880;color:#0E1013}
    .hq{font-size:22px;color:${GOLD}}
    .dname{display:flex;align-items:center;justify-content:center;z-index:1;
           font-size:13px;color:#5A616E;font-weight:800;letter-spacing:.3px}
    .legend{display:flex;gap:26px;justify-content:center;font-size:20px;color:${MUTE};font-weight:700}
    .legend span{display:flex;align-items:center;gap:8px}
    .sw{width:24px;height:24px;border-radius:5px;display:inline-flex;align-items:center;
        justify-content:center;font-size:15px;font-weight:880;color:#0E1013}
    .sw.lv{background:${E.IND_COLOR.MA}}
    .sw.soldsw{opacity:.5;border:2px dashed ${CREAM}}
    .sw.mergedsw{opacity:.5;border:2px dashed ${GOLD}}
    .sw.hqsw{background:#0B0D10;border:2px solid ${GOLD};color:${GOLD}}
    .chartlbl{font-size:24px;font-weight:800;color:${CREAM};margin-bottom:8px;letter-spacing:.2px}
    @keyframes sweep{to{width:${(xOf(nQ - 1) + 3).toFixed(1)}px}}
    @keyframes fadeIn{to{opacity:1}}
    @keyframes fadeOut{to{opacity:0}}
    @keyframes pop{from{opacity:0;transform:scale(.55)}to{opacity:var(--fo);transform:scale(1)}}
  `);
}

/* Reel 12 is cut once per table size. Six players is the flagship and keeps the
   plain filename, because the caption and the gallery already point at it; the
   rest are suffixed. Each one searches its own 200 seeds, so a two player reel
   shows the best two player game rather than a six player game with four seats
   deleted - the boards really are that different. */
const TABLE_SIZES = [2, 3, 4, 5, 6];
const FLAGSHIP = 6;
const reels = [
  { file: "reels/02_supply-web.html", html: reelSupplyWeb() },
  { file: "reels/04_pieces.html", html: reelPieces() },
  { file: "reels/07_turn-order.html", html: reelTurnOrder() },
  ...TABLE_SIZES.map((n) => ({
    file: `reels/12_twelve-quarters${n === FLAGSHIP ? "" : `_${n}p`}.html`,
    html: reelTwelveQuarters(n),
  })),
];

/* ---------------------------------------------------------------- render */
fs.rmSync(OUT, { recursive: true, force: true });
const write = (rel, data) => {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
  return p;
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
let shot = 0;
for (const s of slides) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
  await page.setContent(s.html, { waitUntil: "load" });
  await page.screenshot({ path: write(s.file, Buffer.alloc(0)) });
  await page.close();
  shot++;
}
/* Reels: the animated page, plus a still cover frame for the feed. */
for (const r of reels) {
  write(r.file, r.html);
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.setContent(r.html, { waitUntil: "load" });
  await page.waitForTimeout(6000);           // let the animation settle
  await page.screenshot({ path: write(r.file.replace(/\.html$/, "_cover.png"), Buffer.alloc(0)) });
  await page.close();
}
await browser.close();

/* The captions live at the repo root, not in instagram/, because this script
   clears its own output directory on every run and prose written by hand must
   not be something a rebuild can delete. */
const capSrc = path.join(__dirname, "instagram_captions.md");
if (fs.existsSync(capSrc)) write("CAPTIONS.md", fs.readFileSync(capSrc));
else console.error("warning: instagram_captions.md is missing - no CAPTIONS.md written");

console.log(`instagram/  ${shot} slides, ${reels.length} reels (+covers)`);
