/* LoreWire demo: Home. A streaming-style landing page: a featured hero that rotates through eight
   stories, then rows of posters (unvoted, Top 10 with big numerals, a category, the newest), then the
   footer. */

import { STORIES, LABEL, TAGLINE } from './data.js';
import { unvoted, topTen, inCategory, newest } from './logic.js';
import { h, icon, toast } from './dom.js';
import { art, posterCard, topCard, row } from './cards.js';

var HERO = 8;
var ROTATE_MS = 7000;

export function createHome(app) {
  var el = h('section.view.home', { 'aria-label': 'Home' });
  var slide = 0;
  var timer = null;

  function render() {
    var featured = STORIES.slice(0, HERO);
    var s = featured[slide];
    el.replaceChildren(
      h('section.hero', { 'aria-roledescription': 'carousel', 'aria-label': 'Featured stories' },
        featured.map(function (f, i) { return h('img.hero__art' + (i === slide ? '.is-on' : ''), { src: art(f.id, 'wide'), alt: '', 'aria-hidden': 'true' }); }),
        h('div.hero__shade'),
        h('div.hero__copy', { 'aria-live': 'polite' },
          h('h1.hero__title', { text: s.title }),
          h('div.meta', h('span', { text: '2026' }), h('span.dur', { text: s.duration }), h('span', { text: LABEL }), h('span', { text: s.category })),
          h('p.hero__line', { text: s.summary }),
          h('div.hero__btns',
            h('button.btn.btn--light', { type: 'button', 'data-hero-watch': '', onclick: function () { app.openStory(s.id, 'watch'); } }, 'WATCH & VOTE'),
            h('button.btn.btn--grey', { type: 'button', onclick: function () { app.openStory(s.id, 'read'); } }, icon('info'), 'Read the article'),
            h('button.btn.btn--outline', { type: 'button', onclick: surprise }, icon('shuffle', 15), 'SURPRISE ME'))),
        h('div.hero__dots', { role: 'tablist', 'aria-label': 'Featured story' }, featured.map(function (f, i) {
          return h('button.hero__dot' + (i === slide ? '.is-on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(i === slide), 'aria-label': f.title, onclick: function () { go(i); } });
        }))),
      h('div.rows',
        row('You didn\'t vote yet', unvoted(STORIES, app.votes).slice(0, 8).map(function (x) { return posterCard(app, x); }), 'unvoted'),
        row('Top 10 today', topTen(STORIES).map(function (x, i) { return topCard(app, x, i + 1); }), 'top'),
        row('Workplace Nightmares', inCategory(STORIES, 'Workplace Nightmares').map(function (x) { return posterCard(app, x); }), 'workplace'),
        row('New on LoreWire', newest(STORIES).map(function (x) { return posterCard(app, x); }), 'new')),
      footer());
  }

  function go(i) { slide = (i + HERO) % HERO; render(); restart(); }
  function restart() { clearInterval(timer); timer = setInterval(function () { if (!app.modalOpen()) go(slide + 1); }, ROTATE_MS); }
  function surprise() { app.openStory(STORIES[Math.floor(Math.random() * STORIES.length)].id); }

  function footer() {
    var col = function (title, links) {
      return h('div.foot__col', h('b', { text: title }), links.map(function (l) { return h('button.foot__link', { type: 'button', onclick: function () { toast(l + ' is a page on the real site, not part of this demo.'); } }, l); }));
    };
    return h('footer.foot',
      h('div.foot__brand', h('span.logo', h('span', { text: 'LORE' }), h('span.logo__red', { text: 'WIRE' })), h('small.mono', { text: TAGLINE.toUpperCase() })),
      col('HELP', ['FAQ', 'Contact', 'Accessibility']),
      col('LEGAL', ['Privacy', 'Terms', 'Cookie Policy', 'DMCA', 'Imprint']),
      col('LOREWIRE', ['About', 'Community Guidelines']),
      h('small.foot__bottom.mono', { text: '© 2026 LOREWIRE' }));
  }

  return { el: el, show: function () { render(); restart(); }, hide: function () { clearInterval(timer); }, render: render };
}
