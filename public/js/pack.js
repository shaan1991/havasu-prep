/* Havasu Prep — Pack: editable packing checklist */
'use strict';

RENDER.pack = async function () {
  const d = await api('/api/pack');
  const items = d.items;
  if (!items.length) {
    return '<div class="pg-hd"><div class="pg-eyebrow">Pack</div><div class="pg-title">Your packing list</div>' +
      '<div class="pg-sub">Everything you will carry into the canyon, in one checklist.</div></div>' +
      '<div class="card"><div class="empty"><span class="serif">Nothing here yet.</span>Load the Havasupai essentials checklist, then check things off as they go into the bag. Every item is editable.</div>' +
      '<button class="btn" id="pack-seed">' + IC.plus + ' Load the essentials</button></div>';
  }
  const order = [];
  const groups = {};
  for (const it of items) {
    if (!groups[it.category]) { groups[it.category] = []; order.push(it.category); }
    groups[it.category].push(it);
  }
  const done = items.filter((i) => i.checked).length;
  const pct = Math.round(done / items.length * 100);
  const html = order.map((cat) => {
    const list = groups[cat];
    const cdone = list.filter((i) => i.checked).length;
    return '<div class="pack-cat"><span>' + esc(cat) + '</span><span class="cnt">' + cdone + ' of ' + list.length + '</span></div>' +
      list.map((it) =>
        '<div class="pack-item' + (it.checked ? ' done' : '') + '">' +
        '<button class="check-dot' + (it.checked ? ' on' : '') + '" data-pack-check="' + it.id + '">' + IC.check + '</button>' +
        '<div class="grow"><div class="t1">' + esc(it.label) + '</div>' +
        (it.qty ? '<div class="t2">' + esc(it.qty) + '</div>' : '') + '</div>' +
        '<button class="icon-btn" data-pack-edit="' + it.id + '" title="Edit">' + IC.edit + '</button>' +
        '<button class="icon-btn" data-pack-del="' + it.id + '" title="Remove">' + IC.trash + '</button></div>').join('');
  }).join('');
  return '<div class="pg-hd"><div class="pg-eyebrow">Pack</div>' +
    '<div class="pg-title">Pack it right.</div>' +
    '<div class="pg-sub">Start from the base list, make it yours. Check things off as they go into the bag.</div></div>' +
    '<div class="card"><div class="card-h"><span class="card-t">Packed</span><span class="card-t">' + done + ' of ' + items.length + '</span></div>' +
    '<div class="pack-bar"><i style="width:' + pct + '%"></i></div>' +
    '<div class="cta-row"><button class="btn-ghost btn-sm" id="pack-add">' + IC.plus + ' Add item</button>' +
    '<button class="btn-ghost btn-sm" id="pack-reset">' + IC.refresh + ' Restore base list</button></div></div>' +
    '<div class="stagger">' + html + '</div>';
};
IC.refresh = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5"/></svg>';

RENDER.pack_mount = function () {
  $$('#panel [data-pack-check]').forEach((b) => b.onclick = async () => {
    const on = !b.classList.contains('on');
    b.classList.toggle('on', on);
    b.closest('.pack-item').classList.toggle('done', on);
    try { await api('/api/pack/' + b.dataset.packCheck, { method: 'PUT', body: { checked: on } }); }
    catch (e) { toast(e.message); }
    updatePackProgress();
  });
  $$('#panel [data-pack-del]').forEach((b) => b.onclick = () => {
    confirmDlg('Remove this item?', 'You can always add it back later.', 'Remove', async () => {
      await api('/api/pack/' + b.dataset.packDel, { method: 'DELETE' });
      toast('Item removed'); go('pack');
    });
  });
  $$('#panel [data-pack-edit]').forEach((b) => b.onclick = () => openPackModal(+b.dataset.packEdit));
  const add = $('#pack-add') || $('#pack-add0');
  if (add) add.onclick = () => openPackModal(null);
  const seed = $('#pack-seed');
  if (seed) seed.onclick = async () => {
    try {
      await api('/api/pack/reset', { method: 'POST' });
      toast('Essentials loaded');
      go('pack');
    } catch (e) { toast(e.message); }
  };
  const rs = $('#pack-reset');
  if (rs) rs.onclick = () => confirmDlg('Restore the base list?', 'This replaces your whole list with the original base list. Your custom items will be gone.', 'Restore', async () => {
    await api('/api/pack/reset', { method: 'POST' });
    toast('Base list restored'); go('pack');
  });
};

function updatePackProgress() {
  const items = $$('#panel .pack-item');
  const done = $$('#panel .pack-item.done').length;
  const hdr = $('#panel .card .card-t:last-child');
  if (hdr && items.length) hdr.textContent = done + ' of ' + items.length;
  const bar = $('#panel .pack-bar i');
  if (bar && items.length) bar.style.width = Math.round(done / items.length * 100) + '%';
}

function openPackModal(id) {
  const cats = ['Permits and documents', 'Water', 'Camp', 'Food and cooking', 'Clothing', 'Safety and health', 'Hygiene', 'Extras'];
  const m = openModal(
    '<div class="modal-topic">' + (id ? 'Edit item' : 'Add an item') + '</div>' +
    '<div class="modal-sub">Keep it specific. Future you, exhausted at the trailhead, will thank present you.</div>' +
    '<div class="f-label">Item</div>' +
    '<input class="f-input" id="pk-label" placeholder="Trekking poles" maxlength="120">' +
    '<div class="f-label">Detail (optional)</div>' +
    '<input class="f-input" id="pk-qty" placeholder="1 pair" maxlength="40">' +
    '<div class="f-label">Category</div>' +
    '<div class="chip-row" id="pk-cats">' + cats.map((c, i) =>
      '<button class="chip' + (i === 0 ? ' active' : '') + '" data-c="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' +
    '<div class="btn-row" style="margin-top:18px"><button class="btn-ghost" id="pk-cancel">Cancel</button>' +
    '<button class="btn" id="pk-save">' + (id ? 'Save' : 'Add item') + '</button></div>');
  let cat = cats[0];
  $$('#pk-cats .chip', m).forEach((c) => c.onclick = () => {
    $$('#pk-cats .chip', m).forEach((x) => x.classList.remove('active'));
    c.classList.add('active'); cat = c.dataset.c;
  });
  $('#pk-cancel', m).onclick = () => closeModal();
  $('#pk-save', m).onclick = async () => {
    const label = $('#pk-label', m).value.trim();
    if (!label) { toast('Name the item first'); return; }
    const body = { label, qty: $('#pk-qty', m).value.trim(), category: cat };
    try {
      if (id) await api('/api/pack/' + id, { method: 'PUT', body });
      else await api('/api/pack', { method: 'POST', body });
      closeModal(true);
      toast(id ? 'Item updated' : 'Item added');
      go('pack');
    } catch (e) { toast(e.message); }
  };
  setTimeout(() => $('#pk-label', m).focus(), 100);
}
