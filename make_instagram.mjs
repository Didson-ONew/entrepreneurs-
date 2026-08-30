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
const box = {};
const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
vm.createContext(sandbox);
vm.runInContext(SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "") + `
  box.E = { BP_DATA, INDUSTRIES, IND_NAME, IND_COLOR, BASE_PRICE, PERSONAS,
            MEGACORPS_TO_END, DISCS_PER_PLAYER, CASH_PER_EP, SCALING,
            PRICE_MIN, PRICE_MAX, RENT_PER_LEVEL };
`, sandbox);
const E = box.E;

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

/* Reel 7 - placement order. Left to right down, right to left back. */
function reelTurnOrder() {
  const slots = 4;
  const box = (i, delay, dir) => `
    <div style="width:170px;height:170px;border-radius:22px;border:2px solid ${LINE};
      background:${CARD};display:flex;align-items:center;justify-content:center;
      font-size:52px;font-weight:850;color:${dir === "down" ? MINT : GOLD};
      opacity:0;animation:fadeUp .5s ${delay}s forwards">${i}</div>`;
  return shell(1080, 1920, `
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:110px;padding:0 70px">
      <div>
        <div class="kicker" style="color:${MINT}">Workers go down</div>
        <div style="font-size:44px;font-weight:820;margin:14px 0 30px">left to right</div>
        <div style="display:flex;gap:22px">
          ${[1, 2, 3, 4].map((i) => box(i, 0.4 + i * 0.55, "down")).join("")}
        </div>
      </div>
      <div>
        <div class="kicker">The track resolves</div>
        <div style="font-size:44px;font-weight:820;margin:14px 0 30px">right to left</div>
        <div style="display:flex;gap:22px">
          ${[1, 2, 3, 4].map((i) => box(i, 3.4 + (slots - i) * 0.55, "up")).join("")}
        </div>
      </div>
      <div style="background:${CARD};border:1px solid ${GOLD};border-radius:22px;padding:34px 36px">
        <div style="font-size:40px;font-weight:850;color:${GOLD}">Whoever placed LAST acts FIRST.</div>
        <div style="font-size:30px;color:#C9CFDA;margin-top:14px">
          Place early → more actions, but everyone behind you moves first.<br>
          Place last → you move first, but only once.</div>
      </div>
    </div>`, REEL_CSS);
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

/* Reel 12 - twelve quarters, filling up. */
function reelTwelveQuarters() {
  const cells = [];
  for (let i = 0; i < 64; i++) {
    const ind = E.INDUSTRIES[i % E.INDUSTRIES.length];
    const q = Math.floor(i / 64 * 12);
    cells.push(`<div style="aspect-ratio:1;border-radius:9px;background:${CARD};border:1px solid ${LINE};
      position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:${E.IND_COLOR[ind]};opacity:0;
        animation:fadeUp .5s ${(0.6 + q * 1.1 + (i % 6) * 0.09).toFixed(2)}s forwards"></div>
    </div>`);
  }
  const ticks = Array.from({ length: 12 }).map((_, q) => `
    <div style="flex:1;height:8px;border-radius:4px;background:${LINE};position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:${GOLD};transform:scaleX(0);transform-origin:left;
        animation:grow 1.1s ${(0.6 + q * 1.1).toFixed(2)}s forwards"></div>
    </div>`).join("");
  return shell(1080, 1920, `
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 70px;gap:54px">
      <div style="text-align:center">
        <div class="kicker">Three fiscal years</div>
        <div style="font-size:66px;font-weight:850;margin-top:14px;letter-spacing:-1.5px">Twelve quarters.</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:12px">${cells.join("")}</div>
      <div style="display:flex;gap:8px">${ticks}</div>
      <div style="text-align:center;font-size:34px;font-weight:780;color:#C9CFDA">
        Every company placed changes<br>what the city needs next.</div>
    </div>`, `${REEL_CSS}
    @keyframes grow{to{transform:scaleX(1)}}`);
}

const reels = [
  { file: "reels/02_supply-web.html", html: reelSupplyWeb() },
  { file: "reels/04_pieces.html", html: reelPieces() },
  { file: "reels/07_turn-order.html", html: reelTurnOrder() },
  { file: "reels/12_twelve-quarters.html", html: reelTwelveQuarters() },
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
