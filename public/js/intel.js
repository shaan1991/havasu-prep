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

/* Reference photos per shot location. Wikimedia Commons (hotlink friendly)
   plus one CC BY SA Flickr image. Credits shown in the lightbox. */
/* Ordered to match the SHOTS array above: one entry per location. */
const SHOT_IMGS = [
 [
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/2008-04-04-hav-eric-9561.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/2008-04-04-hav-eric-9561.jpg?width=1280",
   "cap": "Hikers on the trail at golden hour",
   "credit": "© Robertbody at English Wikipedia · CC BY 3.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/2008-04-22-hav-hua-4987.JPG?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/2008-04-22-hav-hua-4987.JPG?width=1280",
   "cap": "The switchbacks from above",
   "credit": "© Robertbody at English Wikipedia · CC BY 3.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/2014%2C%20Intrepid%20Hikers%20on%20the%20Trail%20-%20panoramio.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/2014%2C%20Intrepid%20Hikers%20on%20the%20Trail%20-%20panoramio.jpg?width=1280",
   "cap": "The long walk in",
   "credit": "© Chris English · CC BY SA 3.0 · Wikimedia Commons"
  }
 ],
 [
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Lower%20rock%20falls.JPG?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Lower%20rock%20falls.JPG?width=1280",
   "cap": "Wide on the cascades",
   "credit": "© Gonzo fan2007 · CC BY SA 3.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Dry%20navajo%20falls.JPG?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Dry%20navajo%20falls.JPG?width=1280",
   "cap": "Travertine detail",
   "credit": "© Gonzo fan2007 · CC BY SA 3.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Navajo%20Falls%20in%20Cataract%20Canyon%2C%20Grand%20Canyon%2C%20Arizona%2C%201900-1940%20%28CHS-3843%29.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Navajo%20Falls%20in%20Cataract%20Canyon%2C%20Grand%20Canyon%2C%20Arizona%2C%201900-1940%20%28CHS-3843%29.jpg?width=1280",
   "cap": "Navajo Falls, circa 1900",
   "credit": "Public domain · Wikimedia Commons"
  }
 ],
 [
  {
   "thumb": "https://live.staticflickr.com/2446/3961693313_6186bccca9_b.jpg",
   "src": "https://live.staticflickr.com/2446/3961693313_6186bccca9_b.jpg",
   "cap": "Fifty Foot Falls up close",
   "credit": "© rwiedower · CC BY SA 2.0 · Flickr"
  }
 ],
 [
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Havasu%20Falls%2C%20Grand%20Canyon.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Havasu%20Falls%2C%20Grand%20Canyon.jpg?width=1280",
   "cap": "The classic view from above",
   "credit": "© Traveling Man · CC BY SA 3.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Havasu%20Falls%201%20md%20edit.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Havasu%20Falls%201%20md%20edit.jpg?width=1280",
   "cap": "Frontal with the pools below",
   "credit": "© User:Moondigger · CC BY SA 2.5 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Havasu%20Falls%20Paradise.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Havasu%20Falls%20Paradise.jpg?width=1280",
   "cap": "Turquoise water in midday sun",
   "credit": "© Brent Sisson · CC BY SA 4.0 · Wikimedia Commons"
  }
 ],
 [
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/01470%201948%20Grand%20Canyon%20Historic%20Trout%20Stocking%20Trip%20-%20Havasu%20Creek%20%286904870479%29.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/01470%201948%20Grand%20Canyon%20Historic%20Trout%20Stocking%20Trip%20-%20Havasu%20Creek%20%286904870479%29.jpg?width=1280",
   "cap": "Silky water over travertine",
   "credit": "© Grand Canyon National Park · CC BY 2.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/05196%20Grand%20Canyon%20Nat%20Park%20Historic%20River%20Photo%20%287305034038%29.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/05196%20Grand%20Canyon%20Nat%20Park%20Historic%20River%20Photo%20%287305034038%29.jpg?width=1280",
   "cap": "Pools between the falls",
   "credit": "© Grand Canyon National Park · CC BY 2.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/01928%20Grand%20Canyon%20Historic%20Havasu%20Creek%201949%20%286904877181%29.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/01928%20Grand%20Canyon%20Historic%20Havasu%20Creek%201949%20%286904877181%29.jpg?width=1280",
   "cap": "Cascade detail in the creek",
   "credit": "© Grand Canyon National Park · CC BY 2.0 · Wikimedia Commons"
  }
 ],
 [
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Mooney%20Falls%2C%20Arizona%2C%202006.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Mooney%20Falls%2C%20Arizona%2C%202006.jpg?width=1280",
   "cap": "From the base, looking up",
   "credit": "Public domain · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Mooney%20Falls.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Mooney%20Falls.jpg?width=1280",
   "cap": "The full drop, with scale",
   "credit": "© Riffy Thomas · CC BY SA 4.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Mooney%20Falls%2C%20Havasu%20Canyon%2C%20Arizona%2C%20ca.1930%20%28CHS-4680%29.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Mooney%20Falls%2C%20Havasu%20Canyon%2C%20Arizona%2C%20ca.1930%20%28CHS-4680%29.jpg?width=1280",
   "cap": "Mooney Falls, circa 1930",
   "credit": "Public domain · Wikimedia Commons"
  }
 ],
 [
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Beaver%20falls.JPG?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Beaver%20falls.JPG?width=1280",
   "cap": "The terraced cascades",
   "credit": "© Gonzo fan2007 · CC BY SA 3.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Rope%20Climb%20Beaver%20Falls.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Rope%20Climb%20Beaver%20Falls.jpg?width=1280",
   "cap": "The rope climb section",
   "credit": "Public domain · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Grca%2031880%20-%20Havasupai%20-%20Circa%201900%20%286704208915%29.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Grca%2031880%20-%20Havasupai%20-%20Circa%201900%20%286704208915%29.jpg?width=1280",
   "cap": "Beaver Falls, circa 1900",
   "credit": "© Grand Canyon National Park · CC BY 2.0 · Wikimedia Commons"
  }
 ],
 [
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Grand%20Canyon%20Mouth%20of%20Havasu%20Creek%200193%20%286094535727%29.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Grand%20Canyon%20Mouth%20of%20Havasu%20Creek%200193%20%286094535727%29.jpg?width=1280",
   "cap": "Blue green meets the Colorado",
   "credit": "© Grand Canyon National Park · CC BY 2.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Grand%20Canyon%20Mouth%20of%20Havasu%20Creek%200184%20%286095079826%29.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Grand%20Canyon%20Mouth%20of%20Havasu%20Creek%200184%20%286095079826%29.jpg?width=1280",
   "cap": "Rafts at the meeting point",
   "credit": "© Grand Canyon National Park · CC BY 2.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/The%20confluence%20of%20Havasu%20Creek%20and%20the%20Colorado%20River.%20Grand%20Canyon%20National%20Park%2C%20Arizona%20%2826357567356%29.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/The%20confluence%20of%20Havasu%20Creek%20and%20the%20Colorado%20River.%20Grand%20Canyon%20National%20Park%2C%20Arizona%20%2826357567356%29.jpg?width=1280",
   "cap": "Where the creek meets the river",
   "credit": "© Paxson Woelber · CC BY 2.0 · Wikimedia Commons"
  }
 ],
 [
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/SupaiVillageFirstSignWigleeva.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SupaiVillageFirstSignWigleeva.jpg?width=1280",
   "cap": "The village welcome sign",
   "credit": "© Elf · CC BY SA 3.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Helicopter%20in%20Supai%20Village%20-%20panoramio.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Helicopter%20in%20Supai%20Village%20-%20panoramio.jpg?width=1280",
   "cap": "Helicopter pad below the cliffs",
   "credit": "© Outdoor Craziness · CC BY SA 3.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/01925%20Grand%20Canyon%20Historic%20Supai%20Village%20Irragation%20Ditch%201949%20%286904876421%29.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/01925%20Grand%20Canyon%20Historic%20Supai%20Village%20Irragation%20Ditch%201949%20%286904876421%29.jpg?width=1280",
   "cap": "Supai Village, 1949",
   "credit": "© Grand Canyon National Park · CC BY 2.0 · Wikimedia Commons"
  }
 ],
 [
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Havasu%20Falls%20at%20Night.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Havasu%20Falls%20at%20Night.jpg?width=1280",
   "cap": "Havasu Falls under the stars",
   "credit": "© Jeremy Evans · CC BY SA 2.0 · Wikimedia Commons"
  },
  {
   "thumb": "https://commons.wikimedia.org/wiki/Special:FilePath/Havasupai%20at%20Night%20%28Unsplash%29.jpg?width=480",
   "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Havasupai%20at%20Night%20%28Unsplash%29.jpg?width=1280",
   "cap": "Mooney Falls at night",
   "credit": "© Jeremy Bishop tidesinourveins · CC0 · Wikimedia Commons"
  }
 ]
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
    '<div class="col-body' + (open === true ? ' open' : '') + '">' + bodyHtml + '</div></div>';
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
  const contactsWidget = contactsHtml
    ? contactsHtml + '<div class="t2" style="margin-top:10px">Numbers verified against official sources in September 2026. In a true emergency on the trail, call 911 first if you have any signal at all.</div>'
    : '<div class="empty" style="padding:16px">Contacts are in the Guide tab.</div>';

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

  function shotPins() {
    try { return JSON.parse(localStorage.getItem('havasu_shotpins') || '{}'); }
    catch (e) { return {}; }
  }
  const pins = shotPins();
  const shotsHtml = SHOTS.map((s, si) => {
    const imgs = SHOT_IMGS[si] || [];
    const strip = imgs.length === 0 ? '' :
      '<div class="shot-label">Reference photos</div><div class="shot-strip">' +
      imgs.map((im, ii) =>
        '<button class="shot-thumb' + (pins[si] === ii ? ' pinned' : '') + '" data-shotcard="' + si + '" data-shotimg="' + ii + '"' +
        ' aria-label="View reference photo: ' + esc(im.cap) + '">' +
        '<img loading="lazy" src="' + esc(im.thumb) + '" alt="' + esc(im.cap) + '">' +
        (pins[si] === ii ? '<span class="shot-pinbadge">Pinned</span>' : '') + '</button>').join('') + '</div>';
    return '<div class="card shot-card"><div class="card-h"><span class="card-t">' + esc(s.name) + '</span></div>' +
      '<div class="shot-meta">' + esc(s.meta) + '</div>' + strip +
      '<ul class="shot-list">' + s.shots.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
      '<div class="shot-tip">' + esc(s.tip) + '</div></div>';
  }).join('');

  return '<div class="pg-hd"><div class="pg-eyebrow">Intel</div>' +
    '<div class="pg-title">Canyon conditions, live.</div>' +
    '<div class="pg-sub">Weather, alerts, and news for Supai, refreshed every 20 minutes.</div>' +
    '<div class="intel-bar"><span class="t2">Updated ' + esc(timeAgo(d.updated_at)) + '</span>' +
    '<button class="btn-ghost btn-sm" id="intel-refresh" style="width:auto">Refresh</button></div></div>' +

    colSection('wx', 'Now in Supai', '7 day', wxHtml) +
    colSection('go', 'Getting there', 'maps', locHtml) +
    colSection('ct', 'Key contacts', 'tap to call', contactsWidget) +
    colSection('al', 'Alerts', 'NWS' + (alerts.length ? ' · ' + alerts.length : ''), alertsHtml) +
    colSection('nw', 'Havasupai in the news', null, newsHtml) +

    '<div class="pg-hd" style="margin-top:26px"><div class="pg-eyebrow">Shot list</div>' +
    '<div class="pg-title" style="font-size:26px">Film it like you mean it.</div>' +
    '<div class="pg-sub">Location by location ideas with reference photos. Tap any photo to view it large, pin the ones you want to chase.</div></div>' +
    colSection('sh', 'Shot list', SHOTS.length + ' locations', '<div class="stagger">' + shotsHtml + '</div>') +
    '<div class="shotbox" id="shotbox" hidden><div class="shotbox-back" id="shotbox-back"></div>' +
    '<div class="shotbox-main"><button class="shotbox-x" id="shotbox-x" aria-label="Close">\u00d7</button>' +
    '<button class="shotbox-nav prev" id="shotbox-prev" aria-label="Previous photo">\u2039</button>' +
    '<img id="shotbox-img" alt="">' +
    '<button class="shotbox-nav next" id="shotbox-next" aria-label="Next photo">\u203a</button></div>' +
    '<div class="shotbox-cap"><div class="t1" id="shotbox-cap"></div>' +
    '<div class="t2" id="shotbox-credit"></div>' +
    '<button class="btn btn-sm" id="shotbox-pin" style="width:auto;margin-top:10px">Pin as my reference</button></div></div>';
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

  /* Shot list lightbox */
  const box = $('#shotbox');
  if (box) {
    let bCard = 0, bIdx = 0;
    const pins = (() => { try { return JSON.parse(localStorage.getItem('havasu_shotpins') || '{}'); } catch (e) { return {}; } })();
    const savePins = () => { try { localStorage.setItem('havasu_shotpins', JSON.stringify(pins)); } catch (e) {} };
    function show() {
      const imgs = SHOT_IMGS[bCard] || [];
      if (!imgs.length) return;
      bIdx = (bIdx + imgs.length) % imgs.length;
      const im = imgs[bIdx];
      const img = $('#shotbox-img');
      img.src = im.src; img.alt = im.cap;
      $('#shotbox-cap').textContent = SHOTS[bCard].name + ': ' + im.cap;
      $('#shotbox-credit').textContent = im.credit;
      const pinBtn = $('#shotbox-pin');
      const isPinned = pins[bCard] === bIdx;
      pinBtn.textContent = isPinned ? 'Pinned as my reference' : 'Pin as my reference';
      pinBtn.classList.toggle('pinned-on', isPinned);
      const single = imgs.length < 2;
      $('#shotbox-prev').style.display = single ? 'none' : '';
      $('#shotbox-next').style.display = single ? 'none' : '';
    }
    function openBox(card, idx) { bCard = card; bIdx = idx; box.hidden = false; document.body.style.overflow = 'hidden'; show(); }
    function closeBox() { box.hidden = true; document.body.style.overflow = ''; }
    $$('.shot-thumb').forEach((t) => { t.onclick = () => openBox(+t.dataset.shotcard, +t.dataset.shotimg); });
    $('#shotbox-x').onclick = closeBox;
    $('#shotbox-back').onclick = closeBox;
    $('#shotbox-prev').onclick = (e) => { e.stopPropagation(); bIdx--; show(); };
    $('#shotbox-next').onclick = (e) => { e.stopPropagation(); bIdx++; show(); };
    $('#shotbox-pin').onclick = () => {
      if (pins[bCard] === bIdx) delete pins[bCard]; else pins[bCard] = bIdx;
      savePins(); show();
      $$('.shot-thumb').forEach((t) => {
        const on = pins[+t.dataset.shotcard] === +t.dataset.shotimg;
        t.classList.toggle('pinned', on);
        const badge = t.querySelector('.shot-pinbadge');
        if (on && !badge) { const sp = document.createElement('span'); sp.className = 'shot-pinbadge'; sp.textContent = 'Pinned'; t.appendChild(sp); }
        if (!on && badge) badge.remove();
      });
    };
    if (!window.__shotboxKeys) {
      window.__shotboxKeys = true;
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const b = document.getElementById('shotbox');
        if (b && !b.hidden) { b.hidden = true; document.body.style.overflow = ''; }
      });
    }
  }
};
