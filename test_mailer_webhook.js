/* Password-reset mail over an HTTPS mail API.

   WHY. Render's free instances block outbound SMTP - ports 25, 465 and 587 alike -
   so the SMTP backend cannot be used there whatever the settings say. What is left
   is a provider's own HTTP API on 443.

   WHY A TEMPLATE RATHER THAN PROVIDER CODE. Every provider wants a different JSON
   body, and none of them wants the {from, to, subject, text} this used to post.
   Writing an adapter per provider means writing down a wire format from memory and
   shipping it; when it is wrong, it is wrong in production, on someone else's
   account. A template copied out of the provider's own documentation cannot go
   stale in this repository, and a change at their end is a configuration edit.

   WHAT IS TESTED. The filling: escaping, because the reset mail is several lines
   long and a raw newline in JSON is a body the provider rejects; validation, so a
   typo is caught at boot; and that the provider's complaint reaches the admin,
   because "verified sender" errors are the whole diagnostic. */
const http = require("http");
const mailer = require("./mailer.js");

let fails = 0;
function check(label, ok, detail) {
  if (!ok) fails++;
  console.log(` ${ok ? "ok  " : "FAIL"}  ${label}${detail !== undefined && detail !== "" ? "  [" + detail + "]" : ""}`);
}

/* An endpoint that records what it was sent and answers how the test tells it to. */
function fakeApi({ status = 202, reply = "" } = {}) {
  let got = null;
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => { raw += d; });
    req.on("end", () => {
      got = { headers: req.headers, raw };
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(reply);
    });
  });
  return { got: () => got,
    listen: () => new Promise((r) => server.listen(0, "127.0.0.1", () => r(server.address().port))),
    close: () => new Promise((r) => server.close(r)) };
}

const BREVO = '{"sender":{"email":"{{from_email}}","name":"{{from_name}}"},'
  + '"to":[{"email":"{{to}}"}],"subject":"{{subject}}","textContent":"{{text}}"}';
const SENDGRID = '{"personalizations":[{"to":[{"email":"{{to}}"}]}],'
  + '"from":{"email":"{{from_email}}","name":"{{from_name}}"},"subject":"{{subject}}",'
  + '"content":[{"type":"text/plain","value":"{{text}}"}]}';

const cfg = (over = {}) => ({
  from: "Entrepreneurs <entrepreneurs.boardgame@gmail.com>",
  webhook: "", webhookTemplate: "", webhookHeaders: {}, webhookAuth: "",
  mode: "webhook", ...over,
});

(async () => {
  /* --- a provider-shaped body, built from a template --- */
  {
    const api = fakeApi();
    const port = await api.listen();
    const res = await mailer.send(
      { to: "player@example.com", subject: "Reset your Entrepreneurs password",
        text: "Hello Dids,\n\nOpen this link:\n\nhttps://x/?reset=abc\n" },
      cfg({ webhook: `http://127.0.0.1:${port}/v3/smtp/email`, webhookTemplate: BREVO,
            webhookHeaders: { "api-key": "xkeysib-secret" } }));

    check("the provider accepts it", res.ok === true, res.error);
    const sent = JSON.parse(api.got().raw);
    check("the body is the provider's shape, not ours",
      sent.sender.email === "entrepreneurs.boardgame@gmail.com"
      && sent.to[0].email === "player@example.com"
      && sent.subject === "Reset your Entrepreneurs password", JSON.stringify(sent.sender));
    check("the display name is split out of MAIL_FROM",
      sent.sender.name === "Entrepreneurs", sent.sender.name);
    check("the multi-line body survives the trip",
      /Hello Dids/.test(sent.textContent) && /reset=abc/.test(sent.textContent)
      && sent.textContent.split("\n").length >= 5, JSON.stringify(sent.textContent.slice(0, 30)));
    check("a custom header goes out under its own name",
      api.got().headers["api-key"] === "xkeysib-secret");
    await api.close();
  }

  /* --- the other provider shape, to prove the mechanism is not Brevo-specific --- */
  {
    const api = fakeApi({ status: 202 });
    const port = await api.listen();
    const res = await mailer.send({ to: "p@example.com", subject: "s", text: "t" },
      cfg({ webhook: `http://127.0.0.1:${port}/v3/mail/send`, webhookTemplate: SENDGRID,
            webhookAuth: "Bearer SG.token" }));
    const sent = JSON.parse(api.got().raw);
    check("a differently-shaped provider works with no code change",
      res.ok === true && sent.personalizations[0].to[0].email === "p@example.com"
      && sent.content[0].value === "t", res.error);
    check("Authorization is still sent when that is what the provider wants",
      api.got().headers.authorization === "Bearer SG.token");
    await api.close();
  }

  /* --- escaping: the thing most likely to produce a silent 400 --- */
  {
    const api = fakeApi();
    const port = await api.listen();
    const nasty = 'He said "hello"\nthen \\ left\ttabbed';
    const res = await mailer.send({ to: "p@example.com", subject: 'A "quoted" subject', text: nasty },
      cfg({ webhook: `http://127.0.0.1:${port}/`, webhookTemplate: BREVO }));
    check("quotes, newlines, backslashes and tabs do not break the JSON", res.ok === true, res.error);
    const sent = JSON.parse(api.got().raw);
    check("and arrive at the provider exactly as written",
      sent.textContent === nasty && sent.subject === 'A "quoted" subject',
      JSON.stringify(sent.textContent));
    await api.close();
  }

  /* --- the provider's complaint must reach the admin --- */
  {
    const api = fakeApi({ status: 403,
      reply: '{"errors":[{"message":"The from address does not match a verified Sender Identity."}]}' });
    const port = await api.listen();
    const res = await mailer.send({ to: "p@example.com", subject: "s", text: "t" },
      cfg({ webhook: `http://127.0.0.1:${port}/`, webhookTemplate: BREVO }));
    check("a refusal is reported with the provider's own words",
      res.ok === false && /403/.test(res.error) && /verified Sender Identity/.test(res.error),
      res.error);
    await api.close();
  }

  /* --- bad templates fail before anything is sent --- */
  {
    const api = fakeApi();
    const port = await api.listen();
    const bad = await mailer.send({ to: "p@e.com", subject: "s", text: "t" },
      cfg({ webhook: `http://127.0.0.1:${port}/`, webhookTemplate: '{"to":"{{to}}",}' }));
    check("a malformed template is refused, not posted",
      bad.ok === false && /valid JSON/.test(bad.error) && api.got() === null, bad.error);

    const unknown = await mailer.send({ to: "p@e.com", subject: "s", text: "t" },
      cfg({ webhook: `http://127.0.0.1:${port}/`, webhookTemplate: '{"to":"{{recipient}}"}' }));
    check("an unknown placeholder is named, with the real ones listed",
      unknown.ok === false && /\{\{recipient\}\}/.test(unknown.error)
      && /\{\{to\}\}/.test(unknown.error), unknown.error);
    await api.close();
  }

  /* --- no template: exactly what it always did --- */
  {
    const api = fakeApi();
    const port = await api.listen();
    const res = await mailer.send({ to: "p@example.com", subject: "s", text: "t" },
      cfg({ webhook: `http://127.0.0.1:${port}/` }));
    const sent = JSON.parse(api.got().raw);
    check("without a template the old body shape is unchanged",
      res.ok === true && sent.to === "p@example.com" && sent.subject === "s"
      && sent.text === "t" && sent.from === "Entrepreneurs <entrepreneurs.boardgame@gmail.com>",
      JSON.stringify(sent));
    await api.close();
  }

  /* --- and the boot banner reports the shape --- */
  {
    const saved = { ...process.env };
    for (const k of Object.keys(process.env)) if (/^MAIL_/.test(k)) delete process.env[k];
    process.env.MAIL_WEBHOOK_URL = "https://api.brevo.com/v3/smtp/email";
    process.env.MAIL_WEBHOOK_TEMPLATE = BREVO;
    check("a good template is reported quietly",
      /using MAIL_WEBHOOK_TEMPLATE/.test(mailer.describe(mailer.config())));
    process.env.MAIL_WEBHOOK_TEMPLATE = '{"to":"{{to}}",}';
    check("a broken one is flagged at boot, before a player needs it",
      /WARNING/.test(mailer.describe(mailer.config())), mailer.describe(mailer.config()));
    for (const k of Object.keys(process.env)) if (/^MAIL_/.test(k)) delete process.env[k];
    Object.assign(process.env, saved);
  }

  console.log(fails ? `\n${fails} check(s) failed` : "\nall checks passed");
  process.exit(fails);
})();
