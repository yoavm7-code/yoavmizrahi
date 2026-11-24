/* Launch Desk demo: small DOM helpers shared by every screen.
   Text always goes in through textContent, so nothing a visitor types can become markup. */

import { h, clear, makeLog, makeToast, retryFailedImages } from '../../shared/dom.js';

export { h, clear };
export var log = makeLog('ld-demo');
export var toast = makeToast({ ms: 3400, log: log });

retryFailedImages(log);

export function replace(el, child) { clear(el); if (child) el.appendChild(child); return el; }

/* ---------- Icons (thin outline, 24px grid, drawn for this demo) ---------- */

var ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
  play: '<path d="m6 4 14 8-14 8z"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  comment: '<path d="M4 5h16v11H8l-4 4z"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  logo: '<rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" stroke="none"/><path d="m7.5 16.5 4.5-4.5 4.5 4.5M7.5 11 12 6.5l4.5 4.5" stroke="#13201b" stroke-width="2.2"/>'
};

export function icon(name, size) {
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size || 14);
  svg.setAttribute('height', size || 14);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('ic');
  svg.innerHTML = ICONS[name] || ICONS.more; /* static strings from the table above only */
  return svg;
}

export function dot(color, cls) { return h('span.dot' + (cls ? '.' + cls : ''), { style: { background: color }, 'aria-hidden': 'true' }); }

/* Anything the real app has but this demo leaves out answers the same way. */
export function notInDemo(what) {
  toast(what + ' is not part of this demo. Try Batches, Launches or Overview.');
}

/* ---------- Popovers and menus ---------- */
/* One open at a time. Closes on outside click, Escape, or when a menu item runs. */

var open = null;

export function closePopover() {
  if (!open) return;
  var o = open;
  open = null;
  o.el.remove();
  if (o.anchor) o.anchor.setAttribute('aria-expanded', 'false');
  if (o.onClose) o.onClose();
}

export function popover(anchor, content, opts) {
  opts = opts || {};
  var same = open && open.anchor === anchor;
  closePopover();
  if (same && !opts.reopen) return null;
  var el = h('div.pop' + (opts.cls ? '.' + opts.cls : ''), { role: opts.role || 'dialog' }, content);
  document.body.appendChild(el);
  var r = anchor.getBoundingClientRect();
  var w = el.offsetWidth;
  var left = opts.align === 'right' ? r.right - w : r.left;
  left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
  var top = r.bottom + 6;
  if (top + el.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - el.offsetHeight - 6);
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  anchor.setAttribute('aria-expanded', 'true');
  open = { el: el, anchor: anchor, onClose: opts.onClose };
  var first = el.querySelector('input, button:not([disabled])');
  if (opts.focus !== false && first) first.focus();
  return el;
}

document.addEventListener('pointerdown', function (e) {
  if (open && !open.el.contains(e.target) && !open.anchor.contains(e.target)) closePopover();
}, true);
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && open) { var a = open.anchor; closePopover(); a.focus(); }
});

/* items: { label, icon, danger, hint, toggle (bool), swatch, run } | { sep } | { section } | { note } */
export function menu(items) {
  return h('div.menu', { role: 'menu' }, items.map(function (it) {
    if (it.sep) return h('div.menu__sep', { role: 'separator' });
    if (it.section) return h('div.menu__section', { text: it.section });
    if (it.note) return h('div.menu__note', { text: it.note });
    var b = h('button.menu__item' + (it.danger ? '.is-danger' : '') + (it.active ? '.is-active' : ''), {
      type: 'button', role: it.toggle !== undefined ? 'menuitemcheckbox' : 'menuitem', title: it.title,
      'aria-checked': it.toggle !== undefined ? String(!!it.toggle) : null,
      onclick: function () { closePopover(); if (it.run) it.run(); }
    },
    it.icon ? icon(it.icon) : h('span.ic-space'),
    h('span.menu__label', { text: it.label }),
    it.hint ? h('span.menu__hint', { text: it.hint }) : null,
    it.toggle !== undefined ? h('span.menu__toggle' + (it.toggle ? '.is-on' : ''), { text: it.toggle ? 'on' : 'off' }) : null,
    it.check ? icon('check') : null);
    return b;
  }));
}

export function menuButton(anchor, items, opts) { return popover(anchor, menu(items), Object.assign({ role: 'menu' }, opts || {})); }

/* ---------- Modal ---------- */

var modalEl = null;
export function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }
export function modal(content, opts) {
  closeModal();
  closePopover();
  opts = opts || {};
  var box = h('div.modal' + (opts.cls ? '.' + opts.cls : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label || 'Dialog' }, content);
  modalEl = h('div.backdrop', { onpointerdown: function (e) { if (e.target === modalEl) closeModal(); } }, box);
  document.body.appendChild(modalEl);
  var first = box.querySelector('[autofocus], input, button:not([disabled])');
  if (first) first.focus();
  return box;
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modalEl && !open) closeModal(); });

/* A filtered list in a modal, driven with the arrows and Enter. items: { label, icon, kind, run } */
export function picker(opts) {
  var items = opts.items;
  var sel = 0;
  var list = h('div.picker__list', { role: 'listbox' });
  var input = h('input.picker__input', {
    type: 'text', placeholder: opts.placeholder, 'aria-label': opts.label, autofocus: true,
    oninput: function () { sel = 0; draw(); },
    onkeydown: function (e) {
      var shown = filtered();
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
      else if (e.key === 'Enter' && shown[sel]) { e.preventDefault(); pick(shown[sel]); }
    }
  });
  function filtered() {
    var q = input.value.trim().toLowerCase();
    return items.filter(function (it) { return !q || it.label.toLowerCase().indexOf(q) !== -1; });
  }
  function pick(it) { closeModal(); log('ui', 'picker pick', { picker: opts.label, label: it.label }); it.run(); }
  function draw() {
    var shown = filtered();
    clear(list);
    if (!shown.length) list.appendChild(h('p.picker__empty', { text: 'Nothing matches.' }));
    shown.forEach(function (it, i) {
      list.appendChild(h('button.picker__item' + (i === sel ? '.is-active' : ''), {
        type: 'button', role: 'option', 'aria-selected': String(i === sel),
        onmousemove: function () { if (sel !== i) { sel = i; draw(); } },
        onclick: function () { pick(it); }
      }, icon(it.icon || 'right', 14), h('span', { text: it.label }), h('small', { text: it.kind }), i === sel ? h('kbd', { text: '↵' }) : null));
    });
    var act = list.querySelector('.is-active');
    if (act) act.scrollIntoView({ block: 'nearest' });
  }
  modal(h('div.picker',
    h('label.picker__search', icon('search', 15), input, h('kbd', { text: 'Esc' })),
    list,
    h('div.picker__foot', { text: '↑↓ move · ↵ open · Esc close' })), { cls: 'modal--picker', label: opts.label });
  draw();
  input.focus();
}

/* ---------- Files ---------- */

export function download(name, text, type) {
  var url = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' }));
  var a = h('a', { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  log('ui', 'download', { name: name, bytes: text.length });
}

export function copyText(text, done) {
  var ok = function () { toast(done || 'Copied'); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(ok, function () { toast('Copying is blocked in this frame. Open the demo full screen to copy.'); });
  } else {
    toast('Copying is not available in this browser.');
  }
}
