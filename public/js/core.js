/* Havasu Prep — core: state, api client, helpers, nav shell, modal, toast */
'use strict';

const S = {
  user: null,
  profile: null,
  tab: 'home',
  cache: {},
};

/* ── helpers ────────────────────────────────────────────── */
const $ = (sel, el) => (el || document).querySelector(sel);
const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = (n) => String(n).padStart(2, '0');
const isoDay = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const todayStr = () => isoDay(new Date());
function fmtDay(ds) {
  if (!ds) return '';
  const d = new Date(ds + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
function fmtShort(ds) {
  if (!ds) return '';
  const d = new Date(ds + 'T12:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : d + 'd ago';
}

/* ── api ────────────────────────────────────────────────── */
async function api(path, opts) {
  const o = opts || {};
  const headers = { 'Content-Type': 'application/json' };
  let r;
  try {
    r = await fetch(path, { method: o.method || 'GET', headers, credentials: 'include', body: o.body ? JSON.stringify(o.body) : undefined });
  } catch (e) {
    throw new Error('Could not reach the server. Is it running?');
  }
  let data = {};
  try { data = await r.json(); } catch (e) { /* empty */ }
  if (r.status === 401) { signOut(true); throw new Error(data.error || 'Session expired'); }
  if (!r.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function signOut(silent) {
  S.user = null; S.profile = null;
  localStorage.removeItem('havasu_token');
  if (!silent) toast('Signed out');
  setTimeout(() => { location.href = '/auth/logout'; }, silent ? 0 : 600);
}

/* ── click sounds (WebAudio tick) ───────────────────────── */
let _ac = null;
function tick() {
  if (!S.profile || !S.profile.click_sounds) return;
  try {
    _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = _ac.currentTime;
    const o = _ac.createOscillator(), g = _ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(2100, t);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(_ac.destination);
    o.start(t); o.stop(t + 0.06);
  } catch (e) { /* audio unavailable */ }
}
document.addEventListener('click', (e) => {
  if (e.target.closest('button, .ci-chip, .quiz-opt, .day-card, .note-card, .tab-item, .rail-item, .mob-mi, .pack-item')) tick();
}, true);

/* ── toast ──────────────────────────────────────────────── */
function toast(msg, ms) {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, ms || 2600);
}

/* ── modal ──────────────────────────────────────────────── */
function openModal(html, wide) {
  closeModal(true);
  const root = $('#modal-root');
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = '<div class="modal"' + (wide ? ' style="max-width:680px"' : '') + '>' + html + '</div>';
  back.addEventListener('click', (e) => { if (e.target === back) closeModal(); });
  root.appendChild(back);
  document.body.style.overflow = 'hidden';
  return back;
}
function closeModal(silent) {
  const root = $('#modal-root');
  root.innerHTML = '';
  document.body.style.overflow = '';
  if (!silent) tick();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeMenu(); } });

/* ── confirm ────────────────────────────────────────────── */
function confirmDlg(title, sub, okLabel, onOk) {
  const m = openModal(
    '<div class="modal-topic">' + esc(title) + '</div>' +
    '<div class="modal-sub">' + esc(sub) + '</div>' +
    '<div class="btn-row"><button class="btn-ghost" id="cf-no">Cancel</button>' +
    '<button class="btn" id="cf-yes">' + esc(okLabel || 'Confirm') + '</button></div>');
  $('#cf-no', m).onclick = () => closeModal();
  $('#cf-yes', m).onclick = () => { closeModal(true); onOk(); };
}

/* ── svg icons ──────────────────────────────────────────── */
const IC = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>',
  route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 9 9l4 7 3-4 5 8z"/><circle cx="18" cy="5" r="2"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2.5-6 4 12L16 12h5"/></svg>',
  pack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 12.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M9 13v4M12 13v4M15 13v4"/></svg>',
  notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
  guide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4"/><path d="M7 8l5-5 5 5"/><path d="M5 12v9h14v-9"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  chevL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6 8.5 12l6 6"/></svg>',
  chevR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 6l6 6-6 6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l1 13h9l1-13"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 3l7 7-3 1-4 4v6l-2 2-2-2v-6L6 11l1-3 7-5z" opacity=".9"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4-4 6-4 11a4 4 0 0 0 8 0c0-2-1-3-1-3s3 1 3 5a6 6 0 0 1-12 0C6 8 12 6 12 2z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h13l-2.5 4L18 12H5"/></svg>',
};
const logoMark = '<svg viewBox="0 0 32 32" fill="none"><path d="M4 25 12 9l5 8 3.5-4.5L28 25z" fill="#0c0c0c"/></svg>';

/* ── navigation ───────────────────────────────────────────── */
const TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'train', label: 'Train', icon: 'activity' },
  { id: 'pack', label: 'Pack', icon: 'pack' },
  { id: 'intel', label: 'Intel', icon: 'flag' },
  { id: 'notes', label: 'Notes', icon: 'notes' },
  { id: 'guide', label: 'Guide', icon: 'guide' },
];
const RENDER = {}; // filled by feature scripts

function go(tab, arg) {
  if (!RENDER[tab]) tab = 'home';
  S.tab = tab;
  $$('#rail .rail-item, #tabbar .tab-item, #menu-pop .mob-mi').forEach((el) => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  closeMenu();
  const panel = $('#panel');
  panel.style.animation = 'none';
  void panel.offsetWidth;
  panel.style.animation = '';
  try {
    const html = RENDER[tab] ? RENDER[tab](arg) : '';
    if (html && typeof html.then === 'function') {
      panel.innerHTML = '<div class="empty">loading…</div>';
      html.then((h) => { panel.innerHTML = h; if (RENDER[tab + '_mount']) RENDER[tab + '_mount'](arg); window.scrollTo(0, 0); })
        .catch((e) => { panel.innerHTML = '<div class="empty"><span class="serif">Something broke.</span>' + esc(e.message) + '</div>'; });
    } else {
      panel.innerHTML = html;
      if (RENDER[tab + '_mount']) RENDER[tab + '_mount'](arg);
      window.scrollTo(0, 0);
    }
  } catch (e) {
    panel.innerHTML = '<div class="empty"><span class="serif">Something broke.</span>' + esc(e.message) + '</div>';
  }
  tick();
}

function buildNav() {
  const first = S.user ? esc(S.user.name.split(' ')[0]) : '';
  $('#rail').innerHTML =
    '<div class="rail-brand">' + logoMark + '</div>' +
    '<div class="rail-name">hey, ' + first + '.</div>' +
    '<div class="rail-sub">havasu prep</div>' +
    '<div class="rail-items">' + TABS.map((t) =>
      '<button class="rail-item' + (S.tab === t.id ? ' active' : '') + '" data-tab="' + t.id + '">' + IC[t.icon] + '<span class="lbl">' + t.label + '</span></button>').join('') + '</div>' +
    '<div class="rail-foot">' +
    '<button class="rail-item" data-act="theme">' + (document.documentElement.dataset.theme === 'light' ? IC.moon : IC.sun) + '<span class="lbl">Toggle theme</span></button>' +
    '<button class="rail-item" data-act="invite">' + IC.share + '<span class="lbl">Invite</span></button>' +
    '<button class="rail-item" data-act="settings">' + IC.gear + '<span class="lbl">Settings</span></button>' +
    '<button class="rail-item" data-act="signout">' + IC.out + '<span class="lbl">Sign out</span></button>' +
    '</div>';
  const prim = ['home', 'train', 'pack', 'intel'];
  $('#tabbar').innerHTML = prim.map((id) => {
    const t = TABS.find((x) => x.id === id);
    return '<button class="tab-item' + (S.tab === id ? ' active' : '') + '" data-tab="' + id + '">' + IC[t.icon] + '<span>' + t.label + '</span></button>';
  }).join('') + '<button class="tab-item" data-act="menu">' + IC.menu + '<span>Menu</span></button>';
  $('#menu-pop .mob-menu').innerHTML =
    TABS.map((t) => '<button class="mob-mi' + (S.tab === t.id ? ' active' : '') + '" data-tab="' + t.id + '">' + IC[t.icon] + t.label + '</button>').join('') +
    '<div class="mob-sep"></div>' +
    '<button class="mob-mi" data-act="invite">' + IC.share + 'Invite friends</button>' +
    '<button class="mob-mi" data-act="settings">' + IC.gear + 'Settings</button>' +
    '<button class="mob-mi" data-act="signout">' + IC.out + 'Sign out</button>';
}

function closeMenu() { const m = $('#menu-pop'); if (m) m.hidden = true; }
function openMenu() { $('#menu-pop').hidden = false; }

document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-tab]');
  if (tab) { go(tab.dataset.tab); return; }
  const act = e.target.closest('[data-act]');
  if (!act) return;
  const a = act.dataset.act;
  if (a === 'menu') { ($('#menu-pop').hidden ? openMenu() : closeMenu()); }
  else if (a === 'theme') { toggleTheme(); }
  else if (a === 'invite') { inviteFriends(); }
  else if (a === 'settings') { go('settings'); }
  else if (a === 'signout') { confirmDlg('Sign out?', 'Your training data stays saved under your Google account.', 'Sign out', () => signOut()); }
});

async function inviteFriends() {
  closeMenu();
  const url = 'https://havasu-prep.vercel.app/';
  const data = { title: 'Havasu Prep', text: 'Training for Havasupai? This app builds the plan, the pack list, and live canyon intel. Join me.', url };
  if (navigator.share) { try { await navigator.share(data); } catch (e) {} return; }
  try { await navigator.clipboard.writeText(url); toast('Invite link copied. Send it to your crew.'); }
  catch (e) { prompt('Copy your invite link:', url); }
}

async function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { await api('/api/me', { method: 'PUT', body: { theme: next } }); S.profile.theme = next; } catch (e) { /* offline */ }
  buildNav();
}

/* ── background canvas ──────────────────────────────────── */
(function bg() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const orbs = [];
  function size() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  size(); addEventListener('resize', size);
  for (let i = 0; i < 5; i++) orbs.push({ x: Math.random(), y: Math.random(), r: .25 + Math.random() * .3, s: .0004 + Math.random() * .0008, o: .05 + Math.random() * .06 });
  (function draw() {
    ctx.clearRect(0, 0, W, H);
    const t = Date.now();
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      const x = (o.x + Math.sin(t * o.s + i * 2) * .06) * W;
      const y = (o.y + Math.cos(t * o.s * 1.3 + i) * .06) * H;
      const r = o.r * Math.min(W, H);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(250,204,21,' + o.o + ')');
      g.addColorStop(1, 'rgba(250,204,21,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    requestAnimationFrame(draw);
  })();
})();

/* ── boot ───────────────────────────────────────────────── */
async function boot() {
  try {
    const d = await api('/api/me');
    S.user = d.user; S.profile = d.profile;
  } catch (e) {
    location.href = '/';
    return;
  }
  document.documentElement.dataset.theme = (S.profile && S.profile.theme) || 'dark';
  $('#loader').style.display = 'none';
  $('#app-root').hidden = false;
  buildNav();
  const needsQuiz = !S.profile || !S.profile.level;
  const stravaQ = new URLSearchParams(location.search).get('strava');
  if (stravaQ) history.replaceState(null, '', location.pathname);
  go(needsQuiz ? 'plan' : (stravaQ === 'connected' ? 'train' : 'home'));
  if (stravaQ === 'connected') setTimeout(() => toast('Strava connected. Your crew card is on the Train tab.'), 600);
  else if (stravaQ === 'denied') setTimeout(() => toast('Strava connection was cancelled.'), 600);
  else if (stravaQ === 'failed') setTimeout(() => toast('Strava connection failed. Try again.'), 600);
  else if (needsQuiz) setTimeout(() => toast('Welcome. Take the quiz to get your plan.'), 600);
}

function refreshMe() {
  return api('/api/me').then((d) => { S.user = d.user; S.profile = d.profile; buildNav(); });
}
