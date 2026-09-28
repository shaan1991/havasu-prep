/* Havasu Prep contact tab */
'use strict';

const CONTACT_EMAIL = 'daily.calmly@gmail.com';

RENDER.contact = function () {
  return '<div class="st-h1">Contact</div>' +
    '<div class="card"><div class="card-h"><span class="card-t">Talk to a human</span></div>' +
    '<div class="set-row"><div class="grow"><div class="t1">Questions, feedback, or trip stories</div>' +
    '<div class="t2">This inbox is read by a real person. Expect a reply within a couple of days.</div></div></div>' +
    '<div class="set-row"><div class="grow"><div class="t1">' + CONTACT_EMAIL + '</div>' +
    '<div class="t2">Tap to open your email app, or copy the address.</div></div></div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">' +
    '<a class="btn-ghost btn-sm" style="text-decoration:none" href="mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Havasu Prep note') + '">Email me</a>' +
    '<button class="btn-ghost btn-sm" id="ct-copy">Copy address</button>' +
    '</div></div>' +

    '<div class="card"><div class="card-h"><span class="card-t">Send a quick note</span></div>' +
    '<input class="f-input" id="ct-name" maxlength="60" placeholder="Your name">' +
    '<textarea class="ci-textarea" id="ct-msg" maxlength="2000" placeholder="What is on your mind? A bug, an idea, a question about the trail."></textarea>' +
    '<div style="margin-top:12px"><button class="btn-ghost btn-sm" id="ct-send">Open in my email app</button></div>' +
    '<div class="formula" style="margin-top:12px">This opens your email app with everything filled in. Nothing is sent until you press send.</div></div>' +

    '<div class="card"><div class="card-h"><span class="card-t">About</span></div>' +
    '<div class="formula">Havasu Prep is an independent trip planner for Havasupai hikers. It is not affiliated with the Havasupai Tribe. Permit rules, fees, and trail conditions change, so always confirm with the Tribe official sources before you travel.</div></div>';
};

RENDER.contact_mount = function () {
  $('#ct-copy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      toast('Email address copied');
    } catch (e) {
      toast('Copy this: ' + CONTACT_EMAIL);
    }
  };
  $('#ct-send').onclick = () => {
    const name = $('#ct-name').value.trim();
    const msg = $('#ct-msg').value.trim();
    if (!msg) { toast('Write your note first'); return; }
    const body = (name ? 'From: ' + name + '\n\n' : '') + msg;
    window.location.href = 'mailto:' + CONTACT_EMAIL +
      '?subject=' + encodeURIComponent('Havasu Prep note') +
      '&body=' + encodeURIComponent(body);
  };
};
