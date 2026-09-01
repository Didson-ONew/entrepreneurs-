/* ============================================================================
   ENTREPRENEURS - the Reels, as actual video files.

   The animated pages were delivered as HTML to screen-record, which does not
   work: you cannot screen-record an iframe on a phone, and there is nothing to
   save. So this records them properly and hands over .mp4 files that upload
   straight to Instagram.

   Playwright records the page as it really animates (webm), and ffmpeg
   transcodes to H.264 in yuv420p - the combination every phone and every social
   platform will decode. Anything more exotic silently fails to upload.

   ffmpeg is not on this machine; ffmpeg-static ships a binary as an npm package
   and this uses that, so nothing has to be installed system-wide.

   Run: node make_instagram_reels.mjs
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { chromium } from "playwright-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(__dirname, "instagram");
const OUT = path.join(KIT, "reels_mp4");
const RAW = path.join(KIT, ".reels_raw");

/* ffmpeg-static resolves to the binary it downloaded at install time. */
const ffmpegPath = (() => {
  for (const base of ["/tmp/ffm/node_modules", path.join(__dirname, "node_modules")]) {
    const p = path.join(base, "ffmpeg-static", "ffmpeg");
    if (fs.existsSync(p)) return p;
  }
  console.error("ffmpeg-static not found - npm install ffmpeg-static --prefix /tmp/ffm");
  process.exit(2);
})();

/* How long each page needs to have said everything it has to say. The supply
   web runs a 12s cycle; the others land their last line inside five. */
const REELS = [
  { stem: "02_supply-web", seconds: 13 },
  { stem: "04_pieces", seconds: 9 },
  { stem: "07_turn-order", seconds: 9 },
  { stem: "12_twelve-quarters", seconds: 16 },
];

fs.rmSync(RAW, { recursive: true, force: true });
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const made = [];

for (const r of REELS) {
  const src = path.join(KIT, "reels", `${r.stem}.html`);
  if (!fs.existsSync(src)) { console.error(`missing ${src}`); continue; }

  const dir = path.join(RAW, r.stem);
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    recordVideo: { dir, size: { width: 1080, height: 1920 } },
  });
  const page = await ctx.newPage();
  await page.goto(`file://${src}`, { waitUntil: "load" });
  await page.waitForTimeout(r.seconds * 1000);
  await ctx.close();                                  // flushes the video file

  const webm = fs.readdirSync(dir).find((f) => f.endsWith(".webm"));
  if (!webm) { console.error(`no video captured for ${r.stem}`); continue; }

  const mp4 = path.join(OUT, `${r.stem}.mp4`);
  /* yuv420p and an even frame size are the two things that decide whether a
     social platform accepts the file at all; faststart puts the index at the
     front so it begins playing before it has finished downloading. */
  execFileSync(ffmpegPath, [
    "-y", "-i", path.join(dir, webm),
    "-c:v", "libx264", "-preset", "slow", "-crf", "20",
    "-pix_fmt", "yuv420p", "-r", "30",
    "-vf", "scale=1080:1920:flags=lanczos",
    "-movflags", "+faststart",
    "-an",
    mp4,
  ], { stdio: ["ignore", "ignore", "pipe"] });

  const mb = fs.statSync(mp4).size / 1e6;
  made.push({ stem: r.stem, mb, seconds: r.seconds });
  console.log(`  ${r.stem}.mp4   ${mb.toFixed(2)} MB   ${r.seconds}s`);
}

await browser.close();
fs.rmSync(RAW, { recursive: true, force: true });

/* Prove they are what they claim to be rather than trusting an exit code.
   `ffmpeg -i FILE` with no output always exits non-zero and prints the stream
   description to stderr - that text is the probe, and the throw is expected. */
console.log("\nverifying:");
for (const m of made) {
  let info = "";
  try {
    execFileSync(ffmpegPath, ["-i", path.join(OUT, `${m.stem}.mp4`)],
      { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) { info = String(e.stderr || ""); }
  const line = /Stream #0:0.*Video:.*/.exec(info);
  const dur = /Duration: ([0-9:.]+)/.exec(info);
  const ok = line && /h264/.test(line[0]) && /yuv420p/.test(line[0]) && /1080x1920/.test(line[0]);
  console.log(`  ${ok ? "ok  " : "FAIL"} ${m.stem}.mp4  ${dur ? dur[1] : "?"}  `
    + (line ? line[0].replace(/.*Video: /, "").split(",").slice(0, 3).join(",") : "unreadable"));
}

console.log(`\n${made.length} reels in instagram/reels_mp4/`);
