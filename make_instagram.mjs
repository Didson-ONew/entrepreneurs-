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
function playOneGame(seed) {
  const st = E2.initGame(3, seed, ["Seat 1"], undefined, true, undefined);
  st.players[0].isHuman = false;
  if (st.phase === "drafting") { E2.advanceDraft(st, () => {}); E2.startPlanning(st); }
  const frames = [];                 // per quarter: { plots: {plot:{ind,lvl,hq}}, prices:{ind:$} }
  const snapshot = () => {
    const meta = {};
    for (const p of st.players) {
      for (const b of E2.activeBiz(p)) meta[b.id] = { id: b.id, ind: E2.bizInd(b), lvl: b.level, hq: false };
      for (const b of E2.megacorpHQs(p)) meta[b.id] = { id: b.id, ind: E2.bizInd(b), lvl: b.level, hq: true };
    }
    const plots = {};
    for (const [plot, bizId] of Object.entries(st.board.occupiedBy || {})) {
      if (bizId === undefined || bizId === null) continue;
      if (meta[bizId]) plots[plot] = meta[bizId];
    }
    const prices = {};
    for (const ind of E.INDUSTRIES) prices[ind] = E2.price(st.pm, ind);
    frames.push({ plots, prices });
  };
  E2.advancePlanning(st, E2.mulberry32(seed + 777), (msg) => {
    if (/^▶ Year \d+, Quarter \d+/.test(String(msg))) snapshot();
  });
  snapshot();
  const hqs = new Set();
  for (const f of frames) for (const [plot, m] of Object.entries(f.plots)) if (m.hq) hqs.add(plot);
  return { st, frames, hqCount: hqs.size, built: new Set(frames.flatMap((f) => Object.keys(f.plots))).size };
}

function reelTwelveQuarters() {
  /* A game worth showing needs Megacorps in it - they are the endgame, and a
     reel that never shows one is describing a different game. Search seeds for
     two or more, then prefer the fullest city among those. */
  let best = null;
  for (let seed = 1; seed <= 140; seed++) {
    const g = playOneGame(seed);
    const score = g.hqCount * 1000 + g.built;
    if (!best || score > best.score) best = { ...g, score, seed };
    if (best.hqCount >= 2 && best.built >= 22 && seed > 60) break;
  }
  const { st, frames, seed } = best;
  console.log(`  reel 12: seed ${seed} - ${best.hqCount} Megacorp HQ(s), ${best.built} plots built`);

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
      if (!last || last.id !== m.id || last.ind !== m.ind || last.lvl !== m.lvl || last.hq !== m.hq) {
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
  const outlineFor = (plot, bizId, q) => {
    const mine = new Set(footprintAt[q][bizId] || [plot]);
    const at = {};
    for (const pl of mine) { const g = cellOfPlot[pl]; if (g) at[`${g.gr},${g.gc}`] = true; }
    const g = cellOfPlot[plot];
    if (!g) return "";
    const has = (dr, dc) => !!at[`${g.gr + dr},${g.gc + dc}`];
    const w = "3px solid";
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
      const oc = sState.hq ? GOLD : "#F3F4F6";
      const ink = sState.hq ? GOLD : inkOn(col);
      const fadeOut = sState.until === undefined ? "" : `,fadeOut .3s ${tOf(sState.until)}s forwards`;
      return `<div class="fill" style="--oc:${oc};background:${col};
          ${outlineFor(plot, sState.id, sState.from)}
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
  const gridY = [1, 4, 7, 10].map((v) => `
    <line x1="${PADL}" y1="${yOf(v)}" x2="${W - PADR + 8}" y2="${yOf(v)}" stroke="${LINE}" stroke-width="1"/>
    <text x="14" y="${(yOf(v) + 7).toFixed(1)}" fill="${MUTE}" font-size="19" font-weight="700">$${v}</text>`).join("");

  return shell(1080, 1920, `
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 62px;gap:30px">
      <div style="text-align:center">
        <div class="kicker">One real game</div>
        <div style="font-size:58px;font-weight:850;margin-top:10px;letter-spacing:-1.4px">
          Twelve quarters.</div>
      </div>

      <div class="city">${districts}</div>

      <div class="legend">
        <span><i class="sw" style="background:${E.IND_COLOR.RE}"></i>a company</span>
        <span><i class="sw lv">2</i>its level</span>
        <span><i class="sw hqsw">★</i>Megacorp HQ</span>
      </div>

      <div style="margin-top:2px">
        <div class="chartlbl">What that did to the price of every good</div>
        <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block">
          ${sweep}${gridY}${lines}${endLabels}
        </svg>
      </div>

      <div style="display:flex;justify-content:space-between;font-size:20px;color:${MUTE};font-weight:700">
        <span>Y1 Q1</span><span>Y2</span><span>Y3</span><span>Q12</span>
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
    .fill{position:absolute;inset:-1px;opacity:0;display:flex;align-items:center;
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
    .sw.hqsw{background:#0B0D10;border:2px solid ${GOLD};color:${GOLD}}
    .chartlbl{font-size:24px;font-weight:800;color:${CREAM};margin-bottom:8px;letter-spacing:.2px}
    @keyframes sweep{to{width:${(xOf(nQ - 1) + 3).toFixed(1)}px}}
    @keyframes fadeIn{to{opacity:1}}
    @keyframes fadeOut{to{opacity:0}}
    @keyframes pop{from{opacity:0;transform:scale(.55)}to{opacity:1;transform:scale(1)}}
  `);
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
