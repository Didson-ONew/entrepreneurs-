/* Getting back in without an email.

   Three questions to choose from when registering; answering yours lets you set a new
   password on the spot. The one thing it deliberately cannot do is show the old
   password: it is stored as a scrypt hash, and there is no way back from one.

   Needs a server:
     ACCOUNTS_FILE=/tmp/a.json node server.js

   Run: node test_recovery.js
*/
const accounts = require("./accounts.js");
const BASE = process.env.BASE || "http://127.0.0.1:8080";

function jar() {
  const store = new Map();
  return {
    header() { return store.size ? { cookie: [...store].map(([k, v]) => `${k}=${v}`).join("; ") } : {}; },
    remember(res) {
      const all = typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie() : [res.headers.get("set-cookie")].filter(Boolean);
      for (const line of all) {
        const [pair] = String(line).split(";");
        const i = pair.indexOf("=");
        if (i > 0) store.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }
    },
  };
}
function client(cookies) {
  const go = async (method, p, b) => {
    const r = await fetch(BASE + p, { method, cache: "no-store",
      headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...cookies.header() },
      ...(b ? { body: JSON.stringify(b) } : {}) });
    cookies.remember(r);
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
  return { post: (p, b) => go("POST", p, b || {}), get: (p) => go("GET", p), put: (p, b) => go("PUT", p, b || {}) };
}

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n${t}`);

/* ============================================================== the store alone */
section("An answer is compared the way a person types it");
(async () => {
  const store = accounts.emptyStore();
  const r = await accounts.register(store, {
    name: "Ana", email: "ana@example.com", password: "correcthorse",
    question: "street", answer: "  Baker   Street. ", pid: "x", heldBy: new Set(),
  });
  check("registering with a question works", !!r.user, r.error || "");
  check("the answer is stored scrambled, not in the open",
    !!r.user.answer && !!r.user.answer.hash && !JSON.stringify(r.user.answer).includes("Baker"),
    JSON.stringify(r.user.answer).slice(0, 40));

  const tries = [
    ["exactly as typed", "  Baker   Street. "],
    ["different case", "baker street"],
    ["extra spaces", "Baker  Street"],
    ["no full stop", "Baker Street"],
  ];
  for (const [what, answer] of tries) {
    const got = await accounts.recoverWithAnswer(store, { name: "Ana", answer, password: "brandnewpass" });
    check(`${what} is accepted`, !!got.user, got.error || "");
  }
  const wrong = await accounts.recoverWithAnswer(store, { name: "Ana", answer: "Elm Street", password: "brandnewpass" });
  check("a wrong answer is not", !!wrong.error, wrong.error);

  const noQ = await accounts.register(store, {
    name: "Bruno", email: "b@example.com", password: "correcthorse",
    question: "nonsense", answer: "x", pid: "x", heldBy: new Set(),
  });
  check("a question that is not on the list is refused", !!noQ.error, noQ.error);

  const noA = await accounts.register(store, {
    name: "Bruno", email: "b@example.com", password: "correcthorse",
    question: "street", answer: " ", pid: "x", heldBy: new Set(),
  });
  check("and so is an empty answer", !!noA.error, noA.error);

  /* ============================================================== over the wire */
  section("Getting back in through the site");
  const me = client(jar());
  const name = `Amnesiac${Math.random().toString(16).slice(2, 8)}`;

  const qs = await me.get("/api/questions");
  check("the three questions are offered", qs.status === 200 && qs.body.questions.length === 3,
    qs.body.questions ? qs.body.questions.map((q) => q.key).join(", ") : "");

  const reg = await me.post("/api/register", {
    name, email: `${name}@example.com`, password: "correcthorse",
    question: "lazy_dish", answer: "Beans on toast",
  });
  check("registering needs one of them answered", reg.status === 200, reg.body.error || "");

  const noQuestion = await client(jar()).post("/api/register", {
    name: `${name}X`, email: `${name}x@example.com`, password: "correcthorse",
  });
  check("registering without one is refused", noQuestion.status === 400, noQuestion.body.error || "");

  section("Forgetting it");
  const fresh = client(jar());
  const step1 = await fresh.post("/api/question", { name });
  check("naming the account gives back its question", step1.status === 200 && !!step1.body.question,
    step1.body.question);
  check("and the question is the one that was chosen",
    step1.body.question.includes("cannot be bothered"), step1.body.question);

  const unknown = await fresh.post("/api/question", { name: "NobodyAtAll" });
  check("an unknown name says so rather than inventing a question", unknown.status === 404);

  const wrongAnswer = await fresh.post("/api/recover", { name, answer: "Toast on beans", password: "anotherpassword" });
  check("a wrong answer is refused", wrongAnswer.status === 400, wrongAnswer.body.error);

  const right = await fresh.post("/api/recover", { name, answer: "beans on toast", password: "anotherpassword" });
  check("the right answer sets a new password", right.status === 200, right.body.error || "");
  check("and signs them straight in", right.body.user && right.body.user.name === name);

  const acct = await fresh.get("/api/account");
  check("the session is real", acct.body.user && acct.body.user.name === name);

  const old = await client(jar()).post("/api/login", { name, password: "correcthorse" });
  check("the old password no longer works", old.status === 401, `${old.status}`);
  const now = await client(jar()).post("/api/login", { name, password: "anotherpassword" });
  check("the new one does", now.status === 200, now.body.error || "");

  section("Changing the question from inside the account");
  const inside = client(jar());
  await inside.post("/api/login", { name, password: "anotherpassword" });
  const noPw = await inside.put("/api/question", { question: "street", answer: "Elm Street" });
  check("changing it needs the current password", noPw.status === 400, noPw.body.error);
  const changed = await inside.put("/api/question", {
    current: "anotherpassword", question: "street", answer: "Elm Street",
  });
  check("with it, the question changes", changed.status === 200, changed.body.error || "");

  const after = await client(jar()).post("/api/question", { name });
  check("and the new question is what is asked", after.body.question.includes("street you grew up on"),
    after.body.question);
  const byNew = await client(jar()).post("/api/recover", { name, answer: "elm street", password: "thirdpassword" });
  check("the new answer works", byNew.status === 200, byNew.body.error || "");

  console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
  process.exit(fails ? 1 : 0);
})();
