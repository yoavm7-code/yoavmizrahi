/* Mega Uploader demo: small DOM helpers shared by every screen.
   Text always goes in through textContent, so nothing a visitor types can become markup. */

/* ---------- Logging ---------- */

export function log(ns, msg, values) {
  console.info('[mu-demo ' + ns + '] ' + msg, values || {});
}

/* ---------- Elements ---------- */

/* h('button.btn.btn--ghost', { onclick, title, 'data-x': 1 }, 'Label', child...) */
export function h(spec, attrs) {
  var parts = spec.split('.');
  var el = document.createElement(parts[0] || 'div');
  if (parts.length > 1) el.className = parts.slice(1).join(' ');
  var children = Array.prototype.slice.call(arguments, 2);
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { children.unshift(attrs); attrs = null; }
  if (attrs) {
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'style') Object.assign(el.style, v);
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    });
  }
  append(el, children);
  return el;
}

function append(el, list) {
  list.forEach(function (c) {
    if (c === null || c === undefined || c === false || c === '') return;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  });
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
export function replace(el, child) { clear(el); if (child) el.appendChild(child); return el; }

/* ---------- Icons (thin outline, 24px grid, drawn for this demo) ---------- */

var ICONS = {
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  first: '<path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/>',
  last: '<path d="m13 17 5-5-5-5M6 17l5-5-5-5"/>',
  top: '<path d="M6 4h12M7 14l5-5 5 5"/>',
  bottom: '<path d="M6 20h12M7 10l5 5 5-5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  bug: '<rect x="7" y="7" width="10" height="13" rx="5"/><path d="M9 7a3 3 0 0 1 6 0M3 13h4M17 13h4M4 7l3 2M20 7l-3 2M4 19l3-2M20 19l-3-2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  heal: '<path d="m10.5 20.5 10-10a4.9 4.9 0 0 0-7-7l-10 10a4.9 4.9 0 0 0 7 7z"/><path d="m8.5 8.5 7 7"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  bookmark: '<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
  filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
  play: '<path d="m6 4 14 8-14 8z"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  clip: '<path d="m21.4 11-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  wand: '<path d="m15 4 5 5M4 20 15 9M18 2v4M16 4h4M9 3v2M8 4h2"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  focus: '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  comment: '<path d="M4 5h16v11H8l-4 4z"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  broom: '<path d="m13 11 8-8M8.5 12.5l3 3M4 22l2-6 6-6 4 4-6 6z"/>',
  logo: '<rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" stroke="none"/><rect x="8" y="8" width="8" height="8" rx="1.5" fill="#fff" stroke="none"/>'
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

/* ---------- Toast ---------- */

var toastEl = null;
var toastTimer = null;
export function toast(text, kind) {
  if (!toastEl) { toastEl = h('div.toast', { role: 'status', 'aria-live': 'polite' }); document.body.appendChild(toastEl); }
  toastEl.className = 'toast is-on' + (kind ? ' toast--' + kind : '');
  replace(toastEl, h('span', { text: text }));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3400);
  log('ui', 'toast', { text: text, kind: kind || 'info' });
}

/* Anything the real app has but this demo leaves out answers the same way. */
export function notInDemo(what) {
  toast(what + ' is not part of this demo. Try Workspace, Run history or Dashboard.');
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
