/* Havasu Prep — data layer.
   SQLite (node:sqlite, zero native deps) for local dev.
   Neon Postgres when DATABASE_URL is set (serverless hosts have no persistent
   disk, so the hosted copy keeps its data in Postgres instead of the SQLite file). */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DATABASE_URL = process.env.DATABASE_URL || '';
const usePg = !!DATABASE_URL;

const dataDir = path.join(__dirname, 'data');
/* serverless hosts have a read only filesystem: skip local file setup when on Postgres */
if (!usePg) fs.mkdirSync(dataDir, { recursive: true });

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY,
  trip_date TEXT,
  level TEXT,
  weeks INTEGER,
  quiz TEXT,
  injury_note TEXT,
  plan_started TEXT,
  theme TEXT DEFAULT 'dark',
  click_sounds INTEGER DEFAULT 1,
  updated_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS training_logs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  log_date TEXT NOT NULL,
  week_index INTEGER,
  day_index INTEGER,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  minutes INTEGER DEFAULT 0,
  distance_mi REAL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON training_logs(user_id, log_date);
CREATE TABLE IF NOT EXISTS strava_links (
  user_id INTEGER PRIMARY KEY,
  athlete_id INTEGER,
  athlete_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS strava_seen (
  user_id INTEGER NOT NULL,
  activity_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, activity_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS crews (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS crew_members (
  crew_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (crew_id, user_id),
  FOREIGN KEY(crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS pack_items (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  qty TEXT DEFAULT '',
  checked INTEGER DEFAULT 0,
  sort INTEGER DEFAULT 0,
  custom INTEGER DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  color TEXT DEFAULT 'none',
  pinned INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS app_events (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  event TEXT NOT NULL,
  meta TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_events_event_time ON app_events(event, created_at);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON app_events(user_id, created_at);
`;

const PG_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY,
  trip_date TEXT,
  level TEXT,
  weeks INTEGER,
  quiz TEXT,
  injury_note TEXT,
  plan_started TEXT,
  theme TEXT DEFAULT 'dark',
  click_sounds INTEGER DEFAULT 1,
  updated_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS training_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  log_date TEXT NOT NULL,
  week_index INTEGER,
  day_index INTEGER,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  minutes INTEGER DEFAULT 0,
  distance_mi REAL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON training_logs(user_id, log_date);
CREATE TABLE IF NOT EXISTS strava_links (
  user_id INTEGER PRIMARY KEY,
  athlete_id INTEGER,
  athlete_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS strava_seen (
  user_id INTEGER NOT NULL,
  activity_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, activity_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS crews (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS crew_members (
  crew_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (crew_id, user_id),
  FOREIGN KEY(crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS pack_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  qty TEXT DEFAULT '',
  checked INTEGER DEFAULT 0,
  sort INTEGER DEFAULT 0,
  custom INTEGER DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  color TEXT DEFAULT 'none',
  pinned INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS app_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  event TEXT NOT NULL,
  meta TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_events_event_time ON app_events(event, created_at);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON app_events(user_id, created_at);
`;

let sqliteDb = null;
let pgClient = null;

/* rewrite ? placeholders to $1, $2 for Postgres */
function toPg(text) {
  let i = 0;
  return text.replace(/\?/g, () => '$' + (++i));
}

async function initDb() {
  if (usePg) {
    /* Client (node-postgres style) instead of the neon() http helper:
       the helper only works as a tagged template, while this codebase
       issues dynamic query(text, params) calls everywhere. */
    const { Client } = require('@neondatabase/serverless');
    pgClient = new Client(DATABASE_URL);
    await pgClient.connect();
    await pgClient.query(PG_SCHEMA);
    console.log('Havasu Prep using Postgres (Neon)');
  } else {
    const { DatabaseSync } = require('node:sqlite');
    sqliteDb = new DatabaseSync(path.join(dataDir, 'havasu.db'));
    sqliteDb.exec('PRAGMA journal_mode = WAL');
    sqliteDb.exec(SQLITE_SCHEMA);
    console.log('Havasu Prep using SQLite (local)');
  }
}

/* one row or null */
async function get(text, params) {
  params = params || [];
  if (usePg) {
    const r = await pgClient.query(toPg(text), params);
    return r.rows[0] || null;
  }
  return sqliteDb.prepare(text).get(...params) || null;
}

/* array of rows */
async function all(text, params) {
  params = params || [];
  if (usePg) {
    const r = await pgClient.query(toPg(text), params);
    return r.rows;
  }
  return sqliteDb.prepare(text).all(...params);
}

/* writes; returns { lastInsertRowid } for INSERTs */
async function run(text, params) {
  params = params || [];
  if (usePg) {
    if (/^\s*insert/i.test(text)) {
      const r = await pgClient.query(toPg(text) + ' RETURNING *', params);
      const row = r.rows[0] || {};
      return { lastInsertRowid: row.id === undefined ? null : row.id };
    }
    await pgClient.query(toPg(text), params);
    return { lastInsertRowid: null };
  }
  return sqliteDb.prepare(text).run(...params);
}

const now = () => new Date().toISOString();

async function findOrCreateUser(googleId, name, email, avatar) {
  let row = await get('SELECT * FROM users WHERE google_id = ?', [googleId]);
  if (!row) {
    const r = await run('INSERT INTO users (google_id, name, email, avatar, created_at) VALUES (?,?,?,?,?)',
      [googleId, name, email || null, avatar || null, now()]);
    row = await get('SELECT * FROM users WHERE id = ?', [r.lastInsertRowid]);
  } else if ((name && name !== row.name) || (avatar && avatar !== row.avatar)) {
    await run('UPDATE users SET name = ?, avatar = ? WHERE id = ?', [name, avatar, row.id]);
    row = await get('SELECT * FROM users WHERE id = ?', [row.id]);
  }
  return row;
}

async function getProfile(userId) {
  return await get('SELECT * FROM profiles WHERE user_id = ?', [userId]);
}

async function saveProfile(userId, patch) {
  const cur = await getProfile(userId);
  if (!cur) {
    await run(`INSERT INTO profiles (user_id, trip_date, level, weeks, quiz, injury_note, plan_started, theme, click_sounds, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [userId, patch.trip_date || null, patch.level || null, patch.weeks || null,
        patch.quiz || null, patch.injury_note || null, patch.plan_started || null,
        patch.theme || 'dark', patch.click_sounds == null ? 1 : patch.click_sounds, now()]);
  } else {
    const cols = ['trip_date', 'level', 'weeks', 'quiz', 'injury_note', 'plan_started', 'theme', 'click_sounds'];
    const sets = [], vals = [];
    for (const c of cols) if (c in patch) { sets.push(c + ' = ?'); vals.push(patch[c]); }
    sets.push('updated_at = ?'); vals.push(now()); vals.push(userId);
    await run('UPDATE profiles SET ' + sets.join(', ') + ' WHERE user_id = ?', vals);
  }
  return getProfile(userId);
}

/* ── jwt (HS256, no deps) ───────────────────────────────── */
const b64u = (s) => Buffer.from(s).toString('base64url');
function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (usePg) throw new Error('JWT_SECRET env var is required when DATABASE_URL is set');
  const p = path.join(dataDir, 'jwt.secret');
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  const s = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(p, s, { mode: 0o600 });
  return s;
}
const JWT_SECRET = jwtSecret();
function signToken(uid) {
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64u(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + 60 * 86400 }));
  const s = crypto.createHmac('sha256', JWT_SECRET).update(h + '.' + p).digest('base64url');
  return h + '.' + p + '.' + s;
}
function verifyToken(tok) {
  try {
    const [h, p, s] = String(tok).split('.');
    const want = crypto.createHmac('sha256', JWT_SECRET).update(h + '.' + p).digest('base64url');
    if (s !== want) return null;
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.uid;
  } catch (e) { return null; }
}

/* product analytics: never throws, never blocks the caller */
async function logEvent(userId, event, meta) {
  try {
    await run('INSERT INTO app_events (user_id, event, meta, created_at) VALUES (?,?,?,?)',
      [userId || null, String(event).slice(0, 40), String(meta == null ? '' : meta).slice(0, 200), now()]);
  } catch (e) { console.warn('logEvent failed:', e.message); }
}

module.exports = { initDb, get, all, run, now, findOrCreateUser, getProfile, saveProfile, signToken, verifyToken, logEvent };
