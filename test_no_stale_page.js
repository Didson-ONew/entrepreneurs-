/* A deploy has to reach the people playing.

   The pages went out with NO cache headers at all. That does not mean "do not
   cache" - it means the browser guesses, and a phone will happily keep serving
   a page it fetched days ago. So after a deploy somebody could be running the
   old page against the new server for as long as their browser felt like it,
   which is exactly what the "older game rules" banner was reporting: not a
   server that had not been updated, but a page that had not been re-fetched.

   Needs a server on 8080. */
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE || "http://127.0.0.1:8080";
const ROOT = __dirname;

let fails = 0, n = 0;
const check = (what, ok, note = "") => {
  n++; if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
};
const section = (t) => console.log(`\n${t}`);

(async () => {
  section("Every page tells the browser to ask before reusing it");
  const pages = ["/", "/online.html", "/Entrepreneurs.html", "/app.css"];
  const etags = {};
  for (const p of pages) {
    const r = await fetch(BASE + p);
    const cc = r.headers.get("cache-control") || "";
    const et = r.headers.get("etag") || "";
    etags[p] = et;
    check(`${p} is served`, r.status === 200, `HTTP ${r.status}`);
    check(`${p} says no-cache`, /no-cache/.test(cc), cc || "(no cache-control at all)");
    check(`${p} carries an ETag`, !!et, et || "(none)");
  }

  section("Asking again costs nothing while nothing has changed");
  {
    const r = await fetch(BASE + "/", { headers: { "If-None-Match": etags["/"] } });
    check("an unchanged page answers 304", r.status === 304, `HTTP ${r.status}`);
    const body = await r.text();
    check("and sends no body with it", body.length === 0, `${body.length} bytes`);
  }

  section("But a deploy is picked up on the very next load");
  {
    /* Touching the file is what a deploy does to every one of them. The ETag is
       built from size and mtime, so this is the same change a real deploy makes
       as far as a browser is concerned. */
    const file = path.join(ROOT, "online.html");
    const before = fs.statSync(file);
    fs.utimesSync(file, new Date(), new Date(before.mtimeMs + 2000));
    try {
      const r = await fetch(BASE + "/", { headers: { "If-None-Match": etags["/"] } });
      check("the old ETag no longer matches", r.status === 200, `HTTP ${r.status}`);
      const et = r.headers.get("etag");
      check("and a new one comes back", !!et && et !== etags["/"], et || "(none)");
      const body = await r.text();
      check("with the page itself", body.length > 1000, `${body.length} bytes`);
    } finally {
      fs.utimesSync(file, before.atime, before.mtime);   // leave it as we found it
    }
  }

  section("A made-up ETag is not trusted into a 304");
  {
    const r = await fetch(BASE + "/", { headers: { "If-None-Match": 'W/"deadbeef-0"' } });
    check("an unknown ETag gets the page", r.status === 200, `HTTP ${r.status}`);
  }

  section("The rules-mismatch banner is written once, and blames the right side");
  {
    const src = fs.readFileSync(path.join(ROOT, "OnlineApp.jsx"), "utf8");
    const banners = (src.match(/different rules/g) || []).length;
    check("there is exactly one banner", banners === 1, `${banners} found`);
    check("the old duplicated wording is gone",
      !/running older game rules than this page/.test(src));
    check("a player is told to reload, not to upload a file",
      /Reload the page/.test(src) && !/Upload the current/.test(src));
    check("and it still names both versions",
      /page <code>\{getEngineVersion\(\)\}<\/code>, server <code>\{serverEngine\}<\/code>/.test(src));
  }

  console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
  process.exit(fails ? 1 : 0);
})();
