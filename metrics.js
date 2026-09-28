/* Havasu Prep — product metrics.
   Aggregate, privacy friendly numbers for the private dashboard and the
   weekly digest. The dev QA account (google_id 'dev-local') is excluded
   from every number. */
'use strict';

const DEV_GID = 'dev-local';
const DAY = 86400000;

function isoDaysAgo(n) {
  return new Date(Date.now() - n * DAY).toISOString();
}
function dayKey(iso) {
  return String(iso).slice(0, 10);
}

async function computeMetrics(db) {
  const { get, all } = db;
  const c = (r) => (r && r.c != null ? Number(r.c) : 0);
  const realUsers = `u.google_id <> '${DEV_GID}'`;

  const totalUsers = c(await get(`SELECT COUNT(*) c FROM users u WHERE ${realUsers}`));
  const new7 = c(await get(`SELECT COUNT(*) c FROM users u WHERE ${realUsers} AND u.created_at >= ?`, [isoDaysAgo(7)]));
  const new30 = c(await get(`SELECT COUNT(*) c FROM users u WHERE ${realUsers} AND u.created_at >= ?`, [isoDaysAgo(30)]));

  /* signups per day, last 30 days (backfilled from users.created_at) */
  const signupRows = await all(
    `SELECT substr(u.created_at, 1, 10) d, COUNT(*) c FROM users u WHERE ${realUsers} AND u.created_at >= ? GROUP BY d ORDER BY d`,
    [isoDaysAgo(30)]);
  const signupsByDay = signupRows.map((r) => ({ day: r.d, n: Number(r.c) }));

  /* signins per day, last 14 days (starts from this deploy) */
  const signinRows = await all(
    `SELECT substr(e.created_at, 1, 10) d, COUNT(*) c FROM app_events e JOIN users u ON u.id = e.user_id
     WHERE ${realUsers} AND e.event = 'signin' AND e.created_at >= ? GROUP BY d ORDER BY d`,
    [isoDaysAgo(14)]);
  const signinsByDay = signinRows.map((r) => ({ day: r.d, n: Number(r.c) }));

  /* active users: any event in the window */
  async function active(days) {
    return c(await get(
      `SELECT COUNT(DISTINCT e.user_id) c FROM app_events e JOIN users u ON u.id = e.user_id
       WHERE ${realUsers} AND e.created_at >= ?`, [isoDaysAgo(days)]));
  }
  const active1 = await active(1);
  const active7 = await active(7);
  const active30 = await active(30);

  /* activation funnel */
  const quizUsers = c(await get(
    `SELECT COUNT(DISTINCT e.user_id) c FROM app_events e JOIN users u ON u.id = e.user_id
     WHERE ${realUsers} AND e.event = 'quiz_completed'`));
  const sessionUsers = c(await get(
    `SELECT COUNT(DISTINCT e.user_id) c FROM app_events e JOIN users u ON u.id = e.user_id
     WHERE ${realUsers} AND e.event = 'session_logged'`));
  const pct = (n) => (totalUsers ? Math.round((n / totalUsers) * 100) : 0);

  /* training volume, last 30 days (from the logs table: full history) */
  const vol = await get(
    `SELECT COUNT(*) c, COALESCE(SUM(l.minutes), 0) mins, COALESCE(SUM(l.distance_mi), 0) mi
     FROM training_logs l JOIN users u ON u.id = l.user_id
     WHERE ${realUsers} AND l.created_at >= ?`, [isoDaysAgo(30)]);
  const sessions30 = Number(vol.c || 0);
  const minutes30 = Math.round(Number(vol.mins || 0));
  const miles30 = Math.round(Number(vol.mi || 0) * 10) / 10;

  const crewsCreated = c(await get(
    `SELECT COUNT(*) c FROM crews cr JOIN users u ON u.id = cr.owner_id WHERE ${realUsers}`));
  const crewHikers = c(await get(
    `SELECT COUNT(DISTINCT m.user_id) c FROM crew_members m JOIN users u ON u.id = m.user_id WHERE ${realUsers}`));
  const packItems = c(await get(
    `SELECT COUNT(*) c FROM pack_items p JOIN users u ON u.id = p.user_id WHERE ${realUsers}`));

  /* tab views, last 30 days */
  const tabRows = await all(
    `SELECT e.meta tab, COUNT(*) c FROM app_events e JOIN users u ON u.id = e.user_id
     WHERE ${realUsers} AND e.event = 'tab_view' AND e.created_at >= ? GROUP BY e.meta ORDER BY c DESC`,
    [isoDaysAgo(30)]);
  const tabViews = tabRows.map((r) => ({ tab: r.tab || 'unknown', n: Number(r.c) }));

  return {
    updated_at: new Date().toISOString(),
    users: { total: totalUsers, new_7d: new7, new_30d: new30 },
    signups_by_day: signupsByDay,
    signins_by_day: signinsByDay,
    active: { d1: active1, d7: active7, d30: active30 },
    funnel: {
      quiz_users: quizUsers, quiz_pct: pct(quizUsers),
      session_users: sessionUsers, session_pct: pct(sessionUsers),
    },
    sessions_30d: { count: sessions30, minutes: minutes30, miles: miles30 },
    crews: { created: crewsCreated, hikers: crewHikers },
    pack_items: packItems,
    tab_views_30d: tabViews,
  };
}

/* Short, LinkedIn ready story lines generated from the numbers. */
function storyLines(m) {
  const lines = [];
  const u = m.users.total;
  if (u >= 5) lines.push(u + ' hikers are now prepping for Havasupai with the app I built in my nights and weekends');
  if (m.users.new_7d >= 2) lines.push(m.users.new_7d + ' new hikers signed up this week');
  if (m.sessions_30d.count >= 5) lines.push('Hikers logged ' + m.sessions_30d.count + ' training sessions (' + m.sessions_30d.miles + ' miles) in the last 30 days');
  if (m.funnel.quiz_pct >= 50 && u >= 5) lines.push(m.funnel.quiz_pct + '% of everyone who signed up finished the readiness quiz');
  if (m.crews.created >= 2) lines.push(m.crews.hikers + ' hikers are coordinating in ' + m.crews.created + ' crews');
  const top = m.tab_views_30d[0];
  if (top && top.n >= 10) lines.push('The ' + top.tab + ' tab is the most opened section of the app');
  return lines.slice(0, 4);
}

/* Compact digest for the weekly ping: headline numbers plus story lines. */
function digestMetrics(m) {
  return {
    updated_at: m.updated_at,
    users_total: m.users.total,
    new_7d: m.users.new_7d,
    active_7d: m.active.d7,
    sessions_30d: m.sessions_30d.count,
    miles_30d: m.sessions_30d.miles,
    quiz_pct: m.funnel.quiz_pct,
    story_lines: storyLines(m),
  };
}

module.exports = { computeMetrics, storyLines, digestMetrics, dayKey };
