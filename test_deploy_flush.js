/* Can a deploy land between a move and the debounced write, and lose it?

   A deploy stops the server with SIGTERM. If the flush on the way out works,
   the answer is no however long the debounce is - which is what makes a 20
   second debounce safe rather than a 20 second window of risk. */
const http = require("http"); const fs = require("fs"); const { spawn } = require("child_process");
const DIR = require("os").tmpdir() + "/entrepreneurs-flush"; const PORT = 8097, GH = 8098;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let stored = null, sha = null, writes = 0;
const gh = http.createServer((req, res) => {
  if (req.method === "GET") {
    if (!stored) { res.writeHead(404); return res.end("{}"); }
    res.writeHead(200, {"Content-Type":"application/json"});
    return res.end(JSON.stringify({ sha, content: Buffer.from(stored).toString("base64") }));
  }
  let b = ""; req.on("data", d => b += d); req.on("end", () => {
    const j = JSON.parse(b); stored = Buffer.from(j.content, "base64").toString("utf8");
    writes++; sha = `s${writes}`;
    res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify({content:{sha}}));
  });
});
(async () => {
  fs.rmSync(DIR, {recursive:true, force:true}); fs.mkdirSync(DIR, {recursive:true});
  await new Promise(r => gh.listen(GH, r));
  const srv = spawn("node", ["server.js"], { cwd: __dirname, env: {
    ...process.env, PORT: String(PORT), ENT_DATA_DIR: DIR,
    ENT_BACKUP_REPO: "fake/repo", ENT_BACKUP_TOKEN: "t", ENT_BACKUP_API: `http://127.0.0.1:${GH}` } });
  await sleep(4000);
  // let the first save settle so we are measuring the SECOND change
  const r = await fetch(`http://127.0.0.1:${PORT}/api/create`, { method:"POST",
    headers:{"Content-Type":"application/json"}, body: JSON.stringify({name:"Ana", bots:1}) });
  const { code, token } = await r.json();
  await sleep(24000);
  const settled = writes;
  console.log(`room ${code} saved (${settled} write(s)). Now a change, then SIGTERM 2s later.`);

  // a change: somebody joins. That is a broadcast, so the debounce starts again.
  await fetch(`http://127.0.0.1:${PORT}/api/join`, { method:"POST",
    headers:{"Content-Type":"application/json"}, body: JSON.stringify({ code, name:"Bruno" }) });
  await sleep(2000);                      // well inside the 20s debounce
  srv.kill("SIGTERM");
  await sleep(6000);

  const after = stored ? JSON.parse(stored) : null;
  const room = after && (after.rooms || []).find(x => x.code === code);
  const names = room ? room.members.map(m => m.name) : [];
  const ok = writes > settled && names.includes("Bruno");
  console.log(`${ok ? " ok  " : " FAIL"} the change made 2s before the deploy was flushed`
    + `  [${writes - settled} extra write(s), seats: ${names.join(", ") || "none"}]`);
  gh.close();
  process.exit(ok ? 0 : 1);
})();
