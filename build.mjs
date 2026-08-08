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
