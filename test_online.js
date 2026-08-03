/* Two independent clients, each with its own SSE stream and token, play a full
   game against the live server. Nothing shares memory: everything goes over HTTP. */
const http = require("http");

const HOST = "127.0.0.1", PORT = 8080;

function post(path, body) {
  return new Promise((res, rej) => {
    const data = JSON.stringify(body);
    const req = http.request({ host: HOST, port: PORT, path, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } },
      (r) => { let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => { try { res({ status: r.statusCode, body: JSON.parse(b) }); } catch { res({ status: r.statusCode, body: {} }); } }); });
    req.on("error", rej); req.write(data); req.end();
  });
}

/* A client that holds an SSE stream and tracks the latest state it was pushed. */
function makeClient(name) {
  const c = { name, state: null, seat: null, updates: 0, lobby: null, closed: false };
  c.connect = (code, token) => new Promise((resolve) => {
    const req = http.get({ host: HOST, port: PORT, path: `/api/stream?code=${code}&token=${token}` }, (r) => {
      let buf = "";
      r.on("data", (chunk) => {
        buf += chunk.toString();
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const raw = buf.slice(0, i); buf = buf.slice(i + 2);
          const line = raw.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const msg = JSON.parse(line.slice(6));
          if (msg.type === "hello") { c.seat = msg.seat; resolve(); }
          else if (msg.type === "state") { c.state = msg.state; c.updates++; }
          else if (msg.type === "lobby") { c.lobby = msg; }
        }
      });
    });
    c.req = req;
  });
  return c;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(15); }
  return false;
}

(async () => {
  console.log("=== LOBBY ===");
  const create = await post("/api/create", { name: "Ana", bots: 1 });
  const code = create.body.code;
  const ana = { tok: create.body.token, seat: create.body.seat };
  console.log(`Ana created room ${code} (seat ${ana.seat})`);

  const join = await post("/api/join", { code, name: "Bruno" });
  const bruno = { tok: join.body.token, seat: join.body.seat };
  console.log(`Bruno joined (seat ${bruno.seat})`);

  const cA = makeClient("Ana"), cB = makeClient("Bruno");
  await cA.connect(code, ana.tok);
  await cB.connect(code, bruno.tok);
  console.log(`both SSE streams open (Ana seat ${cA.seat}, Bruno seat ${cB.seat})`);
  await waitFor(() => cA.lobby && cB.lobby);
  console.log(`lobby seen by both: ${JSON.stringify(cA.lobby.members.map((m) => m.name))} + ${cA.lobby.bots} bot`);

  // a non-host must not be able to start
  const badStart = await post("/api/start", { code, token: bruno.tok });
  console.log(`non-host start rejected: ${badStart.status === 403} (${badStart.body.error || ""})`);

  console.log("\n=== START ===");
  await post("/api/start", { code, token: ana.tok });
  await waitFor(() => cA.state && cB.state);
  console.log(`both clients received state (Ana ${cA.updates} updates, Bruno ${cB.updates})`);
  console.log(`players: ${cA.state.players.map((p) => p.name + (p.isHuman ? "(H)" : "(bot)")).join(", ")}`);
  console.log(`seating: ${JSON.stringify(cA.state.turnOrder)}`);

  const me = (c) => (c === cA ? ana : bruno);
  const act = async (c, action, data) => {
    const r = await post("/api/action", { code, token: me(c).tok, action, data });
    return r;
  };

  // turn-order enforcement: whoever is NOT awaited must be refused
  const st0 = cA.state;
  const awaited = st0.awaitingPlayerId;
  const wrong = awaited === cA.seat ? cB : cA;
  const refuse = await act(wrong, "draft", { ind: "UT" });
  console.log(`out-of-turn action rejected: ${refuse.status === 400} (${refuse.body.error || ""})`);

  console.log("\n=== PLAYING ===");
  const clientBySeat = {}; clientBySeat[cA.seat] = cA; clientBySeat[cB.seat] = cB;
  const phases = {};
  let steps = 0;

  while (steps++ < 3000) {
    const st = cA.state;
    if (!st || st.phase === "gameover") break;
    phases[st.phase] = (phases[st.phase] || 0) + 1;

    let seat = null;
    if (st.phase === "drafting") seat = st.awaitingPlayerId;
    else if (st.phase === "planning") seat = st.planningQueue[0];
    else if (st.phase === "resolving") seat = st.pendingHumanAction ? st.pendingHumanAction.playerId : null;
    else if (["delivering", "liquidating", "repayingLoans"].includes(st.phase)) seat = st.awaitingPlayerId;
    else if (st.phase === "placingLH") seat = st.turnOrder[0];

    const c = clientBySeat[seat];
    if (c === undefined) { await sleep(30); continue; }   // bot's turn, server handles it
    const p = st.players.find((x) => x.id === seat);
    const before = c.updates;
    let r;

    if (st.phase === "drafting") {
      const ind = Object.keys(st.decks).find((i) => st.decks[i].length);
      r = await act(c, "draft", { ind });
    } else if (st.phase === "planning") {
      const track = ["ma", "rd", "raise_capital"].find((t) => st.tracks[t].some((x) => x === null)) || "raise_capital";
      r = await act(c, "plan", { track });
    } else if (st.phase === "resolving") {
      const ent = st.pendingHumanAction;
      // simple real play: buy land, then build on it
      const ownedFree = Object.entries(st.board.owner).filter(([k, v]) => v === seat && !(k in st.board.occupiedBy)).map(([k]) => k);
      const bpIdx = p.hand.findIndex((b) => p.cash >= b.setup + 6);
      if (ent.track === "ma" && bpIdx >= 0 && ownedFree.length) {
        const bp = p.hand[bpIdx];
        const need = bp.ind === "UT" || bp.ind === "MA" || bp.ind === "TE" ? bp.lvl : 1;
        if (ownedFree.length >= need) r = await act(c, "act", { type: "launch", index: bpIdx, footprint: ownedFree.slice(0, need) });
      }
      if (!r || r.status !== 200) {
        const unowned = Object.keys(st.board.graph).filter((k) => !(k in st.board.owner));
        if (ent.track === "ma" && unowned.length) r = await act(c, "act", { type: "buyPlot", plot: unowned[0] });
        else if (ent.track === "raise_capital" && p.cash < 25) r = await act(c, "act", { type: "loan" });
      }
      if (!r || r.status !== 200) r = await act(c, "act", { type: "pass" });
    } else if (st.phase === "delivering") {
      const biz = p.businesses.find((b) => b.id === st.deliveringBizId);
      let done = false;
      if (biz) {
        // find any open slot for this business's industry within its own district
        const home = new Set(biz.footprint.map((pk) => { const cc = st.board.cellOf[pk]; return `${cc.r},${cc.c}`; }));
        for (const tk of home) {
          const t = st.demand.tiles[tk];
          if (!t) continue;
          for (let ri = 0; ri < 4; ri++) {
            if (t.rows[ri] !== biz.bp.ind) continue;
            if (ri >= 2 && st.quarter <= 4) continue;
            for (let li = 0; li < Math.min(biz.level, 4); li++) {
              if (!t.filled[ri][li]) {
                r = await act(c, "deliver", { tileKey: tk, rowIdx: ri, levelIdx: li, cross: false });
                if (r.status === 200) { done = true; break; }
              }
            }
            if (done) break;
          }
          if (done) break;
        }
      }
      if (!done) r = await act(c, "skipDelivery", {});
    } else if (st.phase === "liquidating") {
      r = await act(c, "liquidateDone", {});
    } else if (st.phase === "placingLH") {
      const g = st.board.graph;
      let placed = false;
      for (const a of Object.keys(g)) {
        for (const b of g[a]) {
          const ca = st.board.cellOf[a], cb = st.board.cellOf[b];
          if (ca.r === cb.r && ca.c === cb.c) continue;
          if (st.board.lhEdges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) continue;
          r = await act(c, "placeLH", { a, b });
          if (r.status === 200) { placed = true; break; }
        }
        if (placed) break;
      }
      if (!placed) { console.log("  ! no legal hub placement"); break; }
    } else if (st.phase === "repayingLoans") {
      r = await act(c, "repay", {});
      if (!r || r.status !== 200) r = await act(c, "repayDone", {});
    }

    if (r && r.status !== 200 && st.phase !== "repayingLoans") {
      console.log(`  ! ${st.phase} seat ${seat}: ${r.body.error}`);
      if (st.phase === "resolving") await act(c, "act", { type: "pass" });
    }
    await waitFor(() => c.updates > before, 2000);
  }

  const st = cA.state;
  console.log(`\nsteps: ${steps} | final phase: ${st.phase} | quarter: ${st.quarter}`);
  console.log(`phases exercised: ${JSON.stringify(phases)}`);
  console.log(`\nSSE updates received - Ana: ${cA.updates}, Bruno: ${cB.updates}`);
  console.log(`both clients hold identical state: ${JSON.stringify(cA.state.players.map((p) => p.epBank)) === JSON.stringify(cB.state.players.map((p) => p.epBank))}`);
  console.log("\nFINAL SCORES");
  st.players.forEach((p) => console.log(`  ${p.name.padEnd(16)} ${p.isHuman ? "HUMAN" : "bot  "}  ${p.epBank.toFixed(0)} EP  $${Math.round(p.cash)}  ${p.businesses.filter((b) => !b.distressed && !b.isHQ).length} biz`));
  cA.req.destroy(); cB.req.destroy();
  process.exit(0);
})();
