/* ============================================================================
   ENTREPRENEURS - language.

   The game is written in English and plays in English or Brazilian Portuguese.
   This module is the whole of the machinery: a dictionary keyed by the ENGLISH
   SOURCE STRING, a `t()` that looks a string up, and a hook that re-renders the
   app when the language changes.

   WHY THE ENGLISH STRING IS THE KEY. The alternative is invented keys
   ("panel.launch.title"), and for a codebase this size that means renaming
   roughly six hundred strings and keeping a second file in step with them by
   eye. Keying on the source means the call site still reads as English prose,
   a missing translation falls back to perfectly good English rather than
   showing a key to a player, and `check_i18n.js` can list exactly which
   strings have no Portuguese yet by diffing the two sets mechanically.

   PLACEHOLDERS. Anything interpolated becomes {0}, {1} and so on, because word
   order is not the same in the two languages and a translator has to be able to
   move the pieces:

       t("{0} of {1} plots", owned, total)      ->  "{0} de {1} lotes"
       t("Level {0}", n)                         ->  "Nível {0}"

   THE ENGINE NEVER IMPORTS THIS. Everything above the REACT UI marker in
   EntrepreneursGame.jsx runs inside a bare vm sandbox on the server, with import
   lines stripped out, so an engine that called t() would crash the server the
   moment it was loaded. That is also why the game LOG is still English: its
   lines are written by the engine, on the server, into the room for everybody -
   translating them means the engine emitting a key and its arguments instead of
   a sentence, and the client rendering it. That change is worth making and it
   is not this file's job.

   ========================================================================== */
import { useEffect, useState } from "react";
import PT from "./i18n.pt.js";

export const LANGS = [
  { code: "en", label: "English", flag: "EN" },
  { code: "pt", label: "Português (BR)", flag: "PT" },
];

const DICTS = { pt: PT };
const STORE_KEY = "entrepreneurs_lang";

/* A browser set to any flavour of Portuguese opens in Portuguese the first time,
   and after that the player's own choice wins. */
function detect() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && (saved === "en" || DICTS[saved])) return saved;
  } catch (_) {}
  try {
    const nav = (navigator.languages || [navigator.language || ""]).join(",").toLowerCase();
    if (/\bpt\b|pt-/.test(nav)) return "pt";
  } catch (_) {}
  return "en";
}

let LANG = detect();
const subscribers = new Set();

export function getLang() { return LANG; }

export function setLang(code) {
  if (code !== "en" && !DICTS[code]) return;
  LANG = code;
  try { localStorage.setItem(STORE_KEY, code); } catch (_) {}
  try { document.documentElement.lang = code === "pt" ? "pt-BR" : "en"; } catch (_) {}
  subscribers.forEach((fn) => fn(code));
}

/* Re-render on a language change. Every screen that shows text calls this once;
   without it a player would have to reload to see the new language. */
export function useLang() {
  const [lang, set] = useState(LANG);
  useEffect(() => {
    const fn = (code) => set(code);
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }, []);
  return lang;
}

const fill = (s, args) => (args.length
  ? s.replace(/\{(\d+)\}/g, (m, i) => (args[+i] === undefined ? m : String(args[+i])))
  : s);

/* The translation of `s`, or `s` itself. A string with no entry is not an error:
   it is English, which is readable, and check_i18n.js reports it. */
export function t(s, ...args) {
  const d = DICTS[LANG];
  const hit = d && Object.prototype.hasOwnProperty.call(d, s) ? d[s] : s;
  return fill(hit, args);
}

/* For the few places that need to know whether a string has been translated -
   the coverage check, and nothing else. */
export function has(s, lang) {
  const d = DICTS[lang || LANG];
  return !!(d && Object.prototype.hasOwnProperty.call(d, s));
}

export function dictFor(lang) { return DICTS[lang] || null; }

/* The switch itself, so both apps mount the same control. */
export function LanguageSwitch({ style }) {
  const lang = useLang();
  const next = lang === "en" ? "pt" : "en";
  const to = LANGS.find((l) => l.code === next);
  return (
    <button
      onClick={() => setLang(next)}
      title={lang === "en" ? "Mudar para português do Brasil" : "Switch to English"}
      style={style}
    >
      <span aria-hidden="true">&#127760;</span> {to.flag}
    </button>
  );
}
