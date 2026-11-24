/* Ad Radar demo: small DOM helpers shared by every screen.
   Text always goes in through textContent, so nothing a visitor types can become markup. */

import { h, makeLog, makeToast, retryFailedImages } from '../../shared/dom.js';

export { h };
export var log = makeLog('ad-radar');
export var toast = makeToast({ ms: 3200, log: log });

retryFailedImages(log);

/* ---------- Icons (outline, 24px grid, drawn for this demo) ---------- */

var ICONS = {
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  starOn: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  out: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V4H4v12h4"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  play: '<path d="M7 5v14l12-7z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" fill="currentColor" stroke="none"/>',
  down: '<path d="M12 4v12M6 11l6 6 6-6M5 20h14"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  /* The four tabs. */
  ads: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  trends: '<path d="M4 17l5-5 4 3 7-8M15 7h5v5"/>',
  board: '<rect x="4" y="4" width="4.5" height="16" rx="1.2"/><rect x="10" y="4" width="4.5" height="11" rx="1.2"/><rect x="16" y="4" width="4" height="7" rx="1.2"/>',
  scans: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12l5.6-5.6"/>'
};

export function icon(name, size) {
  var s = size || 14;
  var wrap = document.createElement('span');
  wrap.className = 'ic';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  return wrap;
}

/* A segmented control: [All | Have | Missing]. */
export function segmented(options, value, onPick, opts) {
  opts = opts || {};
  return h('div.seg' + (opts.disabled ? '.is-disabled' : ''), { role: 'group', 'aria-label': opts.label },
    options.map(function (o) {
      var on = o[0] === value;
      return h('button.seg__btn' + (on ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(on), disabled: opts.disabled ? true : null, 'data-seg': (opts.key ? opts.key + ':' : '') + o[0], onclick: function () { onPick(o[0]); } }, o[1]);
    }));
}
