import React, { useState, useEffect, useRef } from "react";
import Game, { setNet, getEngineVersion } from "./EntrepreneursGame.jsx";

const api = async (path, body) => {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

const box = { backgroundColor: "#14161a", border: "1px solid #262a33" };
const field = {
  width: "100%", padding: "9px 11px", borderRadius: 6, fontSize: 14,
  backgroundColor: "#1c1f26", border: "1px solid #33384a", color: "#e5e7eb", marginBottom: 10,
};
const btn = (bg, fg) => ({
  width: "100%", padding: "10px 12px", borderRadius: 6, fontSize: 14, fontWeight: 700,
  backgroundColor: bg, color: fg, border: "none", cursor: "pointer",
});

function Lobby({ onEnter }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [bots, setBots] = useState(1);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async (fn) => {
    if (!name.trim()) return setErr("Enter your name first.");
    setBusy(true); setErr("");
    try { await fn(); } catch (e) { setErr("Could not reach the server."); }
    setBusy(false);
  };

  const create = () => go(async () => {
    const r = await api("/api/create", { name: name.trim(), bots });
    if (r.body.error) return setErr(r.body.error);
    onEnter({ code: r.body.code, token: r.body.token, seat: r.body.seat, host: true, name: name.trim() });
  });

  const join = () => go(async () => {
    if (!code.trim()) return setErr("Enter the room code.");
    const r = await api("/api/join", { code: code.trim().toUpperCase(), name: name.trim() });
    if (r.body.error) return setErr(r.body.error);
    onEnter({ code: r.body.code, token: r.body.token, seat: r.body.seat, host: false, name: name.trim() });
  });

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#0e1014" }}>
      <div className="rounded-xl p-6" style={{ ...box, width: "100%", maxWidth: 420 }}>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">ENTREPRENEURS</h1>
        <p className="text-sm text-gray-400 mb-5">Play online with friends &mdash; 2 to 4 players.</p>

        <input style={field} placeholder="Your name" value={name} maxLength={16}
          onChange={(e) => setName(e.target.value)} />

        <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: "#101318" }}>
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2">Start a new game</div>
          <div className="text-[11px] text-gray-500 mb-2">Bots fill any empty seats.</div>
          <div className="flex gap-1.5 mb-3">
            {[0, 1, 2, 3].map((b) => (
              <button key={b} onClick={() => setBots(b)}
                className="flex-1 text-xs font-semibold px-2 py-1.5 rounded"
                style={{ backgroundColor: bots === b ? "#2c5f4f" : "#1c1f26", color: bots === b ? "#d3fcec" : "#9ca3af", border: "none", cursor: "pointer" }}>
                {b} bot{b === 1 ? "" : "s"}
              </button>
            ))}
          </div>
          <button onClick={create} disabled={busy} style={btn("#2c5f4f", "#d3fcec")}>Create room</button>
        </div>

        <div className="rounded-lg p-3" style={{ backgroundColor: "#101318" }}>
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2">Join a friend</div>
          <input style={{ ...field, textTransform: "uppercase", letterSpacing: 2, fontFamily: "ui-monospace, monospace" }}
            placeholder="ROOM CODE" value={code} maxLength={6}
            onChange={(e) => setCode(e.target.value)} />
          <button onClick={join} disabled={busy} style={btn("#20232c", "#e5e7eb")}>Join room</button>
        </div>

        {err && <div className="text-xs mt-3" style={{ color: "#fca5a5" }}>{err}</div>}
      </div>
    </div>
  );
}

function WaitingRoom({ me, lobby, onLeave }) {
  const [err, setErr] = useState("");
  const kick = async (seat) => {
    const r = await api("/api/kick", { code: me.code, token: me.token, seat });
    if (r.body && r.body.error) setErr(r.body.error);
  };
  const total = (lobby ? lobby.members.length : 1) + (lobby ? lobby.bots : 0);
  const start = async () => {
    const r = await api("/api/start", { code: me.code, token: me.token });
    if (r.body.error) setErr(r.body.error);
  };
  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#0e1014" }}>
      <div className="rounded-xl p-6" style={{ ...box, width: "100%", maxWidth: 420 }}>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Room code</div>
        <div className="flex items-center gap-2 mb-4">
          <div className="text-3xl font-bold tracking-widest" style={{ color: "#8fd3b6", fontFamily: "ui-monospace, monospace" }}>{me.code}</div>
          <button onClick={() => navigator.clipboard && navigator.clipboard.writeText(me.code)}
            className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: "#1c1f26", color: "#9ca3af", border: "1px solid #33384a", cursor: "pointer" }}>copy</button>
        </div>
        <p className="text-[11px] text-gray-500 mb-4">Share this code &mdash; your friends enter it under &ldquo;Join a friend&rdquo;.</p>

        <div className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2">In the room</div>
        <div className="space-y-1.5 mb-4">
          {(lobby ? lobby.members : [{ name: me.name, seat: me.seat, host: me.host }]).map((m) => (
            <div key={m.seat} className="flex items-center justify-between text-sm rounded p-2" style={{ backgroundColor: "#1c1f26" }}>
              <span className="text-gray-200">{m.name}{m.seat === me.seat ? " (you)" : ""}</span>
              {m.host ? <span className="text-[10px] text-gray-500">host</span>
                : me.host ? (
                  <button onClick={() => kick(m.seat)} title="Remove this player"
                    className="text-[10px]" style={{ background: "none", border: "none", color: "#8b93a3", textDecoration: "underline", cursor: "pointer" }}>
                    remove
                  </button>
                ) : null}
            </div>
          ))}
          {lobby && Array.from({ length: lobby.bots }).map((_, i) => (
            <div key={`b${i}`} className="flex items-center justify-between text-sm rounded p-2" style={{ backgroundColor: "#141720" }}>
              <span className="text-gray-500 italic">Bot</span>
            </div>
          ))}
        </div>

        {me.host ? (
          <>
            <button onClick={start} disabled={total < 2} style={{ ...btn("#2c5f4f", "#d3fcec"), opacity: total < 2 ? 0.35 : 1 }}>
              {total < 2 ? "Need at least 2 players" : `Start game (${total} players)`}
            </button>
            <p className="text-[10px] text-gray-600 mt-2">You can start as soon as everyone has joined.</p>
          </>
        ) : (
          <div className="text-xs text-gray-500 italic text-center py-2">Waiting for the host to start&hellip;</div>
        )}
        {err && <div className="text-xs mt-3" style={{ color: "#fca5a5" }}>{err}</div>}

        <button onClick={onLeave} className="w-full mt-3 text-xs"
          style={{ background: "none", border: "none", color: "#6b7280", textDecoration: "underline", cursor: "pointer", padding: "6px 0" }}>
          {me.host ? "Cancel this room and go back" : "Leave this room"}
        </button>
        <p className="text-[10px] text-gray-600 mt-1 text-center">
          Meant to join a friend instead? Go back and use their room code.
        </p>
      </div>
    </div>
  );
}

const STORE_KEY = "entrepreneurs_session";

/* A two-tone chime when the turn comes round, so a player can look away between turns.
   WebAudio avoids shipping an audio file and needs no autoplay permission once the
   player has clicked anything on the page. */
let audioCtx = null;
function playTurnChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx || new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    [[660, 0], [880, 0.13]].forEach(([freq, at]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.18, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.28);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now + at); osc.stop(now + at + 0.3);
    });
  } catch (_) {}
}
function awaitedSeat(st) {
  if (!st) return null;
  if (st.phase === "drafting") return st.awaitingPlayerId;
  if (st.phase === "planning") return st.planningQueue[0];
  if (st.phase === "resolving") return st.pendingHumanAction ? st.pendingHumanAction.playerId : null;
  if (["delivering", "liquidating", "repayingLoans"].includes(st.phase)) return st.awaitingPlayerId;
  if (st.phase === "placingLH") return st.turnOrder[0];
  return null;
}
/* localStorage rather than sessionStorage: closing the tab (or the whole browser, or
   locking a phone) must not lock a player out of a game that is still running. */
const store = {
  get() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (_) { return null; } },
  set(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch (_) {} },
  clear() { try { localStorage.removeItem(STORE_KEY); } catch (_) {} },
};

export default function OnlineApp() {
  const [me, setMe] = useState(null);
  const [lobby, setLobby] = useState(null);
  const [state, setState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [conn, setConn] = useState("connecting");
  const [toast, setToast] = useState("");
  const [checking, setChecking] = useState(true);
  const [serverEngine, setServerEngine] = useState(null);
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem("entrepreneurs_muted") === "1"; } catch (_) { return false; } });
  const meRef = useRef(null);
  const wasMyTurn = useRef(false);

  const enter = (m) => { store.set(m); setMe(m); };
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
    try { localStorage.setItem("entrepreneurs_muted", muted ? "1" : "0"); } catch (_) {}
  }, [muted]);
  const leave = async (notifyServer) => {
    const m = meRef.current || me;
    if (notifyServer && m) { try { await api("/api/leave", { code: m.code, token: m.token }); } catch (_) {} }
    store.clear();
    window.location.reload();
  };

  // A refresh mid-game must not eject the player: restore the saved session and
  // ask the server whether it is still valid before showing the lobby.
  useEffect(() => {
    const saved = store.get();
    if (!saved || !saved.code || !saved.token) { setChecking(false); return; }
    api("/api/resume", { code: saved.code, token: saved.token }).then((r) => {
      if (r.body && r.body.ok) setMe({ ...saved, seat: r.body.seat, host: r.body.host, name: r.body.name });
      else store.clear();
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  // dispatch: every in-game action goes to the server, nothing is applied locally
  useEffect(() => {
    setNet({
      send: async (action, data) => {
        const m = meRef.current;
        if (!m) return;
        const r = await api("/api/action", { code: m.code, token: m.token, action, data });
        if (r.body && r.body.error) { setToast(r.body.error); setTimeout(() => setToast(""), 2600); }
      },
    });
    return () => setNet(null);
  }, []);

  /* Updates arrive two ways: the live event stream when it works, and plain polling
     as a fallback. Some proxies and tunnels buffer or strip text/event-stream, which
     used to leave a player stuck on the waiting screen forever, so the game must never
     depend on the stream alone. */
  useEffect(() => {
    if (!me) return;
    meRef.current = me;
    let stop = false;
    const seen = { v: -1 };

    const apply = (msg) => {
      if (!msg) return;
      if (msg.engine) setServerEngine(msg.engine);
      if (typeof msg.v !== "number" || msg.v <= seen.v) return;
      seen.v = msg.v;
      if (msg.type === "lobby") { setLobby(msg); setState(null); wasMyTurn.current = false; }
      else if (msg.type === "state") {
        const st = msg.state;
        const mine = awaitedSeat(st) === (meRef.current || {}).seat;
        const humanOpponents = st.players.filter((pl) => pl.isHuman).length > 1;
        if (mine && !wasMyTurn.current && humanOpponents && !mutedRef.current) playTurnChime();
        wasMyTurn.current = mine;
        const g = {};                       // rebuild the Sets that JSON cannot carry
        for (const k of Object.keys(st.board.graph)) g[k] = new Set(st.board.graph[k]);
        st.board.graph = g;
        setState(st);
        setLogs((msg.logs || []).map((l, i) => ({ id: i, msg: l.msg, pid: l.pid })));
      }
    };

    const es = new EventSource(`/api/stream?code=${me.code}&token=${me.token}`);
    es.onopen = () => setConn("live");
    es.onerror = () => setConn("polling");
    es.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "hello") return;
      setConn("live");
      apply(msg);
    };

    // fetch immediately so nothing waits on the stream, then keep polling
    const poll = async () => {
      if (stop) return;
      try {
        const r = await fetch(`/api/state?code=${me.code}&token=${me.token}&since=${seen.v}`, { cache: "no-store" });
        const msg = await r.json();
        if (!msg.unchanged) { apply(msg); setConn((c) => (c === "live" ? "live" : "polling")); }
      } catch (_) { setConn("offline"); }
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => { stop = true; clearInterval(id); es.close(); };
  }, [me]);

  if (checking) return (
    <div className="w-full min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0e1014" }}>
      <div className="text-sm text-gray-500">Reconnecting&hellip;</div>
    </div>
  );
  if (!me) return <Lobby onEnter={enter} />;
  if (!state) return <WaitingRoom me={me} lobby={lobby} onLeave={() => leave(true)} />;

  return (
    <>
      {serverEngine && serverEngine !== getEngineVersion() && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9998,
          backgroundColor: "#3a2415", borderBottom: "1px solid #7a6a3f",
          color: "#f5d76e", fontSize: 12, padding: "6px 10px", textAlign: "center" }}>
          This server is running older game rules than this page
          (<code>{serverEngine}</code> vs <code>{getEngineVersion()}</code>). Upload the current
          <strong> EntrepreneursGame.jsx </strong> alongside <strong>server.js</strong> and restart it.
        </div>
      )}
      {serverEngine && serverEngine !== getEngineVersion() && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9998,
          backgroundColor: "#3a2415", borderBottom: "1px solid #7a6a3f",
          color: "#f5d76e", fontSize: 12, padding: "6px 10px", textAlign: "center" }}>
          This server is running older game rules than this page (<code>{serverEngine}</code> vs <code>{getEngineVersion()}</code>).
          Upload the current <strong>EntrepreneursGame.jsx</strong> next to <strong>server.js</strong> and restart it.
        </div>
      )}
      <div style={{ position: "fixed", top: 6, right: 8, zIndex: 90, display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#6b7280" }}>room {me.code}</span>
        <button onClick={() => setMuted((v) => !v)} title={muted ? "Turn the turn chime on" : "Turn the turn chime off"}
          style={{ fontSize: 11, background: "none", border: "none", cursor: "pointer", color: muted ? "#6b7280" : "#8fd3b6", padding: 0, lineHeight: 1 }}>
          {muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"}
        </button>
        <button onClick={() => leave(false)} title="Leave this game" style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>leave</button>
        <span style={{
          fontSize: 10, padding: "2px 7px", borderRadius: 999,
          backgroundColor: conn === "offline" ? "#3a1f1f" : conn === "polling" ? "#33301a" : "#14301f",
          color: conn === "offline" ? "#fca5a5" : conn === "polling" ? "#f5d76e" : "#8fd3b6",
          border: "1px solid #2b3040",
        }} title={conn === "polling" ? "Live stream blocked; updating by polling instead" : undefined}>
          {conn === "offline" ? "offline" : conn === "polling" ? "syncing" : "live"}</span>
      </div>
      {toast && (
        <div style={{
          position: "fixed", bottom: 14, left: "50%", transform: "translateX(-50%)", zIndex: 95,
          backgroundColor: "#2a1a1a", border: "1px solid #7a3f3f", color: "#fca5a5",
          padding: "8px 14px", borderRadius: 8, fontSize: 12,
        }}>{toast}</div>
      )}
      <Game online={{
        state, seat: me.seat, logs, host: !!me.host,
        onKick: async (seat) => {
          const r = await api("/api/kick", { code: me.code, token: me.token, seat });
          if (r.body && r.body.error) { setToast(r.body.error); setTimeout(() => setToast(""), 2600); }
        },
        onRematch: async () => {
          const r = await api("/api/rematch", { code: me.code, token: me.token });
          if (r.body && r.body.error) { setToast(r.body.error); setTimeout(() => setToast(""), 2600); }
        },
      }} />
    </>
  );
}
