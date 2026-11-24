/* Memesh demo: small DOM helpers shared by every screen.
   Text always goes in through textContent, so nothing a visitor types can become markup. */

import { qrModules } from './logic.js';
import { h, makeLog, makeToast, retryFailedImages } from '../../shared/dom.js';

export { h };
export var log = makeLog('mm-demo');
export var toast = makeToast({ ms: 3400, log: log });

retryFailedImages(log);

/* ---------- Icons (thin outline, 24px grid, drawn for this demo) ---------- */
/* Icons marked flip point along the reading direction and mirror between Hebrew and English. */

var ICONS = {
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  next: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  minus: '<path d="M6 12h12"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2"/>',
  logout: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
  trend: '<path d="m3 17 6-6 4 4 7-7"/><path d="M14 8h6v6"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'
};
var FLIP = { next: true, back: true };

export function icon(name, size, cls) {
  var s = size || 18;
  var wrap = document.createElement('span');
  wrap.className = 'ic' + (FLIP[name] ? ' ic--flip' : '') + (cls ? ' ' + cls : '');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  return wrap;
}

/* The little sun the real tiles use: a ring of dots around a circle. */
export function sun(size) {
  var s = size || 30;
  var dots = '';
  for (var i = 0; i < 8; i++) {
    var a = i * Math.PI / 4;
    dots += '<circle cx="' + (12 + Math.cos(a) * 8.2).toFixed(2) + '" cy="' + (12 + Math.sin(a) * 8.2).toFixed(2) + '" r="1.6"/>';
  }
  var wrap = document.createElement('span');
  wrap.className = 'sun';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="12" r="4.2"/>' + dots + '</svg>';
  return wrap;
}

/* A QR-looking code for a serial (see qrModules: a picture, not a readable code). */
export function qr(serial, size, label) {
  var grid = qrModules(serial, 25);
  var n = grid.length;
  var rects = '';
  grid.forEach(function (row, y) { row.forEach(function (on, x) { if (on) rects += 'M' + x + ' ' + y + 'h1v1h-1z'; }); });
  var wrap = document.createElement('span');
  wrap.className = 'qr';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', label || serial);
  wrap.innerHTML = '<svg viewBox="-2 -2 ' + (n + 4) + ' ' + (n + 4) + '" width="' + size + '" height="' + size + '" shape-rendering="crispEdges"><rect x="-2" y="-2" width="' + (n + 4) + '" height="' + (n + 4) + '" fill="#fff"/><path d="' + rects + '" fill="#2d3436"/></svg>';
  return wrap;
}

/* ---------- Dialogs ---------- */
/* One dialog at a time over a dimmed backdrop. Escape and the backdrop close it, Tab stays inside,
   and focus returns to whatever opened it. */

var open = null;
export function modal(content, opts) {
  closeModal();
  var o = opts || {};
  var back = document.activeElement;
  var panel = h('div.modal__panel' + (o.cls ? '.' + o.cls : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': o.label || '' }, content);
  var root = h('div.modal', { onmousedown: function (e) { if (e.target === root) closeModal(); } }, panel);
  document.querySelector('.app').appendChild(root);
  requestAnimationFrame(function () { root.classList.add('is-on'); });
  open = { root: root, back: back, panel: panel };
  var first = panel.querySelector('[autofocus], input, button');
  if (first) first.focus();
  log('ui', 'dialog open', { label: o.label || '' });
  return panel;
}
export function closeModal() {
  if (!open) return;
  var m = open;
  open = null;
  m.root.remove();
  if (m.back && m.back.focus && document.contains(m.back)) m.back.focus();
}
document.addEventListener('keydown', function (e) {
  if (!open) return;
  if (e.key === 'Escape') { closeModal(); return; }
  if (e.key !== 'Tab') return;
  var f = open.panel.querySelectorAll('button:not([disabled]), input:not([disabled]), select, a[href]');
  if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
