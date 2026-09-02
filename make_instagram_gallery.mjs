/* ============================================================================
   ENTREPRENEURS - the Instagram kit, as one page you can open on a phone.

   A .tar.gz is useless on a phone and a folder of PNGs is awkward to move
   around. This builds ONE self-contained HTML file with every slide inlined as
   a data URI, every caption in a copy-to-clipboard block, and the four Reels
   embedded as live animated frames you can screen-record straight off the page.

   Nothing is fetched at runtime: no network, no CDN images, no dependencies.
   Open it anywhere, forever, including offline.

   Run: node make_instagram_gallery.mjs      (after make_instagram.mjs)
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(__dirname, "instagram");
if (!fs.existsSync(KIT)) { console.error("run make_instagram.mjs first"); process.exit(2); }

const dataUri = (p) =>
  `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;

/* ---- the captions, split on their headings ---------------------------- */
const capMd = fs.readFileSync(path.join(__dirname, "instagram_captions.md"), "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* Pull the quoted caption body out of one `## n · ...` section. The caption is
   the blockquote; everything else in the section is direction for the shoot. */
function sectionsOf(md) {
  const parts = md.split(/\n## /).slice(1);
  return parts.map((raw) => {
    const nl = raw.indexOf("\n");
    const heading = raw.slice(0, nl).trim();
    const body = raw.slice(nl + 1);
    /* The caption as it will be PASTED. Markdown wraps its source lines and marks
       emphasis with asterisks; Instagram would keep both, so paragraphs are
       unwrapped back into single lines and the markers are stripped. Blank lines
       stay - those are real paragraph breaks the post wants. */
    const quote = body.split("\n")
      .filter((l) => l.startsWith(">"))
      .map((l) => l.replace(/^>\s?/, ""))
      .join("\n")
      .split(/\n\s*\n/)
      .map((para) => para.split("\n").map((l) => l.trim()).filter(Boolean).join(" "))
      .join("\n\n")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/(^|[\s(])\*(\S[^*]*?)\*(?=[\s.,!?)]|$)/g, "$1$2")
      .trim();
    const notes = body.split("\n")
      .filter((l) => l.startsWith("*") && l.endsWith("*") && l.length > 2)
      .map((l) => l.replace(/^\*|\*$/g, "")).join(" ");
    const num = /^(\d+)\s*·/.exec(heading);
    return { heading, quote, notes, n: num ? +num[1] : null };
  });
}
const sections = sectionsOf(capMd);
const posts = sections.filter((s) => s.n !== null).sort((a, b) => a.n - b.n);

/* The corrections section, kept whole - it is the most important text here. */
const corrections = sections.find((s) => /corrections/i.test(s.heading));
const suggestions = capMd.split("\n# Suggested changes to the sequence\n")[1] || "";

/* ---- which files belong to which post --------------------------------- */
const FOLDER_FOR = { 1: "01_what-is", 3: "03_prices", 5: "05_balance", 6: "06_wrong",
  8: "08_bug", 10: "10_ask", 11: "11_personas" };
const REEL_FOR = { 2: "02_supply-web", 4: "04_pieces", 7: "07_turn-order", 12: "12_twelve-quarters" };

function slidesFor(n) {
  const dir = FOLDER_FOR[n];
  if (!dir) return [];
  const full = path.join(KIT, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter((f) => f.endsWith(".png"))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((f) => ({ name: `${dir}/${f}`, uri: dataUri(path.join(full, f)) }));
}
function reelFor(n) {
  const stem = REEL_FOR[n];
  if (!stem) return null;
  const html = path.join(KIT, "reels", `${stem}.html`);
  const cover = path.join(KIT, "reels", `${stem}_cover.png`);
  if (!fs.existsSync(html)) return null;
  return {
    name: `reels/${stem}.html`,
    srcdoc: fs.readFileSync(html, "utf8"),
    cover: fs.existsSync(cover) ? dataUri(cover) : null,
    coverName: `reels/${stem}_cover.png`,
  };
}

/* ---- markdown, only as much as these captions actually use ------------- */
const inline = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/\*(.+?)\*/g, "<em>$1</em>")
  .replace(/`(.+?)`/g, "<code>$1</code>");
/* Markdown wraps its source lines; a paragraph ends at a BLANK line, not at a
   newline. Emitting one <p> per line broke every paragraph into fragments and
   split emphasis spans down the middle of a phrase. */
function mdBlocks(md) {
  const out = [];
  let fence = null, para = [];
  const flush = () => {
    if (!para.length) return;
    out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  for (const line of md.split("\n")) {
    if (line.startsWith("```")) {
      if (fence) { out.push(`<pre><code>${esc(fence.join("\n"))}</code></pre>`); fence = null; }
      else { flush(); fence = []; }
      continue;
    }
    if (fence) { fence.push(line); continue; }
    if (!line.trim()) { flush(); continue; }
    if (line.startsWith("# ")) { flush(); continue; }
    para.push(line.trim());
  }
  flush();
  return out.join("\n");
}

/* ---- the page ---------------------------------------------------------- */
const postCard = (p) => {
  const slides = slidesFor(p.n);
  const reel = reelFor(p.n);
  const thumbs = slides.length ? `
    <div class="rail" role="list">
      ${slides.map((s, i) => `
        <figure role="listitem">
          <a href="${s.uri}" target="_blank" rel="noopener" aria-label="Open slide ${i + 1} full size">
            <img src="${s.uri}" alt="Slide ${i + 1} of post ${p.n}" loading="lazy" width="1080" height="1350">
          </a>
          <figcaption>${esc(s.name)}</figcaption>
        </figure>`).join("")}
    </div>` : "";
  const reelBlock = reel ? `
    <div class="reelrow">
      <div class="reelwrap">
        <iframe title="${esc(reel.name)} — animated, screen-record this"
          srcdoc="${esc(reel.srcdoc).replace(/"/g, "&quot;")}" scrolling="no" loading="lazy"></iframe>
      </div>
      <div class="reelmeta">
        <p class="lbl">Live reel</p>
        <p>Playing at full Reel size, scaled to fit. Screen-record it full-screen for the video — it loops.</p>
        ${reel.cover ? `<p><a class="btn" href="${reel.cover}" target="_blank" rel="noopener">Open cover frame</a></p>` : ""}
        <p class="file">${esc(reel.name)}</p>
      </div>
    </div>` : "";
  return `
  <article class="post" id="post-${p.n}">
    <header>
      <span class="num">${String(p.n).padStart(2, "0")}</span>
      <h3>${inline(p.heading.replace(/^\d+\s*·\s*/, ""))}</h3>
    </header>
    ${p.notes ? `<p class="note">${inline(p.notes)}</p>` : ""}
    ${thumbs}${reelBlock}
    <div class="capbox">
      <div class="caphead">
        <span class="lbl">Caption</span>
        <button class="copy" type="button" data-cap="${esc(p.quote).replace(/"/g, "&quot;")}">Copy caption</button>
      </div>
      <pre class="cap">${esc(p.quote)}</pre>
    </div>
  </article>`;
};

const head = `<title>Entrepreneurs Launch Kit</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Public+Sans:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
  /* Light is the base set; the two blocks after it redefine only tokens, so a
     colour is never defined solely inside a media query. */
  :root{
    --ink:#14161A; --body:#3D434E; --mute:#6B7280;
    --ground:#F7F6F3; --surface:#FFFFFF; --sunk:#EFEDE8; --line:#DCD8D0;
    --accent:#B8730A; --accent-ink:#FFFFFF;
    --shadow:0 1px 2px rgba(20,22,26,.06),0 8px 24px rgba(20,22,26,.06);
    --display:"Bricolage Grotesque",Georgia,serif;
    --text:"Public Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  }
  @media (prefers-color-scheme:dark){
    :root:not([data-theme="light"]){
      --ink:#F2F3F5; --body:#C3C9D4; --mute:#8C94A4;
      --ground:#0E1013; --surface:#161920; --sunk:#101319; --line:#272C36;
      --accent:#F5A623; --accent-ink:#191202;
      --shadow:0 1px 2px rgba(0,0,0,.5),0 10px 30px rgba(0,0,0,.4);
    }
  }
  :root[data-theme="dark"]{
    --ink:#F2F3F5; --body:#C3C9D4; --mute:#8C94A4;
    --ground:#0E1013; --surface:#161920; --sunk:#101319; --line:#272C36;
    --accent:#F5A623; --accent-ink:#191202;
    --shadow:0 1px 2px rgba(0,0,0,.5),0 10px 30px rgba(0,0,0,.4);
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--body);
       font-family:var(--text);font-size:16.5px;line-height:1.62;
       -webkit-text-size-adjust:100%}
  .wrap{max-width:900px;margin:0 auto;padding:0 20px 96px}
  h1,h2,h3{font-family:var(--display);color:var(--ink);text-wrap:balance;margin:0}
  h1{font-size:clamp(34px,7vw,54px);font-weight:800;letter-spacing:-1.4px;line-height:1.03}
  h2{font-size:clamp(23px,4.4vw,30px);font-weight:800;letter-spacing:-.5px}
  h3{font-size:clamp(19px,3.6vw,23px);font-weight:600;letter-spacing:-.2px}
  p{margin:0 0 .85em}
  a{color:var(--accent)}
  code{font-family:var(--mono);font-size:.87em;background:var(--sunk);
       border:1px solid var(--line);border-radius:5px;padding:1px 5px}
  pre{overflow-x:auto;background:var(--sunk);border:1px solid var(--line);
      border-radius:10px;padding:16px;font-family:var(--mono);font-size:13.5px;
      line-height:1.6;color:var(--body);margin:0}
  pre code{background:none;border:0;padding:0;font-size:inherit}

  header.top{padding:64px 0 34px;border-bottom:1px solid var(--line);margin-bottom:40px}
  .eyebrow{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:2.4px;
           text-transform:uppercase;color:var(--accent);margin:0 0 14px}
  .lede{font-size:clamp(17px,3.2vw,19.5px);margin-top:18px;max-width:62ch}

  section.block{margin:0 0 52px}
  section.block > h2{margin-bottom:16px}
  .callout{background:var(--surface);border:1px solid var(--line);
           border-left:3px solid var(--accent);border-radius:12px;
           padding:22px 24px;box-shadow:var(--shadow)}
  .callout p:last-child{margin-bottom:0}

  .post{background:var(--surface);border:1px solid var(--line);border-radius:16px;
        padding:26px 24px;margin:0 0 26px;box-shadow:var(--shadow)}
  .post > header{display:flex;align-items:baseline;gap:14px;margin-bottom:14px}
  .num{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--accent);
       letter-spacing:1px;flex:none}
  .note{font-size:15px;color:var(--mute);font-style:italic;margin-bottom:16px}

  .rail{display:flex;gap:14px;overflow-x:auto;padding:4px 0 12px;
        scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
  .rail figure{margin:0;flex:none;width:200px;scroll-snap-align:start}
  .rail img{width:100%;height:auto;display:block;border-radius:9px;
            border:1px solid var(--line);background:#0E1013}
  .rail figcaption{font-family:var(--mono);font-size:10.5px;color:var(--mute);
                   margin-top:7px;word-break:break-all}

  .reelrow{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;margin:6px 0 18px}
  .reelwrap{width:216px;height:384px;flex:none;border-radius:12px;overflow:hidden;
            border:1px solid var(--line);background:#0E1013}
  .reelwrap iframe{width:1080px;height:1920px;border:0;
                   transform:scale(.2);transform-origin:top left;display:block}
  .reelmeta{flex:1;min-width:210px;font-size:14.5px}
  .lbl{font-family:var(--mono);font-size:11px;letter-spacing:1.6px;text-transform:uppercase;
       color:var(--accent);margin-bottom:6px}
  .file{font-family:var(--mono);font-size:11.5px;color:var(--mute);word-break:break-all}

  .capbox{margin-top:6px}
  .caphead{display:flex;align-items:center;justify-content:space-between;
           gap:12px;margin-bottom:8px}
  .cap{white-space:pre-wrap;font-family:var(--text);font-size:15.5px;
       background:var(--sunk)}
  .btn,.copy{font-family:var(--text);font-size:13px;font-weight:600;cursor:pointer;
       border-radius:8px;border:1px solid var(--line);background:var(--surface);
       color:var(--ink);padding:8px 13px;text-decoration:none;display:inline-block}
  .copy:hover,.btn:hover{border-color:var(--accent);color:var(--accent)}
  .copy.done{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
  :focus-visible{outline:2px solid var(--accent);outline-offset:2px}

  footer{margin-top:60px;padding-top:26px;border-top:1px solid var(--line);
         font-size:14px;color:var(--mute)}
  @media (max-width:560px){ .rail figure{width:156px} }
  @media (prefers-reduced-motion:reduce){ *{animation:none!important;transition:none!important} }
</style>`;

const bodyHtml = `<div class="wrap">
  <header class="top">
    <p class="eyebrow">Entrepreneurs · Instagram</p>
    <h1>Launch kit</h1>
    <p class="lede">Twelve posts. ${slidesFor(1).length ? "" : ""}Every slide, every caption and the four
      animated Reels, in one page. Tap any image to open it full size, then long-press to save it.
      Every asset here is generated from the game engine, so nothing in it can contradict the rules.</p>
  </header>

  ${corrections ? `<section class="block">
    <h2>${inline(corrections.heading)}</h2>
    <div class="callout">${mdBlocks(corrections.quote ? corrections.quote : "")}
      ${mdBlocks(capMd.split("\n## " + corrections.heading + "\n")[1].split("\n---")[0])}</div>
  </section>` : ""}

  <section class="block">
    <h2>The posts</h2>
    ${posts.map(postCard).join("")}
  </section>

  ${suggestions ? `<section class="block">
    <h2>Suggested changes to the sequence</h2>
    <div class="callout">${mdBlocks(suggestions.split("\n---")[0])}</div>
  </section>` : ""}

  <footer>
    <p>Rebuild with <code>node make_instagram.mjs &amp;&amp; node make_instagram_gallery.mjs</code>.
      Captions are edited at <code>instagram_captions.md</code>.</p>
  </footer>
</div>
<script>
  document.querySelectorAll(".copy").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.getAttribute("data-cap");
      var done = function () {
        b.textContent = "Copied";
        b.classList.add("done");
        setTimeout(function () { b.textContent = "Copy caption"; b.classList.remove("done"); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = t; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta); done();
      }
    });
  });
</script>`;

/* Two files from one source. The artifact host supplies its own doctype, head and
   body, so publishing a full document would nest one inside another; the
   standalone copy needs exactly that wrapper to open from disk. */
const fragment = head + "\n" + bodyHtml;
const standalone = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${head}
</head><body style="margin:0">
${bodyHtml}
</body></html>`;

const a = path.join(KIT, "gallery.html");
const b = path.join(KIT, "gallery.artifact.html");
fs.writeFileSync(a, standalone);
fs.writeFileSync(b, fragment);
console.log(`${a}  ${(fs.statSync(a).size / 1e6).toFixed(2)} MB (standalone)`);
console.log(`${b}  ${(fs.statSync(b).size / 1e6).toFixed(2)} MB (artifact fragment), ${posts.length} posts`);
