import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { RULEBOOK, EDITION } from "./rulebook.data.mjs";

/* ============================================================================
   Site chrome: the rulebook and the live table counters.

   Both are mounted once, at the very top of each app, so they are on screen
   everywhere - the join screen, the waiting room, the draft, the board and the
   results - rather than only inside the game.

   The rulebook text comes from rulebook.data.mjs, which is also what
   make_rulebook.mjs turns into the markdown editions. `note` blocks are the
   designer's commentary and are deliberately never rendered here.
   ========================================================================== */

const INK = {
  bg: "#14161a", edge: "#262a33", panel: "#0f1115",
  text: "#c3c9d4", dim: "#8b93a3", head: "#ffffff", accent: "#8fd3b6", accentBg: "#1a2420",
};

function Portal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/* ---------------------------------------------------------------- blocks */

function Blocks({ blocks }) {
  return blocks.map((b, i) => {
    if (b.h) return (
      <h3 key={i} style={{ fontSize: 12, fontWeight: 700, color: INK.accent, margin: "16px 0 6px",
        textTransform: "uppercase", letterSpacing: 0.6 }}>{b.h}</h3>
    );
    if (b.p) return (
      <p key={i} style={{ fontSize: 13, lineHeight: 1.62, color: INK.text, margin: "0 0 10px" }}>{b.p}</p>
    );
    if (b.ul) return (
      <ul key={i} style={{ margin: "0 0 12px", padding: 0, listStyle: "none" }}>
        {b.ul.map((li, k) => (
          <li key={k} style={{ display: "flex", gap: 8, fontSize: 12.5, lineHeight: 1.55,
            color: INK.text, marginBottom: 5 }}>
            <span style={{ color: INK.accent, flexShrink: 0 }}>&bull;</span><span>{li}</span>
          </li>
        ))}
      </ul>
    );
    if (b.table) return (
      <div key={i} style={{ overflowX: "auto", margin: "0 0 14px" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
          {b.table.head.some((h) => h) && (
            <thead>
              <tr>{b.table.head.map((h, k) => (
                <th key={k} style={{ textAlign: "left", padding: "6px 9px", color: INK.dim,
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6,
                  borderBottom: `1px solid ${INK.edge}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}</tr>
            </thead>
          )}
          <tbody>
            {b.table.rows.map((r, k) => (
              <tr key={k} style={{ backgroundColor: k % 2 ? "transparent" : "#12141a" }}>
                {r.map((c, j) => (
                  <td key={j} style={{ padding: "6px 9px", color: j === 0 ? "#e5e7eb" : INK.text,
                    fontWeight: j === 0 ? 600 : 400, lineHeight: 1.5, verticalAlign: "top",
                    borderBottom: `1px solid ${INK.edge}55` }}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    return null;   // `note` blocks are the designer's, not the player's
  });
}

/* -------------------------------------------------------------- rulebook */

/* Plain text of a section, so the search box can match on anything a player
   might remember reading rather than only on the headings. */
function sectionText(s) {
  const bits = [s.title];
  for (const b of s.blocks) {
    if (b.h) bits.push(b.h);
    if (b.p) bits.push(b.p);
    if (b.ul) bits.push(...b.ul);
    if (b.table) bits.push(...b.table.head, ...b.table.rows.flat());
  }
  return bits.join(" ").toLowerCase();
}
const SEARCH_INDEX = RULEBOOK.map(sectionText);

export function Rulebook({ onClose }) {
  const [active, setActive] = useState(RULEBOOK[0].id);
  const [q, setQ] = useState("");
  const bodyRef = useRef(null);

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return null;
    return new Set(RULEBOOK.filter((s, i) => SEARCH_INDEX[i].includes(needle)).map((s) => s.id));
  }, [q]);
  const shown = hits ? RULEBOOK.filter((s) => hits.has(s.id)) : RULEBOOK;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // highlight whichever section is currently under the top of the reading pane
  const onScroll = () => {
    const pane = bodyRef.current;
    if (!pane) return;
    let current = shown.length ? shown[0].id : null;
    for (const s of shown) {
      const el = pane.querySelector(`[data-sec="${s.id}"]`);
      if (el && el.offsetTop - pane.scrollTop <= 80) current = s.id;
    }
    if (current) setActive(current);
  };

  const jump = (id) => {
    const pane = bodyRef.current;
    const el = pane && pane.querySelector(`[data-sec="${id}"]`);
    if (el) pane.scrollTo({ top: el.offsetTop - 12, behavior: "smooth" });
    setActive(id);
  };

  return (
    <Portal>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10040,
        backgroundColor: "rgba(6,8,11,.82)", backdropFilter: "blur(2px)" }} />
      <div role="dialog" aria-label="Rulebook" onClick={(e) => e.stopPropagation()} style={{
        position: "fixed", zIndex: 10041, top: "3vh", bottom: "3vh",
        left: "50%", transform: "translateX(-50%)", width: "min(96vw, 900px)",
        backgroundColor: INK.bg, border: "1px solid #2c5f4f", borderRadius: 12,
        boxShadow: "0 24px 70px rgba(0,0,0,.75)", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
          borderBottom: `1px solid ${INK.edge}`, flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: INK.head, letterSpacing: -0.2 }}>
              Entrepreneurs &mdash; how to play
            </div>
            <div style={{ fontSize: 10, color: INK.dim }}>{EDITION} &middot; the complete rules</div>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the rules&hellip;"
            style={{ marginLeft: "auto", width: "min(40vw, 210px)", padding: "6px 9px", borderRadius: 6,
              fontSize: 12, backgroundColor: "#1c1f26", border: "1px solid #33384a", color: "#e5e7eb" }} />
          <button onClick={onClose} aria-label="Close the rulebook" style={{ background: "none", border: "none",
            color: INK.dim, fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "0 2px" }}>&times;</button>
        </div>

        <div style={{ display: "flex", minHeight: 0, flex: 1 }}>
          {/* contents */}
          <nav className="rb-toc" style={{ width: 196, flexShrink: 0, overflowY: "auto",
            borderRight: `1px solid ${INK.edge}`, padding: "10px 8px", backgroundColor: INK.panel }}>
            {shown.map((s, i) => (
              <button key={s.id} onClick={() => jump(s.id)} style={{
                display: "block", width: "100%", textAlign: "left", padding: "6px 8px", marginBottom: 2,
                borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11.5, lineHeight: 1.35,
                backgroundColor: active === s.id ? INK.accentBg : "transparent",
                color: active === s.id ? INK.accent : INK.dim,
                fontWeight: active === s.id ? 700 : 400,
              }}>
                <span style={{ opacity: 0.5, fontFamily: "ui-monospace, monospace", marginRight: 6 }}>
                  {String(RULEBOOK.findIndex((x) => x.id === s.id) + 1).padStart(2, "0")}
                </span>{s.title}
              </button>
            ))}
            {!shown.length && (
              <div style={{ fontSize: 11, color: INK.dim, padding: "6px 8px", fontStyle: "italic" }}>
                Nothing matches that.
              </div>
            )}
          </nav>

          {/* body */}
          <div ref={bodyRef} onScroll={onScroll} style={{ flex: 1, overflowY: "auto", padding: "14px 20px 40px" }}>
            {shown.map((s) => (
              <section key={s.id} data-sec={s.id} style={{ marginBottom: 26 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: INK.head, margin: "0 0 10px",
                  paddingBottom: 6, borderBottom: `1px solid ${INK.edge}` }}>{s.title}</h2>
                <Blocks blocks={s.blocks} />
              </section>
            ))}
            {!shown.length && (
              <p style={{ fontSize: 13, color: INK.dim }}>
                No rule mentions &ldquo;{q.trim()}&rdquo;. Try a shorter word.
              </p>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* --------------------------------------------------------- live counters */

/* One id per browser, kept in localStorage, so two tabs are one person rather
   than two. The server counts anyone it has heard from in the last half minute. */
function clientId() {
  try {
    let id = localStorage.getItem("entrepreneurs_client_id");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("entrepreneurs_client_id", id);
    }
    return id;
  } catch (_) {
    return "anon";
  }
}

const PRESENCE_MS = 10000;

/* Polls /api/presence and reports how many people are here and how many games
   are running. If there is no server - the single-player page opened straight
   from disk - the fetch fails and the whole thing stays hidden. */
export function useLiveCounts() {
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    let stop = false;
    const id = clientId();
    const ping = async () => {
      if (stop) return;
      try {
        const r = await fetch(`/api/presence?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!r.ok) throw new Error("no presence endpoint");
        const j = await r.json();
        if (!stop) setCounts({ online: j.online | 0, matches: j.matches | 0, waiting: j.waiting | 0 });
      } catch (_) {
        if (!stop) setCounts(null);
      }
    };
    ping();
    const t = setInterval(ping, PRESENCE_MS);
    const onVis = () => { if (!document.hidden) ping(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  return counts;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function LiveCounts({ counts }) {
  if (!counts) return null;
  const title = counts.waiting
    ? `${plural(counts.waiting, "room is", "rooms are")} waiting for players`
    : "Everyone currently on the site, and the games under way";
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 7,
      fontSize: 11, color: INK.dim, padding: "4px 9px", borderRadius: 999,
      backgroundColor: INK.bg, border: `1px solid ${INK.edge}`, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#3ddc97",
        boxShadow: "0 0 6px #3ddc9799", flexShrink: 0 }} />
      <span style={{ color: "#e5e7eb", fontWeight: 700 }}>{counts.online}</span> online
      <span style={{ color: "#3a4152" }}>|</span>
      <span style={{ color: "#e5e7eb", fontWeight: 700 }}>{counts.matches}</span>
      {counts.matches === 1 ? " match" : " matches"}
    </span>
  );
}

/* ------------------------------------------------------------ the chrome */

/* Mounted once per app, at the root, so it survives every screen change. */
export default function SiteChrome() {
  const [open, setOpen] = useState(false);
  const counts = useLiveCounts();

  return (
    <>
      <div style={{ position: "fixed", left: 8, bottom: 8, zIndex: 9994,
        display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", maxWidth: "calc(100vw - 16px)" }}>
        <button onClick={() => setOpen(true)} title="Read the rules (Esc closes)"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700,
            color: INK.accent, backgroundColor: INK.accentBg, border: "1px solid #2c5f4f",
            borderRadius: 999, padding: "4px 11px", cursor: "pointer", whiteSpace: "nowrap" }}>
          <span aria-hidden="true">&#9776;</span> Rulebook
        </button>
        <LiveCounts counts={counts} />
      </div>
      {open && <Rulebook onClose={() => setOpen(false)} />}
    </>
  );
}
