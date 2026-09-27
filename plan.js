/* Havasu Prep — training plan engine, quiz scoring, base packing list */
'use strict';

/* ── fitness levels ─────────────────────────────────────── */
const LEVELS = {
  newcomer: {
    id: 'newcomer',
    name: 'Canyon Newcomer',
    tag: 'Building your base from the ground up',
    blurb: 'You are starting fresh or coming back after a long break. This plan builds walking fitness first, then layers in loaded hikes so the canyon feels familiar before you ever see it.',
    longStart: 4, longPeak: 10, walkStart: 2, walkPeak: 5, strengthDays: 1,
  },
  tested: {
    id: 'tested',
    name: 'Trail Tested',
    tag: 'Turning regular activity into trail strength',
    blurb: 'You move most weeks already. This plan converts that base into hiking specific strength: longer weekend hikes with a pack, hill repeats, and joint friendly strength work.',
    longStart: 6, longPeak: 13, walkStart: 3, walkPeak: 6, strengthDays: 2,
  },
  ready: {
    id: 'ready',
    name: 'Desert Ready',
    tag: 'Sharpening an already strong engine',
    blurb: 'You train hard already. This plan keeps your engine and tunes it for the canyon: heavy pack miles, steep descents, heat prep, and a proper taper so you arrive fresh.',
    longStart: 8, longPeak: 16, walkStart: 4, walkPeak: 8, strengthDays: 2,
  },
};

const KINDS = {
  rest:    { label: 'Rest',     detail: 'Full rest. Sleep, hydrate, eat well. Recovery is training.' },
  walk:    { label: 'Walk',     detail: 'Brisk walk on flat ground or treadmill. Conversational pace.' },
  hike:    { label: 'Hike',     detail: 'Trail hike with hills if you can find them. Wear your trail shoes.' },
  long:    { label: 'Long hike',detail: 'The key session of the week. Carry your pack with real weight.' },
  strength:{ label: 'Strength', detail: 'Legs and core focus: squats, lunges, step ups, planks, calf raises.' },
  easy:    { label: 'Easy move',detail: 'Gentle walk, stretch, or yoga. Keep the legs loose.' },
  stairs:  { label: 'Stairs',   detail: 'Stair repeats or a tall building. The canyon climbs out, not in.' },
};

/* interpolate a value across weeks, with the final week as a taper */
function ramp(start, peak, week, weeks) {
  if (weeks <= 1) return peak;
  if (week >= weeks) return Math.round(peak * 0.55 * 10) / 10; // taper week
  const t = (week - 1) / (weeks - 2 || 1);
  return Math.round((start + (peak - start) * Math.min(1, Math.max(0, t))) * 10) / 10;
}

function buildPlan(levelId, weeks) {
  const L = LEVELS[levelId] || LEVELS.newcomer;
  weeks = Math.max(2, Math.min(12, weeks || 6));
  const out = [];
  for (let w = 1; w <= weeks; w++) {
    const longMi = ramp(L.longStart, L.longPeak, w, weeks);
    const walkMi = ramp(L.walkStart, L.walkPeak, w, weeks);
    const packWt = w === 1 ? 'empty pack' : w < 4 ? '10 to 15 lb in your pack' : w === weeks ? 'light daypack' : '20 to 30 lb in your pack';
    const taper = w === weeks;
    const days = [
      { day: 'Mon', kind: 'rest', title: 'Rest day', detail: KINDS.rest.detail, target_mi: 0, target_min: 0 },
      { day: 'Tue', kind: 'walk', title: 'Brisk walk', detail: KINDS.walk.detail, target_mi: walkMi, target_min: Math.round(walkMi * 20) },
      { day: 'Wed', kind: 'strength', title: 'Strength session', detail: KINDS.strength.detail + (taper ? ' Keep it light this week.' : ''), target_mi: 0, target_min: taper ? 20 : 35 },
      { day: 'Thu', kind: levelId === 'newcomer' ? 'walk' : 'hike', title: levelId === 'newcomer' ? 'Brisk walk' : 'Trail hike', detail: (levelId === 'newcomer' ? KINDS.walk : KINDS.hike).detail, target_mi: Math.round(walkMi * 0.8 * 10) / 10, target_min: Math.round(walkMi * 0.8 * 20) },
      { day: 'Fri', kind: 'rest', title: 'Rest day', detail: 'Save your legs for tomorrow.', target_mi: 0, target_min: 0 },
      { day: 'Sat', kind: 'long', title: taper ? 'Shakeout hike' : 'Long hike', detail: taper ? 'Easy shakeout only. You are ready, trust the work.' : KINDS.long.detail + ' Target ' + longMi + ' miles with ' + packWt + '.', target_mi: longMi, target_min: Math.round(longMi * 25) },
      { day: 'Sun', kind: 'easy', title: 'Easy movement', detail: KINDS.easy.detail, target_mi: Math.round(walkMi * 0.5 * 10) / 10, target_min: 30 },
    ];
    if (levelId !== 'newcomer' && L.strengthDays === 2 && !taper) {
      days[0] = { day: 'Mon', kind: 'stairs', title: 'Stair repeats', detail: KINDS.stairs.detail, target_mi: 0, target_min: 30 };
    }
    out.push({ week: w, total: weeks, taper, days });
  }
  return { level: L, weeks: out };
}

/* ── quiz scoring ───────────────────────────────────────── */
function scoreQuiz(a) {
  const q1 = +a.q1 || 0, q2 = +a.q2 || 0, q3 = +a.q3 || 0, q4 = +a.q4 || 0;
  const score = q1 * 2 + q2 + q3 * 2 + q4 * 2; // max 25
  const level = score <= 8 ? 'newcomer' : score <= 16 ? 'tested' : 'ready';
  return { score, level };
}

function weeksUntil(tripDate) {
  if (!tripDate) return null;
  const ms = new Date(tripDate + 'T12:00:00').getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000 / 7));
}

const INJURY_NOTES = {
  knees: 'Easy on the knees: take descents slow, use trekking poles, and keep step ups shallow.',
  back: 'Mind the back: keep pack weight modest early, hinge at the hips on strength days.',
  feet: 'Mind the feet and ankles: break in trail shoes now, tape hot spots early, single track over pavement.',
  other: 'Work around your limit: swap any session that aggravates it for an easy walk and see a physio if pain persists.',
};

/* ── base packing list (seeded per user, fully editable) ── */
const PACK_TEMPLATE = [
  { category: 'Permits and documents', items: [
    ['Printed permit confirmation', '1 copy'],
    ['Photo ID', '1, needed at check in'],
    ['License plate number', 'written down, needed for parking pass'],
    ['Wristband pickup details', 'saved in notes'],
    ['Emergency contacts card', '1'],
    ['Cash and card', 'for the village store'],
  ]},
  { category: 'Water', items: [
    ['Hydration reservoir or bottles', '3 L capacity'],
    ['Water filter', '1'],
    ['Purification tablets (backup)', '1 pack'],
    ['Electrolyte mix', 'for 4 days'],
    ['Collapsible camp water container', '2 L or more'],
  ]},
  { category: 'Camp', items: [
    ['Tent with rainfly and footprint', '1'],
    ['Sleeping bag (20F or warmer)', '1'],
    ['Sleeping pad', '1'],
    ['Pillow or stuff sack pillow', '1'],
    ['Headlamp plus spare batteries', '1'],
    ['Rat proof food bag or hang kit', '1, rats are the real bears here'],
    ['Tent repair kit', 'patches and spare cord, 1 small'],
  ]},
  { category: 'Food and cooking', items: [
    ['Backpacking stove', '1'],
    ['Fuel canister', '1, check the level before you leave'],
    ['Lighter plus backup', '2'],
    ['Cook pot', '1'],
    ['Long handled spoon', '1'],
    ['Mug or cup', '1'],
    ['Breakfasts', '4'],
    ['Dinners', '3'],
    ['Trail lunches and snacks', '4 days'],
    ['Coffee or tea', '4 servings'],
    ['Salt and spice kit', '1 small'],
    ['Trash bags (pack it all out)', '3'],
  ]},
  { category: 'Clothing', items: [
    ['Broken in hiking shoes', '1 pair'],
    ['Camp sandals or water shoes', '1 pair'],
    ['Merino hiking socks', '3 pairs'],
    ['Underwear', '3 to 4'],
    ['Hiking pants or shorts', '2'],
    ['Base layer top', '1'],
    ['Warm mid layer or puffy', '1'],
    ['Rain shell', '1'],
    ['Sleep clothes', '1 set'],
    ['Swimsuit', '1'],
    ['Sun hat', '1'],
    ['Warm beanie', '1, desert nights get cold'],
    ['Sunglasses', '1'],
  ]},
  { category: 'Safety and health', items: [
    ['First aid kit', '1'],
    ['Blister kit (moleskin and tape)', '1'],
    ['Sunscreen', '1'],
    ['Lip balm with SPF', '1'],
    ['Bug spray', '1'],
    ['Trekking poles', '1 pair'],
    ['Whistle', '1'],
    ['Knife or multitool', '1'],
    ['Duct tape', '1 small roll'],
    ['Offline maps downloaded', 'on your phone'],
    ['Any personal medication', 'full trip supply'],
  ]},
  { category: 'Hygiene', items: [
    ['Toilet paper in a zip bag', '1 roll'],
    ['Hand sanitizer', '1'],
    ['Biodegradable soap', '1 small'],
    ['Toothbrush and paste', '1'],
    ['Quick dry towel', '1'],
    ['Wet wipes', '1 pack'],
    ['Trowel', '1'],
  ]},
  { category: 'Extras', items: [
    ['Dry bags', '2'],
    ['Power bank and cables', '1'],
    ['Camera', 'optional'],
    ['Daypack for the falls', '1'],
    ['Earplugs', '1 pair'],
    ['Book or cards', '1'],
    ['Sit pad', '1'],
  ]},
];

module.exports = { LEVELS, KINDS, buildPlan, scoreQuiz, weeksUntil, INJURY_NOTES, PACK_TEMPLATE };
