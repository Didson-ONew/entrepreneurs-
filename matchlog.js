/* ============================================================================
   Match log — every finished game, and the statistics drawn from them.

   Storage is one JSON object per line in matches.jsonl, appended as games end.
   That is deliberate: it needs no database, a half-written line can only ever
   cost the last match, and you can read the whole history with `tail`.

   Only games the SERVER ran are recorded. A single-player page keeps its game in
   the browser, and letting a browser post its own score would make the hall of
   fame a text box rather than a record.
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_FILE = require("./datadir.js").resolve("matches.jsonl", "MATCHES_FILE");

/* ---------- who a player is ----------
   There are no accounts, so a player is the name they typed. Trimmed, collapsed
   and compared case-insensitively, so "ana" and "Ana " are one person; the
   display keeps the spelling of their most recent game. */
const nameKey = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
const cleanName = (s) => String(s || "").trim().replace(/\s+/g, " ").slice(0, 24);

/* ---------- where EP came from ----------
   The engine records every award with a label; these are the buckets a player
   would recognise on the scoring page. */
function epBucket(label) {
  const l = String(label || "");
  if (l.startsWith("Entered ")) return "industries";
  if (l.startsWith("Company:")) return "companies";
  if (l.startsWith("Megacorp:")) return "megacorps";
  if (l === "IPO tile") return "ipo";
  if (l === "The Real-Estate Mogul" || l === "The Omnipresent") return "land";
  if (l.startsWith("Cash on hand")) return "cash";
  if (l.startsWith("Unpaid loans")) return "loans";
  return "other";
}
const BUCKETS = ["industries", "companies", "megacorps", "ipo", "land", "cash", "loans", "other"];

/* ---------- building a record ---------- */

/* `E` is the engine (for epTotal/activeBiz/bizInd), `room` supplies the table's
   own context: who sat down, how long it took, which rules build ran it. */
function buildRecord(E, room) {
  const st = room.state;
  const seatMember = {};
  (room.members || []).forEach((m) => { seatMember[m.seat] = m; });

  const players = st.players.map((p) => {
    const member = seatMember[p.id];
    const buckets = Object.fromEntries(BUCKETS.map((b) => [b, 0]));
    (p.epLog || []).forEach((e) => { buckets[epBucket(e.label)] += e.amount; });
    const industries = [...new Set((p.industriesScored || []))];
    const plots = Object.values(st.board.owner).filter((v) => v === p.id).length;
    const districts = new Set();
    Object.entries(st.board.owner).forEach(([plot, id]) => {
      if (id !== p.id) return;
      const c = st.board.cellOf[plot];
      if (c) districts.add(`${c.r},${c.c}`);
    });
    E.activeBiz(p).forEach((b) => b.footprint.forEach((plot) => {
      const c = st.board.cellOf[plot];
      if (c) districts.add(`${c.r},${c.c}`);
    }));
    return {
      seat: p.id,
      // a seat handed to a bot mid-game keeps the human's name in the room, so
      // remember what they were called and that they did not finish the game
      name: cleanName(member ? member.name : p.name),
      // Which browser played under that name. Nothing is scored on it - the hall of
      // fame is still keyed on the name typed - it exists so the lobby can tell a
      // returning player from someone about to share a stranger's row.
      pid: (member && member.pid) || null,
      human: !!p.isHuman,
      abandoned: !!member && !p.isHuman,
      persona: p.persona || null,
      ep: Math.round(E.epTotal(p)),
      cash: Math.round(p.cash),
      companies: E.activeBiz(p).length,
      megacorps: p.businesses.filter((b) => b.isHQ).length,
      loanDiscs: p.discsInBank,
      plots,
      districts: districts.size,
      industries,
      ep_from: buckets,
    };
  });

  // rank the way the game does: EP, then money, then fewer loan discs
  const ranked = [...players].sort((a, b) => b.ep - a.ep || b.cash - a.cash || a.loanDiscs - b.loanDiscs);
  ranked.forEach((p, i) => { p.rank = i + 1; });
  const winner = ranked[0];

  return {
    id: crypto.randomBytes(6).toString("hex"),
    at: Date.now(),
    engine: E.ENGINE_VERSION,
    code: room.code,
    quarters: st.quarter,
    durationMs: room.startedAt ? Date.now() - room.startedAt : null,
    personas: !!room.personas,
    // which optional rules were on, so a variant game is never mistaken for a standard one
    variants: Object.entries((st.variants) || {}).filter(([, on]) => on).map(([k]) => k),
    humans: players.filter((p) => p.human).length,
    bots: players.filter((p) => !p.human).length,
    winner: winner ? { name: winner.name, ep: winner.ep, human: winner.human } : null,
    players,
  };
}

/* ---------- the file ---------- */

function append(rec, file = DEFAULT_FILE) {
  try {
    fs.appendFileSync(file, JSON.stringify(rec) + "\n");
    return true;
  } catch (e) {
    console.error(`could not record the match: ${e.message}`);
    return false;   // a read-only disk must not take the game down with it
  }
}

function load(file = DEFAULT_FILE) {
  let raw;
  try { raw = fs.readFileSync(file, "utf8"); } catch (_) { return []; }
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch (_) { /* a torn last line: skip it */ }
  }
  return out;
}

/* ---------- the statistics ---------- */

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round1 = (n) => Math.round(n * 10) / 10;

/* Hall of fame: humans only, ranked by total EP across every recorded match.
   Matches and wins sit beside the total on purpose - a big number built out of
   forty games is a different achievement from the same number built out of five,
   and the table should let you see which it is. */
function hallOfFame(matches) {
  const by = new Map();
  for (const m of matches) {
    for (const p of m.players) {
      if (!p.human || p.abandoned) continue;
      const key = nameKey(p.name);
      if (!key) continue;
      if (!by.has(key)) by.set(key, { name: p.name, matches: 0, wins: 0, ep: 0, best: null, worst: null, megacorps: 0, lastAt: 0 });
      const e = by.get(key);
      e.matches += 1;
      e.ep += p.ep;
      e.megacorps += p.megacorps || 0;
      if (e.best === null || p.ep > e.best) e.best = p.ep;
      if (e.worst === null || p.ep < e.worst) e.worst = p.ep;
      if (p.rank === 1) e.wins += 1;
      if (m.at > e.lastAt) { e.lastAt = m.at; e.name = p.name; }   // keep their latest spelling
    }
  }
  return [...by.values()]
    .map((e) => ({ ...e, avg: round1(e.ep / e.matches), winRate: Math.round((e.wins / e.matches) * 100) }))
    .sort((a, b) => b.ep - a.ep || b.wins - a.wins || a.matches - b.matches);
}

/* ---------- who already answers to a name ----------
   The hall of fame is keyed on the name typed, so two people who both call themselves
   "Dan" pool their scores into one row. Nothing can undo that after the fact, but it
   can be caught at the moment it is about to happen - which is what this is for.

   Only *identified* holders count. A record written before browsers were identified
   has no pid, and it would be unfair to tell the person who actually earned those
   games that their own name is taken, so those records claim nobody. */
function nameHolders(matches) {
  const by = new Map();
  for (const m of matches) {
    for (const p of (m && m.players) || []) {
      if (!p.human || !p.pid) continue;
      const key = nameKey(p.name);
      if (!key) continue;
      if (!by.has(key)) by.set(key, new Set());
      by.get(key).add(p.pid);
    }
  }
  return by;
}

/* Is this name free for this browser to use? `mine` means they have played under it
   before, so filling it back in is right; `taken` means somebody else has, and using
   it would merge two people's records. */
function nickStatus(matches, name, pid) {
  const clean = cleanName(name);
  const key = nameKey(clean);
  if (!key) return { name: clean, taken: false, mine: false, others: 0 };
  const holders = nameHolders(matches).get(key);
  if (!holders || !holders.size) return { name: clean, taken: false, mine: false, others: 0 };
  const others = [...holders].filter((h) => h !== pid).length;
  return { name: clean, taken: others > 0, mine: !!pid && holders.has(pid), others };
}

/* Which rulesets the record book actually contains, newest first.

   Every record carries the ENGINE_VERSION that played it, which changes whenever a
   rule changes. That makes the record book a stack of editions rather than one long
   run, and comparing a score across a scoring change is comparing two games. This is
   what lets the reader ask for one edition at a time. */
function editions(matches) {
  const by = new Map();
  for (const m of matches) {
    if (!m || !Array.isArray(m.players)) continue;
    const key = m.engine || "unknown";
    const e = by.get(key) || { engine: key, matches: 0, firstAt: m.at, lastAt: m.at };
    e.matches += 1;
    if (m.at < e.firstAt) e.firstAt = m.at;
    if (m.at > e.lastAt) e.lastAt = m.at;
    by.set(key, e);
  }
  return [...by.values()].sort((a, b) => b.lastAt - a.lastAt);
}

/* Narrow the record book before summarising it.

     engine    only games played on one ruleset
     standard  only games with no optional rules switched on
     people    only games with a human at the table, and more than one of them

   An unknown filter matches nothing rather than everything: a filter that silently
   does not apply is worse than an empty table, because the numbers still look real. */
function selectMatches(matches, filter = {}) {
  let out = matches.filter((m) => m && Array.isArray(m.players));
  if (filter.engine) out = out.filter((m) => (m.engine || "unknown") === filter.engine);
  if (filter.standard) out = out.filter((m) => !(m.variants || []).length);
  if (filter.people) out = out.filter((m) => (m.humans || 0) > 1);
  return out;
}

function summarise(matches, PERSONAS = {}, filter = {}) {
  const finished = selectMatches(matches, filter);
  if (!finished.length) {
    return { matches: 0, total: matches.filter((m) => m && Array.isArray(m.players)).length,
      editions: editions(matches), filter, hallOfFame: [], summary: null, recent: [],
      industries: [], personas: [], epSources: [] };
  }

  const humanScores = [];
  const winnerScores = [];
  const bucketTotals = Object.fromEntries(BUCKETS.map((b) => [b, 0]));
  let seatCount = 0, megacorps = 0, humanWins = 0, contested = 0;
  const indEntered = {}, indWinner = {};
  const personaPlayed = {}, personaWon = {};

  for (const m of finished) {
    const win = m.players.find((p) => p.rank === 1);
    if (win) {
      winnerScores.push(win.ep);
      if (win.human) humanWins += 1;
      (win.industries || []).forEach((i) => { indWinner[i] = (indWinner[i] || 0) + 1; });
    }
    if ((m.humans || 0) > 1) contested += 1;
    for (const p of m.players) {
      seatCount += 1;
      megacorps += p.megacorps || 0;
      if (p.human) humanScores.push(p.ep);
      BUCKETS.forEach((b) => { bucketTotals[b] += (p.ep_from && p.ep_from[b]) || 0; });
      (p.industries || []).forEach((i) => { indEntered[i] = (indEntered[i] || 0) + 1; });
      if (p.persona) {
        personaPlayed[p.persona] = (personaPlayed[p.persona] || 0) + 1;
        if (p.rank === 1) personaWon[p.persona] = (personaWon[p.persona] || 0) + 1;
      }
    }
  }

  let top = null;
  for (const m of finished) {
    for (const p of m.players) {
      if (!p.human) continue;
      if (!top || p.ep > top.ep) top = { name: p.name, ep: p.ep, at: m.at };
    }
  }

  const durations = finished.map((m) => m.durationMs).filter((d) => d > 0);
  const industries = Object.keys(indEntered)
    .map((ind) => ({ ind, entered: indEntered[ind], wonWith: indWinner[ind] || 0 }))
    .sort((a, b) => b.entered - a.entered);
  const personas = Object.keys(personaPlayed)
    .map((key) => ({
      key,
      name: (PERSONAS[key] && PERSONAS[key].name) || key,
      ind: (PERSONAS[key] && PERSONAS[key].ind) || "",
      played: personaPlayed[key],
      won: personaWon[key] || 0,
      winRate: Math.round(((personaWon[key] || 0) / personaPlayed[key]) * 100),
    }))
    .sort((a, b) => b.winRate - a.winRate || b.played - a.played);
  const epSources = BUCKETS
    .filter((b) => bucketTotals[b] !== 0)
    .map((b) => ({ source: b, perPlayer: round1(bucketTotals[b] / seatCount) }))
    .sort((a, b) => Math.abs(b.perPlayer) - Math.abs(a.perPlayer));

  const recent = [...finished].sort((a, b) => b.at - a.at).slice(0, 12).map((m) => ({
    id: m.id, at: m.at, humans: m.humans, bots: m.bots, personas: m.personas, variants: m.variants || [],
    durationMs: m.durationMs, engine: m.engine,
    players: [...m.players].sort((a, b) => a.rank - b.rank)
      .map((p) => ({ name: p.name, ep: p.ep, human: p.human, rank: p.rank, persona: p.persona })),
  }));

  return {
    matches: finished.length,
    /* how many the book holds in total, so a filter can say "12 of 340" */
    total: matches.filter((m) => m && Array.isArray(m.players)).length,
    editions: editions(matches),
    filter,
    hallOfFame: hallOfFame(finished),
    summary: {
      matches: finished.length,
      contested,                                   // more than one human at the table
      firstAt: Math.min(...finished.map((m) => m.at)),
      lastAt: Math.max(...finished.map((m) => m.at)),
      seats: seatCount,
      avgWinningEP: round1(avg(winnerScores)),
      avgHumanEP: round1(avg(humanScores)),
      topScore: top,
      humanWinRate: finished.length ? Math.round((humanWins / finished.length) * 100) : 0,
      megacorpsPerMatch: round1(megacorps / finished.length),
      avgDurationMs: durations.length ? Math.round(avg(durations)) : null,
    },
    industries,
    personas,
    epSources,
    recent,
  };
}

module.exports = { buildRecord, append, load, summarise, hallOfFame, epBucket, nameKey, cleanName,
  nameHolders, nickStatus, editions, selectMatches, BUCKETS, DEFAULT_FILE };
