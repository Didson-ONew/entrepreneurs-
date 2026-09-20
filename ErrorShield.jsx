/* The last line of defence against a blank page.

   A render error anywhere in the tree unmounts the whole React root, and what the
   player sees is a black screen with no message and no way forward. That is exactly
   what happened when the Go Public card referenced a constant that had been removed:
   one ReferenceError, and a player mid-game could not see their own board.

   This catches it. The game state lives on the server (online) or in memory (solo),
   so a reload is nearly always enough; the message says what broke so it can be
   reported, and the button reloads. Error boundaries are the one thing React still
   requires a class for. */
import React from "react";

export default class ErrorShield extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    try { console.error("render error", error, info && info.componentStack); } catch (_) {}
  }
  render() {
    if (!this.state.error) return this.props.children;
    const msg = String((this.state.error && this.state.error.message) || this.state.error);
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "#0b0e14", color: "#e5e7eb", fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 420, backgroundColor: "#151922", border: "1px solid #2c5f4f", borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: "#d3fcec" }}>Something went wrong on this screen</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>
            Your game is safe. Reload the page to pick up where you were. If it keeps happening,
            send the line below through Feedback.
          </div>
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#fca5a5", wordBreak: "break-word", marginBottom: 14 }}>{msg}</div>
          <button onClick={() => { try { location.reload(); } catch (_) {} }}
            style={{ backgroundColor: "#2c5f4f", color: "#e5e7eb", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
