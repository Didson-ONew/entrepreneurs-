import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

/* ============================================================================
   Records: the hall of fame, the statistics, and the last games played.

   Everything here is read from /api/stats, which the server computes from
   matches.jsonl. Only games the server itself ran are in there - a single-player
   page keeps its game in the browser, so it has nothing to report and says so.
   ========================================================================== */

const INK = {
  bg: "#14161a", edge: "#262a33", panel: "#0f1115",
  text: "#c3c9d4", dim: "#8b93a3", head: "#ffffff", accent: "#f5d76e", accentBg: "#231f14",
};
const GOLD = ["#f5d76e", "#c9ccd4", "#c98f5b"];   // 1st, 2nd, 3rd

function Portal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

const nfmt = (n) => (n === null || n === undefined ? "—" : String(n));
const when = (ms) => {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ago = (ms) => {
  if (!ms) return "";
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 90) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d} day${d === 1 ? "" : "s"} ago` : when(ms);
};
/* Games played at full tilt by a script finish in under a second, and real ones
   run to the better part of an hour. One formatter that copes with both. */
const duration = (ms) => {
  if (!ms || ms < 0) return "\u2014";
  if (ms < 60000) return `${Math.max(1, Math.round(ms / 1000))} sec`;
  const min = Math.round(ms / 60000);
  if (min < 90) return `${min} min`;
  return `${Math.round(min / 6) / 10} hr`;
};
const SOURCE_LABEL = {
  industries: "Entering industries", companies: "Company levels at year end",
  megacorps: "Megacorp tiles", ipo: "IPO tile", land: "Land awards",
  cash: "Cash on hand", loans: "Unpaid loans", other: "Other",
};

const th = { textAlign: "left", padding: "6px 9px", color: INK.dim, fontSize: 10, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: 0.6, borderBottom: `1px solid ${INK.edge}`, whiteSpace: "nowrap" };
const td = { padding: "6px 9px", color: INK.text, borderBottom: `1px solid ${INK.edge}55`, whiteSpace: "nowrap" };
const num = { ...td, textAlign: "right", fontFamily: "ui-monospace, monospace" };

function Stat({ label, value, sub }) {
  return (
    <div style={{ backgroundColor: INK.panel, border: `1px solid ${INK.edge}`, borderRadius: 8, padding: "9px 11px" }}>
      <div style={{ fontSize: 9.5, color: INK.dim, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: INK.head, lineHeight: 1.25 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: INK.dim }}>{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ hall of fame */

function HallOfFame({ data }) {
  const hof = data.hallOfFame || [];
  if (!hof.length) {
    return <Empty text="No finished games with a human at the table yet. Play one and this fills in." />;
  }
  const most = Math.max(...hof.map((e) => e.ep));
  return (
    <>
      <p style={{ fontSize: 11.5, color: INK.dim, margin: "0 0 12px", lineHeight: 1.5 }}>
        Total EP scored across every recorded game. Matches and wins sit beside it on purpose:
        a big total built out of forty games is a different thing from the same total built out of five.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
          <thead><tr>
            <th style={th}>#</th><th style={th}>Player</th>
            <th style={{ ...th, textAlign: "right" }}>Total EP</th>
            <th style={{ ...th, textAlign: "right" }}>Games</th>
            <th style={{ ...th, textAlign: "right" }}>Wins</th>
            <th style={{ ...th, textAlign: "right" }}>Average</th>
            <th style={{ ...th, textAlign: "right" }}>Best</th>
            <th style={th}>Last seen</th>
          </tr></thead>
          <tbody>
            {hof.map((e, i) => (
              <tr key={e.name + i} style={{ backgroundColor: i % 2 ? "transparent" : "#12141a" }}>
                <td style={{ ...td, color: GOLD[i] || INK.dim, fontWeight: i < 3 ? 700 : 400, fontFamily: "ui-monospace, monospace" }}>{i + 1}</td>
                <td style={{ ...td, color: i < 3 ? GOLD[i] : "#e5e7eb", fontWeight: 600, whiteSpace: "normal" }}>
                  {e.name}
                  {/* a quiet bar so the shape of the table reads at a glance */}
                  <div style={{ height: 2, marginTop: 3, borderRadius: 2, backgroundColor: i < 3 ? GOLD[i] : "#2c5f4f",
                    width: `${Math.max(4, Math.round((e.ep / most) * 100))}%`, opacity: 0.55 }} />
                </td>
                <td style={{ ...num, color: INK.head, fontWeight: 700 }}>{e.ep}</td>
                <td style={num}>{e.matches}</td>
                <td style={num}>{e.wins} <span style={{ color: INK.dim }}>({e.winRate}%)</span></td>
                <td style={num}>{e.avg}</td>
                <td style={num}>{e.best}</td>
                <td style={{ ...td, color: INK.dim }}>{ago(e.lastAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 10.5, color: INK.dim, marginTop: 12, lineHeight: 1.5 }}>
        Players are matched on the name they type, so two people sharing a name share a row.
        Bots are never listed, and a seat handed to a bot part-way through earns its player nothing for that game.
      </p>
    </>
  );
}

/* -------------------------------------------------------------- statistics */

function Statistics({ data }) {
  const s = data.summary;
  if (!s) return <Empty text="Nothing recorded yet." />;
  const maxEntered = Math.max(1, ...(data.industries || []).map((i) => i.entered));
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
        <Stat label="Games recorded" value={s.matches} sub={`${s.contested} with more than one human`} />
        <Stat label="Highest score" value={s.topScore ? `${s.topScore.ep} EP` : "—"} sub={s.topScore ? `${s.topScore.name}, ${when(s.topScore.at)}` : ""} />
        <Stat label="Average winning score" value={`${s.avgWinningEP} EP`} sub={`humans average ${s.avgHumanEP} EP`} />
        <Stat label="Humans win" value={`${s.humanWinRate}%`} sub="of games they are in" />
        <Stat label="Megacorps" value={s.megacorpsPerMatch} sub="formed per game" />
        <Stat label="Typical length" value={duration(s.avgDurationMs)} sub="12 quarters" />
      </div>

      <Section title="Where the points come from" hint="Average EP per player per game, across every recorded match.">
        {(data.epSources || []).map((e) => {
          const w = Math.min(100, Math.abs(e.perPlayer) * 4);
          const neg = e.perPlayer < 0;
          return (
            <div key={e.source} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: INK.text, width: 190, flexShrink: 0 }}>{SOURCE_LABEL[e.source] || e.source}</span>
              <span style={{ flex: 1, height: 8, backgroundColor: "#1c1f26", borderRadius: 4, overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${w}%`, backgroundColor: neg ? "#7a3f3f" : "#2c5f4f" }} />
              </span>
              <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: neg ? "#fca5a5" : INK.head, width: 46, textAlign: "right" }}>
                {e.perPlayer > 0 ? "+" : ""}{e.perPlayer}
              </span>
            </div>
          );
        })}
      </Section>

      <Section title="Industries" hint="How often each was entered, and how often the winner was in it.">
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
          <thead><tr>
            <th style={th}>Industry</th><th style={{ ...th, textAlign: "right" }}>Entered</th>
            <th style={{ ...th, textAlign: "right" }}>By the winner</th><th style={th} />
          </tr></thead>
          <tbody>
            {(data.industries || []).map((i) => (
              <tr key={i.ind}>
                <td style={{ ...td, color: "#e5e7eb", fontWeight: 600 }}>{i.ind}</td>
                <td style={num}>{i.entered}</td>
                <td style={num}>{i.wonWith}</td>
                <td style={{ ...td, width: "45%" }}>
                  <span style={{ display: "block", height: 6, borderRadius: 3, backgroundColor: "#2c5f4f",
                    width: `${Math.round((i.entered / maxEntered) * 100)}%` }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {!!(data.personas || []).length && (
        <Section title="Personas" hint="Only games played with the persona module on.">
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
            <thead><tr>
              <th style={th}>Persona</th><th style={th}>Industry</th>
              <th style={{ ...th, textAlign: "right" }}>Played</th>
              <th style={{ ...th, textAlign: "right" }}>Won</th>
              <th style={{ ...th, textAlign: "right" }}>Win rate</th>
            </tr></thead>
            <tbody>
              {data.personas.map((p) => (
                <tr key={p.key}>
                  <td style={{ ...td, color: "#e5e7eb", fontWeight: 600 }}>{p.name}</td>
                  <td style={{ ...td, color: INK.dim }}>{p.ind}</td>
                  <td style={num}>{p.played}</td>
                  <td style={num}>{p.won}</td>
                  <td style={num}>{p.winRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </>
  );
}

/* ----------------------------------------------------------- recent games */

function Recent({ data }) {
  const games = data.recent || [];
  if (!games.length) return <Empty text="No games finished yet." />;
  return (
    <>
      {games.map((m) => (
        <div key={m.id} style={{ backgroundColor: INK.panel, border: `1px solid ${INK.edge}`,
          borderRadius: 8, padding: "9px 11px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, color: INK.dim }}>
              {ago(m.at)} &middot; {m.humans} human{m.humans === 1 ? "" : "s"}
              {m.bots ? `, ${m.bots} bot${m.bots === 1 ? "" : "s"}` : ""}
              {m.personas ? " \u00b7 personas" : ""}
              {(m.variants || []).length ? ` \u00b7 ${m.variants.length} variant${m.variants.length === 1 ? "" : "s"}` : ""}
              {m.durationMs ? ` \u00b7 ${duration(m.durationMs)}` : ""}
            </span>
            <span style={{ fontSize: 9.5, color: "#4b5563", fontFamily: "ui-monospace, monospace" }}>{m.engine}</span>
          </div>
          {m.players.map((p) => (
            <div key={p.rank} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, marginBottom: 2 }}>
              <span style={{ width: 14, color: GOLD[p.rank - 1] || INK.dim, fontWeight: p.rank === 1 ? 700 : 400,
                fontFamily: "ui-monospace, monospace" }}>{p.rank}</span>
              <span style={{ flex: 1, color: p.human ? "#e5e7eb" : INK.dim, fontStyle: p.human ? "normal" : "italic" }}>
                {p.name}{p.persona ? "" : ""}
              </span>
              <span style={{ fontFamily: "ui-monospace, monospace", color: p.rank === 1 ? INK.head : INK.text }}>{p.ep} EP</span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function Section({ title, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: INK.accent, margin: "0 0 2px",
        textTransform: "uppercase", letterSpacing: 0.6 }}>{title}</h3>
      {hint && <p style={{ fontSize: 10.5, color: INK.dim, margin: "0 0 8px" }}>{hint}</p>}
      {children}
    </div>
  );
}
function Empty({ text }) {
  return <p style={{ fontSize: 12.5, color: INK.dim, lineHeight: 1.6, fontStyle: "italic" }}>{text}</p>;
}

/* ------------------------------------------------------------- the panel */

const TABS = [["hof", "Hall of fame"], ["stats", "Statistics"], ["recent", "Recent games"]];

export function Records({ onClose }) {
  const [tab, setTab] = useState("hof");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let stop = false;
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("no records endpoint"); return r.json(); })
      .then((j) => { if (!stop) setData(j); })
      .catch(() => { if (!stop) setErr("These records live on the game server, so they are only here when you are playing online."); });
    return () => { stop = true; };
  }, []);

  return (
    <Portal>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10040,
        backgroundColor: "rgba(6,8,11,.82)", backdropFilter: "blur(2px)" }} />
      <div role="dialog" aria-label="Records" onClick={(e) => e.stopPropagation()} style={{
        position: "fixed", zIndex: 10041, top: "3vh", bottom: "3vh",
        left: "50%", transform: "translateX(-50%)", width: "min(96vw, 860px)",
        backgroundColor: INK.bg, border: "1px solid #7a6a3f", borderRadius: 12,
        boxShadow: "0 24px 70px rgba(0,0,0,.75)", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
          borderBottom: `1px solid ${INK.edge}`, flexShrink: 0, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: INK.head, letterSpacing: -0.2 }}>Records</div>
            <div style={{ fontSize: 10, color: INK.dim }}>
              {data ? `${data.matches} game${data.matches === 1 ? "" : "s"} recorded` : " "}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {TABS.map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                border: `1px solid ${tab === k ? "#7a6a3f" : INK.edge}`,
                backgroundColor: tab === k ? INK.accentBg : "transparent",
                color: tab === k ? INK.accent : INK.dim,
              }}>{label}</button>
            ))}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none",
            color: INK.dim, fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "0 2px" }}>&times;</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px 40px" }}>
          {err && <Empty text={err} />}
          {!err && !data && <Empty text="Reading the record book…" />}
          {!err && data && tab === "hof" && <HallOfFame data={data} />}
          {!err && data && tab === "stats" && <Statistics data={data} />}
          {!err && data && tab === "recent" && <Recent data={data} />}
        </div>
      </div>
    </Portal>
  );
}

export default Records;
