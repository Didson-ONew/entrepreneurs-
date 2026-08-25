/* Six chairs online.

   The engine deals up to six seats and widens the three working tracks at five and
   six. The server has its own idea of how many people fit, and the two have to agree:
   a room that seats four in the lobby while the engine seats six is a table where the
   fifth person is quietly turned into a watcher for no reason anybody can see.

   What is checked here is the seam, not the rules:

     the host can ask for up to five bots, and asking for more is clamped, not obeyed
     humans and bots share the same six chairs - five bots leaves exactly one seat
     the seventh arrival becomes a watcher and is told the table is full
     a six-seat game actually starts, and starts with six-wide tracks

   Run the server first, then: node test_six_seats.js
*/
const BASE = process.env.BASE || "http://127.0.0.1:8080";
const post = async (p, b) => (await fetch(BASE + p, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b),
})).json();
const get = async (p) => (await fetch(BASE + p, { cache: "no-store" })).json();
const lobbyOf = (c, t) => get(`/api/state?code=${c}&token=${t}&since=-1`);

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n${t}`);

(async () => {
  section("How many bots a host may ask for");
  {
    const r = await post("/api/create", { name: "Ana", bots: 5 });
    const lob = await lobbyOf(r.code, r.token);
    check("five bots is allowed", lob.bots === 5, `got ${lob.bots}`);
  }
  {
    const r = await post("/api/create", { name: "Ana", bots: 9 });
    const lob = await lobbyOf(r.code, r.token);
    check("nine is clamped to five, not refused", lob.bots === 5, `got ${lob.bots}`);
  }
  {
    const r = await post("/api/create", { name: "Ana", bots: -3 });
    const lob = await lobbyOf(r.code, r.token);
    check("a negative count is clamped to none", lob.bots === 0, `got ${lob.bots}`);
  }

  section("People and bots share the same six chairs");
  {
    const host = await post("/api/create", { name: "Ana", bots: 5 });
    const late = await post("/api/join", { code: host.code, name: "Bruno" });
    check("with five bots the table is full", late.spectator === true, JSON.stringify(late));
    check("and the newcomer is told why", late.reason === "full", late.reason);

    await post("/api/options", { code: host.code, token: host.token, bots: 2 });
    const lob = await lobbyOf(host.code, host.token);
    check("the host can free seats up again", lob.bots === 2, `got ${lob.bots}`);
    const now = await post("/api/join", { code: host.code, name: "Bruno" });
    check("and then somebody can sit down", !now.spectator && now.seat === 1, JSON.stringify(now));
  }

  section("Six people, no bots");
  {
    const host = await post("/api/create", { name: "P1", bots: 0 });
    const seated = [host];
    for (let i = 2; i <= 6; i++) seated.push(await post("/api/join", { code: host.code, name: `P${i}` }));
    check("all six sit down", seated.every((s) => !s.spectator), seated.map((s) => s.seat).join(","));
    check("their seats are 0 to 5", seated.map((s) => s.seat).join(",") === "0,1,2,3,4,5");
    const seventh = await post("/api/join", { code: host.code, name: "P7" });
    check("the seventh watches instead", seventh.spectator === true && seventh.reason === "full",
      JSON.stringify(seventh));

    const start = await post("/api/start", { code: host.code, token: host.token });
    check("the game starts", start.ok === true, start.error || "");
    const st = (await lobbyOf(host.code, host.token)).state;
    check("six seats are in play", st && st.players.length === 6, st ? `${st.players.length}` : "no state");
    const w = st ? ["raise_capital", "ma", "rd"].map((k) => st.tracks[k].length) : [];
    check("the working tracks are six wide", w.join("/") === "6/6/6", w.join("/"));
    check("Board Meeting is still two seats", st && st.tracks.board_meeting.length === 2);
    /* at six players every tile in the game is drawn - four from each of the four
       tiers - which is what makes a second merger findable and the early ending real */
    check("the whole Megacorp box is in play", st && st.megacorpPool.length === 16,
      st ? `${st.megacorpPool.length} tiles` : "");
  }

  section("A four-seat table is unchanged");
  {
    const host = await post("/api/create", { name: "Ana", bots: 3 });
    await post("/api/start", { code: host.code, token: host.token });
    const st = (await lobbyOf(host.code, host.token)).state;
    check("four seats", st && st.players.length === 4, st ? `${st.players.length}` : "no state");
    const w = st ? ["raise_capital", "ma", "rd"].map((k) => st.tracks[k].length) : [];
    check("the working tracks stay four wide", w.join("/") === "4/4/4", w.join("/"));
  }

  console.log(fails ? `\n${fails} FAILED\n` : "\nall checks passed\n");
  process.exit(fails ? 1 : 0);
})();
