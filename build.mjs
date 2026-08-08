/* ============================================================================
   Build the two shipped pages.

   Entrepreneurs.html  single-player  (entry.jsx)
   online.html         online client  (online_entry.jsx)

   Both are single files with no network dependencies: app.css is inlined in a
   <style>, and the whole React bundle in one <script>. The server just serves
   them as static files, so a page opened from disk plays exactly the same.

   Usage:  node build.mjs
   ========================================================================== */
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const ENGINE_MARK = "/* ============================== REACT UI ============================== */";

/* The server loads the engine section out of EntrepreneursGame.jsx at boot, so a
   deployment that ships new pages but an old copy of that file would quietly play by
   the old rules. The client compares its ENGINE_VERSION with the server's and says so
   when they differ - which only works if that constant actually tracks the code. Its
   comment always claimed it was "bumped automatically at build time"; now it is. */
function stampEngineVersion() {
  const file = "EntrepreneursGame.jsx";
  const src = readFileSync(file, "utf8");
  const pattern = /const ENGINE_VERSION = "[^"]*";/;
  const engine = src.slice(0, src.indexOf(ENGINE_MARK)).replace(pattern, "");
  const hash = createHash("sha256").update(engine).digest("hex").slice(0, 8);
  const next = src.replace(pattern, `const ENGINE_VERSION = "${hash}";`);
  if (next !== src) {
    writeFileSync(file, next);
    console.log(`engine version    ${hash} (rules changed - restart any running server)`);
  } else {
    console.log(`engine version    ${hash} (unchanged)`);
  }
}
stampEngineVersion();

const css = readFileSync("app.css", "utf8");

const page = (title, script) =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>` +
  `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>` +
  `<meta name="theme-color" content="#0e1014"/><title>${title}</title>` +
  `<style>${css}</style></head><body><div id="root"></div>` +
  `<script>${script}</script></body></html>`;

async function bundle(entry) {
  const r = await build({
    entryPoints: [entry],
    bundle: true, write: false, minify: true, legalComments: "eof",
    format: "iife", jsx: "automatic", target: ["es2020"],
    define: { "process.env.NODE_ENV": '"production"' },
    loader: { ".js": "jsx", ".jsx": "jsx" },
  });
  return r.outputFiles[0].text;
}

const jobs = [
  ["entry.jsx", "Entrepreneurs.html", "Entrepreneurs"],
  ["online_entry.jsx", "online.html", "Entrepreneurs &mdash; Online"],
];

for (const [entry, out, title] of jobs) {
  const script = await bundle(entry);
  writeFileSync(out, page(title, script));
  console.log(`${out.padEnd(20)} ${(script.length / 1024).toFixed(0)} kB of script`);
}
