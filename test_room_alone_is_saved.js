/* The exact case that was lost: a game, and nothing else. No note, no new
   account, no finished match - just people playing. Before the fix nothing
   scheduled a durable save, so the store never heard about it. */
const http = require("http"); const fs = require("fs"); const { spawn } = require("child_process");
const DIR = require("os").tmpdir() + "/entrepreneurs-roomonly"; const PORT = 8095, GH = 8096;
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
  const r = await fetch(`http://127.0.0.1:${PORT}/api/create`, { method:"POST",
    headers:{"Content-Type":"application/json"}, body: JSON.stringify({name:"Ana", bots:1}) });
  const { code } = await r.json();
  console.log("created room", code, "- now waiting, doing nothing else at all");
  await sleep(26000);
  const ok = writes > 0 && stored && (JSON.parse(stored).rooms || []).some(x => x.code === code);
  console.log(`${ok ? " ok  " : " FAIL"} a game on its own reaches the store  [${writes} write(s)]`);
  srv.kill("SIGTERM"); await sleep(1500); gh.close();
  process.exit(ok ? 0 : 1);
})();
