/* Havasu Prep — My Plan: activity quiz + plan overview */
'use strict';

const QUIZ = [
  {
    key: 'q1', q: 'How active are you right now?',
    sub: 'Be honest. The plan only works if it starts where you are.',
    type: 'chips',
    opts: [
      { v: 0, t: 'Mostly sedentary' },
      { v: 1, t: 'Lightly active' },
      { v: 2, t: 'Active most weeks' },
      { v: 3, t: 'Very active' },
    ],
  },
  {
    key: 'q2', q: 'How many days per week do you exercise?',
    sub: 'Anything that gets your heart rate up counts.',
    type: 'stepper', min: 0, max: 7,
  },
  {
    key: 'q3', q: 'Longest hike in the last 3 months?',
    sub: 'With or without a pack, just the distance.',
    type: 'chips',
    opts: [
      { v: 0, t: 'Under 3 miles' },
      { v: 1, t: '3 to 6 miles' },
      { v: 2, t: '6 to 10 miles' },
      { v: 3, t: 'Over 10 miles' },
    ],
  },
  {
    key: 'q4', q: 'Could you walk 5 miles today?',
    sub: 'Flat ground, comfortable shoes, no heroics.',
    type: 'chips',
    opts: [
      { v: 0, t: 'Not yet' },
      { v: 1, t: 'Probably, slowly' },
      { v: 2, t: 'Yes, tired after' },
      { v: 3, t: 'Yes, easily' },
    ],
  },
  {
    key: 'q5', q: 'Any injuries or limits to respect?',
    sub: 'The plan will note it and go easier where it matters.',
    type: 'chips',
    opts: [
      { v: 'none', t: 'None' },
      { v: 'knees', t: 'Knees' },
      { v: 'back', t: 'Back' },
      { v: 'feet', t: 'Feet or ankles' },
      { v: 'other', t: 'Something else' },
    ],
  },
  {
    key: 'trip_date', q: 'When is your trip?',
    sub: 'Your plan length adapts to the time you have. Optional, you can set it later.',
    type: 'date',
  },
];

let Q = null;
function quizStart() { Q = { step: 0, answers: { q2: 3 } }; go('plan'); }

RENDER.plan = async function () {
  if (Q) return quizHtml();
  try {
    const d = await api('/api/plan');
    return planOverviewHtml(d);
  } catch (e) {
    return quizIntroHtml();
  }
};

function quizIntroHtml() {
  return '<div class="pg-hd"><div class="pg-eyebrow">My Plan</div>' +
    '<div class="pg-title">Tell me how active you are.</div>' +
    '<div class="pg-sub">Six quick questions. About a minute. Your answers shape a week by week training plan built for the Havasupai trail.</div></div>' +
    '<div class="ci-flow"><div class="ci-intro">' +
    '<div class="ci-intro-title">Ready when you are</div>' +
    '<div class="ci-intro-sub">No wrong answers. Just an honest starting point.</div>' +
    '<button class="ci-intro-btn" id="q-begin">Start the quiz</button>' +
    '</div></div>';
}

function quizHtml() {
  if (Q.step === -1) return quizIntroHtml();
  if (Q.step >= QUIZ.length) {
    return '<div class="ci-flow"><div class="ci-intro"><div class="loader-cube" style="margin:0 auto"><i></i><i></i><i></i></div>' +
      '<div class="ci-intro-sub" style="margin-top:20px">Building your plan…</div></div></div>';
  }
  const s = QUIZ[Q.step];
  const prog = QUIZ.map((_, i) => '<i class="' + (i < Q.step ? 'on' : i === Q.step ? 'on' : '') + '"></i>').join('');
  let body = '';
  if (s.type === 'chips') {
    body = '<div class="ci-chips">' + s.opts.map((o) =>
      '<button class="ci-chip' + (Q.answers[s.key] === o.v ? ' sel' : '') + '" data-qv="' + o.v + '">' + esc(o.t) + '</button>').join('') + '</div>';
  } else if (s.type === 'stepper') {
    const v = Q.answers[s.key] == null ? 3 : +Q.answers[s.key];
    body = '<div class="ci-stepper"><button data-qstep="-1">−</button><div class="ci-val">' + v + '</div><button data-qstep="1">+</button></div>' +
      '<div class="ci-rating-label">days per week</div>';
  } else if (s.type === 'date') {
    body = '<div class="quiz-date"><input class="f-input" type="date" id="q-date" value="' + esc(Q.answers.trip_date || '') + '"></div>';
  }
  const canNext = s.type === 'date' ? true : Q.answers[s.key] !== undefined && Q.answers[s.key] !== null;
  return '<div class="pg-hd"><div class="pg-eyebrow">My Plan</div></div>' +
    '<div class="ci-flow"><div class="ci-step-anim" id="q-step">' +
    '<div class="ci-prog">' + prog + '</div>' +
    '<div class="ci-q">' + esc(s.q) + '</div>' +
    '<div class="ci-q-sub">' + esc(s.sub) + '</div>' + body +
    '<div class="ci-nav">' +
    (Q.step > 0 ? '<button class="ci-back-btn" id="q-back">Back</button>' : '') +
    '<button class="ci-next-btn" id="q-next"' + (canNext ? '' : ' disabled') + '>' +
    (Q.step === QUIZ.length - 1 ? 'Build my plan' : 'Next') + '</button>' +
    '</div><div class="ci-err" id="q-err"></div>' +
    '</div></div>';
}

function planOverviewHtml(d) {
  const weeks = d.plan.weeks;
  const cards = weeks.map((w) => {
    const long = w.days.find((x) => x.kind === 'long');
    const sessions = w.days.filter((x) => x.kind !== 'rest').length;
    return '<button class="day-card" data-goto-week="' + w.week + '">' +
      '<div class="day-ic">' + IC.route + '</div>' +
      '<div class="day-meta"><div class="day-name">Week ' + w.week + (w.taper ? ' · taper' : '') + '</div>' +
      '<div class="day-desc">' + sessions + ' sessions · long hike ' + long.target_mi + ' mi</div></div>' +
      '<div class="day-state wait">' + IC.chevR + '</div></button>';
  }).join('');
  return '<div class="pg-hd"><div class="pg-eyebrow">My Plan</div>' +
    '<div class="pg-title">Your training plan</div>' +
    '<div class="pg-sub">' + d.weeks + ' weeks, built around your trip' + (d.trip_date ? ' on ' + fmtDay(d.trip_date) : '') + '.</div></div>' +
    '<div class="plan-hero"><div class="lvl">' + esc(d.level.tag) + '</div>' +
    '<h2>' + esc(d.level.name) + '</h2><p>' + esc(d.level.blurb) + '</p>' +
    (d.injury ? '<div class="injury-note">' + esc(d.injury) + '</div>' : '') +
    '<div class="cta-row"><button class="btn btn-sm" data-goto-train style="width:auto">Open this week</button>' +
    '<button class="btn-ghost btn-sm" id="plan-retake">Retake quiz</button></div></div>' +
    '<div class="stagger">' + cards + '</div>';
}

RENDER.plan_mount = function () {
  const begin = $('#q-begin');
  if (begin) begin.onclick = () => quizStart();
  const step = $('#q-step');
  if (step) {
    $$('#q-step [data-qv]').forEach((b) => b.onclick = () => {
      Q.answers[QUIZ[Q.step].key] = b.dataset.qv === String(+b.dataset.qv) && !isNaN(+b.dataset.qv) ? +b.dataset.qv : b.dataset.qv;
      go('plan');
    });
    $$('#q-step [data-qstep]').forEach((b) => b.onclick = () => {
      const s = QUIZ[Q.step];
      let v = Q.answers[s.key] == null ? 3 : +Q.answers[s.key];
      v = Math.max(s.min, Math.min(s.max, v + (+b.dataset.qstep)));
      Q.answers[s.key] = v; go('plan');
    });
    const dt = $('#q-date');
    if (dt) dt.onchange = () => { Q.answers.trip_date = dt.value || null; };
    const back = $('#q-back');
    if (back) back.onclick = () => { Q.step--; go('plan'); };
    const next = $('#q-next');
    if (next && !next.disabled) next.onclick = submitQuizStep;
  }
  $$('[data-goto-week]').forEach((b) => b.onclick = () => go('train', +b.dataset.gotoWeek));
  const gt = $('[data-goto-train]');
  if (gt) gt.onclick = () => go('train');
  const rt = $('#plan-retake');
  if (rt) rt.onclick = () => confirmDlg('Retake the quiz?', 'Your current plan and logged sessions stay saved. A new quiz just rebuilds the plan.', 'Retake', () => quizStart());
};

async function submitQuizStep() {
  const s = QUIZ[Q.step];
  if (s.type !== 'date' && (Q.answers[s.key] === undefined || Q.answers[s.key] === null)) return;
  if (Q.step < QUIZ.length - 1) { Q.step++; go('plan'); return; }
  Q.step = QUIZ.length;
  go('plan');
  try {
    const d = await api('/api/quiz', { method: 'POST', body: { answers: Q.answers } });
    Q = null;
    await refreshMe();
    go('plan');
    setTimeout(() => {
      openModal('<div class="result-hero"><div class="result-lvl">' + esc(d.level.tag) + '</div>' +
        '<div class="result-name">' + esc(d.level.name) + '</div>' +
        '<div class="result-blurb">' + esc(d.level.blurb) + '</div>' +
        (d.injury ? '<div class="injury-note" style="text-align:left;max-width:480px;margin:0 auto 20px">' + esc(d.injury) + '</div>' : '') +
        '<button class="btn" id="res-go">Start training</button></div>');
      $('#res-go').onclick = () => { closeModal(true); go('train'); };
    }, 350);
  } catch (e) {
    Q.step = QUIZ.length - 1;
    go('plan');
    toast(e.message);
  }
}
