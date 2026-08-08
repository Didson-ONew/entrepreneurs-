import React, { useState, useEffect, useRef } from "react";
import Game, { setNet, getEngineVersion, Floating } from "./EntrepreneursGame.jsx";
import SiteChrome from "./Rulebook.jsx";

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
    onEnter({ code: r.body.code, token: r.body.token, seat: r.body.seat, host: false,
      name: name.trim(), spectator: !!r.body.spectator });
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
          <p className="text-[10px] text-gray-500 mb-2">
            If the game has already started or the table is full, you will join as a
            watcher — you can see the whole board, chat and talk, but not play.
          </p>
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

        {me.host && (
          <button onClick={async () => {
              const r = await api("/api/options", { code: me.code, token: me.token, personas: !(lobby && lobby.personas) });
              if (r.body && r.body.error) setErr(r.body.error);
            }}
            className="w-full rounded-md px-3 py-2 text-left mb-3"
            style={{ backgroundColor: "#1c1f26", border: `1px solid ${lobby && lobby.personas ? "#2c5f4f" : "#262a33"}` }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: lobby && lobby.personas ? "#8fd3b6" : "#8b93a3" }}>
                Personas {lobby && lobby.personas ? "ON" : "OFF"}
              </span>
              <span className="text-[10px]" style={{ color: "#8fd3b6" }}>{lobby && lobby.personas ? "\u2713" : ""}</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              Each player is dealt a random specialist power, one per industry.
            </div>
          </button>
        )}
        {!me.host && lobby && lobby.personas && (
          <div className="rounded-md px-3 py-2 mb-3 text-[11px]"
            style={{ backgroundColor: "#1c1f26", border: "1px solid #2c5f4f", color: "#8fd3b6" }}>
            Personas are ON &mdash; you will be dealt a random specialist power when the game starts.
          </div>
        )}
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

        {lobby && lobby.watchers && lobby.watchers.length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
              Watching ({lobby.watchers.length})
            </div>
            <div className="text-[11px] text-gray-400">{lobby.watchers.join(", ")}</div>
          </div>
        )}
        {me.spectator && (
          <div className="mt-3 rounded p-2 text-[11px]" style={{ backgroundColor: "#1c2733", color: "#8fd3b6" }}>
            You are watching this room. The host starts the game when the players are ready.
          </div>
        )}
        <button onClick={onLeave} className="w-full mt-3 text-xs"
          style={{ background: "none", border: "none", color: "#6b7280", textDecoration: "underline", cursor: "pointer", padding: "6px 0" }}>
          {me.spectator ? "Stop watching" : me.host ? "Cancel this room and go back" : "Leave this room"}
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

/* ---------------- Table chat + voice ----------------
   Chat rides on the state payload the client already receives, so it needs no
   transport of its own.

   Voice is a small WebRTC mesh: with at most four players that is six connections,
   which browsers handle comfortably. The server only relays the handshake; the audio
   itself flows directly between players and never touches the host. */

const STUN = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }];

function useVoice(me, active) {
  const [on, setOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peers, setPeers] = useState([]);      // [{seat, name, speaking}]
  const [error, setError] = useState("");
  const localStream = useRef(null);
  const conns = useRef(new Map());             // seat -> RTCPeerConnection
  const audios = useRef(new Map());            // seat -> HTMLAudioElement
  const pollRef = useRef(null);

  const post = (body) =>
    fetch("/api/signal", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: me.code, token: me.token, ...body }) }).then((r) => r.json());

  function attach(seat, stream) {
    let el = audios.current.get(seat);
    if (!el) {
      el = document.createElement("audio");
      el.autoplay = true;
      el.dataset.seat = String(seat);
      document.body.appendChild(el);
      audios.current.set(seat, el);
    }
    el.srcObject = stream;
    el.play().catch(() => {});
  }

  function makeConn(seat) {
    if (conns.current.has(seat)) return conns.current.get(seat);
    const pc = new RTCPeerConnection({ iceServers: STUN });
    if (localStream.current) localStream.current.getTracks().forEach((t) => pc.addTrack(t, localStream.current));
    pc.onicecandidate = (e) => { if (e.candidate) post({ kind: "ice", to: seat, payload: e.candidate }); };
    pc.ontrack = (e) => attach(seat, e.streams[0]);
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        setPeers((ps) => ps.map((p) => (p.seat === seat ? { ...p, failed: pc.connectionState === "failed" } : p)));
      }
    };
    conns.current.set(seat, pc);
    return pc;
  }

  async function callPeer(seat) {
    const pc = makeConn(seat);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    post({ kind: "offer", to: seat, payload: offer });
  }

  async function handle(msg) {
    if (msg.kind === "presence") {
      setPeers((ps) => {
        const rest = ps.filter((p) => p.seat !== msg.from);
        return msg.on ? [...rest, { seat: msg.from, name: msg.name }] : rest;
      });
      if (!msg.on) {
        const pc = conns.current.get(msg.from);
        if (pc) { pc.close(); conns.current.delete(msg.from); }
        const el = audios.current.get(msg.from);
        if (el) { el.remove(); audios.current.delete(msg.from); }
      } else if (msg.from > me.seat) {
        // deterministic tie-break: the lower seat always makes the offer
        callPeer(msg.from);
      }
      return;
    }
    if (msg.kind === "offer") {
      const pc = makeConn(msg.from);
      await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      post({ kind: "answer", to: msg.from, payload: answer });
      setPeers((ps) => (ps.some((p) => p.seat === msg.from) ? ps : [...ps, { seat: msg.from, name: msg.name }]));
    } else if (msg.kind === "answer") {
      const pc = conns.current.get(msg.from);
      if (pc && pc.signalingState !== "stable") await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
    } else if (msg.kind === "ice") {
      const pc = conns.current.get(msg.from);
      if (pc) { try { await pc.addIceCandidate(new RTCIceCandidate(msg.payload)); } catch (_) {} }
    }
  }

  async function start() {
    setError("");
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false,
      });
    } catch (e) {
      setError(e && e.name === "NotAllowedError"
        ? "Microphone permission was refused. Allow it in your browser's address bar to join the call."
        : "No microphone available.");
      return;
    }
    setOn(true);
    const r = await post({ type: "join" });
    (r.peers || []).forEach((p) => {
      setPeers((ps) => (ps.some((x) => x.seat === p.seat) ? ps : [...ps, p]));
      if (p.seat > me.seat) callPeer(p.seat);   // lower seat offers
    });
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/signals?code=${me.code}&token=${me.token}`, { cache: "no-store" });
        const d = await res.json();
        for (const m of d.mail || []) handle(m);
      } catch (_) {}
    }, 900);
  }

  function stop() {
    post({ type: "leave" });
    clearInterval(pollRef.current);
    conns.current.forEach((pc) => pc.close()); conns.current.clear();
    audios.current.forEach((el) => el.remove()); audios.current.clear();
    if (localStream.current) localStream.current.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    setPeers([]); setOn(false); setMuted(false);
  }

  function toggleMute() {
    if (!localStream.current) return;
    const next = !muted;
    localStream.current.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMuted(next);
  }

  useEffect(() => () => { if (on) stop(); }, []);          // clean up on unmount
  useEffect(() => { if (!active && on) stop(); }, [active]);

  return { on, muted, peers, error, start, stop, toggleMute };
}

function TablePanel({ me, chat, onSend }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat");
  const [draft, setDraft] = useState("");
  const [seenCount, setSeenCount] = useState(0);
  const endRef = useRef(null);
  const voice = useVoice(me, true);

  const unread = Math.max(0, chat.length - seenCount);
  useEffect(() => { if (open) setSeenCount(chat.length); }, [open, chat.length]);
  useEffect(() => {
    const box = endRef.current && endRef.current.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [chat.length, open, tab]);

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    onSend(t);
    setDraft("");
  };

  const btn = {
    background: "none", border: "none", cursor: "pointer", fontSize: 11,
    padding: "5px 9px", borderRadius: 5,
  };

  return (
    <Floating>
      <div style={{ position: "fixed", right: 10, bottom: 10, zIndex: 9997, width: open ? 300 : "auto" }}>
        {!open && (
          <button onClick={() => setOpen(true)}
            style={{ ...btn, backgroundColor: "#14161a", border: "1px solid #2c5f4f", color: "#8fd3b6",
              padding: "8px 12px", fontWeight: 700, boxShadow: "0 6px 18px rgba(0,0,0,0.5)" }}>
            Table {unread > 0 && (
              <span style={{ marginLeft: 6, backgroundColor: "#c0392b", color: "#fff", borderRadius: 8,
                padding: "1px 6px", fontSize: 10 }}>{unread}</span>
            )}
            {voice.on && <span style={{ marginLeft: 6 }}>{"\uD83C\uDFA4"}</span>}
          </button>
        )}

        {open && (
          <div style={{ backgroundColor: "#14161a", border: "1px solid #262a33", borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.55)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: 6,
              borderBottom: "1px solid #262a33" }}>
              {["chat", "voice"].map((k) => (
                <button key={k} onClick={() => setTab(k)}
                  style={{ ...btn, flex: 1, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                    backgroundColor: tab === k ? "#2c5f4f" : "#1c1f26",
                    color: tab === k ? "#d3fcec" : "#8b93a3" }}>
                  {k}{k === "voice" && voice.on ? " \u25CF" : ""}
                </button>
              ))}
              <button onClick={() => setOpen(false)} style={{ ...btn, color: "#6b7280" }}>&#10005;</button>
            </div>

            {tab === "chat" && (
              <div>
                <div style={{ height: 210, overflowY: "auto", padding: "8px 10px" }}>
                  {!chat.length && (
                    <div style={{ fontSize: 11, color: "#6b7280", fontStyle: "italic" }}>
                      No messages yet. Say hello to the table.
                    </div>
                  )}
                  {chat.map((m) => (
                    <div key={m.id} style={{ marginBottom: 7 }}>
                      <div style={{ fontSize: 10, fontWeight: 700,
                        color: m.seat === me.seat ? "#8fd3b6" : "#9aa3b2" }}>
                        {m.seat === me.seat ? "You" : m.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#d5d9e0", lineHeight: 1.35, wordBreak: "break-word" }}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
                <div style={{ display: "flex", gap: 6, padding: 8, borderTop: "1px solid #262a33" }}>
                  <input value={draft} maxLength={400}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                    placeholder="Message the table"
                    style={{ flex: 1, backgroundColor: "#1c1f26", border: "1px solid #262a33",
                      borderRadius: 5, color: "#e5e7eb", fontSize: 12, padding: "6px 8px", outline: "none" }} />
                  <button onClick={send} disabled={!draft.trim()}
                    style={{ ...btn, backgroundColor: "#2c5f4f", color: "#d3fcec", fontWeight: 700,
                      opacity: draft.trim() ? 1 : 0.4 }}>Send</button>
                </div>
              </div>
            )}

            {tab === "voice" && (
              <div style={{ padding: 10 }}>
                {!voice.on ? (
                  <>
                    <div style={{ fontSize: 11, color: "#9aa3b2", lineHeight: 1.45, marginBottom: 9 }}>
                      Talk to the other players while you play. Your browser will ask for
                      microphone permission. Audio goes directly between players, not through the server.
                    </div>
                    <button onClick={voice.start}
                      style={{ ...btn, width: "100%", backgroundColor: "#2c5f4f", color: "#d3fcec",
                        fontWeight: 700, padding: "8px 0" }}>
                      {"\uD83C\uDFA4"} Join voice call
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>
                      ON THE CALL
                    </div>
                    <div style={{ marginBottom: 9 }}>
                      <div style={{ fontSize: 12, color: "#8fd3b6" }}>
                        You {voice.muted && <span style={{ color: "#fca5a5" }}>(muted)</span>}
                      </div>
                      {voice.peers.map((p) => (
                        <div key={p.seat} style={{ fontSize: 12, color: p.failed ? "#fca5a5" : "#d5d9e0" }}>
                          {p.name}{p.failed ? " \u2014 could not connect" : ""}
                        </div>
                      ))}
                      {!voice.peers.length && (
                        <div style={{ fontSize: 11, color: "#6b7280", fontStyle: "italic", marginTop: 3 }}>
                          Waiting for someone else to join&hellip;
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={voice.toggleMute}
                        style={{ ...btn, flex: 1, backgroundColor: "#1c1f26", border: "1px solid #262a33",
                          color: voice.muted ? "#fca5a5" : "#8fd3b6", fontWeight: 700 }}>
                        {voice.muted ? "Unmute" : "Mute"}
                      </button>
                      <button onClick={voice.stop}
                        style={{ ...btn, flex: 1, backgroundColor: "#3a1f1f", border: "1px solid #7a3f3f",
                          color: "#fca5a5", fontWeight: 700 }}>Leave call</button>
                    </div>
                  </>
                )}
                {voice.error && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#fca5a5", lineHeight: 1.4 }}>
                    {voice.error}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Floating>
  );
}

/* The rulebook and the live counters are mounted here, outside the app, so they
   are on screen on every one of its screens - joining, waiting, drafting, playing
   and the results - instead of only inside the game. */
export default function OnlineApp() {
  return (
    <>
      <SiteChrome />
      <OnlineTable />
    </>
  );
}

function OnlineTable() {
  const [me, setMe] = useState(null);
  const [lobby, setLobby] = useState(null);
  const [state, setState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [conn, setConn] = useState("connecting");
  const [toast, setToast] = useState("");
  const [checking, setChecking] = useState(true);
  const [serverEngine, setServerEngine] = useState(null);
  const [chat, setChat] = useState([]);
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
      if (r.body && r.body.ok) setMe({ ...saved, seat: r.body.seat, host: r.body.host, name: r.body.name, spectator: !!saved.spectator });
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
      if (msg.chat) setChat(msg.chat);
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

  const tablePanel = (
    <TablePanel me={me} chat={chat}
      onSend={(text) => api("/api/chat", { code: me.code, token: me.token, text })} />
  );
  if (!state) return (
    <>
      {tablePanel}
      <WaitingRoom me={me} lobby={lobby} onLeave={() => leave(true)} />
    </>
  );

  return (
    <>
      {tablePanel}
      {me.spectator && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9996,
          backgroundColor: "#1c2733", borderBottom: "1px solid #3a4152",
          color: "#8fd3b6", fontSize: 12, padding: "5px 10px", textAlign: "center" }}>
          You are <strong>watching</strong> this game. You can chat and join the voice call,
          but you cannot take actions.
        </div>
      )}
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
        state, seat: me.seat, logs, host: !!me.host, spectator: !!me.spectator,
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
