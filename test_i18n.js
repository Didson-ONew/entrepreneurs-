/* Does the game actually run in every language it offers?

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
/* Words that can only come from that language's dictionary, and can never be a
   coincidence of the English text. */
const MARKERS = {
  pt: ["Manual", "Registros", "Projeto", "trimestre", "Trimestre", "lote", "setor", "Iniciar", "Começar"],
  zh: ["规则书", "记录", "蓝图", "季度", "地块", "产业", "开始游戏", "怎么玩"],
  en: ["Rulebook", "Records"],
};
const LANG_NAME = { pt: "Portuguese", zh: "Chinese", en: "English" };

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
  await click(/Start Game|Começar|Iniciar|开始游戏/);
  await sleep(1200);
  let reached = false;
  for (let i = 0; i < 60 && !reached; i++) {
    if (await crashed()) break;
    const t = await txt();
    if (/Your turn|Place a meeple|Sua vez|Coloque um trabalhador|Planning|Planejamento|轮到你了|放置一个工人|规划/.test(t) && /Q1/.test(t)) { reached = true; break; }
    if (/Year 1|Ano 1|第 1 年/.test(t)) { await click(/Year 1|Ano 1|第 1 年/); await sleep(1000); continue; }
    const deck = page.locator("button").filter({ hasText: /\d+\s*(?:left|restante)|还剩\s*\d+/i }).first();
    if (await deck.count() && await deck.isEnabled().catch(() => false)) { await deck.click({ timeout: 2500 }).catch(() => {}); await sleep(300); continue; }
    await sleep(350);
  }
  check(`[${lang}] the game screen renders`, reached && !(await crashed()),
    reached ? "" : (await txt()).replace(/\n+/g, " | ").slice(0, 220));

  const board = await txt();
  const hits = MARKERS[lang].filter((w) => lobby.includes(w) || board.includes(w));
  if (lang === "en") {
    check("[en] the screen is in English", hits.length >= 1, hits.join(", "));
  } else {
    check(`[${lang}] the screen is in ${LANG_NAME[lang]}`, hits.length >= 3, hits.join(", ") || "none of the markers appeared");
    check(`[${lang}] the English chrome is gone`, !/\bRulebook\b/.test(lobby), "the rulebook button is still English");
  }
  check(`[${lang}] no uncaught page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
  await browser.close();
}

/* A missing translation is not a crash, so nothing else would catch it. This
   makes the suite fail when a new English string lands in any language without
   a translation - every language check_i18n.js reports on, not just the first. */
function coverage() {
  const { execFileSync } = require("child_process");
  const out = execFileSync("node", [path.join(__dirname, "check_i18n.js")], { encoding: "utf8" });
  const lines = [...out.matchAll(/^(\w+): (\d+)\/(\d+) strings translated/gm)];
  check("check_i18n.js reported on at least one language", lines.length > 0, out.slice(0, 200));
  for (const [, code, done, all] of lines) {
    check(`[${code}] every player-facing string has a translation`, done === all, `${done} of ${all}`);
  }
}

(async () => {
  coverage();
  for (const lang of ["en", "pt", "zh"]) await run(lang);
  console.log(failures ? `\n${failures} check(s) failed\n` : "\nall checks passed\n");
  process.exit(failures ? 1 : 0);
})();
