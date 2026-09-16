/* Run the test suite against a server this script owns.

   WHY THIS EXISTS. Twenty-three of the tests talk to a running server over HTTP and
   none of them starts one, so running `node test_online.js` on a clean checkout gives
   you ECONNREFUSED and a red test that looks exactly like a product bug. It cost two
   rounds of investigation to rediscover that, which is two rounds too many.

   It also isolates the data. The server writes accounts, games and match logs into
   ENT_DATA_DIR, so a suite run against the default directory would scribble over the
   real store - and the tests create accounts and finish games on purpose. This boots
   the server on a throwaway directory and deletes it afterwards.

   Usage
     npm test                 every test
     npm test -- accounts     only tests whose filename contains "accounts"
     npm test -- --keep       leave the temp data directory behind to inspect
     npm test -- -v           print each test's own output, passing or failing

   Exit code is the number of failing tests, so CI can read it.
*/
import { spawn } from "node:child_process";
import { readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";

const args = process.argv.slice(2);
const KEEP = args.includes("--keep");
const VERBOSE = args.includes("--verbose") || args.includes("-v");
const filters = args.filter((a) => !a.startsWith("--"));

/* Ask the OS for a port nobody is using, rather than assuming 8080 is free - a stale
   server from an earlier session holding that port is exactly how a suite ends up
   testing yesterday's code. */
function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.once("error", rej);
    s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => res(port)); });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(base, proc, ms = 20000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) return false;
    try {
      const r = await fetch(base + "/", { cache: "no-store" });
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await sleep(150);
  }
  return false;
}

const DATA = mkdtempSync(path.join(tmpdir(), "entrepreneurs-test-"));
const PORT = await freePort();
const BASE = `http://127.0.0.1:${PORT}`;
/* The server needs PORT. The TESTS must not inherit it: four of them start a server
   of their own (test_survives_restart and friends) and read `process.env.PORT`, so
   handing them this one makes them try to bind a port already held by the shared
   server and die with EADDRINUSE. They get BASE, which says where the shared server
   is, and keep their own defaults for the servers they run themselves. */
const serverEnv = { ...process.env, ENT_DATA_DIR: DATA, PORT: String(PORT), BASE };
const env = { ...process.env, ENT_DATA_DIR: DATA, BASE };
delete env.PORT;

console.log(`server on ${BASE}`);
console.log(`data     ${DATA}${KEEP ? "  (kept)" : ""}\n`);

const server = spawn("node", ["server.js"], { env: serverEnv, stdio: ["ignore", "pipe", "pipe"] });
let serverLog = "";
server.stdout.on("data", (d) => { serverLog += d; });
server.stderr.on("data", (d) => { serverLog += d; });

let failures = [];
try {
  if (!await waitForServer(BASE, server)) {
    console.error("the server never came up. Its output:\n" + serverLog);
    process.exit(1);
  }

  let tests = readdirSync(".").filter((f) => /^test_.*\.js$/.test(f)).sort();
  if (filters.length) tests = tests.filter((f) => filters.some((q) => f.includes(q)));
  if (!tests.length) { console.error("no tests matched " + filters.join(" ")); process.exit(1); }

  const skipped = [];
  for (const t of tests) {
    const started = Date.now();
    let lastOut = "";
    const code = await new Promise((res) => {
      const p = spawn("node", [t], { env, stdio: ["ignore", "pipe", "pipe"] });
      let out = "";
      p.stdout.on("data", (d) => { out += d; });
      p.stderr.on("data", (d) => { out += d; });
      const timer = setTimeout(() => p.kill("SIGKILL"), 240000);
      p.on("close", (c) => {
        clearTimeout(timer);
        lastOut = out;
        if (c !== 0) failures.push({ t, out });
        if (/\bskip/i.test(out) && c === 0) skipped.push(t);
        res(c);
      });
    });
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`${code === 0 ? "ok  " : "FAIL"}  ${t.padEnd(28)} ${secs}s`);
    if (VERBOSE && lastOut) console.log(lastOut.trimEnd().split("\n").map((l) => "      " + l).join("\n"));
  }

  console.log(`\n${tests.length - failures.length}/${tests.length} passed`);
  if (skipped.length) console.log(`(${skipped.length} reported a skip inside: ${skipped.join(", ")})`);
  for (const { t, out } of failures) {
    console.log(`\n${"=".repeat(70)}\n${t}\n${"=".repeat(70)}\n${out.trimEnd().split("\n").slice(-25).join("\n")}`);
  }
} finally {
  server.kill("SIGTERM");
  await sleep(300);
  if (server.exitCode === null) server.kill("SIGKILL");
  if (!KEEP) rmSync(DATA, { recursive: true, force: true });
}

process.exit(failures.length);
