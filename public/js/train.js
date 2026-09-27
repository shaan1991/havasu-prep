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
  let strava = { stravaOn: false, connected: false }, crews = { crews: [], max: 12 };
  try { const r = await api('/api/strava/status'); strava = r; } catch (e) { /* strava unavailable */ }
  try { crews = await api('/api/crews'); } catch (e) { /* crews unavailable */ }
  const crewHtml = buildCrewCard(strava, crews);
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
    (d.level ? '<div class="lvl-strip"><span>Training as <b>' + esc(d.level.name) + '</b></span><button class="btn-ghost btn-sm" id="train-retake" style="width:auto">Retake quiz</button></div>' : '') +
    crewHtml +
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
  mountCrewCard();
  const ex = $('#log-extra');
  if (ex) ex.onclick = () => openLogModal(TRAIN_WEEK, null);
  const rt = $('#train-retake');
  if (rt) rt.onclick = () => confirmDlg('Retake the quiz?', 'Your current plan and logged sessions stay saved. A new quiz just rebuilds the plan.', 'Retake', () => quizStart());
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

/* ── crew: strava sync + training crews ─────────────────────── */
function buildCrewCard(strava, crews) {
  let stravaSec;
  if (!strava.stravaOn) {
    stravaSec = '<div class="t2">Strava sync is not set up on this copy of the app yet.</div>';
  } else if (!strava.connected) {
    stravaSec = '<div class="t2" style="margin-bottom:10px">Pull your hikes, walks, and runs in with one tap. Your crew sees your weekly totals, never your routes.</div>' +
      '<button class="btn btn-sm" id="strava-connect" style="width:auto">Connect Strava</button>';
  } else {
    stravaSec = '<div class="strava-row"><span>Connected as <b>' + esc(strava.athlete_name || 'athlete') + '</b></span>' +
      '<span class="strava-btns"><button class="btn-ghost btn-sm" id="strava-sync" style="width:auto">Sync now</button>' +
      '<button class="btn-ghost btn-sm" id="strava-off" style="width:auto">Disconnect</button></span></div>' +
      '<div id="strava-new"></div>';
  }
  const crewCards = (crews.crews || []).map((c) => {
    const members = c.members.map((m) => {
      const bar = Math.min(100, Math.round(m.sessions / 5 * 100));
      return '<div class="crew-m"><div class="crew-mrow"><span class="grow">' + esc(m.name) + (m.me ? ' <span class="t2">(you)</span>' : '') + '</span>' +
        '<span class="t2">' + m.sessions + ' sessions · ' + esc(String(m.miles)) + ' mi</span></div>' +
        '<div class="pack-bar"><i style="width:' + bar + '%"></i></div></div>';
    }).join('');
    return '<div class="crew"><div class="card-h"><span class="card-t">' + esc(c.name) + '</span>' +
      '<button class="btn-ghost btn-sm crew-code" data-copy-code="' + esc(c.code) + '" style="width:auto">Code: ' + esc(c.code) + '</button></div>' +
      members +
      '<div class="crew-foot"><button class="btn-ghost btn-sm" data-leave-crew="' + esc(c.id) + '" style="width:auto">Leave</button>' +
      (c.owner ? '<button class="btn-ghost btn-sm" data-del-crew="' + esc(c.id) + '" style="width:auto">Delete crew</button>' : '') + '</div></div>';
  }).join('');
  return '<div class="card crew-card"><div class="card-h"><span class="card-t">Crew</span><span class="card-t dim">train together</span></div>' +
    '<div class="crew-sec"><div class="crew-sec-t">Strava sync</div>' + stravaSec + '</div>' +
    '<div class="crew-sec"><div class="crew-sec-t">My crews <span class="t2">· max ' + (crews.max || 12) + ', the tribe limit</span></div>' +
    (crewCards || '<div class="t2" style="margin-bottom:10px">No crew yet. Create one and share the code, or join with a code a friend sent you.</div>') +
    '<div class="crew-forms"><div class="crew-formrow"><input class="f-input" id="crew-name" placeholder="Crew name" maxlength="60">' +
    '<button class="btn btn-sm" id="crew-create" style="width:auto">Create</button></div>' +
    '<div class="crew-formrow"><input class="f-input" id="crew-code-in" placeholder="Invite code" maxlength="6" style="text-transform:uppercase">' +
    '<button class="btn btn-sm" id="crew-join" style="width:auto">Join</button></div></div></div></div>';
}

function renderStravaNew(acts) {
  const box = $('#strava-new');
  if (!box) return;
  if (!acts.length) { box.innerHTML = '<div class="t2" style="margin-top:8px">Nothing new. You are all synced.</div>'; return; }
  box.innerHTML = '<div class="crew-sec-t" style="margin-top:10px">New activities</div>' + acts.map((a, i) =>
    '<div class="strava-act"><div class="grow"><div class="t1">' + esc(a.name) + '</div>' +
    '<div class="t2">' + esc(a.log_date) + ' · ' + esc(String(a.distance_mi)) + ' mi · ' + a.minutes + ' min</div></div>' +
    '<span class="strava-btns"><button class="btn-ghost btn-sm" data-imp-act="' + i + '" style="width:auto">Import</button>' +
    '<button class="btn-ghost btn-sm" data-dis-act="' + i + '" style="width:auto">Skip</button></span></div>').join('');
  box._acts = acts;
  $$('#strava-new [data-imp-act]').forEach((b) => b.onclick = async () => {
    const a = box._acts[+b.dataset.impAct];
    b.disabled = true; b.textContent = 'Importing…';
    try {
      await api('/api/strava/import', { method: 'POST', body: { activities: [a] } });
      toast('Session logged');
      go('train', TRAIN_WEEK);
    } catch (e) { toast(e.message); b.disabled = false; b.textContent = 'Import'; }
  });
  $$('#strava-new [data-dis-act]').forEach((b) => b.onclick = async () => {
    const a = box._acts[+b.dataset.disAct];
    try { await api('/api/strava/dismiss', { method: 'POST', body: { ids: [a.id] } }); } catch (e) {}
    box._acts.splice(+b.dataset.disAct, 1);
    renderStravaNew(box._acts);
  });
}

function mountCrewCard() {
  const sc = $('#strava-connect');
  if (sc) sc.onclick = () => { location.href = '/auth/strava'; };
  const sy = $('#strava-sync');
  if (sy) sy.onclick = async () => {
    sy.disabled = true; sy.textContent = 'Syncing…';
    try {
      const r = await api('/api/strava/activities');
      renderStravaNew(r.activities || []);
    } catch (e) { toast(e.message); }
    sy.disabled = false; sy.textContent = 'Sync now';
  };
  const so = $('#strava-off');
  if (so) so.onclick = () => confirmDlg('Disconnect Strava?', 'Your logged sessions stay. New activities just will not sync.', 'Disconnect', async () => {
    await api('/api/strava/disconnect', { method: 'POST' });
    go('train', TRAIN_WEEK);
  });
  const cc = $('#crew-create');
  if (cc) cc.onclick = async () => {
    const name = $('#crew-name').value.trim();
    try {
      const r = await api('/api/crews', { method: 'POST', body: { name } });
      toast('Crew created. Code: ' + r.code);
      go('train', TRAIN_WEEK);
    } catch (e) { toast(e.message); }
  };
  const cj = $('#crew-join');
  if (cj) cj.onclick = async () => {
    const code = $('#crew-code-in').value.trim();
    if (!code) { toast('Enter the invite code'); return; }
    try {
      const r = await api('/api/crews/join', { method: 'POST', body: { code } });
      toast('Joined ' + r.name);
      go('train', TRAIN_WEEK);
    } catch (e) { toast(e.message); }
  };
  $$('#panel [data-copy-code]').forEach((b) => b.onclick = async (e) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(b.dataset.copyCode); toast('Code copied. Send it to your crew.'); }
    catch (err) { prompt('Crew invite code:', b.dataset.copyCode); }
  });
  $$('#panel [data-leave-crew]').forEach((b) => b.onclick = () => confirmDlg('Leave this crew?',
    'Your training data stays yours. The crew just will not see your progress anymore.', 'Leave', async () => {
      await api('/api/crews/' + b.dataset.leaveCrew + '/leave', { method: 'POST' });
      go('train', TRAIN_WEEK);
    }));
  $$('#panel [data-del-crew]').forEach((b) => b.onclick = () => confirmDlg('Delete this crew?',
    'Everyone in the crew loses the shared view. This cannot be undone.', 'Delete', async () => {
      await api('/api/crews/' + b.dataset.delCrew, { method: 'DELETE' });
      go('train', TRAIN_WEEK);
    }));
}
