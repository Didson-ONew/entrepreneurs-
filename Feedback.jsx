import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

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
        {value === null ? "no score" : `${value} of 5`}
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
      setErr(e.message || "That did not go through.");
    } finally { setBusy(false); }
  };

  if (sent) return (
    <div style={{ padding: "22px 18px", textAlign: "center" }}>
      <div style={{ fontSize: 26, marginBottom: 8 }} aria-hidden="true">&#10003;</div>
      <div style={{ fontSize: 13.5, color: INK.head, fontWeight: 700, marginBottom: 4 }}>Noted, thank you.</div>
      <div style={{ fontSize: 11.5, color: INK.dim, marginBottom: 16, lineHeight: 1.5 }}>
        It went in with the rules version you were playing, so it will still make sense later.
      </div>
      <button onClick={() => { setSent(false); setText(""); setRating(null); }}
        style={btn(INK.accentBg, "#2c5f4f", INK.accent)}>Write another</button>
      <button onClick={onClose} style={{ ...btn("transparent", INK.edge, INK.dim), marginLeft: 8 }}>Close</button>
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
            <div style={{ fontSize: 12, fontWeight: 700, color: kind === k.key ? INK.accent : INK.text }}>{k.label}</div>
            <div style={{ fontSize: 10, color: INK.dim, marginTop: 2, lineHeight: 1.35 }}>{k.blurb}</div>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10.5, color: INK.dim, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
          How is it playing?{kind === "session" ? "" : " (optional)"}
        </div>
        <Stars value={rating} onChange={setRating} />
      </div>

      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={2000}
        placeholder={kind === "issue"
          ? "What happened, and what did you expect instead?"
          : kind === "session" ? "What made it a 3, or a 5?" : "What would you change?"}
        style={{
          width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: 7, resize: "vertical",
          backgroundColor: "#1c1f26", border: `1px solid #33384a`, color: "#e5e7eb",
          fontSize: 12.5, lineHeight: 1.5, fontFamily: "inherit",
        }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <div style={{ fontSize: 10, color: INK.dim, flex: 1, lineHeight: 1.4 }}>
          {context.room
            ? <>Sent from table <b style={{ color: INK.text }}>{context.room}</b>{context.quarter ? <> in Quarter {context.quarter}</> : null}.</>
            : "Sent from the lobby."}
        </div>
        <span style={{ fontSize: 10, color: INK.dim }}>{text.length}/2000</span>
        <button onClick={send} disabled={busy}
          style={{ ...btn(INK.accentBg, "#2c5f4f", INK.accent), opacity: busy ? 0.6 : 1 }}>
          {busy ? "Sending…" : "Send"}
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
      .then(({ ok, j }) => { if (stop) return; if (!ok) setErr(j.error || "Could not read those."); else setData(j); })
      .catch(() => { if (!stop) setErr("Could not reach the server."); });
    return () => { stop = true; };
  }, []);

  if (err) return <div style={{ padding: 16, fontSize: 12, color: "#ff8f8f" }}>{err}</div>;
  if (!data) return <div style={{ padding: 16, fontSize: 12, color: INK.dim }}>Reading&hellip;</div>;

  const s = data.summary;
  const shown = filter === "all" ? data.entries : data.entries.filter((e) => e.kind === filter);

  return (
    <div style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {[["all", `Everything (${s.total})`]].concat(KINDS.map((k) => [k.key, `${k.label} (${s.byKind[k.key] || 0})`]))
          .map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              ...btn(filter === key ? INK.accentBg : "transparent", filter === key ? "#2c5f4f" : INK.edge,
                filter === key ? INK.accent : INK.dim), fontSize: 11, padding: "4px 10px",
            }}>{label}</button>
          ))}
        {s.averageRating !== null && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#f5d76e" }}>
            &#9733; {s.averageRating} average, from {s.rated} score{s.rated === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {!shown.length && <div style={{ fontSize: 12, color: INK.dim, padding: "10px 0" }}>Nothing here yet.</div>}

      {shown.map((e) => (
        <div key={e.id} style={{ border: `1px solid ${INK.edge}`, borderRadius: 8, padding: "9px 11px",
          marginBottom: 8, backgroundColor: INK.panel }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: INK.accent }}>
              {(KINDS.find((k) => k.key === e.kind) || {}).label || e.kind}
            </span>
            <span style={{ fontSize: 11.5, color: INK.head, fontWeight: 600 }}>
              {e.account || e.name || "someone"}
              {e.account && <span style={{ color: INK.accent, marginLeft: 4 }} title="signed in">&#10003;</span>}
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

function Matches() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let stop = false;
    const read = () => fetch("/api/matches", { cache: "no-store", credentials: "same-origin" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (stop) return; if (!ok) setErr(j.error || "Could not read those."); else setData(j); })
      .catch(() => { if (!stop) setErr("Could not reach the server."); });
    read();
    const t = setInterval(read, 5000);      // tables change while you are looking
    return () => { stop = true; clearInterval(t); };
  }, []);

  if (err) return <div style={{ padding: 16, fontSize: 12, color: "#ff8f8f" }}>{err}</div>;
  if (!data) return <div style={{ padding: 16, fontSize: 12, color: INK.dim }}>Reading&hellip;</div>;
  if (!data.matches.length) return <div style={{ padding: 16, fontSize: 12, color: INK.dim }}>Nobody is playing right now.</div>;

  return (
    <div style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: 10.5, color: INK.dim, marginBottom: 10 }}>
        Refreshes itself every few seconds. A seat shows as a bot once the server has taken it over.
      </div>
      {data.matches.map((m) => (
        <div key={m.code} style={{ border: `1px solid ${INK.edge}`, borderRadius: 8, padding: "9px 11px",
          marginBottom: 8, backgroundColor: INK.panel }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: INK.head, fontFamily: "ui-monospace, monospace" }}>{m.code}</span>
            <span style={{ fontSize: 11, color: m.phase === "lobby" ? INK.warn : INK.accent }}>
              {m.phase === "lobby" ? "waiting to start" : m.phase === "gameover" ? "finished" : `Quarter ${m.quarter} · ${m.phase}`}
            </span>
            {m.awaiting && <span style={{ fontSize: 11, color: INK.dim }}>waiting on <b style={{ color: INK.text }}>{m.awaiting}</b></span>}
            {!!m.watchers.length && (
              <span style={{ fontSize: 10.5, color: INK.dim }}>
                watching: {m.watchers.join(", ")}
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
                {seat.host && <span title="host" style={{ marginLeft: 4, opacity: 0.7 }}>&#9733;</span>}
                {!seat.human && <span style={{ marginLeft: 4, opacity: 0.7 }}>bot</span>}
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

export function FeedbackPanel({ admin, context, onClose }) {
  const [tab, setTab] = useState("write");

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const tabs = admin
    ? [["write", "Write in"], ["notes", "What came in"], ["matches", "Who is playing"]]
    : [["write", "Write in"]];

  return (
    <Portal>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10040,
        backgroundColor: "rgba(6,8,11,.82)", backdropFilter: "blur(2px)" }} />
      <div role="dialog" aria-label="Playtest feedback" onClick={(e) => e.stopPropagation()} style={{
        position: "fixed", zIndex: 10041, top: "5vh", bottom: "5vh",
        left: "50%", transform: "translateX(-50%)", width: "min(96vw, 720px)",
        backgroundColor: INK.bg, border: "1px solid #2c5f4f", borderRadius: 12,
        boxShadow: "0 24px 70px rgba(0,0,0,.75)", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
          borderBottom: `1px solid ${INK.edge}`, flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: INK.head, letterSpacing: -0.2 }}>
              Tell me how it played
            </div>
            <div style={{ fontSize: 10, color: INK.dim }}>
              The game is still being tuned &mdash; every note goes to the designer.
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", background: "none",
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
export function useFeedbackAccess() {
  const [access, setAccess] = useState({ ready: false, server: false, admin: false });
  useEffect(() => {
    let stop = false;
    fetch("/api/account", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no"))))
      .then((j) => { if (!stop) setAccess({ ready: true, server: true, admin: !!j.admin }); })
      .catch(() => { if (!stop) setAccess({ ready: true, server: false, admin: false }); });
    return () => { stop = true; };
  }, []);
  return access;
}

export default FeedbackPanel;
