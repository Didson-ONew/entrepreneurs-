/* ============================================================================
   Entrepreneurs - getting a password-reset link to a person

   Sending email is the one part of a login system a game server cannot honestly
   do by itself: it needs a mail account somewhere, and which one depends entirely
   on where this is hosted. So this does not implement SMTP. It hands the message
   to whatever the host already has, and says clearly which of those it used.

     MAIL_SMTP_HOST     an ordinary SMTP account - the one most people already
     MAIL_SMTP_USER     have. With Gmail that is smtp.gmail.com, your address, and
     MAIL_SMTP_PASS     an APP PASSWORD (not the account password; it needs 2-Step
     MAIL_SMTP_PORT     Verification switched on to exist). Port 465 speaks TLS from
                        the first byte, 587 starts plain and upgrades with STARTTLS;
                        465 is the default because fewer hosts interfere with it.
     MAIL_WEBHOOK_URL   POST to any transactional mail API over HTTPS - which is
     MAIL_WEBHOOK_TEMPLATE  what a host that blocks SMTP leaves you. Every provider
     MAIL_WEBHOOK_AUTH      wants its own JSON, so rather than guessing at theirs,
     MAIL_WEBHOOK_HEADER    the body is a template you copy from their documentation
                        and fill with {{to}}, {{subject}}, {{text}}, {{from}},
                        {{from_email}} and {{from_name}}. Without a template the
                        body is {from, to, subject, text}, as it always was.
                        MAIL_WEBHOOK_AUTH goes out as Authorization; providers that
                        use their own header name take MAIL_WEBHOOK_HEADER instead,
                        "Name: value", one per line.
     MAIL_COMMAND       a command fed the message on stdin, e.g. "sendmail -t".
     (none set)         the link is printed in the server's own terminal.

   SMTP is spoken directly, in about a hundred lines below, rather than by pulling
   in a mail library: the server has no runtime dependencies and this is not a good
   reason to start. It is the plain path through the protocol and nothing more -
   one recipient, one message, no queueing, no retries.

   That last one is not a failure mode - it is the right answer when you are
   running the server on your own machine for friends, which is how the hosting
   guide expects most tables to play. You read the link and paste it to them.
   ========================================================================== */
const { spawn } = require("child_process");

const env = (k, d = "") => (process.env[k] == null ? d : String(process.env[k]));

function config() {
  const webhook = env("MAIL_WEBHOOK_URL").trim();
  const webhookTemplate = env("MAIL_WEBHOOK_TEMPLATE").trim();
  const command = env("MAIL_COMMAND").trim();
  const smtpHost = env("MAIL_SMTP_HOST").trim();
  const smtpUser = env("MAIL_SMTP_USER").trim();
  const smtpPass = env("MAIL_SMTP_PASS");
  const smtp = !!(smtpHost && smtpUser && smtpPass);
  return {
    /* Gmail will not let you send as somebody else: the envelope sender has to be the
       account that authenticated. Defaulting From to the SMTP user removes the most
       common way to configure this wrongly and get a silent rejection. */
    from: env("MAIL_FROM", smtp ? smtpUser : "entrepreneurs@localhost").trim(),
    webhook,
    webhookTemplate,
    webhookHeaders: parseHeaders(env("MAIL_WEBHOOK_HEADER")),
    webhookAuth: env("MAIL_WEBHOOK_AUTH").trim(),
    command,
    smtpHost,
    smtpUser,
    smtpPass,
    smtpPort: Number(env("MAIL_SMTP_PORT", "465")) || 465,
    mode: smtp ? "smtp" : webhook ? "webhook" : command ? "command" : "console",
  };
}

/* One line for the boot banner, so whoever starts the server knows what will
   happen when a player forgets their password - before one does. */
function describe(c = config()) {
  if (c.mode === "smtp") {
    /* A provider will not let you send as somebody else. Gmail answers a mismatched
       sender with 553, and this is the one setting a person is likely to get wrong -
       so say it at boot rather than leaving it for the first forgotten password. */
    const warn = addrOnly(c.from).toLowerCase() !== c.smtpUser.toLowerCase()
      ? `  <-- WARNING: MAIL_FROM is ${addrOnly(c.from)} but the account is ${c.smtpUser};`
        + " most providers, Gmail included, will refuse to send as another address."
        + " A display name is fine, a different address is not."
      : "";
    return `reset mail: sent over SMTP as ${c.smtpUser} via ${c.smtpHost}:${c.smtpPort}${warn}`;
  }
  if (c.mode === "webhook") {
    /* A template that cannot produce valid JSON should be found at boot, not by the
       first player who forgets their password. */
    const dry = c.webhookTemplate
      ? fillTemplate(c.webhookTemplate, templateValues(c, { to: "a@b.c", subject: "s", text: "t" }))
      : null;
    const shape = !c.webhookTemplate ? " with the default {from, to, subject, text} body"
      : dry.error ? `  <-- WARNING: ${dry.error}` : " using MAIL_WEBHOOK_TEMPLATE";
    return `reset mail: POSTed to ${c.webhook}${shape}`;
  }
  if (c.mode === "command") return `reset mail: piped to \`${c.command}\``;
  return "reset mail: printed here in this terminal (set MAIL_WEBHOOK_URL or MAIL_COMMAND to send it properly)";
}

/* "api-key: abc123", one per line. Providers that do not use Authorization - Brevo
   and Postmark among them - need their own header, and there is no reason to make
   that a code change. */
function parseHeaders(raw) {
  const out = {};
  for (const line of String(raw || "").split(/\r?\n/)) {
    const at = line.indexOf(":");
    if (at <= 0) continue;
    const name = line.slice(0, at).trim();
    const value = line.slice(at + 1).trim();
    if (name && value) out[name] = value;
  }
  return out;
}

/* Fill a provider's JSON with this message.

   The values are escaped as JSON string contents - the template supplies the
   quotes around each placeholder - because the reset mail is several lines long
   and a raw newline or an apostrophe pasted into JSON produces a body the provider
   rejects with something unhelpful. Then the result is parsed before it is sent:
   a template with a typo in it should fail here, saying so, rather than as a 400
   from somebody else's API. */
function fillTemplate(tpl, values) {
  const esc = (v) => JSON.stringify(String(v == null ? "" : v)).slice(1, -1);
  const missing = [];
  const filled = tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    if (!(key in values)) { missing.push(key); return ""; }
    return esc(values[key]);
  });
  if (missing.length) {
    return { error: `MAIL_WEBHOOK_TEMPLATE uses {{${missing[0]}}}, which is not one of `
      + Object.keys(values).map((k) => `{{${k}}}`).join(", ") };
  }
  try { JSON.parse(filled); } catch (e) {
    return { error: `MAIL_WEBHOOK_TEMPLATE did not produce valid JSON (${e.message})` };
  }
  return { body: filled };
}

/* The pieces a template may ask for. */
function templateValues(c, msg) {
  const name = String(c.from).replace(/<[^>]*>/, "").trim().replace(/^"|"$/g, "");
  return {
    to: msg.to, subject: msg.subject, text: msg.text,
    from: c.from, from_email: addrOnly(c.from), from_name: name || addrOnly(c.from),
  };
}

function rfc822({ from, to, subject, text }, now = new Date()) {
  /* Every line ends CRLF, the body included. The message used to be assembled with
     CRLF between the headers and whatever the caller's text happened to use inside
     it - bare LF, in practice. SMTP wants CRLF throughout, and the dot-stuffing
     below splits on CRLF, so a body full of lone newlines was never stuffed at all:
     a line reading "." in a reset mail would have ended the message early. */
  const body = String(text).replace(/\r\n?/g, "\n").replace(/\n/g, "\r\n");
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${now.toUTCString()}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "",
    body,
  ].join("\r\n");
}

async function viaWebhook(c, msg, fetchImpl = fetch) {
  const headers = { "Content-Type": "application/json", ...c.webhookHeaders };
  if (c.webhookAuth) headers.Authorization = c.webhookAuth;

  let body;
  if (c.webhookTemplate) {
    const made = fillTemplate(c.webhookTemplate, templateValues(c, msg));
    if (made.error) return { ok: false, via: "webhook", error: made.error };
    body = made.body;
  } else {
    body = JSON.stringify({ from: c.from, to: msg.to, subject: msg.subject, text: msg.text });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetchImpl(c.webhook, { method: "POST", headers, body, signal: controller.signal });
    if (r.ok) return { ok: true, via: "webhook" };
    /* The status alone is never the useful part. "The from address does not match a
       verified Sender Identity" is, and it arrives in the body - which the previous
       version read and threw away. */
    let said = "";
    try { said = (await r.text()).replace(/\s+/g, " ").trim().slice(0, 300); } catch (_) {}
    return { ok: false, via: "webhook",
      error: `mail API answered ${r.status}${said ? `: ${said}` : ""}` };
  } catch (e) {
    return { ok: false, via: "webhook", error: explain(e) };
  } finally {
    clearTimeout(timer);
  }
}

/* ---- SMTP ----------------------------------------------------------------

   One message to one recipient, and then hang up. Enough of the protocol to be
   correct and nothing beyond it.

   `connect` is injectable so the tests can drive the whole conversation over a
   plain socket against a fake server: the protocol is the part that can be wrong,
   and it does not need a certificate to be exercised. */
const tls = require("tls");
const net = require("net");

/* SMTP replies can run over several lines: "250-SIZE" continues, "250 OK" ends.
   Reading one chunk and hoping it was the whole reply is the usual way to write a
   client that works until the day the server pauses mid-greeting. */
function smtpReader(sock) {
  let buf = "";
  const waiters = [];
  const pump = () => {
    let nl;
    while ((nl = buf.indexOf("\r\n")) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 2);
      const w = waiters[0];
      if (!w) continue;
      w.lines.push(line);
      /* a space in the fourth column means this is the last line of the reply */
      if (/^\d{3} /.test(line)) { waiters.shift(); w.resolve({ code: Number(line.slice(0, 3)), lines: w.lines }); }
    }
  };
  sock.on("data", (d) => { buf += d.toString("utf8"); pump(); });
  return () => new Promise((resolve, reject) => {
    waiters.push({ lines: [], resolve, reject });
    pump();
  });
}

/* A line of the body that begins with a dot would otherwise end the message. */
const dotStuff = (body) => body.split("\r\n").map((l) => (l.startsWith(".") ? "." + l : l)).join("\r\n");

function viaSmtp(c, msg, connect) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    const fail = (e) => finish({ ok: false, via: "smtp", error: explain(e) });

    let sock;
    try {
      sock = connect
        ? connect({ host: c.smtpHost, port: c.smtpPort })
        : c.smtpPort === 465
          ? tls.connect({ host: c.smtpHost, port: c.smtpPort, servername: c.smtpHost })
          : net.connect({ host: c.smtpHost, port: c.smtpPort });
    } catch (e) { return fail(e); }

    sock.setTimeout(20000, () => { fail(new Error("timed out talking to " + c.smtpHost)); sock.destroy(); });
    sock.on("error", fail);
    sock.on("close", () => finish({ ok: false, via: "smtp", error: "connection closed before the message was accepted" }));

    let read = smtpReader(sock);
    const say = (line) => new Promise((r) => sock.write(line + "\r\n", () => r()));
    const expect = async (want, what) => {
      const rep = await read();
      if (Math.floor(rep.code / 100) !== want) throw new Error(`${what}: ${rep.lines.join(" | ")}`);
      return rep;
    };

    (async () => {
      await expect(2, "greeting");
      await say("EHLO entrepreneurs");
      const ehlo = await expect(2, "EHLO refused");

      /* Port 587 opens in the clear and is upgraded. Skipped when the caller handed
         us a socket, which is the tests driving a plain fake server. */
      if (!connect && c.smtpPort !== 465 && ehlo.lines.some((l) => /STARTTLS/i.test(l))) {
        await say("STARTTLS");
        await expect(2, "STARTTLS refused");
        sock.removeAllListeners("data");
        const plain = sock;
        sock = tls.connect({ socket: plain, servername: c.smtpHost });
        sock.on("error", fail);
        read = smtpReader(sock);
        await new Promise((r, j) => { sock.once("secureConnect", r); sock.once("error", j); });
        await say("EHLO entrepreneurs");
        await expect(2, "EHLO after STARTTLS refused");
      }

      /* AUTH PLAIN carries \0user\0pass in one base64 blob. */
      const blob = Buffer.from("\0" + c.smtpUser + "\0" + c.smtpPass, "utf8").toString("base64");
      await say("AUTH PLAIN " + blob);
      await expect(2, "the server would not accept that user and password");

      await say(`MAIL FROM:<${addrOnly(c.from)}>`);
      await expect(2, "sender refused");
      await say(`RCPT TO:<${addrOnly(msg.to)}>`);
      await expect(2, "recipient refused");
      await say("DATA");
      await expect(3, "DATA refused");
      await say(dotStuff(rfc822({ from: c.from, ...msg })) + "\r\n.");
      await expect(2, "the message itself was refused");
      await say("QUIT");
      finish({ ok: true, via: "smtp" });
      sock.end();
    })().catch((e) => { fail(e); try { sock.destroy(); } catch (_) {} });
  });
}

/* Say what actually went wrong.

   node throws an AggregateError when EVERY address a name resolves to failed to
   connect - which is what a blocked outbound port looks like, and Gmail resolves to
   several. Its own message is the bare word "AggregateError"; the causes are in
   .errors, and reporting the wrapper alone turns the one useful diagnostic into
   nothing. Which is exactly what it did the first time this was tried for real. */
function explain(e) {
  if (!e) return "unknown error";
  if (Array.isArray(e.errors) && e.errors.length) {
    const seen = [];
    for (const inner of e.errors) {
      const bit = [inner.code, inner.address && `${inner.address}:${inner.port}`]
        .filter(Boolean).join(" ") || String(inner.message || inner);
      if (!seen.includes(bit)) seen.push(bit);
    }
    /* The overwhelmingly likely cause, and one no amount of re-reading your own
       settings will reveal: a lot of hosts block outbound SMTP to stop spam being
       sent from them. Render's free instances refuse 25, 465 and 587 outright. */
    return `could not connect (${seen.join(", ")})`
      + " - many hosts block outbound SMTP ports; Render's free tier blocks 25, 465 and 587,"
      + " so a paid instance or an HTTPS mail API (MAIL_WEBHOOK_URL) is needed there";
  }
  const code = e.code ? `${e.code}: ` : "";
  return code + String(e.message || e);
}

/* "Name <a@b>" -> "a@b", because the envelope takes the bare address. */
function addrOnly(s) {
  const m = String(s || "").match(/<([^>]+)>/);
  return (m ? m[1] : String(s || "")).trim();
}

function viaCommand(c, msg) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(c.command, { shell: true, stdio: ["pipe", "ignore", "pipe"] });
    } catch (e) {
      return resolve({ ok: false, via: "command", error: String(e && e.message || e) });
    }
    let err = "";
    child.stderr.on("data", (d) => { err += d.toString().slice(0, 500); });
    child.on("error", (e) => resolve({ ok: false, via: "command", error: String(e && e.message || e) }));
    child.on("close", (code) => resolve(code === 0
      ? { ok: true, via: "command" }
      : { ok: false, via: "command", error: `${c.command} exited ${code}${err ? `: ${err.trim()}` : ""}` }));
    child.stdin.end(rfc822({ from: c.from, ...msg }));
  });
}

function viaConsole(c, msg) {
  console.log(
    `\n--- password reset for ${msg.to} -------------------------------------\n` +
    `${msg.text}\n` +
    "-------------------------------------------------------------------\n"
  );
  return Promise.resolve({ ok: true, via: "console" });
}

/* Never throws and never rejects: a mail server having a bad day must not take the
   game server down with it, and the caller tells the player the same thing either
   way (see the note on /api/forgot). */
async function send(msg, c = config(), opts = {}) {
  const full = { to: String(msg.to || ""), subject: String(msg.subject || ""), text: String(msg.text || "") };
  if (!full.to) return { ok: false, via: c.mode, error: "no recipient" };
  try {
    if (c.mode === "smtp") return await viaSmtp(c, full, opts.connect);
    if (c.mode === "webhook") return await viaWebhook(c, full);
    if (c.mode === "command") return await viaCommand(c, full);
    return await viaConsole(c, full);
  } catch (e) {
    return { ok: false, via: c.mode, error: String(e && e.message || e) };
  }
}

function resetMessage({ to, name, link, minutes }) {
  return {
    to,
    subject: "Reset your Entrepreneurs password",
    text: [
      `Hello ${name},`,
      "",
      "Somebody asked to reset the password for your Entrepreneurs account.",
      "If that was you, open this link:",
      "",
      link,
      "",
      `The link works once and expires in ${minutes} minutes.`,
      "If it was not you, you can ignore this - nothing has changed.",
    ].join("\n"),
  };
}

module.exports = { config, describe, send, resetMessage, rfc822 };
