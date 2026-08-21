#!/usr/bin/env node
/* ============================================================================
   Entrepreneurs - the accounts file, from the terminal.

   Whoever runs the server owns the machine, and should never be locked out of
   their own game by a forgotten password or an account that was never made.
   This reads and writes the same file the server does.

   Stop the server before writing, or the running copy will overwrite what this
   changed the next time it saves.

     node account_tool.js list
     node account_tool.js add    <name> <email> <password>
     node account_tool.js reset  <name> <password>
     node account_tool.js remove <name>

   ACCOUNTS_FILE=/path/to/accounts.json picks a different file - use the same
   value the server runs with, or this will helpfully report on the wrong one.
   ========================================================================== */
const accounts = require("./accounts.js");

const file = process.env.ACCOUNTS_FILE || accounts.DEFAULT_FILE;
const [cmd, ...args] = process.argv.slice(2);

const die = (msg) => { console.error(msg); process.exit(1); };
const when = (t) => (t ? new Date(t).toISOString().slice(0, 16).replace("T", " ") : "never");

let store;
try { store = accounts.load(file); } catch (e) { die(e.message); }

(async () => {
  switch (cmd) {
    case "list": {
      console.log(`${store.users.length} account(s) in ${file}\n`);
      if (!store.users.length) {
        console.log("  (none) - nobody has registered on this server yet.");
        console.log("  ENT_ADMINS only names which accounts COUNT as admins; it does not create them.");
        console.log("  Register through the site, or: node account_tool.js add <name> <email> <password>");
        break;
      }
      const pad = (s, n) => String(s).padEnd(n);
      console.log(pad("name", 20) + pad("email", 30) + pad("question", 14) + "last signed in");
      console.log("-".repeat(80));
      for (const u of store.users) {
        console.log(pad(u.name, 20) + pad(u.email || "-", 30)
          + pad(u.question ? "yes" : "no", 14) + when(u.lastLoginAt));
      }
      break;
    }

    case "add": {
      const [name, email, password] = args;
      if (!name || !email || !password) die("Usage: node account_tool.js add <name> <email> <password>");
      /* No secret question from here: whoever is at this terminal can already reset
         the password, so it would be ceremony. Set one from inside the account. */
      const r = await accounts.register(store, {
        name, email, password, pid: "console", heldBy: new Set(),
        question: accounts.QUESTIONS[0].key, answer: "set this from your account page",
      });
      if (r.error) die(r.error);
      accounts.save(store, file);
      console.log(`Registered ${r.user.name}. Sign in and set a real secret question from the account panel.`);
      break;
    }

    case "reset": {
      const [name, password] = args;
      if (!name || !password) die("Usage: node account_tool.js reset <name> <password>");
      const u = accounts.byName(store, name);
      if (!u) die(`No account called ${name}. Run "list" to see what is there.`);
      const problem = accounts.passwordProblem(password);
      if (problem) die(problem);
      u.pw = await accounts.hashPassword(password);
      u.reset = null;
      accounts.save(store, file);
      console.log(`Password set for ${u.name}.`);
      break;
    }

    case "remove": {
      const [name] = args;
      if (!name) die("Usage: node account_tool.js remove <name>");
      const u = accounts.byName(store, name);
      if (!u) die(`No account called ${name}.`);
      store.users = store.users.filter((x) => x.id !== u.id);
      accounts.save(store, file);
      console.log(`Removed ${u.name}. The name is free to register again.`);
      break;
    }

    default:
      console.log(require("fs").readFileSync(__filename, "utf8")
        .split("\n").slice(1, 19).map((l) => l.replace(/^ {3}/, "")).join("\n"));
      console.log(`\nReading: ${file}`);
      process.exit(cmd ? 1 : 0);
  }
})();
