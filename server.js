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

async function issueAndGo(req, res, profile) {
  const name = profile.displayName || (profile.emails && profile.emails[0] && profile.emails[0].value.split('@')[0]) || 'Hiker';
  const email = profile.emails && profile.emails[0] && profile.emails[0].value;
  const avatar = profile.photos && profile.photos[0] && profile.photos[0].value;
  const user = await findOrCreateUser(profile.id, name, email, avatar);
  const token = signToken(user.id);
  res.redirect('/app.html#token=' + token);
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
  const h = req.headers.authorization || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  const uid = tok && verifyToken(tok);
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
  res.json({ week: w, total: plan.weeks.length, days: wk.days.map((d, i) => ({ ...d, logs: byDay[i] || [] })) });
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