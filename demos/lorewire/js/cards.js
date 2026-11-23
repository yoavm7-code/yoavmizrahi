/* LoreWire demo: the story cards every screen uses. The 2:3 poster (key art with the title painted on
   it, a category chip and the duration), the Top 10 card with its big numeral, and the wide card for
   "More like this". Clicking any of them opens the story. */

import { h } from './dom.js';

export function art(id, kind) { return 'media/' + id + '/' + kind + '.webp'; }

export function posterCard(app, s, opts) {
  var o = opts || {};
  return h('button.poster' + (o.big ? '.poster--big' : ''), { type: 'button', 'data-story': s.id, 'aria-label': s.title + ', ' + s.category + ', ' + s.duration, onclick: function () { app.openStory(s.id); } },
    h('img', { src: art(s.id, 'poster'), alt: '', loading: 'lazy', decoding: 'async' }),
    h('span.chip.chip--card', { text: s.category.toUpperCase() }),
    h('span.poster__time', { text: s.duration }),
    app.votes[s.id] ? h('span.poster__voted', { text: 'VOTED' }) : null);
}

export function topCard(app, s, n) {
  return h('button.top', { type: 'button', 'data-story': s.id, 'aria-label': 'Number ' + n + ': ' + s.title, onclick: function () { app.openStory(s.id); } },
    h('span.top__num', { 'aria-hidden': 'true', text: String(n) }),
    h('span.top__art', h('img', { src: art(s.id, 'poster'), alt: '', loading: 'lazy', decoding: 'async' }), h('span.chip.chip--card', { text: s.category.toUpperCase() }), h('span.poster__time', { text: s.duration })));
}

export function wideCard(app, s) {
  return h('button.wide', { type: 'button', 'data-story': s.id, onclick: function () { app.openStory(s.id); } },
    h('span.wide__art', h('img', { src: art(s.id, 'wide'), alt: '', loading: 'lazy', decoding: 'async' }), h('span.poster__time', { text: s.duration }), h('span.chip.chip--card', { text: s.category.toUpperCase() })),
    h('b.wide__title', { text: s.title }),
    h('small.wide__line', { text: s.summary }));
}

/* A titled row that scrolls sideways and bleeds off the right edge. */
export function row(title, cards, key) {
  if (!cards.length) return null;
  return h('section.row', { 'data-row': key || '' }, h('h2.row__title', { text: title }), h('div.row__track', cards));
}

export function grid(app, list) {
  if (!list.length) return h('p.empty', { text: 'Nothing here yet.' });
  return h('div.grid', list.map(function (s) { return posterCard(app, s, { big: true }); }));
}
