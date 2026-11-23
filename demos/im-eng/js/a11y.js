/* I.M demo: the accessibility panel. Text size plus twelve switches, each a class on <html> that
   app.css acts on, and a reading guide that follows the pointer. Settings last for the visit. */

import { A11Y } from './data.js';
import { textSize } from './logic.js';
import { h, icon, log } from './dom.js';

export function createA11y(app) {
  var on = {};
  var size = 1;
  var panel = h('aside.a11y', { id: 'a11y-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'a11y-title', hidden: true });
  var guide = h('div.reading-guide', { 'aria-hidden': 'true' });
  var opener = null;

  function apply() {
    var root = document.documentElement;
    A11Y.forEach(function (o) { root.classList.toggle('a11y-' + o[0], !!on[o[0]]); });
    root.style.setProperty('--text-scale', String(size));
    var video = document.querySelector('.hero__video');
    if (video) { if (on.still) video.pause(); else if (video.paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); } }
    guide.hidden = !on.guide;
  }

  function draw() {
    panel.replaceChildren(
      h('div.a11y__head', h('h2', { id: 'a11y-title', text: 'הגדרות נגישות' }), h('button.a11y__close', { type: 'button', 'aria-label': 'סגירה', 'data-a11y-close': '', onclick: close }, icon('x', 20))),
      h('div.a11y__body',
        h('div.a11y__size', h('span', { text: 'גודל טקסט' }),
          h('div.a11y__steps',
            h('button', { type: 'button', 'data-size': 'up', 'aria-label': 'הגדלת טקסט', onclick: function () { size = textSize(size, 1); apply(); draw(); } }, 'א+'),
            h('button', { type: 'button', 'data-size': 'reset', onclick: function () { size = 1; apply(); draw(); } }, 'איפוס'),
            h('button', { type: 'button', 'data-size': 'down', 'aria-label': 'הקטנת טקסט', onclick: function () { size = textSize(size, -1); apply(); draw(); } }, 'א-')),
          h('small', { 'data-size-now': '', text: Math.round(size * 100) + '%' })),
        h('div.a11y__tiles', A11Y.map(function (o) {
          var active = !!on[o[0]];
          return h('button.tile' + (active ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(active), 'data-a11y': o[0], onclick: function () {
            on[o[0]] = !on[o[0]];
            log('a11y', o[0], { on: on[o[0]] });
            apply();
            draw();
            panel.querySelector('[data-a11y="' + o[0] + '"]').focus();
          } }, icon(o[0], 22), h('span', { text: o[1] }));
        }))),
      h('button.a11y__reset', { type: 'button', 'data-a11y-reset': '', onclick: function () { on = {}; size = 1; apply(); draw(); } }, icon('refresh', 16), 'איפוס כל ההגדרות'));
  }

  function open(from) {
    opener = from || document.activeElement;
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add('is-open'); });
    panel.querySelector('.a11y__close').focus();
  }
  function close() {
    panel.classList.remove('is-open');
    setTimeout(function () { panel.hidden = true; }, 250);
    if (opener && opener.focus) opener.focus();
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
  document.addEventListener('pointermove', function (e) { if (on.guide) guide.style.top = (e.clientY - 22) + 'px'; });

  draw();
  apply();
  document.body.append(panel, guide);
  return { open: open, close: close, isOpen: function () { return !panel.hidden; } };
}
