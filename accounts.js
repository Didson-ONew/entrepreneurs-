/* ============================================================================
   Entrepreneurs - accounts

   An account exists for one reason: to make a name yours. The hall of fame is
   kept by name, so without accounts anyone can type "Dids" and add to Dids's
   record. Claiming a name here means only the person holding the password can
   play under it.

   Zero dependencies - Node's crypto has everything this needs.

   What this deliberately is NOT: a general identity system. There are no roles,
   no profiles, no third-party sign-in. It protects a nickname, and that is all.
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_FILE = process.env.ACCOUNTS_FILE || path.join(__dirname, "accounts.json");

/* Passwords are hashed with scrypt, which is deliberately slow and memory-hard, so
   a stolen accounts.json is not a list of passwords. These parameters cost roughly
   100ms per attempt on a normal machine - slow enough to matter to someone guessing,
   fast enough that signing in feels instant. They are stored per user, so raising
   them later does not lock anybody out. */
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const SESSION_DAYS = 30;
const RESET_MINUTES = 60;

/* ---------- the secret question ----------
   Email reset needs a mail account the host may not have, and a link the player may
   never receive. A question they answered when they registered needs neither.

   Three to choose from, deliberately. More would be a menu nobody reads; the classics
   - mother's maiden name, first pet - are worth avoiding because they are the ones
   strangers can look up. These are personal, stable, and not on anybody's profile. */
const QUESTIONS = [
  { key: "street", text: "What was the name of the street you grew up on?" },
  { key: "first_bought", text: "What is the first record, film or book you bought with your own money?" },
  { key: "lazy_dish", text: "What do you cook when you cannot be bothered to cook?" },
];
const questionText = (key) => (QUESTIONS.find((q) => q.key === key) || {}).text || null;

/* An answer is typed twice months apart, so it is compared loosely: case, outer
   spacing, runs of spaces and a trailing full stop must not be the difference between
   getting back in and not. What survives is hashed exactly like a password, because a
   stolen store must not hand over the answers either. */
const answerKey = (s) => String(s == null ? "" : s)
  .trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
const MIN_ANSWER = 2;

const MIN_PASSWORD = 8;
/* scrypt hashes whatever it is handed, so an unbounded password is a way to make the
   server do unbounded work. Nobody has a 200-character password they typed on purpose. */
const MAX_PASSWORD = 200;

const cleanName = (s) => String(s == null ? "" : s).trim().replace(/\s+/g, " ").slice(0, 24);
const nameKey = (s) => cleanName(s).toLowerCase();
const emailKey = (s) => String(s == null ? "" : s).trim().toLowerCase().slice(0, 160);

/* Deliberately permissive. The only test that matters is whether the reset mail
   arrives, and no regular expression can tell you that. This just rejects things
   that cannot possibly be an address. */
const looksLikeEmail = (s) => /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(emailKey(s));

/* ---------- the store ----------
   One small JSON file, rewritten whole. There will be tens of accounts, not
   millions, and a single file that is either the old one or the new one is worth
   more here than the ability to scale. */
function emptyStore() {
  return { version: 1, secret: crypto.randomBytes(32).toString("hex"), users: [] };
}

function load(file = DEFAULT_FILE) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.users) || typeof s.secret !== "string") throw new Error("shape");
    return s;
  } catch (e) {
    // No file yet is the normal first run: start with an empty store.
    if (e.code === "ENOENT") return emptyStore();
    /* Anything else - unreadable, truncated, not JSON - must NOT be silently replaced.
       Overwriting it would delete every account on the next save. Refuse to start and
       let a human look at the file. */
    throw new Error(`accounts file at ${file} could not be read (${e.message}). ` +
      `Move it aside if you mean to start fresh - replacing it deletes every account.`);
  }
}

/* Write to a temporary file and rename over the old one: a reader either sees the
   whole previous store or the whole new one, never half of either. */
function save(store, file = DEFAULT_FILE) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
  try { fs.chmodSync(file, 0o600); } catch (_) { /* Windows, or a filesystem without modes */ }
}

/* ---------- passwords ---------- */
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }, (err, key) => {
      if (err) return reject(err);
      resolve({ ...SCRYPT, salt: salt.toString("hex"), hash: key.toString("hex") });
    });
  });
}

function checkPassword(password, pw) {
  return new Promise((resolve) => {
    if (!pw || !pw.salt || !pw.hash) return resolve(false);
    const keylen = pw.keylen || SCRYPT.keylen;
    crypto.scrypt(password, Buffer.from(pw.salt, "hex"), keylen,
      { N: pw.N || SCRYPT.N, r: pw.r || SCRYPT.r, p: pw.p || SCRYPT.p }, (err, key) => {
        if (err) return resolve(false);
        const want = Buffer.from(pw.hash, "hex");
        // constant time: comparing with === leaks how much of the hash matched
        resolve(want.length === key.length && crypto.timingSafeEqual(want, key));
      });
  });
}

function passwordProblem(password) {
  const s = String(password == null ? "" : password);
  if (s.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
  if (s.length > MAX_PASSWORD) return `Password must be under ${MAX_PASSWORD} characters.`;
  return null;
}

/* ---------- sessions ----------
   A signed cookie, not a stored session table: the server can verify it without
   remembering anything, and restarting does not sign everybody out. The signature
   is what makes this an authority, unlike the ent_player cookie beside it - forge
   a byte and it stops verifying. */
function signSession(store, userId, days = SESSION_DAYS) {
  const exp = Date.now() + days * 24 * 60 * 60 * 1000;
  const body = Buffer.from(JSON.stringify({ u: userId, e: exp })).toString("base64url");
  const sig = crypto.createHmac("sha256", store.secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function readSession(store, value) {
  if (!value || typeof value !== "string") return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const want = crypto.createHmac("sha256", store.secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const v = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!v || typeof v.u !== "string" || typeof v.e !== "number") return null;
    if (v.e < Date.now()) return null;
    return v.u;
  } catch (_) { return null; }
}

/* ---------- finding people ---------- */
const byId = (store, id) => store.users.find((u) => u.id === id) || null;
const byName = (store, name) => store.users.find((u) => u.nameKey === nameKey(name)) || null;
const byEmail = (store, email) => store.users.find((u) => u.emailKey === emailKey(email)) || null;

/* What the browser is allowed to know about an account: its own. */
const publicUser = (u) => (u ? { id: u.id, name: u.name, email: u.email,
  question: u.question || null, questionText: questionText(u.question) } : null);

/* ---------- registering ----------
   `heldBy` is the set of browser ids that have already finished games under this
   name, from the match records. Someone who has been playing as "Dids" all along
   can claim it; a stranger cannot walk in and take it. */
async function register(store, { name, email, password, pid, heldBy, question, answer }) {
  const nm = cleanName(name);
  if (nm.length < 2) return { error: "Pick a name of at least 2 characters." };
  if (!looksLikeEmail(email)) return { error: "That does not look like an email address." };
  const pwProblem = passwordProblem(password);
  if (pwProblem) return { error: pwProblem };
  if (!questionText(question)) return { error: "Choose one of the questions." };
  if (answerKey(answer).length < MIN_ANSWER) return { error: "Answer the question you chose." };

  if (byName(store, nm)) return { error: `${nm} is already registered. Sign in instead, or pick another name.` };
  if (byEmail(store, email)) return { error: "There is already an account with that email address." };

  const holders = heldBy instanceof Set ? heldBy : new Set(heldBy || []);
  const others = [...holders].filter((h) => h && h !== pid);
  if (others.length) {
    return { error: `Somebody else has already played games as ${nm}. Pick a name that is not in the records yet, ` +
      `or ask them to register it.` };
  }

  const pw = await hashPassword(password);
  const user = {
    id: crypto.randomBytes(12).toString("hex"),
    name: nm,
    nameKey: nameKey(nm),
    email: emailKey(email),
    emailKey: emailKey(email),
    pw,
    question,
    answer: await hashPassword(answerKey(answer)),
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    reset: null,
  };
  store.users.push(user);
  return { user };
}

/* ---------- signing in ----------
   The same answer whether the name is unknown or the password is wrong: telling
   them apart turns the sign-in form into a list of who has an account. */
const WRONG = "That name and password do not match.";

async function login(store, { name, password }) {
  const u = byName(store, name);
  if (!u) {
    /* Still spend the time hashing. Answering "no such user" instantly is how an
       attacker enumerates names without ever guessing a password. */
    await checkPassword(String(password || ""), { salt: crypto.randomBytes(16).toString("hex"), hash: "00".repeat(64) });
    return { error: WRONG };
  }
  if (!(await checkPassword(String(password || ""), u.pw))) return { error: WRONG };
  u.lastLoginAt = Date.now();
  return { user: u };
}

/* ---------- forgotten passwords ----------
   The token is random and only its hash is stored, so a leaked accounts.json does
   not hand out password resets. It expires, and using it burns it. */
function startReset(store, who) {
  const u = byEmail(store, who) || byName(store, who);
  if (!u) return null;
  const token = crypto.randomBytes(24).toString("hex");
  u.reset = {
    hash: crypto.createHash("sha256").update(token).digest("hex"),
    exp: Date.now() + RESET_MINUTES * 60 * 1000,
  };
  return { user: u, token };
}

function resetOwner(store, token) {
  if (!token || typeof token !== "string") return null;
  const h = crypto.createHash("sha256").update(token).digest("hex");
  const u = store.users.find((x) => x.reset && x.reset.hash === h);
  if (!u) return null;
  if (u.reset.exp < Date.now()) return null;
  return u;
}

async function finishReset(store, token, password) {
  const u = resetOwner(store, token);
  if (!u) return { error: "That reset link has expired or has already been used." };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  u.pw = await hashPassword(password);
  u.reset = null;                      // one use only
  return { user: u };
}

/* ---------- the secret question ----------
   Two steps, because the player has to be shown the question before they can answer
   it. Step one names the account and gets its question back; step two answers it and
   sets a new password in the same breath.

   Asking for the question does say whether a name is registered - but so does the
   join screen, which already warns a player when the name they typed belongs to
   somebody. This gives away nothing that was not public.

   What it cannot do is SHOW the old password. Passwords are stored as scrypt hashes
   and there is no way back from one; that is the entire reason a stolen accounts.json
   is not a list of passwords. Setting a new one is the only thing on offer. */
function questionFor(store, name) {
  const u = byName(store, name);
  if (!u) return { error: "No account with that name." };
  if (!u.question) {
    return { error: `${u.name} was registered before secret questions existed. Use the email link instead, ` +
      `and set a question once you are back in.` };
  }
  return { name: u.name, question: questionText(u.question) };
}

const WRONG_ANSWER = "That is not the answer on the account.";

async function recoverWithAnswer(store, { name, answer, password }) {
  const u = byName(store, name);
  if (!u || !u.answer) {
    /* Spend the time anyway. An instant "no" is how somebody finds out which names
       have a question set without ever answering one. */
    await checkPassword(answerKey(answer), { salt: crypto.randomBytes(16).toString("hex"), hash: "00".repeat(64) });
    return { error: WRONG_ANSWER };
  }
  if (!(await checkPassword(answerKey(answer), u.answer))) return { error: WRONG_ANSWER };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  u.pw = await hashPassword(password);
  u.reset = null;             // any link that was out there is now void
  u.lastLoginAt = Date.now();
  return { user: u };
}

/* Setting or changing the question, from inside the account. Needs the current
   password: otherwise a borrowed session could quietly swap the answer and take the
   account for good. */
async function setQuestion(store, user, { current, question, answer }) {
  if (!(await checkPassword(String(current || ""), user.pw))) return { error: "Your current password is not right." };
  if (!questionText(question)) return { error: "Choose one of the questions." };
  if (answerKey(answer).length < MIN_ANSWER) return { error: "Answer the question you chose." };
  user.question = question;
  user.answer = await hashPassword(answerKey(answer));
  return { user };
}

async function changePassword(store, user, current, next) {
  if (!(await checkPassword(String(current || ""), user.pw))) return { error: "Your current password is not right." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  user.pw = await hashPassword(next);
  return { user };
}

module.exports = {
  DEFAULT_FILE, SESSION_DAYS, RESET_MINUTES, MIN_PASSWORD,
  QUESTIONS, questionText, answerKey, MIN_ANSWER,
  questionFor, recoverWithAnswer, setQuestion,
  load, save, emptyStore,
  hashPassword, checkPassword, passwordProblem,
  signSession, readSession,
  byId, byName, byEmail, publicUser,
  register, login, startReset, resetOwner, finishReset, changePassword,
  cleanName, nameKey, emailKey, looksLikeEmail,
};
