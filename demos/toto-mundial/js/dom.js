/* Toto Mundial demo: small DOM helpers shared by every screen.
   Text always goes in through textContent, so nothing a visitor types can become markup. */

import { h, clear, makeLog, makeToast } from '../../shared/dom.js';

export { h, clear };
export var log = makeLog('tm-demo');
export var toast = makeToast({ ms: 3200, log: log });

/* ---------- Icons (outline, 24px grid, drawn for this demo) ---------- */
/* Icons marked flip point along the reading direction and mirror in Hebrew. */

var ICONS = {
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
  bets: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 9 1.5 1.5L12 8M8 15l1.5 1.5L12 14M14.5 9.5H17M14.5 15.5H17"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>',
  live: '<circle cx="12" cy="12" r="2"/><path d="M8 8a5.6 5.6 0 0 0 0 8M16 8a5.6 5.6 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
  more: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
  coins: '<ellipse cx="9" cy="7" rx="5" ry="2.5"/><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7"/><path d="M10 15.4c.9 1.2 2.8 2.1 5 2.1 2.8 0 5-1.1 5-2.5v-4c0-1.2-1.6-2.2-3.8-2.4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.6 3.5-5.5 6.5-5.5s5.5 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.4 3.5 5.2"/>',
  shield: '<path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z"/>',
  book: '<path d="M4 5.5C6.5 4 9.5 4 12 5.5v14C9.5 18 6.5 18 4 19.5zM20 5.5C17.5 4 14.5 4 12 5.5v14c2.5-1.5 5.5-1.5 8 0z"/>',
  chat: '<path d="M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 20 11.5z"/>',
  logout: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  next: '<path d="m9 6 6 6-6 6"/>',
  out: '<path d="M8 16 16 8M9 8h7v7"/>',
  sparkle: '<path d="M12 3c.7 4.3 2.2 6 6.5 6.5C14.2 10 12.7 11.7 12 16c-.7-4.3-2.2-6-6.5-6.5C9.8 9 11.3 7.3 12 3z"/><path d="M18.5 15c.3 1.7 1 2.4 2.5 2.7-1.5.3-2.2 1-2.5 2.8-.3-1.8-1-2.5-2.5-2.8 1.5-.3 2.2-1 2.5-2.7z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16.2 9.7"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4v4h4M12 8v4.5l3 2"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r="1.1"/><circle cx="15.5" cy="8.5" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="8.5" cy="15.5" r="1.1"/><circle cx="15.5" cy="15.5" r="1.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  crown: '<path d="m4 8 4 4 4-7 4 7 4-4-1.5 10h-13z"/>',
  medal: '<circle cx="12" cy="14.5" r="5.5"/><path d="M9 9.5 6.5 3h4L12 7M15 9.5 17.5 3h-4"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z"/><path d="M14.5 6.5 17 4l3 3-2.5 2.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  trend: '<path d="m3 17 6-6 4 4 7-7"/><path d="M14 8h6v6"/>',
  swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 14.5 6 18M5 17l2 2"/><path d="M14.5 6.5 18 3h3v3l-3.5 3.5"/>',
  zone: '<circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 4.5h-5L8 10z"/><path d="M12 3v4M16 10l4.5-1.5M14.5 14.5l2.5 4M9.5 14.5 7 18.5M8 10 3.5 8.5"/>',
  dot: '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>'
};
var FLIP = { next: true, out: true, undo: true };

export function icon(name, size, cls) {
  var s = size || 18;
  var wrap = document.createElement('span');
  wrap.className = 'ic' + (FLIP[name] ? ' ic--flip' : '') + (cls ? ' ' + cls : '');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  return wrap;
}

/* The pool's cup: a small trophy in gold for the logo. */
export function cup(size) {
  var s = size || 22;
  var wrap = document.createElement('span');
  wrap.className = 'cup';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<svg viewBox="0 0 24 32" width="' + (s * 0.75) + '" height="' + s + '"><path d="M7 2h10c0 6-1 10-3 12.5-.8 1-1 2.2-1 3.5v3h-2v-3c0-1.3-.2-2.5-1-3.5C8 12 7 8 7 2z" fill="#d79a2b"/>' +
    '<path d="M7 4H4c0 4 1.6 6.4 4.3 7M17 4h3c0 4-1.6 6.4-4.3 7" fill="none" stroke="#d79a2b" stroke-width="1.6"/>' +
    '<rect x="8" y="21" width="8" height="3" rx="1" fill="#b97f1f"/><rect x="6.5" y="24" width="11" height="4" rx="1.2" fill="#d79a2b"/>' +
    '<circle cx="17" cy="26" r="3.6" fill="#fff8f5" stroke="#382e29" stroke-width="1"/><path d="M17 23.6l1.2.9-.5 1.4h-1.4l-.5-1.4z" fill="#382e29"/></svg>';
  return wrap;
}

/* ---------- Bottom sheets ---------- */
/* One sheet at a time. It slides up over the app, Escape or the backdrop closes it, and focus returns
   to whatever opened it. */

var openSheet = null;
export function sheet(content, opts) {
  closeSheet();
  var o = opts || {};
  var back = document.activeElement;
  var panel = h('div.sheet__panel', { role: 'dialog', 'aria-modal': 'true', 'aria-label': o.label || '' }, h('span.sheet__grip', { 'aria-hidden': 'true' }), content);
  var root = h('div.sheet', { onclick: function (e) { if (e.target === root) closeSheet(); } }, panel);
  document.querySelector('.app').appendChild(root);
  requestAnimationFrame(function () { root.classList.add('is-on'); });
  openSheet = { root: root, back: back };
  var first = panel.querySelector('input, button');
  if (first) first.focus();
  log('ui', 'sheet open', { label: o.label || '' });
  return panel;
}
export function closeSheet() {
  if (!openSheet) return;
  var s = openSheet;
  openSheet = null;
  s.root.remove();
  if (s.back && s.back.focus) s.back.focus();
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
