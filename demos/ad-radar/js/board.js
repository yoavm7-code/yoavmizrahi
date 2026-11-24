/* Ad Radar demo: the Board. Four columns (new, idea, drafting, published). Drag a card to another
   column to change its status, or use its arrow button. Clicking a card opens the ad. */

import { PEOPLE } from './data.js';
import { board, statusOf, nextStatus, STATUSES, pad } from './logic.js';
import { h, icon, toast, log } from './dom.js';
import { creative } from './creative.js';

var TITLES = { new: 'New', idea: 'Idea', drafting: 'Drafting', published: 'Published' };

export function createBoard(app) {
  var el = h('section.view.board', { 'aria-label': 'Board' });
  var drag = null;

  function render() {
    var q = String(app.query.board || '').trim().toLowerCase();
    var ads = app.ads.filter(function (a) { return !q || (a.headline + ' ' + a.vertical + ' ' + a.domain).toLowerCase().indexOf(q) !== -1; });
    var cols = board(ads, app.work);
    el.replaceChildren(
      h('div.page-head', h('h1', { text: 'Board' }), h('p.muted', { text: 'From idea to published. Drag a card to another column; the status saves on the ad.' })),
      h('div.columns', STATUSES.map(function (s) {
        return h('section.col.col--' + s, { 'data-col': s, 'aria-label': TITLES[s] },
          h('div.col__head', h('span.col__dot'), h('b', { text: TITLES[s] }), h('span.fill'), h('span.col__n.mono', { 'data-count': s, text: pad(cols[s].length) })),
          h('div.col__body', cols[s].length ? cols[s].map(card) : h('p.col__empty', { text: 'Drop a card here' })));
      })));
  }

  function card(ad) {
    var s = statusOf(app.work, ad.id);
    var owner = PEOPLE.filter(function (p) { return app.work[ad.id] && p.id === app.work[ad.id].owner; })[0];
    var to = nextStatus(s);
    return h('article.pcard', { 'data-card': ad.id, tabindex: '0', 'aria-label': ad.headline,
      onpointerdown: function (e) { start(e, ad); },
      onkeydown: function (e) { if (e.key === 'Enter' && e.target === e.currentTarget) app.openAd(ad.id); } },
      h('div.pcard__top', creative(ad, 'thumb'), h('span.pcard__title', { text: ad.headline })),
      h('div.pcard__foot', h('span.chip', { text: ad.vertical }), h('span.mono.faint.ellipsis', { text: ad.domain }), h('span.fill'),
        h('span.avatar.avatar--sm' + (owner ? '' : '.is-empty'), { title: owner ? owner.full : 'No owner', text: owner ? owner.id.toUpperCase() : '·' }),
        to ? h('button.pcard__move', { type: 'button', 'aria-label': 'Move to ' + TITLES[to].toLowerCase(), title: 'Move to ' + TITLES[to].toLowerCase(), 'data-move': to, onclick: function () { move(ad, to); } }, icon('arrow', 13)) : null));
  }

  function move(ad, to) {
    var e = app.work[ad.id] || (app.work[ad.id] = {});
    e.status = to;
    log('board', 'move', { ad: ad.id, to: to });
    render();
    var moved = el.querySelector('[data-card="' + ad.id + '"]');
    if (moved) { moved.classList.add('is-dropped'); moved.scrollIntoView({ block: 'nearest' }); }
    toast('Moved to ' + TITLES[to] + '.');
  }

  /* ---------- Dragging ---------- */

  function start(e, ad) {
    if (e.button !== 0 || e.target.closest('button')) return;
    var node = e.currentTarget;
    drag = { ad: ad, node: node, x: e.clientX, y: e.clientY, ghost: null, over: null, id: e.pointerId };
    node.setPointerCapture(e.pointerId);
    node.addEventListener('pointermove', moveDrag);
    node.addEventListener('pointerup', endDrag);
    node.addEventListener('pointercancel', cancel);
  }

  function moveDrag(e) {
    if (!drag) return;
    if (!drag.ghost) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 6) return;
      var r = drag.node.getBoundingClientRect();
      drag.dx = drag.x - r.left; drag.dy = drag.y - r.top;
      drag.ghost = drag.node.cloneNode(true);
      drag.ghost.className = 'pcard pcard--ghost';
      drag.ghost.style.width = r.width + 'px';
      document.body.appendChild(drag.ghost);
      drag.node.classList.add('is-lifted');
    }
    drag.ghost.style.transform = 'translate(' + (e.clientX - drag.dx) + 'px,' + (e.clientY - drag.dy) + 'px) rotate(2deg)';
    var col = document.elementFromPoint(e.clientX, e.clientY);
    col = col && col.closest('[data-col]');
    if (drag.over !== col) {
      if (drag.over) drag.over.classList.remove('is-over');
      drag.over = col;
      if (col) col.classList.add('is-over');
    }
  }

  function endDrag() {
    if (!drag) return;
    var d = drag;
    cleanup();
    if (!d.ghost) { app.openAd(d.ad.id); return; }
    var to = d.over && d.over.getAttribute('data-col');
    if (to && to !== statusOf(app.work, d.ad.id)) move(d.ad, to);
  }

  function cancel() { cleanup(); }

  function cleanup() {
    if (!drag) return;
    drag.node.removeEventListener('pointermove', moveDrag);
    drag.node.removeEventListener('pointerup', endDrag);
    drag.node.removeEventListener('pointercancel', cancel);
    drag.node.classList.remove('is-lifted');
    if (drag.ghost) drag.ghost.remove();
    if (drag.over) drag.over.classList.remove('is-over');
    drag = null;
  }

  return { el: el, show: render, render: render, hide: cleanup };
}
