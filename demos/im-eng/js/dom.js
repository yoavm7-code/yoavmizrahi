/* I.M demo: small DOM helpers shared by every part of the page.
   Text always goes in through textContent, so nothing a visitor types can become markup. */

import { h, makeLog, makeToast, retryFailedImages } from '../../shared/dom.js';

export { h };
export var log = makeLog('im-demo');
export var toast = makeToast({ ms: 3400, attrs: { dir: 'ltr', lang: 'en' }, log: log });

retryFailedImages(log);

/* ---------- Icons (outline, 24px grid, drawn for this demo) ---------- */

var ICONS = {
  home: '<path d="M4 10.5 12 4l8 6.5V20h-5v-6h-6v6H4z"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .7 3 2.8 3 6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  insta: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><path d="M16.8 7.2h.01"/>',
  arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowBack: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  refresh: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5"/>',
  person: '<circle cx="12" cy="4.6" r="1.9" fill="currentColor" stroke="none"/><path d="M5 8.5c2.3.7 4.6 1 7 1s4.7-.3 7-1M12 9.5v4.5M12 14l-3.5 6.5M12 14l3.5 6.5"/>',
  contrast: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor"/>',
  grayscale: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/><path d="M12 9v11"/>',
  links: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
  readable: '<path d="M5 6h14M12 6v13M9 19h6"/>',
  still: '<rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/>',
  cursor: '<path d="m6 3 13 7-6 2-2 6z"/>',
  guide: '<rect x="3.5" y="9" width="17" height="6" rx="1.5"/><path d="M6 5h12M6 19h12"/>',
  noimages: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="m4 16 5-5 4 4 2-2 5 5M3 3l18 18"/>',
  invert: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17" fill="currentColor"/><path d="M12 7.5v9"/>',
  dyslexia: '<path d="M5 19 10 5l5 14M7 14h6M17 11c2 0 3 1 3 3v5M20 15c-3 0-4 .8-4 2s1 2 2 2c1.2 0 2-.8 2-2"/>',
  spacing: '<path d="M4 8h3M17 8h3M8 5v14M16 5v14M4 16l3-3-3-3M20 16l-3-3 3-3"/>',
  lines: '<path d="M9 6h11M9 12h11M9 18h11M4 4v16M2.5 6 4 4l1.5 2M2.5 18 4 20l1.5-2"/>'
};

export function icon(name, size) {
  var s = size || 22;
  var wrap = document.createElement('span');
  wrap.className = 'ic';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  return wrap;
}

/* WhatsApp's mark, filled. */
export function whatsapp(size) {
  var s = size || 22;
  var wrap = document.createElement('span');
  wrap.className = 'ic';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="currentColor"><path d="M12 2.5a9.4 9.4 0 0 0-8.1 14.2L2.6 21.4l4.8-1.2A9.4 9.4 0 1 0 12 2.5zm0 17.2a7.8 7.8 0 0 1-4-1.1l-.3-.2-2.8.7.8-2.7-.2-.3A7.8 7.8 0 1 1 12 19.7zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.4 6.4 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.1 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.5 2.5 0 0 0 1.7-1.2 2 2 0 0 0 .1-1.2c-.1-.1-.2-.2-.4-.3z"/></svg>';
  return wrap;
}
