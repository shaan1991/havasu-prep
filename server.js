/* Havasu Prep — Express server, Google OAuth, JWT sessions, JSON API */
'use strict';
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('node:path');
const { initDb, get, all, run, now, findOrCreateUser, getProfile, saveProfile, signToken, verifyToken } = require('./db');
const { LEVELS, buildPlan, scoreQuiz, weeksUntil, INJURY_NOTES, PACK_TEMPLATE } = require('./plan');

const PORT = process.env.PORT || 3200;
const APP_URL = (process.env.APP_URL || ('http://localhost:' + PORT)).replace(/\/$/, '');
const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const DEV_LOGIN = process.env.ALLOW_DEV_LOGIN === '1';

/* Express 4 does not catch async errors; wrap every async handler */
const ah = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const app = express();
app.use(express.json({ limit: '256kb' }));

/* ── google oauth ───────────────────────────────────────── */
const googleOn = !!(GOOGLE_ID && GOOGLE_SECRET);
if (googleOn) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_ID,
    clientSecret: GOOGLE_SECRET,
    callbackURL: APP_URL + '/auth/google/callback',
  }, (accessToken, refreshToken, profile, done) => done(null, profile)));
}
app.use(passport.initialize());

const COOKIE_NAME = 'havasu_token';
function cookieOpts(req) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return { httpOnly: true, secure: secure, sameSite: 'lax', maxAge: 60 * 86400 * 1000, path: '/' };
}
function readCookie(req) {
  const h = req.headers.cookie || '';
  const m = h.match(/(?:^|;\s*)havasu_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
async function issueAndGo(req, res, profile) {
  const name = profile.displayName || (profile.emails && profile.emails[0] && profile.emails[0].value.split('@')[0]) || 'Hiker';
  const email = profile.emails && profile.emails[0] && profile.emails[0].value;
  const avatar = profile.photos && profile.photos[0] && profile.photos[0].value;
  const user = await findOrCreateUser(profile.id, name, email, avatar);
  const token = signToken(user.id);
  res.cookie(COOKIE_NAME, token, cookieOpts(req));
  res.redirect('/app.html');
}

const setupHtml = () => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in setup — Havasu Prep</title>
<style>body{background:#0c0c0c;color:#f0e9d8;font-family:-apple-system,'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}
.card{max-width:520px;background:#191919;border:1px solid rgba(244,238,224,.17);border-radius:18px;padding:32px}
h1{font-family:Georgia,serif;font-weight:400;margin:0 0 12px}p{color:#808080;line-height:1.7;font-size:14px}
code{background:#0c0c0c;padding:2px 8px;border-radius:6px;color:#facc15}</style></head><body><div class="card">
<h1>Google sign in is not configured yet</h1>
<p>This copy of Havasu Prep needs Google OAuth credentials before anyone can sign in. Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in the environment, with the authorized redirect URI <code>${APP_URL}/auth/google/callback</code>, then restart the server. See README for the full setup walkthrough.</p>
</div></body></html>`;

app.get('/auth/google', (req, res, next) => {
  if (!googleOn) return res.status(503).send(setupHtml());
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});
app.get('/auth/google/callback',
  (req, res, next) => {
    if (!googleOn) return res.status(503).send(setupHtml());
    next();
  },
  passport.authenticate('google', { session: false, failureRedirect: '/?auth=failed' }),
  ah((req, res) => issueAndGo(req, res, req.user)));

app.get('/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.redirect('/');
});

if (DEV_LOGIN) {
  app.post('/auth/dev', ah(async (req, res) => {
    const user = await findOrCreateUser('dev-local', 'Test Hiker', 'test@example.com', null);
    res.json({ token: signToken(user.id) });
  }));
  app.get('/auth/dev', ah(async (req, res) => {
    const user = await findOrCreateUser('dev-local', 'Test Hiker', 'test@example.com', null);
    await issueAndGo(req, res, user);
  }));
}

/* ── api auth ───────────────────────────────────────────── */
const apiAuth = ah(async (req, res, next) => {
  const tok = readCookie(req);
  const uid = tok ? verifyToken(tok) : null;
  if (!uid) return res.status(401).json({ error: 'Not signed in' });
  const user = await get('SELECT id, name, email, avatar, created_at FROM users WHERE id = ?', [uid]);
  if (!user) return res.status(401).json({ error: 'Account not found' });
  req.user = user;
  next();
});

const api = express.Router();
api.use(apiAuth);

/* me */
api.get('/me', ah(async (req, res) => {
  res.json({ user: req.user, profile: await getProfile(req.user.id), devLogin: DEV_LOGIN });
}));
api.put('/me', ah(async (req, res) => {
  const { name, trip_date, theme, click_sounds } = req.body || {};
  if (name) await run('UPDATE users SET name = ? WHERE id = ?', [String(name).slice(0, 60), req.user.id]);
  const patch = {};
  if (trip_date !== undefined) patch.trip_date = trip_date || null;
  if (theme === 'dark' || theme === 'light') patch.theme = theme;
  if (click_sounds === 0 || click_sounds === 1) patch.click_sounds = click_sounds;
  const profile = await saveProfile(req.user.id, patch);
  res.json({ user: await get('SELECT id, name, email, avatar, created_at FROM users WHERE id = ?', [req.user.id]), profile });
}));

/* quiz + plan */
async function seedPack(userId) {
  const n = (await get('SELECT COUNT(*) c FROM pack_items WHERE user_id = ?', [userId])).c;
  if (n > 0) return;
  let sort = 0;
  for (const g of PACK_TEMPLATE) for (const [label, qty] of g.items) {
    await run('INSERT INTO pack_items (user_id, category, label, qty, sort) VALUES (?,?,?,?,?)',
      [userId, g.category, label, qty, sort++]);
  }
}
api.post('/quiz', ah(async (req, res) => {
  const a = (req.body && req.body.answers) || {};
  const tripDate = a.trip_date || null;
  const { level } = scoreQuiz(a);
  const injury = INJURY_NOTES[a.q5] || null;
  let weeks = weeksUntil(tripDate);
  if (weeks == null || weeks < 2) weeks = LEVELS[level].weeks_default;
  weeks = Math.max(2, Math.min(12, weeks));
  const profile = await saveProfile(req.user.id, {
    trip_date: tripDate, level, weeks,
    quiz: JSON.stringify(a), injury_note: injury,
    plan_started: now(),
  });
  await seedPack(req.user.id);
  res.json({ level: LEVELS[level], weeks, injury, profile, plan: buildPlan(level, weeks) });
}));
api.get('/plan', ah(async (req, res) => {
  const p = await getProfile(req.user.id);
  if (!p || !p.level) return res.status(404).json({ error: 'Take the quiz first' });
  res.json({ level: LEVELS[p.level], weeks: p.weeks, injury: p.injury_note, trip_date: p.trip_date, plan: buildPlan(p.level, p.weeks) });
}));

/* ── intel: live canyon conditions (weather, alerts, news) ── */
const SUPAI = { lat: 36.2369, lon: -112.6903 };
const INTEL_TTL = 20 * 60 * 1000;
let intelCache = { at: 0, data: null };
const WMO_LABEL = { 0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Icy fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Light showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Light snow showers', 86: 'Snow showers', 95: 'Thunderstorm', 96: 'Storm with hail', 99: 'Storm with hail' };
async function fetchTimeout(url, opts, ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms || 12000);
  try { return await fetch(url, Object.assign({}, opts, { signal: c.signal })); }
  finally { clearTimeout(t); }
}
async function intelWeather() {
  const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + SUPAI.lat + '&longitude=' + SUPAI.lon +
    '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FPhoenix&forecast_days=7';
  const j = await (await fetchTimeout(u)).json();
  const days = (j.daily.time || []).map((t, i) => ({
    date: t,
    hi: Math.round(j.daily.temperature_2m_max[i]),
    lo: Math.round(j.daily.temperature_2m_min[i]),
    precip: j.daily.precipitation_probability_max[i],
    label: WMO_LABEL[j.daily.weather_code[i]] || '—',
  }));
  return {
    temp: Math.round(j.current.temperature_2m),
    label: WMO_LABEL[j.current.weather_code] || '—',
    humidity: j.current.relative_humidity_2m,
    wind_mph: Math.round(j.current.wind_speed_10m),
    days,
  };
}
async function intelAlerts() {
  const j = await (await fetchTimeout('https://api.weather.gov/alerts/active?point=' + SUPAI.lat + ',' + SUPAI.lon,
    { headers: { 'User-Agent': 'havasu-prep/1.0' } })).json();
  return (j.features || []).map((f) => {
    const p = f.properties || {};
    return {
      event: p.event || 'Alert',
      headline: p.headline || '',
      severity: p.severity || 'Unknown',
      effective: p.effective || null,
      expires: p.expires || null,
      areas: p.areaDesc || '',
    };
  });
}
function parseNewsRss(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  const clean = (x) => String(x || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
  const tag = (b, t) => { const mm = b.match(new RegExp('<' + t + '>([\\s\\S]*?)</' + t + '>')); return mm ? mm[1] : ''; };
  while ((m = re.exec(xml)) && items.length < 12) {
    const b = m[1];
    let title = clean(tag(b, 'title'));
    let source = clean(tag(b, 'source'));
    const dm = title.match(/ - ([^-]+)$/);
    if (dm) { if (!source) source = dm[1].trim(); title = title.slice(0, dm.index).trim(); }
    items.push({ title, link: clean(tag(b, 'link')), source, published: clean(tag(b, 'pubDate')) });
  }
  return items.filter((x) => x.title && x.link);
}
async function intelNews() {
  const r = await fetchTimeout('https://news.google.com/rss/search?q=havasupai%20OR%20%22havasu%20falls%22&hl=en-US&gl=US&ceid=US:en');
  return parseNewsRss(await r.text());
}
api.get('/intel', ah(async (req, res) => {
  const now = Date.now();
  if (req.query.fresh !== '1' && intelCache.data && now - intelCache.at < INTEL_TTL) return res.json(intelCache.data);
  const out = { updated_at: new Date().toISOString(), weather: null, alerts: [], news: [], errors: {} };
  const [w, a, n] = await Promise.allSettled([intelWeather(), intelAlerts(), intelNews()]);
  if (w.status === 'fulfilled') out.weather = w.value; else out.errors.weather = true;
  if (a.status === 'fulfilled') out.alerts = a.value; else out.errors.alerts = true;
  if (n.status === 'fulfilled') out.news = n.value; else out.errors.news = true;
  intelCache = { at: now, data: out };
  res.json(out);
}));


/* ── strava + crews ─────────────────────────────────────── */
const STRAVA_ID = process.env.STRAVA_CLIENT_ID || '';
const STRAVA_SECRET = process.env.STRAVA_CLIENT_SECRET || '';
const stravaOn = !!(STRAVA_ID && STRAVA_SECRET);
const CREW_MAX = 12; /* tribe limit: 12 permits per 2026 reservation */

app.get('/auth/strava', apiAuth, (req, res) => {
  if (!stravaOn) return res.status(503).send('Strava sync is not set up on this copy of Havasu Prep yet. Add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to the environment.');
  const u = 'https://www.strava.com/oauth/authorize?client_id=' + STRAVA_ID +
    '&redirect_uri=' + encodeURIComponent(APP_URL + '/auth/strava/callback') +
    '&response_type=code&approval_prompt=force&scope=read,activity:read_all';
  res.redirect(u);
});
app.get('/auth/strava/callback', ah(async (req, res) => {
  const uid = req.headers.cookie && verifyToken(readCookie(req));
  if (!uid) return res.redirect('/?auth=failed');
  if (!stravaOn) return res.status(503).send('Strava sync is not configured.');
  if (!req.query.code) return res.redirect('/app.html?strava=denied');
  const r = await fetchTimeout('https://www.strava.com/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: STRAVA_ID, client_secret: STRAVA_SECRET, code: req.query.code, grant_type: 'authorization_code' }),
  }, 15000);
  if (!r.ok) return res.redirect('/app.html?strava=failed');
  const j = await r.json();
  const a = j.athlete || {};
  const name = [a.firstname, a.lastname].filter(Boolean).join(' ') || 'Strava athlete';
  const cur = await get('SELECT * FROM strava_links WHERE user_id = ?', [uid]);
  const vals = [a.id || null, name, j.access_token, j.refresh_token, j.expires_at, now()];
  if (cur) await run('UPDATE strava_links SET athlete_id = ?, athlete_name = ?, access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ? WHERE user_id = ?', vals.concat([uid]));
  else await run('INSERT INTO strava_links (athlete_id, athlete_name, access_token, refresh_token, expires_at, updated_at, user_id) VALUES (?,?,?,?,?,?,?)', vals.concat([uid]));
  res.redirect('/app.html?strava=connected');
}));

async function stravaTokenFor(userId) {
  const row = await get('SELECT * FROM strava_links WHERE user_id = ?', [userId]);
  if (!row) return null;
  if (row.expires_at > Math.floor(Date.now() / 1000) + 300) return row;
  const r = await fetchTimeout('https://www.strava.com/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: STRAVA_ID, client_secret: STRAVA_SECRET, grant_type: 'refresh_token', refresh_token: row.refresh_token }),
  }, 15000);
  if (!r.ok) return null;
  const j = await r.json();
  await run('UPDATE strava_links SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ? WHERE user_id = ?',
    [j.access_token, j.refresh_token, j.expires_at, now(), userId]);
  return Object.assign({}, row, { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at });
}

const STRAVA_KIND = { Hike: 'hike', Walk: 'walk', TrailRun: 'hike', Run: 'easy' };
api.get('/strava/status', ah(async (req, res) => {
  const row = await get('SELECT athlete_name, updated_at FROM strava_links WHERE user_id = ?', [req.user.id]);
  res.json({ stravaOn, connected: !!row, athlete_name: row ? row.athlete_name : null, synced_at: row ? row.updated_at : null });
}));
api.post('/strava/disconnect', ah(async (req, res) => {
  await run('DELETE FROM strava_links WHERE user_id = ?', [req.user.id]);
  res.json({ ok: true });
}));
api.get('/strava/activities', ah(async (req, res) => {
  const tok = await stravaTokenFor(req.user.id);
  if (!tok) return res.status(400).json({ error: 'Connect Strava first' });
  const r = await fetchTimeout('https://www.strava.com/api/v3/athlete/activities?per_page=30&page=1',
    { headers: { Authorization: 'Bearer ' + tok.access_token } }, 15000);
  if (!r.ok) return res.status(502).json({ error: 'Strava did not answer' });
  const seen = await all('SELECT activity_id FROM strava_seen WHERE user_id = ?', [req.user.id]);
  const seenSet = new Set(seen.map((x) => x.activity_id));
  const out = [];
  for (const a of (await r.json()) || []) {
    if (seenSet.has(a.id)) continue;
    const kind = STRAVA_KIND[a.sport_type || a.type];
    if (!kind) continue;
    out.push({
      id: a.id, name: a.name || 'Strava activity', kind,
      log_date: String(a.start_date_local || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
      distance_mi: Math.round((a.distance || 0) / 1609.344 * 10) / 10,
      minutes: Math.round((a.moving_time || 0) / 60),
    });
  }
  res.json({ activities: out });
}));
api.post('/strava/import', ah(async (req, res) => {
  const list = (req.body && req.body.activities) || [];
  if (!list.length) return res.status(400).json({ error: 'Nothing to import' });
  let n = 0;
  for (const a of list.slice(0, 30)) {
    if (!a.id) continue;
    const kind = ['walk', 'hike', 'long', 'strength', 'easy', 'stairs'].includes(a.kind) ? a.kind : 'hike';
    const dup = await get('SELECT 1 FROM strava_seen WHERE user_id = ? AND activity_id = ?', [req.user.id, a.id]);
    if (dup) continue;
    await run('INSERT INTO training_logs (user_id, log_date, week_index, day_index, kind, title, minutes, distance_mi, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [req.user.id, a.log_date || new Date().toISOString().slice(0, 10), null, null, kind,
        String(a.name || 'Strava activity').slice(0, 120), Math.max(0, +a.minutes || 0), Math.max(0, +a.distance_mi || 0),
        'Synced from Strava', now()]);
    await run('INSERT INTO strava_seen (user_id, activity_id) VALUES (?,?)', [req.user.id, a.id]);
    n++;
  }
  res.json({ imported: n });
}));
api.post('/strava/dismiss', ah(async (req, res) => {
  const ids = (req.body && req.body.ids) || [];
  for (const id of ids.slice(0, 30)) {
    try { await run('INSERT INTO strava_seen (user_id, activity_id) VALUES (?,?)', [req.user.id, id]); } catch (e) { /* already seen */ }
  }
  res.json({ ok: true });
}));

/* canyon readiness: 0-100 from the last 28 days of logged training.
   Miles base 40 (80 mi full marks), longest session 25 (10 mi full marks),
   consistency 20 (12 sessions full marks), strength 15 (4 sessions full marks).
   Bands: 80+ canyon ready, 60+ almost there, 40+ building, else early days. */
function readinessOf(logs) {
  const miles = logs.reduce((t, l) => t + (l.distance_mi || 0), 0);
  const longest = logs.reduce((m, l) => Math.max(m, l.distance_mi || 0), 0);
  const sessions = logs.length;
  const strength = logs.filter((l) => l.kind === 'strength').length;
  const score = Math.round(
    Math.min(40, miles / 80 * 40) +
    Math.min(25, longest / 10 * 25) +
    Math.min(20, sessions / 12 * 20) +
    Math.min(15, strength / 4 * 15));
  const band = score >= 80 ? 'Canyon ready' : score >= 60 ? 'Almost there' : score >= 40 ? 'Building' : 'Early days';
  const bandKey = score >= 80 ? 'ready' : score >= 60 ? 'almost' : score >= 40 ? 'building' : 'early';
  return {
    score, band, bandKey,
    parts: { miles: Math.round(miles * 10) / 10, longest: Math.round(longest * 10) / 10, sessions, strength },
  };
}
function readinessCutoff() { return new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10); }
api.get('/readiness', ah(async (req, res) => {
  const logs = await all('SELECT log_date, distance_mi, minutes, kind FROM training_logs WHERE user_id = ? AND log_date >= ?',
    [req.user.id, readinessCutoff()]);
  res.json(readinessOf(logs));
}));

/* crews: train together, capped at the tribe group size */
function crewCode() {
  const c = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}
function weekStartISO() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
api.post('/crews', ah(async (req, res) => {
  const name = String((req.body && req.body.name) || '').trim().slice(0, 60) || 'My crew';
  let code = crewCode();
  for (let i = 0; i < 8 && await get('SELECT 1 FROM crews WHERE id = ?', [code]); i++) code = crewCode();
  await run('INSERT INTO crews (id, name, owner_id, created_at) VALUES (?,?,?,?)', [code, name, req.user.id, now()]);
  await run('INSERT INTO crew_members (crew_id, user_id, display_name, joined_at) VALUES (?,?,?,?)', [code, req.user.id, req.user.name, now()]);
  res.json({ id: code, name, code });
}));
api.post('/crews/join', ah(async (req, res) => {
  const code = String((req.body && req.body.code) || '').trim().toUpperCase();
  const crew = await get('SELECT * FROM crews WHERE id = ?', [code]);
  if (!crew) return res.status(404).json({ error: 'No crew found with that code' });
  const mem = await get('SELECT 1 FROM crew_members WHERE crew_id = ? AND user_id = ?', [code, req.user.id]);
  if (mem) return res.json({ id: code, name: crew.name, code });
  const count = (await get('SELECT COUNT(*) c FROM crew_members WHERE crew_id = ?', [code])).c;
  if (count >= CREW_MAX) return res.status(400).json({ error: 'This crew is full (12 max, the tribe limit)' });
  await run('INSERT INTO crew_members (crew_id, user_id, display_name, joined_at) VALUES (?,?,?,?)', [code, req.user.id, req.user.name, now()]);
  res.json({ id: code, name: crew.name, code });
}));
api.get('/crews', ah(async (req, res) => {
  const mine = await all('SELECT c.id, c.name, c.owner_id FROM crews c JOIN crew_members m ON m.crew_id = c.id WHERE m.user_id = ? ORDER BY c.created_at', [req.user.id]);
  const ws = weekStartISO();
  const cutoff = readinessCutoff();
  const out = [];
  for (const c of mine) {
    const members = await all('SELECT user_id, display_name FROM crew_members WHERE crew_id = ? ORDER BY joined_at', [c.id]);
    const rows = [];
    for (const m of members) {
      const agg = await get('SELECT COUNT(*) n, COALESCE(SUM(distance_mi),0) mi, COALESCE(SUM(minutes),0) mins FROM training_logs WHERE user_id = ? AND log_date >= ?', [m.user_id, ws]);
      const rlogs = await all('SELECT log_date, distance_mi, minutes, kind FROM training_logs WHERE user_id = ? AND log_date >= ?', [m.user_id, cutoff]);
      const r = readinessOf(rlogs);
      rows.push({ name: m.display_name, sessions: agg.n, miles: Math.round(agg.mi * 10) / 10, minutes: agg.mins, me: m.user_id === req.user.id, score: r.score, band: r.band, bandKey: r.bandKey });
    }
    const groupScore = rows.length ? Math.round(rows.reduce((t, m) => t + m.score, 0) / rows.length) : 0;
    const feed = await all(`SELECT m.display_name AS name, l.title, l.distance_mi, l.minutes, l.log_date, l.kind
      FROM training_logs l JOIN crew_members m ON m.user_id = l.user_id
      WHERE m.crew_id = ? ORDER BY l.log_date DESC, l.id DESC LIMIT 8`, [c.id]);
    out.push({ id: c.id, name: c.name, code: c.id, owner: c.owner_id === req.user.id, members: rows, groupScore, feed });
  }
  res.json({ crews: out, max: CREW_MAX });
}));
api.post('/crews/:id/leave', ah(async (req, res) => {
  await run('DELETE FROM crew_members WHERE crew_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  const left = (await get('SELECT COUNT(*) c FROM crew_members WHERE crew_id = ?', [req.params.id])).c;
  if (left === 0) await run('DELETE FROM crews WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));
api.delete('/crews/:id', ah(async (req, res) => {
  const crew = await get('SELECT * FROM crews WHERE id = ?', [req.params.id]);
  if (!crew) return res.status(404).json({ error: 'Not found' });
  if (crew.owner_id !== req.user.id) return res.status(403).json({ error: 'Only the crew creator can delete it' });
  await run('DELETE FROM crews WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

/* training */
api.get('/training/week', ah(async (req, res) => {
  const p = await getProfile(req.user.id);
  if (!p || !p.level) return res.status(404).json({ error: 'Take the quiz first' });
  const plan = buildPlan(p.level, p.weeks);
  const w = Math.max(1, Math.min(plan.weeks.length, +req.query.week || currentWeek(p)));
  const wk = plan.weeks[w - 1];
  const logs = await all('SELECT * FROM training_logs WHERE user_id = ? AND week_index = ?', [req.user.id, w]);
  const byDay = {};
  for (const l of logs) { (byDay[l.day_index] = byDay[l.day_index] || []).push(l); }
  res.json({ week: w, total: plan.weeks.length, level: LEVELS[p.level], days: wk.days.map((d, i) => ({ ...d, logs: byDay[i] || [] })) });
}));
api.post('/training/log', ah(async (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.kind) return res.status(400).json({ error: 'Title and kind are required' });
  const r = await run(`INSERT INTO training_logs (user_id, log_date, week_index, day_index, kind, title, minutes, distance_mi, notes, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`, [req.user.id, b.log_date || new Date().toISOString().slice(0, 10),
    b.week_index || null, b.day_index == null ? null : +b.day_index, b.kind, String(b.title).slice(0, 120),
    Math.max(0, +b.minutes || 0), Math.max(0, +b.distance_mi || 0), String(b.notes || '').slice(0, 500), now()]);
  res.json({ id: r.lastInsertRowid });
}));
api.delete('/training/log/:id', ah(async (req, res) => {
  await run('DELETE FROM training_logs WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));
api.get('/training/recent', ah(async (req, res) => {
  const rows = await all('SELECT * FROM training_logs WHERE user_id = ? ORDER BY log_date DESC, id DESC LIMIT 20', [req.user.id]);
  res.json({ logs: rows });
}));
function currentWeek(p) {
  if (!p.plan_started) return 1;
  const days = Math.floor((Date.now() - new Date(p.plan_started).getTime()) / 86400000);
  return Math.max(1, Math.min(p.weeks || 6, Math.floor(days / 7) + 1));
}
api.get('/stats', ah(async (req, res) => {
  const rows = await all('SELECT log_date, distance_mi, minutes, kind FROM training_logs WHERE user_id = ? ORDER BY log_date DESC', [req.user.id]);
  const daySet = new Set(rows.map(r => r.log_date));
  let streak = 0;
  const d = new Date();
  if (!daySet.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (daySet.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }
  const p = await getProfile(req.user.id);
  let weekDone = 0, weekTotal = 0, weekNum = 0;
  if (p && p.level) {
    const plan = buildPlan(p.level, p.weeks);
    weekNum = currentWeek(p);
    const wk = plan.weeks[weekNum - 1];
    const restDays = wk.days.filter(x => x.kind === 'rest').length;
    weekTotal = wk.days.length;
    const logs = await all('SELECT DISTINCT day_index FROM training_logs WHERE user_id = ? AND week_index = ? AND day_index IS NOT NULL', [req.user.id, weekNum]);
    weekDone = Math.min(weekTotal, restDays + logs.length);
  }
  res.json({
    streak,
    totalSessions: rows.length,
    totalMi: Math.round(rows.reduce((s, r) => s + (r.distance_mi || 0), 0) * 10) / 10,
    totalMin: rows.reduce((s, r) => s + (r.minutes || 0), 0),
    weekNum, weekDone, weekTotal,
    tripDate: p && p.trip_date,
    daysToTrip: p && p.trip_date ? Math.max(0, Math.ceil((new Date(p.trip_date + 'T12:00:00').getTime() - Date.now()) / 86400000)) : null,
  });
}));

/* packing */
api.get('/pack', ah(async (req, res) => {
  const rows = await all('SELECT * FROM pack_items WHERE user_id = ? ORDER BY sort', [req.user.id]);
  res.json({ items: rows });
}));
api.post('/pack', ah(async (req, res) => {
  const b = req.body || {};
  if (!b.label) return res.status(400).json({ error: 'Label is required' });
  const max = (await get('SELECT COALESCE(MAX(sort),-1) m FROM pack_items WHERE user_id = ?', [req.user.id])).m;
  const r = await run('INSERT INTO pack_items (user_id, category, label, qty, sort, custom) VALUES (?,?,?,?,?,1)',
    [req.user.id, b.category || 'Extras', String(b.label).slice(0, 120), String(b.qty || '').slice(0, 40), max + 1]);
  res.json({ id: r.lastInsertRowid });
}));
api.put('/pack/:id', ah(async (req, res) => {
  const b = req.body || {};
  const row = await get('SELECT * FROM pack_items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  await run('UPDATE pack_items SET label = ?, qty = ?, category = ?, checked = ? WHERE id = ?', [
    b.label != null ? String(b.label).slice(0, 120) : row.label,
    b.qty != null ? String(b.qty).slice(0, 40) : row.qty,
    b.category != null ? String(b.category).slice(0, 60) : row.category,
    b.checked != null ? (b.checked ? 1 : 0) : row.checked,
    req.params.id]);
  res.json({ ok: true });
}));
api.delete('/pack/:id', ah(async (req, res) => {
  await run('DELETE FROM pack_items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));
api.post('/pack/reset', ah(async (req, res) => {
  await run('DELETE FROM pack_items WHERE user_id = ?', [req.user.id]);
  await seedPack(req.user.id);
  res.json({ ok: true });
}));

/* notes */
api.get('/notes', ah(async (req, res) => {
  const rows = await all('SELECT * FROM notes WHERE user_id = ? ORDER BY pinned DESC, updated_at DESC', [req.user.id]);
  res.json({ notes: rows });
}));
api.post('/notes', ah(async (req, res) => {
  const b = req.body || {};
  const r = await run('INSERT INTO notes (user_id, title, body, color, pinned, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [req.user.id, String(b.title || 'Untitled').slice(0, 120), String(b.body || '').slice(0, 8000), b.color || 'none', b.pinned ? 1 : 0, now(), now()]);
  res.json({ id: r.lastInsertRowid });
}));
api.put('/notes/:id', ah(async (req, res) => {
  const b = req.body || {};
  const row = await get('SELECT * FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  await run('UPDATE notes SET title = ?, body = ?, color = ?, pinned = ?, updated_at = ? WHERE id = ?', [
    b.title != null ? String(b.title).slice(0, 120) : row.title,
    b.body != null ? String(b.body).slice(0, 8000) : row.body,
    b.color || 'none', b.pinned != null ? (b.pinned ? 1 : 0) : row.pinned, now(), req.params.id]);
  res.json({ ok: true });
}));
api.delete('/notes/:id', ah(async (req, res) => {
  await run('DELETE FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

/* public config for the landing page (no auth needed) */
app.get('/api/config', (req, res) => res.json({ devLogin: DEV_LOGIN, googleOn }));
app.use('/api', api);

/* ── static ─────────────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));
app.get('/app.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));

/* async errors become clean 500s instead of crashed requests */
app.use((err, req, res, next) => {
  console.error('request failed:', err && err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong' });
});

/* boot: listen when run directly (node server.js). On serverless hosts the
   platform loads this file (or api/index.js, which requires it), so the module
   itself is a request handler: it waits for DB init, then runs Express.
   Exporting the handler directly keeps Vercel's loader happy no matter which
   file it treats as the function entry. */
const ready = initDb();
if (require.main === module) {
  ready
    .then(() => app.listen(PORT, () => console.log('Havasu Prep on ' + APP_URL)))
    .catch((e) => { console.error('database init failed:', e.message); process.exit(1); });
}
const handler = (req, res) => ready.then(() => app(req, res));
handler.ready = ready;
handler.app = app;
module.exports = handler;