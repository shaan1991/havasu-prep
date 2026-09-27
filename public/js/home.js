/* Havasu Prep — Home dashboard */
'use strict';

RENDER.home = async function () {
  const d = await api('/api/stats');
  const first = S.user.name.split(' ')[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const hasPlan = d.weekTotal > 0;
  const pct = d.weekTotal ? Math.round(d.weekDone / d.weekTotal * 100) : 0;
  const C = 2 * Math.PI * 46;
  const ring = '<div class="ring"><svg viewBox="0 0 110 110">' +
    '<circle cx="55" cy="55" r="46" fill="none" stroke="var(--bg-track)" stroke-width="10"/>' +
    '<circle cx="55" cy="55" r="46" fill="none" stroke="var(--sc-good)" stroke-width="10" stroke-linecap="round" ' +
    'stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct / 100)) + '" style="transition:stroke-dashoffset 1s cubic-bezier(.2,.9,.25,1)"/>' +
    '</svg><div class="rv"><b>' + pct + '%</b><span>week ' + d.weekNum + '</span></div></div>';

  const recent = await api('/api/training/recent').catch(() => ({ logs: [] }));
  const recentHtml = recent.logs.slice(0, 4).map((l) =>
    '<div class="list-row"><div class="day-ic' + (true ? ' done' : '') + '" style="width:40px;height:40px">' + IC.check + '</div>' +
    '<div class="grow"><div class="t1">' + esc(l.title) + '</div>' +
    '<div class="t2">' + fmtShort(l.log_date) + (l.distance_mi > 0 ? ' · ' + esc(String(l.distance_mi)) + ' mi' : '') + (l.minutes > 0 ? ' · ' + esc(String(l.minutes)) + ' min' : '') + '</div></div></div>').join('');

  return '<div class="home-hi">' + greet + ', ' + esc(first) + '.</div>' +
    '<div class="home-date">' + new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + '</div>' +

    '<div class="card"><div class="card-h"><span class="card-t">Countdown</span>' +
    (d.tripDate ? '<button class="btn-ghost btn-sm" id="hm-trip">Change date</button>' : '') + '</div>' +
    (d.tripDate
      ? '<div class="count-big">' + d.daysToTrip + '</div><div class="count-cap">days to ' + fmtDay(d.tripDate) + '</div>'
      : '<div class="empty" style="padding:20px"><span class="serif">When is your trip?</span>Set the date and the countdown begins.<br><br><button class="btn btn-sm" id="hm-trip" style="width:auto">Set trip date</button></div>') +
    '</div>' +

    (hasPlan ?
      '<div class="card"><div class="card-h"><span class="card-t">This week training</span>' +
      '<button class="btn-ghost btn-sm" data-tab="train">Open</button></div>' +
      '<div class="ring-wrap">' + ring +
      '<div><div style="font-size:15px;font-weight:700">' + d.weekDone + ' of ' + d.weekTotal + ' days on track</div>' +
      '<div class="day-detail">Streak: <b style="color:var(--sc-mid)">' + d.streak + ' day' + (d.streak === 1 ? '' : 's') + '</b> ' + IC.flame.replace('<svg', '<svg width="14" height="14" style="vertical-align:-2px"') + '</div>' +
      '<div class="day-detail">' + esc(String(d.totalMi)) + ' miles · ' + d.totalSessions + ' sessions all time</div></div></div></div>'
      : '<div class="card"><div class="empty"><span class="serif">Your plan is waiting.</span>Take the 60 second quiz and get a training plan built for your fitness.<br><br><button class="btn btn-sm" data-tab="train" style="width:auto">Take the quiz</button></div></div>') +

    '<div class="grid2">' +
    '<div class="card"><div class="stat-big">' + d.streak + '</div><div class="count-cap">day streak</div></div>' +
    '<div class="card"><div class="stat-big">' + esc(String(d.totalMi)) + '</div><div class="count-cap">miles logged</div></div>' +
    '</div>' +

    (recentHtml ? '<div class="card" style="margin-top:14px"><div class="card-h"><span class="card-t">Recent sessions</span><button class="btn-ghost btn-sm" data-tab="train">All</button></div>' + recentHtml + '</div>' : '') +

    '<div class="card" style="margin-top:14px"><div class="card-h"><span class="card-t">Get ready</span></div>' +
    '<div class="cta-row">' +
    '<button class="btn-ghost btn-sm" data-tab="pack">' + IC.pack + ' Packing list</button>' +
    '<button class="btn-ghost btn-sm" data-tab="guide">' + IC.guide + ' Trip guide</button>' +
    '<button class="btn-ghost btn-sm" data-tab="notes">' + IC.notes + ' Notes</button>' +
    '</div></div>';
};

RENDER.home_mount = function () {
  const t = $('#hm-trip');
  if (t) t.onclick = () => {
    const m = openModal('<div class="modal-topic">Trip date</div>' +
      '<div class="modal-sub">Your training weeks and countdown line up to this date.</div>' +
      '<div class="f-label">Hike date</div>' +
      '<input class="f-input" type="date" id="hm-date" value="' + esc((S.profile && S.profile.trip_date) || '') + '">' +
      '<div class="btn-row" style="margin-top:8px"><button class="btn-ghost" id="hm-cancel">Cancel</button>' +
      '<button class="btn" id="hm-save">Save</button></div>');
    $('#hm-cancel', m).onclick = () => closeModal();
    $('#hm-save', m).onclick = async () => {
      try {
        const v = $('#hm-date', m).value || null;
        await api('/api/me', { method: 'PUT', body: { trip_date: v } });
        await refreshMe();
        closeModal(true);
        toast('Trip date saved');
        go('home');
      } catch (e) { toast(e.message); }
    };
  };
};
