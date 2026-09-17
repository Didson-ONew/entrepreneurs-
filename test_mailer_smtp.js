/* Password-reset mail over SMTP.

   WHY THIS EXISTS AT ALL. Until now the mailer could POST to a webhook, pipe to a
   command, or print to the terminal. None of those help somebody hosting on Render
   with no mail service and no domain: the reset link ended up in a server log that
   the player cannot read. An ordinary SMTP account - a Gmail address with an app
   password - is the one thing nearly everybody already has, so the mailer now speaks
   SMTP directly rather than pulling in a mail library the server does not otherwise
   need.

   WHAT IS ACTUALLY TESTED. The conversation, against a fake server on localhost:
   greeting, EHLO, AUTH PLAIN, MAIL FROM, RCPT TO, DATA, the terminating dot. That is
   the part that can be wrong. `send` takes an injectable `connect` so the protocol
   can be driven over a plain socket without a certificate.

   WHAT IS NOT. The real handshake with smtp.gmail.com - this environment's egress
   proxy blocks it, and a test that needed live credentials would not be a test. TLS
   itself is node's `tls`, not ours. */
const net = require("net");
const mailer = require("./mailer.js");

let fails = 0;
function check(label, ok, detail) {
  if (!ok) fails++;
  console.log(` ${ok ? "ok  " : "FAIL"}  ${label}${detail !== undefined && detail !== "" ? "  [" + detail + "]" : ""}`);
}

/* A fake SMTP server. `script` maps a command prefix to the reply it should give,
   so a test can make any single step fail. Records everything it was told. */
function fakeSmtp(script = {}) {
  const seen = [];
  let body = "", inData = false, raw = "";
  const server = net.createServer((sock) => {
    sock.write("220 fake.smtp ESMTP ready\r\n");
    let buf = "";
    sock.on("data", (d) => {
      raw += d.toString();          // exactly what went down the wire
      buf += d.toString();
      let nl;
      while ((nl = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        if (inData) {
          if (line === ".") { inData = false; sock.write((script.DOT || "250 queued") + "\r\n"); }
          else body += line + "\n";
          continue;
        }
        seen.push(line);
        const cmd = line.split(/[ :]/)[0].toUpperCase();
        if (script[cmd]) { sock.write(script[cmd] + "\r\n"); if (script[cmd].startsWith("354")) inData = true; continue; }
        if (cmd === "EHLO") sock.write("250-fake.smtp\r\n250-SIZE 35882577\r\n250 AUTH PLAIN LOGIN\r\n");
        else if (cmd === "AUTH") sock.write("235 authenticated\r\n");
        else if (cmd === "MAIL") sock.write("250 sender ok\r\n");
        else if (cmd === "RCPT") sock.write("250 recipient ok\r\n");
        else if (cmd === "DATA") { sock.write("354 go ahead\r\n"); inData = true; }
        else if (cmd === "QUIT") { sock.write("221 bye\r\n"); sock.end(); }
        else sock.write("250 ok\r\n");
      }
    });
  });
  return { server, seen, body: () => body, raw: () => raw,
    listen: () => new Promise((r) => server.listen(0, "127.0.0.1", () => r(server.address().port))),
    close: () => new Promise((r) => server.close(r)) };
}

const cfg = (over = {}) => ({
  from: "Founder <me@gmail.com>", smtpHost: "127.0.0.1", smtpUser: "me@gmail.com",
  smtpPass: "app password", smtpPort: 0, mode: "smtp", ...over,
});

(async () => {
  /* --- the happy path --- */
  {
    const f = fakeSmtp();
    const port = await f.listen();
    const res = await mailer.send(
      { to: "player@example.com", subject: "Reset your Entrepreneurs password", text: "link: https://x/y" },
      cfg({ smtpPort: port }),
      { connect: (o) => net.connect({ host: o.host, port }) });
    await f.close();

    check("the message is accepted", res.ok === true && res.via === "smtp", res.error || res.via);
    check("it greets with EHLO", f.seen.some((l) => /^EHLO /.test(l)));
    check("it authenticates with AUTH PLAIN", f.seen.some((l) => /^AUTH PLAIN /.test(l)));

    const auth = (f.seen.find((l) => /^AUTH PLAIN /.test(l)) || "").slice(11);
    const decoded = Buffer.from(auth, "base64").toString("utf8");
    check("the credentials are the NUL-separated pair SMTP expects",
      decoded === "\0me@gmail.com\0app password", JSON.stringify(decoded));

    check("the envelope sender is the bare address, not the display name",
      f.seen.includes("MAIL FROM:<me@gmail.com>"),
      f.seen.find((l) => l.startsWith("MAIL FROM")));
    check("the recipient is passed through",
      f.seen.includes("RCPT TO:<player@example.com>"),
      f.seen.find((l) => l.startsWith("RCPT TO")));

    const body = f.body();
    check("the body carries the reset link", /link: https:\/\/x\/y/.test(body));
    check("and a Subject, From, To and Date header",
      /^Subject: Reset your Entrepreneurs password$/m.test(body)
      && /^From: Founder <me@gmail\.com>$/m.test(body)
      && /^To: player@example\.com$/m.test(body)
      && /^Date: .+/m.test(body));
  }

  /* --- a line starting with a dot must not end the message early --- */
  {
    const f = fakeSmtp();
    const port = await f.listen();
    const res = await mailer.send(
      { to: "p@example.com", subject: "s", text: "before\n.\nafter\n..double" },
      cfg({ smtpPort: port }), { connect: (o) => net.connect({ host: o.host, port }) });
    await f.close();
    check("a dot on its own line does not truncate the message", res.ok === true, res.error);
    const body = f.body();
    check("and the text survives it intact",
      /before/.test(body) && /after/.test(body) && /double/.test(body),
      JSON.stringify(body.slice(-40)));

    /* This is the check that matters, and the one an earlier version of this test
       got wrong: it asserted the message "survived" while the whole body was in
       fact arriving as a SINGLE line, because it used bare newlines and the fake
       server - like the client - only split on CRLF. Both agreed, and both were
       wrong. Read the wire instead. */
    const wire = f.raw();
    const sent = wire.slice(wire.indexOf("\r\n\r\n") + 4);
    check("the body goes out with CRLF line endings, as SMTP requires",
      !/[^\r]\n/.test(wire), JSON.stringify(wire.slice(-40)));
    check("a lone dot is stuffed to '..' on the wire",
      /\r\n\.\.\r\n/.test(sent), JSON.stringify(sent.slice(-40)));
    check("and the message is closed by a lone dot, followed by QUIT",
      /\r\n\.\r\nQUIT\r\n$/.test(wire), JSON.stringify(wire.slice(-16)));
  }

  /* --- every refusal is reported, never thrown --- */
  for (const [cmd, reply, what] of [
    ["AUTH", "535 5.7.8 Username and Password not accepted", "a rejected app password"],
    ["MAIL", "550 sender denied", "a refused sender"],
    ["RCPT", "550 no such user", "a refused recipient"],
    ["DOT", "552 message too large", "a refused message"],
  ]) {
    const f = fakeSmtp({ [cmd]: reply });
    const port = await f.listen();
    const res = await mailer.send({ to: "p@example.com", subject: "s", text: "t" },
      cfg({ smtpPort: port }), { connect: (o) => net.connect({ host: o.host, port }) });
    await f.close();
    check(`${what} is reported, not thrown`,
      res.ok === false && res.via === "smtp" && !!res.error, res.error);
  }

  /* --- a dead server must not take the game server with it --- */
  {
    const dead = net.createServer();
    const port = await new Promise((r) => dead.listen(0, "127.0.0.1", () => r(dead.address().port)));
    await new Promise((r) => dead.close(r));
    const res = await mailer.send({ to: "p@example.com", subject: "s", text: "t" },
      cfg({ smtpPort: port }), { connect: (o) => net.connect({ host: o.host, port }) });
    check("an unreachable mail server is reported, not thrown",
      res.ok === false && !!res.error, res.error);
  }

  /* --- configuration --- */
  {
    const saved = { ...process.env };
    for (const k of Object.keys(process.env)) if (/^MAIL_/.test(k)) delete process.env[k];
    check("with nothing set, the link still reaches the terminal", mailer.config().mode === "console");

    process.env.MAIL_SMTP_HOST = "smtp.gmail.com";
    process.env.MAIL_SMTP_USER = "me@gmail.com";
    process.env.MAIL_SMTP_PASS = "abcd efgh ijkl mnop";
    const c = mailer.config();
    check("three variables are enough to switch SMTP on", c.mode === "smtp");
    check("it defaults to the implicit-TLS port", c.smtpPort === 465, String(c.smtpPort));
    check("From defaults to the authenticated account, which is what Gmail requires",
      c.from === "me@gmail.com", c.from);
    check("the boot banner says where mail will go and does not leak the password",
      /smtp\.gmail\.com:465/.test(mailer.describe(c)) && !/abcd/.test(mailer.describe(c)),
      mailer.describe(c));

    process.env.MAIL_WEBHOOK_URL = "https://example.com/send";
    check("SMTP wins over a webhook when both are set", mailer.config().mode === "smtp");

    for (const k of Object.keys(process.env)) if (/^MAIL_/.test(k)) delete process.env[k];
    Object.assign(process.env, saved);
  }

  console.log(fails ? `\n${fails} check(s) failed` : "\nall checks passed");
  process.exit(fails);
})();
