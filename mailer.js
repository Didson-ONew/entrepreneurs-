/* ============================================================================
   Entrepreneurs - getting a password-reset link to a person

   Sending email is the one part of a login system a game server cannot honestly
   do by itself: it needs a mail account somewhere, and which one depends entirely
   on where this is hosted. So this does not implement SMTP. It hands the message
   to whatever the host already has, and says clearly which of those it used.

     MAIL_WEBHOOK_URL   POST {to, subject, text} as JSON. Any transactional mail
                        API that takes JSON, or a three-line relay of your own.
                        MAIL_WEBHOOK_AUTH is sent as the Authorization header.
     MAIL_COMMAND       a command fed the message on stdin, e.g. "sendmail -t".
     (neither set)      the link is printed in the server's own terminal.

   That last one is not a failure mode - it is the right answer when you are
   running the server on your own machine for friends, which is how the hosting
   guide expects most tables to play. You read the link and paste it to them.
   ========================================================================== */
const { spawn } = require("child_process");

const env = (k, d = "") => (process.env[k] == null ? d : String(process.env[k]));

function config() {
  const webhook = env("MAIL_WEBHOOK_URL").trim();
  const command = env("MAIL_COMMAND").trim();
  return {
    from: env("MAIL_FROM", "entrepreneurs@localhost").trim(),
    webhook,
    webhookAuth: env("MAIL_WEBHOOK_AUTH").trim(),
    command,
    mode: webhook ? "webhook" : command ? "command" : "console",
  };
}

/* One line for the boot banner, so whoever starts the server knows what will
   happen when a player forgets their password - before one does. */
function describe(c = config()) {
  if (c.mode === "webhook") return `reset mail: POSTed to ${c.webhook}`;
  if (c.mode === "command") return `reset mail: piped to \`${c.command}\``;
  return "reset mail: printed here in this terminal (set MAIL_WEBHOOK_URL or MAIL_COMMAND to send it properly)";
}

function rfc822({ from, to, subject, text }) {
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "",
    text,
  ].join("\r\n");
}

function viaWebhook(c, msg) {
  return new Promise((resolve) => {
    const headers = { "Content-Type": "application/json" };
    if (c.webhookAuth) headers.Authorization = c.webhookAuth;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(c.webhook, {
      method: "POST",
      headers,
      body: JSON.stringify({ from: c.from, to: msg.to, subject: msg.subject, text: msg.text }),
      signal: controller.signal,
    })
      .then((r) => resolve(r.ok ? { ok: true, via: "webhook" }
        : { ok: false, via: "webhook", error: `mail webhook answered ${r.status}` }))
      .catch((e) => resolve({ ok: false, via: "webhook", error: String(e && e.message || e) }))
      .finally(() => clearTimeout(timer));
  });
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
async function send(msg, c = config()) {
  const full = { to: String(msg.to || ""), subject: String(msg.subject || ""), text: String(msg.text || "") };
  if (!full.to) return { ok: false, via: c.mode, error: "no recipient" };
  try {
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
