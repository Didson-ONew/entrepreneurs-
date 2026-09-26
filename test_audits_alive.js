/* ============================================================================
   Every audit still measures the game that is actually in the repo.

   WHY THIS EXISTS. The 43 audit_*.js scripts are the whole evidence base for
   every balance decision in this game - what a level is worth, where the price
   floor sits, how much of a winning score is cash. None of them was ever run by
   the suite, so nothing noticed when one stopped working.

   And they stop working easily. An audit does not import the engine; it READS
   EntrepreneursGame.jsx as text, asserts that some exact fragment of it is still
   there, and then splices an arm into that fragment inside a `vm` sandbox. That
   is what lets an audit measure a rule the repo does not implement. It is also
   what makes it fragile: change the line an audit anchors on - even in a way
   that changes no behaviour at all - and the audit exits 2 and is never run
   again. It does not fail loudly. It just stops being evidence.

   That is not hypothetical. Twenty-three of the 43 were dead when this test was
   written, including audit_state_of_play.js, which the rulebook cites by name
   for its scoring-mix note, and audit_tension.js. Two of them were killed by a
   pure translation commit that moved one log line and changed no rule.

   WHAT THIS CHECKS, AND WHAT IT DOES NOT. Every audit is started, and its shape
   guards run synchronously at startup, before any game is played. So:

     exits non-zero         FAIL - its probes no longer match the engine
     still running at GRACE PASS - the guards are satisfied; it is now simulating
     exits 0 inside GRACE   PASS - it finished, on a workload of one

   It does NOT check that an audit's conclusions still hold, or that its arms
   still test what its header says they test. It checks the one thing that has
   actually gone wrong over and over: that the engine has not moved out from
   under the probe. When this fails, read the message it prints - it names the
   needle - and re-anchor that audit against the current engine.

   Run alone: node test_audits_alive.js [name-fragment ...]
   ========================================================================== */
const { spawn } = require("child_process");
const { readdirSync, readFileSync } = require("fs");
const path = require("path");

/* Long enough for the guards - they are synchronous string scans over a file
   already in the page cache, plus in a few audits the vm compile of one arm.
   Short enough that 43 of them in parallel stay inside the suite's patience. */
const GRACE_MS = 6000;
const CONCURRENCY = 6;

const filters = process.argv.slice(2);
let audits = readdirSync(__dirname)
  .filter((f) => /^audit_.*\.(js|mjs)$/.test(f))
  .sort();
if (filters.length) audits = audits.filter((f) => filters.some((q) => f.includes(q)));
if (!audits.length) { console.error("no audits matched " + filters.join(" ")); process.exit(1); }

/* Every audit takes its workload as argv[2] - seeds, games or seeds-per-block.
   One is the smallest honest answer, and none of them is expected to get far
   enough to use it before we stop them. */
function checkOne(file) {
  return new Promise((resolve) => {
    const started = Date.now();
    const p = spawn("node", [path.join(__dirname, file), "1"], {
      cwd: __dirname,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let err = "";
    p.stderr.on("data", (d) => { err += d; });

    const timer = setTimeout(() => {
      /* Past the guards and into the simulation, which is all this test wanted
         to know. Stop it there rather than playing out games the suite has no
         use for. */
      p.kill("SIGKILL");
      resolve({ file, ok: true, why: "guards pass", ms: Date.now() - started });
    }, GRACE_MS);

    p.on("error", (e) => {
      clearTimeout(timer);
      resolve({ file, ok: false, why: `could not start: ${e.message}`, ms: Date.now() - started });
    });
    p.on("close", (code, signal) => {
      clearTimeout(timer);
      if (signal === "SIGKILL") return;            // our own timer already resolved
      if (code === 0) {
        resolve({ file, ok: true, why: "ran to the end", ms: Date.now() - started });
      } else {
        resolve({ file, ok: false, why: firstComplaint(err) || `exit ${code}`, ms: Date.now() - started });
      }
    });
  });
}

/* An audit that finds the engine moved says so on stderr and exits 2. Pull that
   line out so the failure names the needle instead of just the exit code. */
function firstComplaint(err) {
  const line = err.split("\n").map((l) => l.trim()).filter(Boolean)
    .find((l) => /changed shape|update this (probe|script)|moved|no longer/i.test(l));
  return line || err.split("\n").map((l) => l.trim()).filter(Boolean)[0] || "";
}

/* A SECOND FAILURE MODE, AND A QUIETER ONE. An audit's guarded needles are
   asserted before use, so when one moves the audit exits 2 and the check above
   reports it. But an audit also calls .replace() on the engine source to splice
   its instrumentation in, and .replace() on a string that is not there does not
   throw - it returns the source unchanged. The hook is never installed, the
   collector is never called, and the audit prints a table of zeros.

   That is not hypothetical either: audit_rent_one.js spliced on a line the
   engine stopped computing when ground rent was split out of OPEX, so every
   "where the OPEX dollar lands" figure it printed read 0%, in a table whose
   whole purpose is that split.

   So: every string literal an audit hands to .replace() must still be somewhere
   in the engine. Literals with ${...} in them cannot be checked this way and are
   skipped; needles held in variables are covered by the run check above, which
   fails when their assertion does. */
function checkSplices() {
  const enginePath = path.join(__dirname, "EntrepreneursGame.jsx");
  const src = require("fs").readFileSync(enginePath, "utf8");
  const cut = src.indexOf("/* ============================== REACT UI ============================== */");
  const engine = cut < 0 ? src : src.slice(0, cut);
  const bad = [];
  for (const f of audits) {
    const a = readFileSync(path.join(__dirname, f), "utf8");
    const re = /\.replace\(\s*("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\`)*`)\s*,/g;
    let m;
    while ((m = re.exec(a))) {
      const lit = m[1];
      if (lit.includes("${")) continue;             // interpolated: not checkable here
      let text;
      try { text = eval(lit); } catch (e) { continue; }
      if (typeof text !== "string" || text.length < 8) continue;
      if (!engine.includes(text)) {
        bad.push({ file: f, snippet: text.split("\n")[0].trim().slice(0, 70) });
      }
    }
  }
  return bad;
}

async function main() {
  const results = [];
  const queue = audits.slice();
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) results.push(await checkOne(queue.shift()));
  });
  await Promise.all(workers);
  results.sort((a, b) => a.file.localeCompare(b.file));

  for (const r of results) {
    console.log(`${r.ok ? "ok  " : "DEAD"}  ${r.file.padEnd(30)} ${(r.ms / 1000).toFixed(1)}s  ${r.why}`);
  }
  const splices = checkSplices();
  for (const b of splices) {
    console.log(`SPLICE  ${b.file.padEnd(30)} replaces text the engine no longer has: ${JSON.stringify(b.snippet)}`);
  }

  const dead = results.filter((r) => !r.ok);
  console.log(`\n${results.length - dead.length}/${results.length} audits still match the engine`
    + (splices.length ? `, but ${splices.length} splice${splices.length === 1 ? "" : "s"} hit nothing` : ""));
  if (splices.length) {
    console.log("\nA .replace() that matches nothing does not throw - it returns the source");
    console.log("unchanged, the hook is never installed, and the audit prints zeros. Re-anchor");
    console.log("each of these on the line the engine actually has now.\n");
    process.exit(1);
  }
  if (dead.length) {
    console.log("\nThese audits no longer measure the game in this repo. Re-anchor each");
    console.log("probe against the current EntrepreneursGame.jsx - do not delete the audit,");
    console.log("and do not leave it dead: a dead audit is evidence that has silently expired.\n");
    for (const r of dead) console.log(`  ${r.file}\n    ${r.why}`);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
