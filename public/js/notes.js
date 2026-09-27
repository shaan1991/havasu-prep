/* Havasu Prep — Notes */
'use strict';

const NOTE_COLORS = [
  { id: 'none', label: 'Plain' }, { id: 'red', label: 'Red' }, { id: 'orange', label: 'Orange' },
  { id: 'yellow', label: 'Yellow' }, { id: 'green', label: 'Green' }, { id: 'blue', label: 'Blue' }, { id: 'purple', label: 'Purple' },
];

RENDER.notes = async function () {
  const d = await api('/api/notes');
  const cards = d.notes.map((n) =>
    '<div class="note-card' + (n.pinned ? ' pinned' : '') + (n.color && n.color !== 'none' ? ' c-' + n.color : '') + '" data-note="' + n.id + '">' +
    (n.pinned ? '<span class="note-pin">' + IC.pin + '</span>' : '') +
    '<div class="note-title">' + esc(n.title) + '</div>' +
    '<div class="note-body">' + esc(n.body) + '</div>' +
    '<div class="note-date">' + timeAgo(n.updated_at) + '</div></div>').join('');
  return '<div class="pg-hd"><div class="pg-eyebrow">Notes</div>' +
    '<div class="pg-title">Trip brain, externalized.</div>' +
    '<div class="pg-sub">Flight times, confirmation numbers, the name of that waterfall, anything. Pin the ones you will need at the trailhead.</div></div>' +
    '<div class="cta-row" style="margin:0 0 18px"><button class="btn-ghost" id="note-add">' + IC.plus + ' New note</button></div>' +
    (cards ? '<div class="notes-grid stagger">' + cards + '</div>'
      : '<div class="card"><div class="empty"><span class="serif">No notes yet.</span>Your future self at Hualapai Hilltop will want these.</div></div>');
};

RENDER.notes_mount = function () {
  const add = $('#note-add');
  if (add) add.onclick = () => openNoteModal(null);
  $$('#panel [data-note]').forEach((c) => c.onclick = () => openNoteModal(+c.dataset.note));
};

async function openNoteModal(id) {
  let n = { title: '', body: '', color: 'none', pinned: 0 };
  if (id) {
    const d = await api('/api/notes');
    n = d.notes.find((x) => x.id === id) || n;
  }
  const m = openModal(
    '<div class="modal-topic">' + (id ? 'Edit note' : 'New note') + '</div>' +
    '<div class="f-label">Title</div>' +
    '<input class="f-input" id="nt-title" value="' + esc(n.title) + '" maxlength="120" placeholder="Note title">' +
    '<div class="f-label">Body</div>' +
    '<textarea class="ci-textarea" id="nt-body" maxlength="8000" placeholder="Write it down before you forget it.">' + esc(n.body) + '</textarea>' +
    '<div class="f-label" style="margin-top:16px">Color</div>' +
    '<div class="chip-row" id="nt-colors">' + NOTE_COLORS.map((c) =>
      '<button class="chip' + (n.color === c.id ? ' active' : '') + '" data-c="' + c.id + '">' + c.label + '</button>').join('') + '</div>' +
    '<div class="btn-row" style="margin-top:18px">' +
    (id ? '<button class="btn-ghost btn-danger" id="nt-del">Delete</button>' : '') +
    '<button class="btn-ghost" id="nt-pin">' + (n.pinned ? 'Unpin' : 'Pin') + '</button>' +
    '<button class="btn" id="nt-save">Save</button></div>');
  let color = n.color || 'none', pinned = !!n.pinned;
  $$('#nt-colors .chip', m).forEach((c) => c.onclick = () => {
    $$('#nt-colors .chip', m).forEach((x) => x.classList.remove('active'));
    c.classList.add('active'); color = c.dataset.c;
  });
  $('#nt-pin', m).onclick = () => { pinned = !pinned; $('#nt-pin', m).textContent = pinned ? 'Unpin' : 'Pin'; };
  const del = $('#nt-del', m);
  if (del) del.onclick = () => confirmDlg('Delete this note?', 'This cannot be undone.', 'Delete', async () => {
    await api('/api/notes/' + id, { method: 'DELETE' });
    toast('Note deleted'); go('notes');
  });
  $('#nt-save', m).onclick = async () => {
    const body = { title: $('#nt-title', m).value.trim() || 'Untitled', body: $('#nt-body', m).value, color, pinned };
    try {
      if (id) await api('/api/notes/' + id, { method: 'PUT', body });
      else await api('/api/notes', { method: 'POST', body });
      closeModal(true);
      toast('Note saved'); go('notes');
    } catch (e) { toast(e.message); }
  };
}
