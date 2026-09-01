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
  { stem: "07_turn-order", seconds: 11 },
  { stem: "12_twelve-quarters", seconds: 17 },
];

fs.rmSync(RAW, { recursive: true, force: true });
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

/* WHY THIS DOES NOT RECORD THE PAGE.

   Playwright's recordVideo captures whenever the compositor happens to produce
   a frame, so the output is variable-rate: some animation frames appear twice,
   some not at all. Handing that to ffmpeg with a fixed -r makes it duplicate and
   drop unevenly, and the result visibly flickers - which is exactly what the
   first cut did.

   So the animation is not recorded, it is SEEKED. Every CSS animation on the
   page is paused and its currentTime set to an exact instant through the Web
   Animations API, then the frame is captured. Frame n is always the page at
   exactly n/fps seconds, the same every run, and the encode is true constant
   frame rate. No compositor timing is involved anywhere. */
const FPS = 30;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const made = [];

for (const r of REELS) {
  const src = path.join(KIT, "reels", `${r.stem}.html`);
  if (!fs.existsSync(src)) { console.error(`missing ${src}`); continue; }

  const dir = path.join(RAW, r.stem);
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1,
  });
  await page.goto(`file://${src}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(400);

  const total = Math.round(r.seconds * FPS);
  for (let n = 0; n < total; n++) {
    await page.evaluate((ms) => {
      for (const a of document.getAnimations()) {
        a.pause();
        try { a.currentTime = ms; } catch (e) { /* a finished animation may refuse */ }
      }
    }, (n / FPS) * 1000);
    await page.screenshot({
      path: path.join(dir, `f${String(n).padStart(5, "0")}.png`),
      animations: "disabled",          // never wait on, or advance, an animation
    });
  }
  await page.close();

  const mp4 = path.join(OUT, `${r.stem}.mp4`);
  /* -fps_mode cfr with a matching input rate keeps one encoded frame per
     captured frame; yuv420p and an even size decide whether a social platform
     accepts the file at all, and faststart lets it play before it has finished
     downloading. */
  execFileSync(ffmpegPath, [
    "-y", "-framerate", String(FPS),
    "-i", path.join(dir, "f%05d.png"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "20",
    "-pix_fmt", "yuv420p", "-fps_mode", "cfr", "-r", String(FPS),
    "-movflags", "+faststart", "-an",
    mp4,
  ], { stdio: ["ignore", "ignore", "pipe"] });

  fs.rmSync(dir, { recursive: true, force: true });
  const mb = fs.statSync(mp4).size / 1e6;
  made.push({ stem: r.stem, mb, seconds: r.seconds, frames: total });
  console.log(`  ${r.stem}.mp4   ${mb.toFixed(2)} MB   ${r.seconds}s   ${total} frames`);
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
