/* The durable copy of everything a deploy wipes.

   Free hosting rebuilds the data directory on every restart, and this instance
   restarts every time it wakes from the sleep it drops into after fifteen idle
   minutes. So the server keeps a copy in a private GitHub repository and reads
   it back at boot.

   Everything here runs against a stubbed fetch: the suite never touches the
   network, and no token is needed to run it. */
const backup = require("./backup.js");
const remotestore = require("./remotestore.js");

let fails = 0, n = 0;
const check = (what, ok, note = "") => {
  n++; if (!ok) fails++;
  console.log(`${ok ? " ok  " : " FAIL"} ${what}${note ? `  [${note}]` : ""}`);
};
const section = (t) => console.log(`\n${t}`);

const ENV = { ENT_BACKUP_REPO: "Didson-ONew/ent-data", ENT_BACKUP_TOKEN: "ghp_secret" };
const b64 = (o) => Buffer.from(JSON.stringify(o), "utf8").toString("base64");

/* A stand-in for the GitHub contents API that remembers what it was given. */
function fakeGitHub({ start = null, failWith = null } = {}) {
  const state = { file: start, sha: start ? "sha-0" : null, writes: 0, reads: 0, calls: [] };
  const f = async (url, opts = {}) => {
    state.calls.push({ url, method: opts.method || "GET", headers: opts.headers });
    if (failWith) return { ok: false, status: failWith, json: async () => ({}) };
    if ((opts.method || "GET") === "GET") {
      state.reads++;
      if (!state.file) return { ok: false, status: 404, json: async () => ({}) };
      return { ok: true, status: 200,
        json: async () => ({ sha: state.sha, content: b64(state.file) }) };
    }
    const body = JSON.parse(opts.body);
    if (state.file && body.sha !== state.sha) {
      return { ok: false, status: 409, json: async () => ({ message: "sha mismatch" }) };
    }
    state.writes++;
    state.file = JSON.parse(Buffer.from(body.content, "base64").toString("utf8"));
    state.sha = `sha-${state.writes}`;
    state.lastMessage = body.message;
    return { ok: true, status: 200, json: async () => ({ content: { sha: state.sha } }) };
  };
  f.state = state;
  return f;
}

const sampleFile = (matches = 3) => backup.build({
  accounts: { users: [{ id: 1, name: "Didson", pass: "hash", email: "d@example.com" }] },
  matches: Array.from({ length: matches }, (_, i) => ({ id: `m${i}`, players: [] })),
  feedback: { entries: [{ id: "f1", text: "loved it" }] },
  engine: "503c4432",
});

(async () => {
  section("It stays off unless it is fully configured");
  {
    check("nothing set means off", remotestore.configured({}) === false);
    check("and the boot line says so plainly", /^off - /.test(remotestore.describe({})));
    check("a repo with no token is off",
      remotestore.configured({ ENT_BACKUP_REPO: "a/b" }) === false);
    check("a token with no repo is off",
      remotestore.configured({ ENT_BACKUP_TOKEN: "x" }) === false);
    check("a half setup is called out rather than ignored",
      /misconfigured/.test(remotestore.describe({ ENT_BACKUP_TOKEN: "x" })));
    check("a repo that is not owner/name is rejected",
      remotestore.configured({ ENT_BACKUP_REPO: "justaname", ENT_BACKUP_TOKEN: "x" }) === false);
    check("and named as the reason",
      /owner\/name/.test(remotestore.describe({ ENT_BACKUP_REPO: "justaname", ENT_BACKUP_TOKEN: "x" })));
    check("fully set is on", remotestore.configured(ENV) === true);
    check("the boot line names where it goes",
      remotestore.describe(ENV) === "Didson-ONew/ent-data/backup.json", remotestore.describe(ENV));
  }

  section("The token never appears in anything printed");
  {
    check("not in the description", !remotestore.describe(ENV).includes("ghp_secret"));
    const withBranch = { ...ENV, ENT_BACKUP_BRANCH: "main", ENT_BACKUP_PATH: "x/y.json" };
    check("path and branch are honoured",
      remotestore.describe(withBranch) === "Didson-ONew/ent-data/x/y.json on main",
      remotestore.describe(withBranch));
  }

  section("Nothing saved yet");
  {
    remotestore._resetSha();
    const gh = fakeGitHub();
    const got = await remotestore.load(ENV, gh);
    check("a 404 reads as 'nothing there', not an error", got === null);
  }

  section("Saving and reading back");
  {
    remotestore._resetSha();
    const gh = fakeGitHub();
    const file = sampleFile(3);
    check("the first save succeeds", await remotestore.save(file, ENV, gh) === true);
    check("it was a PUT", gh.state.calls.some((c) => c.method === "PUT"));
    check("the commit message says what is in it",
      /3 matches/.test(gh.state.lastMessage), gh.state.lastMessage);
    check("the token is sent as a bearer",
      gh.state.calls[0].headers.Authorization === "Bearer ghp_secret");

    const back = await remotestore.load(ENV, gh);
    check("what comes back is what went in",
      back && back.counts.matches === 3 && back.accounts.length === 1);
    check("and it is still a valid backup file", backup.problem(back) === null,
      String(backup.problem(back)));
  }

  section("A second save updates rather than duplicating");
  {
    remotestore._resetSha();
    const gh = fakeGitHub();
    await remotestore.save(sampleFile(3), ENV, gh);
    await remotestore.save(sampleFile(9), ENV, gh);
    check("two saves, two writes", gh.state.writes === 2, `${gh.state.writes}`);
    check("the store holds the newer one", gh.state.file.counts.matches === 9);
  }

  section("A stale sha is recovered from, not dropped");
  {
    remotestore._resetSha();
    const gh = fakeGitHub();
    await remotestore.save(sampleFile(3), ENV, gh);
    // something else writes the file behind our back
    gh.state.sha = "sha-somebody-else";
    const ok = await remotestore.save(sampleFile(5), ENV, gh);
    check("the save still lands after a 409", ok === true);
    check("and the newer content is what is stored", gh.state.file.counts.matches === 5);
  }

  section("A bad token is reported, and never throws");
  {
    remotestore._resetSha();
    const gh = fakeGitHub({ failWith: 401 });
    check("load answers null rather than throwing", await remotestore.load(ENV, gh) === null);
    check("save answers false rather than throwing",
      await remotestore.save(sampleFile(), ENV, gh) === false);
  }

  section("An unreachable GitHub is caught");
  {
    remotestore._resetSha();
    const dead = async () => { throw new Error("getaddrinfo ENOTFOUND"); };
    check("load survives it", await remotestore.load(ENV, dead) === null);
    check("save survives it", await remotestore.save(sampleFile(), ENV, dead) === false);
  }

  section("Restoring is a merge, so a stale copy cannot undo anything");
  {
    /* This is the property that makes pulling at boot safe. backup.apply adds
       what is missing and leaves what is there alone - so a copy written before
       somebody changed their password cannot put the old one back. */
    const store = sampleFile(2);
    const live = {
      accounts: { users: [{ id: 1, name: "Didson", pass: "NEW-hash", email: "d@example.com" }] },
      matches: [],
      feedback: { entries: [] },
    };
    const result = backup.apply(store, live);
    check("the merge is accepted", !result.error, String(result.error));
    check("the password already here is NOT replaced",
      live.accounts.users[0].pass === "NEW-hash", live.accounts.users[0].pass);
    check("but the matches it was missing arrive", result.newMatches.length === 2);
  }

  console.log(fails ? `\n${fails} of ${n} check(s) failed\n` : `\nall ${n} checks passed\n`);
  process.exit(fails ? 1 : 0);
})();
