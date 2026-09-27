/* Havasu Prep — Train: weekly training tracker */
'use strict';

const KIND_ICON = { rest: 'moon', walk: 'activity', hike: 'route', long: 'route', strength: 'dumbbell', easy: 'activity', stairs: 'activity' };
const KIND_LABEL = { rest: 'Rest', walk: 'Walk', hike: 'Hike', long: 'Long hike', strength: 'Strength', easy: 'Easy move', stairs: 'Stairs' };

RENDER.train = async function (weekArg) {
  let d;
  try {
    d = await api('/api/training/week' + (weekArg ? '?week=' + weekArg : ''));
  } catch (e) {
    return '<div class="pg-hd"><div class="pg-eyebrow">Train</div><div class="pg-title">No plan yet.</div>' +
      '<div class="pg-sub">Take the 60 second quiz and your training weeks will appear here.</div></div>' +
      '<button class="btn" onclick="quizStart()">Take the quiz</button>';
  }
  const pct = d.days.length ? Math.round(d.days.filter((x) => x.kind === 'rest' || x.logs.length > 0).length / d.days.length * 100) : 0;
  const cards = d.days.map((day, i) => {
    const done = day.logs.length > 0;
    const target = day.target_mi > 0 ? day.target_mi + ' mi' : day.target_min > 0 ? day.target_min + ' min' : '';
    const logs = day.logs.map((l) =>
      '<div class="log-row">' + IC.check.replace('<svg', '<svg width="14" height="14"') + ' <b>' + esc(l.title) + '</b> ' +
      (l.distance_mi > 0 ? esc(String(l.distance_mi)) + ' mi · ' : '') + (l.minutes > 0 ? esc(String(l.minutes)) + ' min' : '') +
      '<button class="x icon-btn" data-del-log="' + l.id + '" title="Delete">' + IC.x + '</button></div>').join('');
    return '<div class="day-card" data-log-day="' + i + '" data-day-kind="' + day.kind + '" style="cursor:pointer">' +
      '<div class="day-ic' + (done ? ' done' : day.kind === 'rest' ? ' rest' : '') + '">' + IC[KIND_ICON[day.kind] || 'activity'] + '</div>' +
      '<div class="day-meta"><div class="day-name">' + esc(day.day) + ' · ' + esc(day.title) + '</div>' +
      '<div class="day-detail">' + esc(day.detail) + '</div>' +
      (target ? '<div class="day-target">Target: ' + esc(target) + '</div>' : '') +
      (logs ? '<div class="log-list">' + logs + '</div>' : '') + '</div>' +
      '<span class="kind-tag ' + day.kind + '">' + (KIND_LABEL[day.kind] || day.kind) + '</span></div>';
  }).join('');
  return '<div class="pg-hd"><div class="pg-eyebrow">Train</div>' +
    '<div class="pg-title">This week, on the trail to ready.</div>' +
    '<div class="pg-sub">Log each session as you finish it. Rest days count too, recovery is training.</div></div>' +
    (d.days.some((x) => x.taper) || d.week === d.total ? '' : '') +
    '<div class="card"><div class="card-h"><span class="card-t">Week progress</span><span class="card-t">' + pct + '%</span></div>' +
    '<div class="pack-bar"><i style="width:' + pct + '%"></i></div></div>' +
    '<div class="wk-pager"><button class="btn-ghost btn-sm" id="wk-prev"' + (d.week <= 1 ? ' disabled' : '') + '>' + IC.chevL + '</button>' +
    '<div class="wk-label">Week ' + d.week + ' of ' + d.total + '</div>' +
    '<button class="btn-ghost btn-sm" id="wk-next"' + (d.week >= d.total ? ' disabled' : '') + '>' + IC.chevR + '</button></div>' +
    (d.week === d.total ? '<div class="taper-banner">Taper week. Short and easy sessions only. Trust the work you put in, you are ready.</div>' : '') +
    '<div class="stagger">' + cards + '</div>' +
    '<div class="cta-row"><button class="btn-ghost" id="log-extra">' + IC.plus + ' Log an extra session</button></div>';
};

let TRAIN_WEEK = null;
RENDER.train_mount = function (weekArg) {
  const m = $('#panel').innerHTML.match(/Week (\d+) of (\d+)/);
  TRAIN_WEEK = weekArg || (m ? +m[1] : null);
  const prev = $('#wk-prev'), next = $('#wk-next');
  if (prev && !prev.disabled) prev.onclick = () => go('train', (TRAIN_WEEK || 1) - 1);
  if (next && !next.disabled) next.onclick = () => go('train', (TRAIN_WEEK || 1) + 1);
  $$('#panel [data-log-day]').forEach((c) => c.onclick = (e) => {
    if (e.target.closest('[data-del-log]')) return;
    openLogModal(TRAIN_WEEK, +c.dataset.logDay, c.dataset.dayKind);
  });
  $$('#panel [data-del-log]').forEach((b) => b.onclick = async (e) => {
    e.stopPropagation();
    await api('/api/training/log/' + b.dataset.delLog, { method: 'DELETE' });
    toast('Session removed');
    go('train', TRAIN_WEEK);
  });
  const ex = $('#log-extra');
  if (ex) ex.onclick = () => openLogModal(TRAIN_WEEK, null);
};

function openLogModal(week, dayIdx, dayKind) {
  const kinds = ['walk', 'hike', 'long', 'strength', 'easy', 'stairs'];
  const defKind = kinds.includes(dayKind) ? dayKind : 'walk';
  const m = openModal(
    '<div class="modal-topic">Log a session</div>' +
    '<div class="modal-sub">Every session counts. Log it while it is fresh.</div>' +
    '<div class="f-label">What did you do</div>' +
    '<input class="f-input" id="lg-title" placeholder="Morning hike at the lake" maxlength="120">' +
    '<div class="f-label">Kind</div>' +
    '<div class="chip-row" id="lg-kinds">' + kinds.map((k) =>
      '<button class="chip' + (k === defKind ? ' active' : '') + '" data-k="' + k + '">' + KIND_LABEL[k] + '</button>').join('') + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    '<div><div class="f-label">Miles</div><input class="f-input" id="lg-mi" type="number" min="0" step="0.1" placeholder="0"></div>' +
    '<div><div class="f-label">Minutes</div><input class="f-input" id="lg-min" type="number" min="0" step="1" placeholder="0"></div></div>' +
    '<div class="f-label">Date</div>' +
    '<input class="f-input" id="lg-date" type="date" value="' + todayStr() + '">' +
    '<div class="f-label">Notes (optional)</div>' +
    '<textarea class="ci-textarea" id="lg-notes" style="min-height:80px" placeholder="How did it feel?" maxlength="500"></textarea>' +
    '<div class="btn-row" style="margin-top:18px"><button class="btn-ghost" id="lg-cancel">Cancel</button>' +
    '<button class="btn" id="lg-save">Save session</button></div>');
  let kind = defKind;
  $$('#lg-kinds .chip', m).forEach((c) => c.onclick = () => {
    $$('#lg-kinds .chip', m).forEach((x) => x.classList.remove('active'));
    c.classList.add('active'); kind = c.dataset.k;
  });
  $('#lg-cancel', m).onclick = () => closeModal();
  $('#lg-save', m).onclick = async () => {
    const title = $('#lg-title', m).value.trim();
    if (!title) { toast('Give the session a title'); return; }
    try {
      await api('/api/training/log', {
        method: 'POST',
        body: {
          title, kind,
          minutes: +$('#lg-min', m).value || 0,
          distance_mi: +$('#lg-mi', m).value || 0,
          log_date: $('#lg-date', m).value || todayStr(),
          notes: $('#lg-notes', m).value.trim(),
          week_index: week, day_index: dayIdx,
        },
      });
      closeModal(true);
      toast('Session logged');
      go('train', week);
    } catch (e) { toast(e.message); }
  };
  setTimeout(() => $('#lg-title', m).focus(), 100);
}
