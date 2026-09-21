/* Does the game actually run in Portuguese?

   check_i18n.js proves the dictionary covers every string. This proves the far
   more important thing: that the translated app RENDERS. Two bugs made that
   worth a test of its own. Both were the same mistake - a local variable named
   `t` shadowing the imported translate function - and both were invisible to a
   "no page errors" check, because React caught the throw and the ErrorShield
   quietly replaced the screen. One killed the whole board; the other swallowed
   a single error message inside a promise.

   So: load the built page in each language, walk into a real game, and assert
   that the error boundary never appears and that the screen is in the language
   asked for.

   Run: node test_i18n.js
*/
const path = require("path");
const { launchBrowser } = require("./testkit");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (label, cond, note = "") => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${note ? `  [${note}]` : ""}`);
  if (!cond) failures++;
};

const PAGE = "file://" + path.join(__dirname, "Entrepreneurs.html");
/* Words that can only come from the Portuguese dictionary, and can never be a
   coincidence of the English text. */
const PT_MARKERS = ["Manual", "Registros", "Projeto", "trimestre", "Trimestre", "lote", "setor", "Iniciar", "Começar"];
const EN_MARKERS = ["Rulebook", "Records"];

async function run(lang) {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem("entrepreneurs_tutorial_seen", "1");
      localStorage.setItem("entrepreneurs_lang", l);
    } catch (_) {}
  }, lang);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(PAGE);
  await sleep(1200);

  const txt = () => page.evaluate(() => document.body.innerText);
  const crashed = async () => /went wrong on this screen|deu errado nesta tela/i.test(await txt());

  check(`[${lang}] the lobby renders`, !(await crashed()));
  const lobby = await txt();

  /* into a real game: draft, then the board */
  const click = async (re) => {
    const b = page.getByRole("button", { name: re }).first();
    if (await b.count() && await b.isEnabled().catch(() => false)) {
      await b.click({ timeout: 3000 }).catch(() => {});
      return true;
    }
    return false;
  };
  await click(/Start Game|Começar|Iniciar/);
  await sleep(1200);
  let reached = false;
  for (let i = 0; i < 60 && !reached; i++) {
    if (await crashed()) break;
    const t = await txt();
    if (/Your turn|Place a meeple|Sua vez|Coloque um trabalhador|Planning|Planejamento/.test(t) && /Q1/.test(t)) { reached = true; break; }
    if (/Year 1|Ano 1/.test(t)) { await click(/Year 1|Ano 1/); await sleep(1000); continue; }
    const deck = page.locator("button").filter({ hasText: /\d+\s*(?:left|restante)/i }).first();
    if (await deck.count() && await deck.isEnabled().catch(() => false)) { await deck.click({ timeout: 2500 }).catch(() => {}); await sleep(300); continue; }
    await sleep(350);
  }
  check(`[${lang}] the game screen renders`, reached && !(await crashed()),
    reached ? "" : (await txt()).replace(/\n+/g, " | ").slice(0, 220));

  const board = await txt();
  if (lang === "pt") {
    const hits = PT_MARKERS.filter((w) => lobby.includes(w) || board.includes(w));
    check("[pt] the screen is in Portuguese", hits.length >= 3, hits.join(", ") || "no Portuguese found");
    check("[pt] the English chrome is gone", !/\bRulebook\b/.test(lobby), "the rulebook button is still English");
  } else {
    const hits = EN_MARKERS.filter((w) => lobby.includes(w));
    check("[en] the screen is in English", hits.length >= 1, hits.join(", "));
  }
  check(`[${lang}] no uncaught page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
  await browser.close();
}

/* A missing translation is not a crash, so nothing else would catch it. This
   makes the suite fail when a new English string lands without Portuguese. */
function coverage() {
  const { execFileSync } = require("child_process");
  const out = execFileSync("node", [path.join(__dirname, "check_i18n.js")], { encoding: "utf8" });
  const m = /pt-BR: (\d+)\/(\d+)/.exec(out);
  check("every player-facing string has a translation", !!m && m[1] === m[2],
    m ? `${m[1]} of ${m[2]}` : "check_i18n.js printed nothing");
}

(async () => {
  coverage();
  await run("en");
  await run("pt");
  console.log(failures ? `\n${failures} check(s) failed\n` : "\nall checks passed\n");
  process.exit(failures ? 1 : 0);
})();
