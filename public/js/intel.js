/* Havasu Prep — Intel: live canyon conditions, alerts, news, shot list */
'use strict';

/* Shot list: curated per location. Heights and distances verified against
   published trail guides (Sep 2026). No height claimed where unverified. */
const SHOTS = [
  {
    name: 'Hualapai Hilltop switchbacks', meta: 'Mile 0 · the way in',
    shots: ['The headlamp line at dawn, hikers winding down the switchbacks', 'First light hitting the canyon walls from the trail'],
    tip: 'Start before sunrise. The early miles are the story of the descent.',
  },
  {
    name: 'Navajo Falls', meta: 'Past Supai village · first falls on the trail',
    shots: ['Wide shot with the creek leading the eye to the falls', 'Slow shutter on the cascades from the bank'],
    tip: 'Smaller and quieter than Havasu. A good warm up stop on the way in.',
  },
  {
    name: 'Fifty Foot Falls', meta: 'Short detour near Navajo Falls',
    shots: ['Intimate cascade details through the cottonwoods', 'Pools at the base with the cliffs behind'],
    tip: 'Easy to walk past. Worth the short detour for variety in your reel.',
  },
  {
    name: 'Havasu Falls', meta: 'About 100 ft · the icon',
    shots: ['The classic frontal from the viewpoint above the falls', 'Travertine pools at the base as foreground', 'Slow shutter for silky water, with a person in frame for scale'],
    tip: 'Midday sun brings out the turquoise. Mornings are quieter with softer light.',
  },
  {
    name: 'Travertine pools', meta: 'Between Havasu and Mooney Falls',
    shots: ['Turquoise pools with cottonwood reflections', 'Wading shots, camera low near the water'],
    tip: 'The color is strongest when the sun is high. Keep a dry bag on you.',
  },
  {
    name: 'Mooney Falls', meta: 'About 200 ft · the tallest of the Havasupai falls',
    shots: ['From the base looking up through the mist', 'The descent itself: tunnels, chains, ladders, gloves on', 'Rainbow in the spray on a sunny afternoon'],
    tip: 'Mist makes the rock slick and soaks gear. Protect the camera and watch your footing.',
  },
  {
    name: 'Beaver Falls', meta: 'About 3 miles below Mooney · creek crossings to get there',
    shots: ['The cascades with palm trees in frame', 'Wading the creek crossings, shot from the bank', 'Picnic tables area for a rest beat in the story'],
    tip: 'Knee deep crossings each way. Water shoes and a dry bag are not optional.',
  },
  {
    name: 'The Confluence', meta: 'Where Havasu Creek meets the Colorado · full day push',
    shots: ['The color contrast where blue green water meets the river', 'The canyon walls closing in on the final stretch'],
    tip: 'About 8 miles from camp one way. Start early and carry more water than you think.',
  },
  {
    name: 'Supai Village', meta: 'Tribal land · respect first',
    shots: ['Village scenes without people, or only with clear permission', 'The storefronts and canyon walls framing daily life'],
    tip: 'Ask before photographing anyone. No drones anywhere on the reservation.',
  },
  {
    name: 'Night sky', meta: 'Minimal light pollution',
    shots: ['Milky Way over the falls on a tripod', 'Tent glowing from inside with the canyon walls behind'],
    tip: 'New moon weeks are best. A small tripod earns its weight here.',
  },
];

/* Key locations: one tap directions. Queries are place names, no coordinates
   are fabricated; the map apps resolve them. */
const LOCATIONS = [
  { name: 'Permit check-in', desc: 'Grand Canyon Caverns Inn · Route 66, Peach Springs', q: 'Grand Canyon Caverns Inn, Peach Springs, AZ' },
  { name: 'Trailhead & parking', desc: 'Hualapai Hilltop · end of Indian Road 18', q: 'Hualapai Hilltop Trailhead, Arizona' },
  { name: 'Supai Village', desc: 'Tourist office · 8 miles from the trailhead', q: 'Supai, Arizona' },
  { name: 'Havasu Falls', desc: '2 miles past the village', q: 'Havasu Falls, Arizona' },
  { name: 'Havasupai Campground', desc: 'Between Havasu Falls and Mooney Falls', q: 'Havasupai Campground, Arizona' },
];
const KEY_CONTACT_NAMES = ['Grand Canyon Caverns Inn', 'Havasupai Tourist Office', 'Campground Rangers Office', 'Coconino County Sheriff', 'Kingman Regional Medical Center', 'Poison Control'];

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return 'just now';
  const m = Math.round(s / 60);
  if (m < 90) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 48) return h + ' hr ago';
  return Math.round(h / 24) + ' days ago';
}
function wxDayName(iso) {
  try { return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' }); }
  catch (e) { return ''; }
}
function alertColor(sev) {
  sev = String(sev || '').toLowerCase();
  if (sev === 'extreme' || sev === 'severe') return 'var(--sc-bad)';
  if (sev === 'moderate') return 'var(--sc-mid)';
  return 'var(--m)';
}
function fmtAlertDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  catch (e) { return ''; }
}
function colSection(id, title, meta, bodyHtml, open) {
  return '<div class="card col-card"><button class="col-head" data-col="' + id + '">' +
    '<span class="card-t">' + esc(title) + '</span>' +
    '<span class="col-right">' + (meta ? '<span class="card-t dim">' + esc(meta) + '</span>' : '') +
    '<span class="col-chev">▾</span></span></button>' +
    '<div class="col-body' + (open === false ? '' : ' open') + '">' + bodyHtml + '</div></div>';
}

RENDER.intel = async function () {
  let d;
  try { d = await api('/api/intel'); }
  catch (e) {
    return '<div class="pg-hd"><div class="pg-eyebrow">Intel</div><div class="pg-title">Canyon conditions.</div></div>' +
      '<div class="card"><div class="empty"><span class="serif">The canyon is out of reach.</span>Could not load live conditions.<br><br><button class="btn btn-sm" id="intel-retry" style="width:auto">Try again</button></div></div>';
  }

  const w = d.weather;
  const wxHtml = !w || d.errors.weather
    ? '<div class="empty" style="padding:16px">Weather feed is unreachable right now.</div>'
    : '<div class="wx-now"><div><div class="stat-big">' + esc(String(w.temp)) + '°</div>' +
      '<div class="count-cap">' + esc(w.label) + ' · Supai, AZ</div></div>' +
      '<div class="wx-meta"><div>' + esc(String(w.humidity)) + '% humidity</div><div>' + esc(String(w.wind_mph)) + ' mph wind</div></div></div>' +
      '<div class="wx-days">' + w.days.map((x) =>
        '<div class="wx-day"><div class="wx-d">' + esc(wxDayName(x.date)) + '</div>' +
        '<div class="wx-t">' + esc(String(x.hi)) + '°<span>' + esc(String(x.lo)) + '°</span></div>' +
        '<div class="wx-p">' + esc(String(x.precip)) + '%</div></div>').join('') + '</div>';

  const locHtml = LOCATIONS.map((l) => {
    const g = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(l.q);
    const a = 'https://maps.apple.com/?q=' + encodeURIComponent(l.q);
    return '<div class="loc-row"><div class="grow"><div class="t1">' + esc(l.name) + '</div>' +
      '<div class="t2">' + esc(l.desc) + '</div></div>' +
      '<div class="map-btns"><a class="map-btn" href="' + g + '" target="_blank" rel="noopener">Google Maps</a>' +
      '<a class="map-btn" href="' + a + '" target="_blank" rel="noopener">Apple Maps</a></div></div>';
  }).join('');
  const keyContacts = (typeof CONTACTS !== 'undefined' ? KEY_CONTACT_NAMES.map((n) => CONTACTS.find((c) => c.name === n)).filter(Boolean) : []);
  const contactsHtml = keyContacts.map((c) =>
    '<div class="contact-card"><div class="grow"><div class="t1">' + esc(c.name) + '</div>' +
    '<div class="t2">' + esc(c.sub) + '</div></div>' +
    '<a class="num" href="tel:' + c.tel + '">' + esc(c.num) + '</a></div>').join('');
  const gettingHtml = locHtml +
    (contactsHtml ? '<div class="key-sub">Key contacts</div>' + contactsHtml +
      '<div class="t2" style="margin-top:10px">Numbers verified against official sources in September 2026. In a true emergency on the trail, call 911 first if you have any signal at all.</div>' : '');

  const alerts = d.alerts || [];
  const alertsHtml = d.errors.alerts
    ? '<div class="empty" style="padding:16px">Alert feed is unreachable right now.</div>'
    : alerts.length === 0
      ? '<div class="intel-calm"><span class="serif">All quiet.</span>No active weather alerts for the Supai area on official channels.</div>'
      : alerts.map((a) =>
        '<div class="alert-row"><span class="alert-pill" style="background:' + alertColor(a.severity) + '">' + esc(a.severity) + '</span>' +
        '<div class="grow"><div class="t1">' + esc(a.event) + '</div>' +
        (a.headline ? '<div class="t2">' + esc(a.headline) + '</div>' : '') +
        '<div class="t2">' + esc(a.areas || '') + (a.expires ? ' · until ' + esc(fmtAlertDate(a.expires)) : '') + '</div></div></div>').join('');

  const news = d.news || [];
  const newsHtml = d.errors.news
    ? '<div class="empty" style="padding:16px">News feed is unreachable right now.</div>'
    : news.length === 0
      ? '<div class="intel-calm"><span class="serif">Quiet cycle.</span>Nothing new in the latest check. Havasupai is a small place; quiet weeks are normal.</div>'
      : news.map((n) =>
        '<a class="news-row" href="' + esc(n.link) + '" target="_blank" rel="noopener"><div class="grow">' +
        '<div class="t1">' + esc(n.title) + '</div>' +
        '<div class="t2">' + esc(n.source || 'News') + (n.published ? ' · ' + esc(timeAgo(n.published)) : '') + '</div></div>' +
        '<span class="news-go">↗</span></a>').join('');

  const shotsHtml = SHOTS.map((s) =>
    '<div class="card shot-card"><div class="card-h"><span class="card-t">' + esc(s.name) + '</span></div>' +
    '<div class="shot-meta">' + esc(s.meta) + '</div>' +
    '<ul class="shot-list">' + s.shots.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
    '<div class="shot-tip">' + esc(s.tip) + '</div></div>').join('');

  return '<div class="pg-hd"><div class="pg-eyebrow">Intel</div>' +
    '<div class="pg-title">Canyon conditions, live.</div>' +
    '<div class="pg-sub">Weather, alerts, and news for Supai, refreshed every 20 minutes.</div>' +
    '<div class="intel-bar"><span class="t2">Updated ' + esc(timeAgo(d.updated_at)) + '</span>' +
    '<button class="btn-ghost btn-sm" id="intel-refresh" style="width:auto">Refresh</button></div></div>' +

    colSection('wx', 'Now in Supai', '7 day', wxHtml) +
    colSection('go', 'Getting there', 'maps & contacts', gettingHtml) +
    colSection('al', 'Alerts', 'NWS' + (alerts.length ? ' · ' + alerts.length : ''), alertsHtml) +
    colSection('nw', 'Havasupai in the news', null, newsHtml) +

    '<div class="pg-hd" style="margin-top:26px"><div class="pg-eyebrow">Shot list</div>' +
    '<div class="pg-title" style="font-size:26px">Film it like you mean it.</div>' +
    '<div class="pg-sub">Location by location ideas, built for the canyon as it is.</div></div>' +
    colSection('sh', 'Shot list', SHOTS.length + ' locations', '<div class="stagger">' + shotsHtml + '</div>');
};

RENDER.intel_mount = function () {
  const rf = $('#intel-refresh');
  if (rf) rf.onclick = async () => {
    rf.disabled = true; rf.textContent = 'Refreshing…';
    try { await api('/api/intel?fresh=1'); } catch (e) { /* cached render still shows */ }
    go('intel');
  };
  const rt = $('#intel-retry');
  if (rt) rt.onclick = () => go('intel');
  $$('.col-head').forEach((h) => h.onclick = () => {
    const body = h.nextElementSibling;
    const open = body.classList.toggle('open');
    h.classList.toggle('closed', !open);
  });
};
