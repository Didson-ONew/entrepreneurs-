import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { t, useLang } from "./i18n.js";

/* ============================================================================
   Playtest feedback, and the designer's view of it.

   Two things live here because they are two halves of one loop. Any player can
   open the box and write in - a suggestion, something that went wrong, or a
   score out of five for how the session played. Whoever is running the playtest
   signs in and reads the lot, alongside who is sitting at which table right now.

   Every note is stamped server-side with the rules version it was written
   under, because an opinion about the economy means nothing without knowing
   which economy it was.
   ========================================================================== */

const INK = {
  bg: "#14161a", edge: "#262a33", panel: "#0f1115",
  text: "#c3c9d4", dim: "#8b93a3", head: "#ffffff", accent: "#8fd3b6", accentBg: "#1a2420",
  warn: "#f0a868", warnBg: "#241d14",
};

function Portal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

const KINDS = [
  { key: "suggestion", label: "An idea", blurb: "Something you would change or add." },
  { key: "issue", label: "Something wrong", blurb: "A rule that misfired, or a bug." },
  { key: "session", label: "How it played", blurb: "Score the session and say why." },
];

async function post(url, body) {
  const r = await fetch(url, {
    method: "POST", cache: "no-store", credentials: "same-origin",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `That did not go through (${r.status}).`);
  return j;
}

/* ------------------------------------------------------------- the form */

function Stars({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(value === n ? null : n)}
          aria-label={`${n} out of 5`} aria-pressed={value === n}
          style={{
            width: 30, height: 30, borderRadius: 6, cursor: "pointer", fontSize: 15, lineHeight: 1,
            border: `1px solid ${value !== null && n <= value ? "#7a6a3f" : INK.edge}`,
            backgroundColor: value !== null && n <= value ? "#231f14" : "transparent",
            color: value !== null && n <= value ? "#f5d76e" : INK.dim,
          }}>&#9733;</button>
      ))}
      <span style={{ fontSize: 10.5, color: INK.dim, marginLeft: 4 }}>
        {value === null ? t("no score") : t("{0} of 5", value)}
      </span>
    </div>
  );
}

function WriteIn({ context, onClose }) {
  const [kind, setKind] = useState("suggestion");
  const [rating, setRating] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  const send = async () => {
    setBusy(true); setErr("");
    try {
      await post("/api/feedback", { kind, rating, text, ...context });
      setSent(true);
    } catch (e) {
      setErr(e.message || t("That did not go through."));
    } finally { setBusy(false); }
  };

  if (sent) return (
    <div style={{ padding: "22px 18px", textAlign: "center" }}>
      <div style={{ fontSize: 26, marginBottom: 8 }} aria-hidden="true">&#10003;</div>
      <div style={{ fontSize: 13.5, color: INK.head, fontWeight: 700, marginBottom: 4 }}>{t("Noted, thank you.")}</div>
      <div style={{ fontSize: 11.5, color: INK.dim, marginBottom: 16, lineHeight: 1.5 }}>
        {t("It went in with the rules version you were playing, so it will still make sense later.")}
      </div>
      <button onClick={() => { setSent(false); setText(""); setRating(null); }}
        style={btn(INK.accentBg, "#2c5f4f", INK.accent)}>{t("Write another")}</button>
      <button onClick={onClose} style={{ ...btn("transparent", INK.edge, INK.dim), marginLeft: 8 }}>{t("Close")}</button>
    </div>
  );

  return (
    <div style={{ padding: "14px 16px 16px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {KINDS.map((k) => (
          <button key={k.key} onClick={() => setKind(k.key)}
            style={{
              flex: "1 1 130px", textAlign: "left", padding: "8px 10px", borderRadius: 7, cursor: "pointer",
              border: `1px solid ${kind === k.key ? "#2c5f4f" : INK.edge}`,
              backgroundColor: kind === k.key ? INK.accentBg : "transparent",
            }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: kind === k.key ? INK.accent : INK.text }}>{t(k.label)}</div>
            <div style={{ fontSize: 10, color: INK.dim, marginTop: 2, lineHeight: 1.35 }}>{t(k.blurb)}</div>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10.5, color: INK.dim, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {t("How is it playing?")}{kind === "session" ? "" : " " + t("(optional)")}
        </div>
        <Stars value={rating} onChange={setRating} />
      </div>

      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={2000}
        placeholder={kind === "issue"
          ? t("What happened, and what did you expect instead?")
          : kind === "session" ? t("What made it a 3, or a 5?") : t("What would you change?")}
        style={{
          width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: 7, resize: "vertical",
          backgroundColor: "#1c1f26", border: `1px solid #33384a`, color: "#e5e7eb",
          fontSize: 12.5, lineHeight: 1.5, fontFamily: "inherit",
        }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <div style={{ fontSize: 10, color: INK.dim, flex: 1, lineHeight: 1.4 }}>
          {context.room
            ? <>{t("Sent from table")} <b style={{ color: INK.text }}>{context.room}</b>{context.quarter ? t(" in Quarter {0}", context.quarter) : null}.</>
            : t("Sent from the lobby.")}
        </div>
        <span style={{ fontSize: 10, color: INK.dim }}>{text.length}/2000</span>
        <button onClick={send} disabled={busy}
          style={{ ...btn(INK.accentBg, "#2c5f4f", INK.accent), opacity: busy ? 0.6 : 1 }}>
          {busy ? t("Sending…") : t("Send it")}
        </button>
      </div>
      {err && <div style={{ marginTop: 8, fontSize: 11.5, color: "#ff8f8f" }}>{err}</div>}
    </div>
  );
}

/* ------------------------------------------------------- what came back in */

const when = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

function Notes() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let stop = false;
    fetch("/api/feedback", { cache: "no-store", credentials: "same-origin" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (stop) return; if (!ok) setErr(j.error || t("Could not read those.")); else setData(j); })
      .catch(() => { if (!stop) setErr(t("Could not reach the server.")); });
    return () => { stop = true; };
  }, []);

  if (err) return <div style={{ padding: 16, fontSize: 12, color: "#ff8f8f" }}>{err}</div>;
  if (!data) return <div style={{ padding: 16, fontSize: 12, color: INK.dim }}>{t("Reading…")}</div>;

  const s = data.summary;
  const shown = filter === "all" ? data.entries : data.entries.filter((e) => e.kind === filter);

  return (
    <div style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {[["all", `${t("Everything")} (${s.total})`]].concat(KINDS.map((k) => [k.key, `${t(k.label)} (${s.byKind[k.key] || 0})`]))
          .map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              ...btn(filter === key ? INK.accentBg : "transparent", filter === key ? "#2c5f4f" : INK.edge,
                filter === key ? INK.accent : INK.dim), fontSize: 11, padding: "4px 10px",
            }}>{label}</button>
          ))}
        {s.averageRating !== null && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#f5d76e" }}>
            &#9733; {t(s.rated === 1 ? "{0} average, from {1} score" : "{0} average, from {1} scores", s.averageRating, s.rated)}
          </span>
        )}
      </div>

      {!shown.length && <div style={{ fontSize: 12, color: INK.dim, padding: "10px 0" }}>{t("Nothing here yet.")}</div>}

      {shown.map((e) => (
        <div key={e.id} style={{ border: `1px solid ${INK.edge}`, borderRadius: 8, padding: "9px 11px",
          marginBottom: 8, backgroundColor: INK.panel }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: INK.accent }}>
              {t((KINDS.find((k) => k.key === e.kind) || {}).label || e.kind)}
            </span>
            <span style={{ fontSize: 11.5, color: INK.head, fontWeight: 600 }}>
              {e.account || e.name || t("someone")}
              {e.account && <span style={{ color: INK.accent, marginLeft: 4 }} title={t("signed in")}>&#10003;</span>}
            </span>
            {e.rating !== null && e.rating !== undefined && (
              <span style={{ fontSize: 11, color: "#f5d76e" }}>{"★".repeat(e.rating)}</span>
            )}
            <span style={{ marginLeft: "auto", fontSize: 10, color: INK.dim, fontFamily: "ui-monospace, monospace" }}>
              {when(e.at)}
              {e.room ? ` · ${e.room}` : ""}
              {e.quarter ? ` · Q${e.quarter}` : ""}
              {e.engine ? ` · ${e.engine}` : ""}
            </span>
          </div>
          {e.text && (
            <div style={{ fontSize: 12.5, color: INK.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{e.text}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ who is playing */

/* Take a copy, put a copy back.

   On hosting with no permanent disk the server's files are wiped by every deploy,
   and nothing in the game can prevent that. What it can do is make the copy one
   click and the restore one click, so the hall of fame is a file you keep rather
   than something the hosting decides to keep for you. */
function Backup() {
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");
  const [err, setErr] = useState("");
  const input = useRef(null);

  /* Named `action` rather than `btn`: there is already a btn() in this file and a
     second one with a different signature is how a wrong style ends up somewhere. */
  const action = (primary) => ({
    fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 7, cursor: "pointer",
    border: `1px solid ${primary ? "#2c5f4f" : INK.edge}`,
    backgroundColor: primary ? INK.accentBg : "transparent",
    color: primary ? INK.accent : INK.text,
  });

  async function restore(file) {
    setBusy(true); setErr(""); setSaid("");
    try {
      const text = await file.text();
      let parsed;
      try { parsed = JSON.parse(text); }
      catch (_) { setErr(t("That file is not a backup - it is not even JSON.")); setBusy(false); return; }
      const r = await fetch("/api/restore", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.error || t("The server would not take that file."));
      else setSaid(j.message || "Done.");
    } catch (_) {
      setErr(t("Could not reach the server."));
    }
    setBusy(false);
    if (input.current) input.current.value = "";     // so the same file can be chosen twice
  }

  return (
    <div style={{ padding: "14px 16px", fontSize: 12.5, color: INK.text, lineHeight: 1.6 }}>
      <div style={{ marginBottom: 14 }}>
        {t("Everything the server remembers between games — the hall of fame, the registered names, and the notes people have written in — in one file.")}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <a href="/api/backup" style={{ ...action(true), textDecoration: "none", display: "inline-block" }}>
          {t("Download a copy")}
        </a>
        <button style={action(false)} disabled={busy}
          onClick={() => input.current && input.current.click()}>
          {busy ? t("Reading…") : t("Put a copy back")}
        </button>
        <input ref={input} type="file" accept="application/json,.json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) restore(f); }} />
      </div>

      {said && (
        <div style={{ padding: "9px 11px", borderRadius: 7, marginBottom: 12,
          backgroundColor: INK.accentBg, border: "1px solid #2c5f4f", color: INK.accent }}>
          {said}
        </div>
      )}
      {err && (
        <div style={{ padding: "9px 11px", borderRadius: 7, marginBottom: 12,
          backgroundColor: "#241618", border: "1px solid #7a3f3f", color: "#ff8f8f" }}>
          {err}
        </div>
      )}

      <div style={{ color: INK.dim, fontSize: 11.5, lineHeight: 1.65 }}>
        <div style={{ marginBottom: 8 }}>
          <b style={{ color: INK.text }}>{t("Putting a copy back never deletes anything.")}</b>{" "}
          {t("It adds games and notes the server has not seen, and adds names that are not registered here. A name that IS registered is left exactly as it is, so an old copy can never undo somebody’s new password. The worst a wrong file can do is add games that already happened.")}
        </div>
        <div style={{ padding: "8px 10px", borderRadius: 7,
          backgroundColor: INK.warnBg, border: `1px solid ${INK.warn}55`, color: INK.warn }}>
          {t("The file holds password hashes and the email addresses people gave. Keep it as carefully as you would keep a password list — don’t put it in a shared folder or a public repository.")}
        </div>
      </div>
    </div>
  );
}

function Matches() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let stop = false;
    const read = () => fetch("/api/matches", { cache: "no-store", credentials: "same-origin" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (stop) return; if (!ok) setErr(j.error || t("Could not read those.")); else setData(j); })
      .catch(() => { if (!stop) setErr(t("Could not reach the server.")); });
    read();
    const timer = setInterval(read, 5000);   // tables change while you are looking
    return () => { stop = true; clearInterval(timer); };
  }, []);

  if (err) return <div style={{ padding: 16, fontSize: 12, color: "#ff8f8f" }}>{err}</div>;
  if (!data) return <div style={{ padding: 16, fontSize: 12, color: INK.dim }}>{t("Reading…")}</div>;
  if (!data.matches.length) return <div style={{ padding: 16, fontSize: 12, color: INK.dim }}>{t("Nobody is playing right now.")}</div>;

  return (
    <div style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: 10.5, color: INK.dim, marginBottom: 10 }}>
        {t("Refreshes itself every few seconds. A seat shows as a bot once the server has taken it over.")}
      </div>
      {data.matches.map((m) => (
        <div key={m.code} style={{ border: `1px solid ${INK.edge}`, borderRadius: 8, padding: "9px 11px",
          marginBottom: 8, backgroundColor: INK.panel }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: INK.head, fontFamily: "ui-monospace, monospace" }}>{m.code}</span>
            <span style={{ fontSize: 11, color: m.phase === "lobby" ? INK.warn : INK.accent }}>
              {m.phase === "lobby" ? t("waiting to start") : m.phase === "gameover" ? t("finished") : t("Quarter {0} · {1}", m.quarter, t(m.phase))}
            </span>
            {m.awaiting && <span style={{ fontSize: 11, color: INK.dim }}>{t("waiting on")} <b style={{ color: INK.text }}>{m.awaiting}</b></span>}
            {!!m.watchers.length && (
              <span style={{ fontSize: 10.5, color: INK.dim }}>
                {t("watching:")} {m.watchers.join(", ")}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {m.seats.map((seat) => (
              <span key={seat.seat} style={{
                fontSize: 11, padding: "3px 9px", borderRadius: 999,
                border: `1px solid ${seat.human ? "#2c5f4f" : INK.edge}`,
                backgroundColor: seat.human ? INK.accentBg : "transparent",
                color: seat.human ? INK.accent : INK.dim,
              }}>
                {seat.name}
                {seat.host && <span title={t("host")} style={{ marginLeft: 4, opacity: 0.7 }}>&#9733;</span>}
                {!seat.human && <span style={{ marginLeft: 4, opacity: 0.7 }}>{t("bot")}</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- the panel */

function btn(bg, edge, fg) {
  return {
    fontSize: 11.5, fontWeight: 700, color: fg, backgroundColor: bg,
    border: `1px solid ${edge}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer",
  };
}

export function FeedbackPanel({ admin, context, onClose, onOpened }) {
  const [tab, setTab] = useState("write");

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  /* Ask the server who this is every time the panel opens, in case they signed in
     since the page loaded. */
  useEffect(() => { if (onOpened) onOpened(); }, [onOpened]);

  const tabs = admin
    ? [["write", t("Write in")], ["notes", t("What came in")], ["matches", t("Who is playing")], ["backup", t("Backup")]]
    : [["write", t("Write in")]];

  return (
    <Portal>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10040,
        backgroundColor: "rgba(6,8,11,.82)", backdropFilter: "blur(2px)" }} />
      <div role="dialog" aria-label={t("Playtest feedback")} onClick={(e) => e.stopPropagation()} style={{
        position: "fixed", zIndex: 10041, top: "5vh", bottom: "5vh",
        left: "50%", transform: "translateX(-50%)", width: "min(96vw, 720px)",
        backgroundColor: INK.bg, border: "1px solid #2c5f4f", borderRadius: 12,
        boxShadow: "0 24px 70px rgba(0,0,0,.75)", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
          borderBottom: `1px solid ${INK.edge}`, flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: INK.head, letterSpacing: -0.2 }}>
              {t("Tell me how it played")}
            </div>
            <div style={{ fontSize: 10, color: INK.dim }}>
              {t("The game is still being tuned — every note goes to the designer.")}
            </div>
          </div>
          <button onClick={onClose} aria-label={t("Close")} style={{ marginLeft: "auto", background: "none",
            border: "none", color: INK.dim, fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "0 2px" }}>&times;</button>
        </div>

        {tabs.length > 1 && (
          <div style={{ display: "flex", gap: 6, padding: "10px 14px 0", flexShrink: 0 }}>
            {tabs.map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                ...btn(tab === key ? INK.accentBg : "transparent", tab === key ? "#2c5f4f" : INK.edge,
                  tab === key ? INK.accent : INK.dim), padding: "5px 12px",
              }}>{label}</button>
            ))}
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          {tab === "write" && <WriteIn context={context} onClose={onClose} />}
          {tab === "notes" && <Notes />}
          {tab === "matches" && <Matches />}
          {tab === "backup" && <Backup />}
        </div>
      </div>
    </Portal>
  );
}

/* The pill that opens it, plus the one question it needs answered first: is the
   person looking at this the one running the playtest? Asked of the server, which
   is the only thing that can answer it - a name typed at the join screen proves
   nothing. If there is no server at all (the single-file build opened from disk)
   the whole thing stays hidden, because there is nowhere for a note to go. */
/* Who is looking, and what they are allowed to see.

   This used to ask the server once, when the panel first mounted. The pill lives in the
   site chrome, so it mounts as the page loads - before anybody has signed in. Sign in
   afterwards and the answer was never asked again: the designer's own account got the
   visitor's panel, with a box to write in and no way to read anything back.

   So it asks again whenever the account changes. accountChanged() is called by the sign
   in, register, recover and sign out paths; the tab regaining focus and the panel being
   opened both re-ask too, which covers signing in from another tab. */
const ACCOUNT_EVENT = "entrepreneurs:account";
export function accountChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(ACCOUNT_EVENT));
}
export function useFeedbackAccess() {
  const [access, setAccess] = useState({ ready: false, server: false, admin: false, name: null });
  const [nonce, setNonce] = useState(0);
  const recheck = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    let stop = false;
    fetch("/api/account", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no"))))
      .then((j) => { if (!stop) setAccess({ ready: true, server: true, admin: !!j.admin, name: (j.user && j.user.name) || null }); })
      .catch(() => { if (!stop) setAccess({ ready: true, server: false, admin: false, name: null }); });
    return () => { stop = true; };
  }, [nonce]);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onFocus = () => { if (!document.hidden) recheck(); };
    window.addEventListener(ACCOUNT_EVENT, recheck);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(ACCOUNT_EVENT, recheck);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [recheck]);
  return { ...access, recheck };
}

export default FeedbackPanel;

/* ============================================================================
   The end of a match.

   A playtest is only worth as much as what comes back from it, and the moment a
   player is most able to say how it felt is the moment the final score goes up -
   not later, from the Feedback button they have to think to press. So the game
   asks, once, right there.

   Once is the whole design. It is shown a single time per match per browser, it
   can be waved away, and waving it away is remembered, because a prompt that
   nags is a prompt people learn to dismiss without reading. The note goes in as
   a "session" note with the room, the quarter it ended on and the rules version,
   which is what makes an old note still legible after the rules move.
   ========================================================================== */
const ASKED_KEY = "entrepreneurs_thanks";

function alreadyAsked(matchId) {
  try {
    const seen = JSON.parse(localStorage.getItem(ASKED_KEY) || "[]");
    return Array.isArray(seen) && seen.includes(matchId);
  } catch (_) { return false; }
}
function rememberAsked(matchId) {
  try {
    const seen = JSON.parse(localStorage.getItem(ASKED_KEY) || "[]");
    const next = (Array.isArray(seen) ? seen : []).concat(matchId).slice(-40);
    localStorage.setItem(ASKED_KEY, JSON.stringify(next));
  } catch (_) {}
}

export function EndOfGameThanks({ matchId, context, onClose }) {
  useLang();
  const [rating, setRating] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  /* Remembered as soon as it is shown, not when it is answered: a player who
     closes the tab has still been asked, and should not be asked again. */
  useEffect(() => { if (matchId) rememberAsked(matchId); }, [matchId]);

  const dismiss = () => { if (onClose) onClose(); };

  const send = async () => {
    setBusy(true); setErr("");
    try {
      await post("/api/feedback", { kind: "session", rating, text, ...(context || {}) });
      setSent(true);
      setTimeout(dismiss, 1600);
    } catch (e) {
      setErr(e.message || t("That did not go through."));
    } finally { setBusy(false); }
  };

  return (
    /* A card in the corner, not a sheet over the whole screen. The player has
       just been shown the final board and may want to hit Play again; an ask
       that blocks that button is an ask that gets closed unread. */
    <Portal>
      <div style={{
        position: "fixed", right: 12, bottom: 56, zIndex: 10050,
        maxWidth: "calc(100vw - 24px)", pointerEvents: "none",
      }}>
        <div role="dialog" aria-label={t("Thanks for playing")}
          style={{
            width: "min(92vw, 380px)", backgroundColor: INK.bg, border: `1px solid ${INK.edge}`,
            borderRadius: 12, boxShadow: "0 24px 70px rgba(0,0,0,.75)", overflow: "hidden",
            pointerEvents: "auto",
          }}>
          {sent ? (
            <div style={{ padding: "26px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 26, marginBottom: 8 }} aria-hidden="true">&#10003;</div>
              <div style={{ fontSize: 13.5, color: INK.head, fontWeight: 700 }}>{t("Noted, thank you.")}</div>
            </div>
          ) : (
            <div style={{ padding: "18px 18px 16px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: INK.head, marginBottom: 4 }}>
                {t("Thanks for playing")}
              </div>
              <div style={{ fontSize: 11.5, color: INK.dim, lineHeight: 1.5, marginBottom: 14 }}>
                {t("The game is still being tuned, and what you say here is what moves it. Did you enjoy it?")}
              </div>

              <Stars value={rating} onChange={setRating} />

              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
                placeholder={t("What worked, what dragged, what you would change.")}
                style={{
                  width: "100%", marginTop: 12, padding: "8px 10px", borderRadius: 7, resize: "vertical",
                  backgroundColor: INK.panel, border: `1px solid ${INK.edge}`, color: INK.text,
                  fontSize: 12, lineHeight: 1.45, fontFamily: "inherit", boxSizing: "border-box",
                }} />

              {err && <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 8 }}>{err}</div>}

              <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                <button onClick={send} disabled={busy || (rating === null && !text.trim())}
                  style={{
                    ...btn(INK.accentBg, "#2c5f4f", INK.accent),
                    opacity: busy || (rating === null && !text.trim()) ? 0.5 : 1,
                  }}>{busy ? t("Sending…") : t("Send it")}</button>
                <button onClick={dismiss} style={btn("transparent", INK.edge, INK.dim)}>{t("Not now")}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

/* Should this player be asked about this match? Only a human who has just seen a
   game end, and only once. */
export function shouldThank(matchId) {
  return !!matchId && !alreadyAsked(matchId);
}
