/* Havasu Prep — Settings */
'use strict';

RENDER.settings = function () {
  const p = S.profile || {};
  const initials = S.user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return '<div class="st-h1">Settings</div>' +
    '<div class="card"><div class="set-row"><div class="avatar">' +
    (S.user.avatar ? '<img src="' + esc(S.user.avatar) + '" alt="">' : esc(initials)) + '</div>' +
    '<div class="grow"><div class="t1">' + esc(S.user.name) + '</div>' +
    '<div class="t2">' + esc(S.user.email || 'Signed in with Google') + '</div></div></div>' +
    '<div class="set-row"><div class="grow"><div class="t1">Display name</div>' +
    '<div class="t2">Shown on your home screen.</div></div></div>' +
    '<div class="todo-add" style="margin-top:4px"><input id="set-name" value="' + esc(S.user.name) + '" maxlength="60">' +
    '<button class="btn-ghost btn-sm" id="set-name-save" style="flex:0 0 auto">Save</button></div></div>' +

    '<div class="card"><div class="card-h"><span class="card-t">Preferences</span></div>' +
    '<div class="set-row"><div class="grow"><div class="t1">Light theme</div>' +
    '<div class="t2">Cream instead of black.</div></div>' +
    '<button class="toggle' + (document.documentElement.dataset.theme === 'light' ? ' on' : '') + '" id="set-theme"><i></i></button></div>' +
    '<div class="set-row"><div class="grow"><div class="t1">Click sounds</div>' +
    '<div class="t2">A soft tick on every tap.</div></div>' +
    '<button class="toggle' + (p.click_sounds ? ' on' : '') + '" id="set-sound"><i></i></button></div></div>' +

    '<div class="card"><div class="card-h"><span class="card-t">Account</span></div>' +
    '<div class="set-row"><div class="grow"><div class="t1">Sign out</div>' +
    '<div class="t2">Your data stays saved under your Google account.</div></div>' +
    '<button class="btn-ghost btn-sm" id="set-out">Sign out</button></div></div>' +

    '<div class="card"><div class="card-h"><span class="card-t">About</span></div>' +
    '<div class="formula">Havasu Prep is an independent trip planner for Havasupai hikers. It is not affiliated with the Havasupai Tribe. Permit rules, fees, and trail conditions change, so always confirm with the Tribe official sources before you travel. Train smart, pack light, leave no trace.</div></div>';
};

RENDER.settings_mount = function () {
  $('#set-name-save').onclick = async () => {
    const v = $('#set-name').value.trim();
    if (!v) return;
    await api('/api/me', { method: 'PUT', body: { name: v } });
    await refreshMe();
    toast('Name saved');
    go('settings');
  };
  $('#set-theme').onclick = () => toggleTheme();
  $('#set-sound').onclick = async function () {
    const on = !this.classList.contains('on');
    this.classList.toggle('on', on);
    await api('/api/me', { method: 'PUT', body: { click_sounds: on ? 1 : 0 } });
    S.profile.click_sounds = on ? 1 : 0;
  };
  $('#set-out').onclick = () => confirmDlg('Sign out?', 'Your training data stays saved under your Google account.', 'Sign out', () => signOut());
};
