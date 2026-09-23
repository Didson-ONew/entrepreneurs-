/* A score for the whole session is a mood. "The rules were a 5 and the pace was
   a 2" is a thing to go and fix, which is why the box asks six direct questions
   as well as the one.

   Three things have to hold for that to be worth anything: the questions the
   screen asks and the columns the store keeps have to be the SAME LIST, a note
   that skipped them has to stay readable beside one that answered, and every
   column has to average over the notes that answered IT rather than over all of
   them - otherwise an unpopular question looks like an unpopular game. */
const fs = require("fs"), path = require("path");
const feedback = require("./feedback.js");

let fails = 0;
const check = (label, ok, note = "") => {
  console.log(` ${ok ? "ok  " : "FAIL"}  ${label}${note ? `  [${note}]` : ""}`);
  if (!ok) fails++;
};

/* --- the screen and the store ask the same questions --------------------- */
const ui = fs.readFileSync(path.join(__dirname, "Feedback.jsx"), "utf8");
const block = ui.slice(ui.indexOf("const ASPECTS = ["), ui.indexOf("];", ui.indexOf("const ASPECTS = [")));
const asked = [...block.matchAll(/key:\s*"(\w+)"/g)].map((m) => m[1]);
check("the form asks every question the store keeps",
  JSON.stringify(asked) === JSON.stringify(feedback.ASPECTS),
  `form ${asked.join(",")} vs store ${feedback.ASPECTS.join(",")}`);
check("and every question is asked in words, not named as a category",
  (block.match(/q:\s*"[^"]*\?"/g) || []).length === feedback.ASPECTS.length,
  `${(block.match(/q:\s*"[^"]*\?"/g) || []).length} of ${feedback.ASPECTS.length} end in a question mark`);

/* --- a note carrying them survives the round trip ------------------------ */
const store = { version: 1, entries: [] };
const full = feedback.add(store, { kind: "session", rating: 4, text: "good",
  aspects: { rules: 5, pace: 2, again: 4 } });
check("a note with specifics is accepted", full.ok, full.error || "");
check("and keeps exactly what was answered",
  JSON.stringify(full.entry.aspects) === JSON.stringify({ rules: 5, pace: 2, again: 4 }),
  JSON.stringify(full.entry.aspects));

const bare = feedback.add(store, { kind: "session", rating: 3, text: "fine" });
check("a note with none of them is still a note", bare.ok && bare.entry.aspects === null,
  JSON.stringify(bare.entry && bare.entry.aspects));

const onlySpecifics = feedback.add(store, { kind: "session", aspects: { rules: 1 } });
check("specifics alone are enough to send", onlySpecifics.ok, onlySpecifics.error || "");

/* --- and the ones that must be refused ----------------------------------- */
check("a score out of range is refused",
  !feedback.add(store, { kind: "session", aspects: { rules: 9 } }).ok);
check("a score that is not a number is refused",
  !feedback.add(store, { kind: "session", aspects: { rules: "lots" } }).ok);
const stray = feedback.add(store, { kind: "session", rating: 3, aspects: { nonsense: 5 } });
check("a question this build does not ask is dropped, not refused",
  stray.ok && stray.entry.aspects === null, JSON.stringify(stray.entry && stray.entry.aspects));

/* --- the averages ---------------------------------------------------------- */
const s = feedback.summary(store);
check("each column averages over the notes that answered it",
  s.aspects.rules.rated === 2 && s.aspects.rules.average === 3,
  `rules: ${s.aspects.rules.average} from ${s.aspects.rules.rated}`);
check("a question nobody answered reads as no answer, not as zero",
  s.aspects.decisions.rated === 0 && s.aspects.decisions.average === null,
  `decisions: ${s.aspects.decisions.average}`);
check("the overall score is still counted on its own",
  s.rated === 3 && s.averageRating === Math.round(((4 + 3 + 3) / 3) * 10) / 10,
  `${s.averageRating} from ${s.rated}`);

/* --- the one control the game needs a player to press --------------------- */
const chrome = fs.readFileSync(path.join(__dirname, "Rulebook.jsx"), "utf8");
const bar = chrome.slice(chrome.indexOf("export default function SiteChrome"));
check("the feedback button is at the top of the screen", /position: "fixed", top: 6/.test(bar));
check("and there is one of it, not two",
  (bar.match(/setOpen\("feedback"\)/g) || []).length === 1,
  `${(bar.match(/setOpen\("feedback"\)/g) || []).length} found`);

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
