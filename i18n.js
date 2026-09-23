/* ============================================================================
   ENTREPRENEURS - language.

   The game is written in English and plays in English, Brazilian Portuguese or
   Simplified Chinese. This module is the whole of the machinery: a dictionary
   per language keyed by the ENGLISH SOURCE STRING, a `t()` that looks a string
   up, and a hook that re-renders the app when the language changes.

   ADDING A LANGUAGE is three files and no edits here beyond the registry: a
   dictionary `i18n.<code>.js`, a rulebook `rulebook.<code>.mjs`, and a line in
   LANGS. check_i18n.js and check_rulebook_i18n.mjs both read LANGS, so the new
   language is checked from the moment it is registered.

   WHY THE ENGLISH STRING IS THE KEY. The alternative is invented keys
   ("panel.launch.title"), and for a codebase this size that means renaming
   roughly six hundred strings and keeping a second file in step with them by
   eye. Keying on the source means the call site still reads as English prose,
   a missing translation falls back to perfectly good English rather than
   showing a key to a player, and `check_i18n.js` can list exactly which
   strings a language is missing by diffing the two sets mechanically.

   PLACEHOLDERS. Anything interpolated becomes {0}, {1} and so on, because word
   order is not the same in any two languages and a translator has to be able to
   move the pieces - or leave one out, as Chinese does with the placeholders that
   carry nothing but an English plural ending:

       t("{0} of {1} plots", owned, total)      ->  "{0} de {1} lotes"
       t("Level {0}", n)                         ->  "Nível {0}"  /  "等级 {0}"

   THE ENGINE NEVER IMPORTS THIS. Everything above the REACT UI marker in
   EntrepreneursGame.jsx runs inside a bare vm sandbox on the server, with import
   lines stripped out, so an engine that called t() would crash the server the
   moment it was loaded. The game LOG is translated all the same, without
   breaking that rule: the engine emits `logMsg(key, ...args)` - a key and its
   arguments, never a sentence - the room stores it, and the client renders it
   through t() in whatever language that client is reading.

   ========================================================================== */
import { useEffect, useState } from "react";
import PT from "./i18n.pt.js";
import ZH from "./i18n.zh.js";

export const LANGS = [
  { code: "en", label: "English", flag: "EN" },
  { code: "pt", label: "Português (BR)", flag: "PT" },
  { code: "zh", label: "\u4e2d\u6587\uff08\u7b80\u4f53\uff09", flag: "\u4e2d" },
];

const DICTS = { pt: PT, zh: ZH };
const STORE_KEY = "entrepreneurs_lang";

/* A browser set to a language the game speaks opens in it the first time, and
   after that the player's own choice wins. Matched on the base tag, so pt-BR and
   pt-PT both land on Portuguese, zh-CN and zh-TW both on Chinese. */
function detect() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && (saved === "en" || DICTS[saved])) return saved;
  } catch (_) {}
  try {
    const nav = (navigator.languages || [navigator.language || ""]).join(",").toLowerCase();
    for (const { code } of LANGS) {
      if (code === "en") continue;
      if (new RegExp(`(^|,)${code}(-|,|$)`).test(nav)) return code;
    }
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
  const TAG = { pt: "pt-BR", zh: "zh-CN", en: "en" };
  try { document.documentElement.lang = TAG[code] || code; } catch (_) {}
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

/* The switch itself, so both apps mount the same control.

   A toggle worked while there were two languages and stops working at three, so
   this is a small list. It names each language IN that language, because a
   player who cannot read the current one still has to find their own. */
export function LanguageSwitch({ style }) {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const here = LANGS.find((l) => l.code === lang) || LANGS[0];
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        title={LANGS.map((l) => l.label).join(" / ")} aria-haspopup="listbox" aria-expanded={open}
        style={style}>
        <span aria-hidden="true">&#127760;</span> {here.flag}
      </button>
      {open && (
        <span role="listbox" style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 10060,
          backgroundColor: "#14161a", border: "1px solid #2b3040", borderRadius: 8,
          boxShadow: "0 10px 30px rgba(0,0,0,0.55)", overflow: "hidden", minWidth: 150,
        }}>
          {LANGS.map((l) => (
            <button key={l.code} role="option" aria-selected={l.code === lang}
              onClick={(e) => { e.stopPropagation(); setLang(l.code); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "7px 11px",
                fontSize: 11.5, whiteSpace: "nowrap", cursor: "pointer", border: "none",
                backgroundColor: l.code === lang ? "#1b2030" : "transparent",
                color: l.code === lang ? "#c9d4ea" : "#8b93a3",
              }}>{l.label}</button>
          ))}
        </span>
      )}
    </span>
  );
}
