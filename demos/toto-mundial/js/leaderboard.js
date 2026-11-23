/* Toto Mundial demo: the Leaderboard. Four rankings behind pill tabs, the pot split, the Monkey (a bot
   that picks at random, the score to beat) and a card per player that opens to show their last change. */

import { PEOPLE, ME, MONKEY, PAST, LIVE } from './data.js';
import { standings, aheadOfMonkey, potSplit, prizeFor, lastChange, at } from './logic.js';
import { t, num, signed, money, team, score, personName, shortDateTime } from './i18n.js';
import { h, icon, log } from './dom.js';
import { avatar, potCard, pill } from './parts.js';

var CATS = [
  { key: 'bank', label: 'lb.overall', sub: 'lb.sub.overall' },
  { key: 'matches', label: 'lb.matches', sub: 'lb.sub.matches' },
  { key: 'live', label: 'lb.live', sub: 'lb.sub.live' },
  { key: 'duels', label: 'lb.duels', sub: 'lb.sub.duels' }
];

export function createLeaders(app) {
  var el = h('section.screen.leaders');
  var view = { cat: 'bank', open: {} };

  function render() {
    var cat = CATS.filter(function (c) { return c.key === view.cat; })[0];
    var rows = standings(view.cat, app.extra());
    var overall = standings('bank', app.extra());
    var split = potSplit(PEOPLE.length);
    el.setAttribute('aria-label', t('lb.title'));
    el.replaceChildren(h('div.page',
      h('h1.h-hero', { text: t('lb.title') }),
      h('p.sub', { text: t(cat.sub) }),
      h('div.pills', { role: 'tablist', 'aria-label': t('lb.title') }, CATS.map(function (c) {
        var on = c.key === view.cat;
        return h('button.pill-tab' + (on ? '.is-on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(on), 'data-lb-cat': c.key, onclick: function () { view.cat = c.key; log('leaders', 'category', { cat: c.key }); render(); }, text: t(c.label) });
      })),
      view.cat === 'bank' ? potCard() : null,
      view.cat === 'bank' ? h('div.card.monkey',
        h('span.monkey__face', { 'aria-hidden': 'true', text: '🐒' }),
        h('span.monkey__txt', h('b', { text: t('monkey.name') }), h('small', { text: t('monkey.sub', { n: aheadOfMonkey(overall), total: overall.length }) })),
        h('span.monkey__pts', h('b.num', { text: num(MONKEY.bank) }), h('small', { text: t('pts') }))) : null,
      h('ol.lb', rows.map(function (r) { return rowCard(r, view.cat === 'bank' ? prizeFor(r.rank, split) : 0); }))));
  }

  function rowCard(r, prize) {
    var p = r.person;
    var isMe = p.id === ME;
    var name = isMe ? t('you') : personName(p);
    var open = !!view.open[p.id];
    var li = h('li.lb__row' + (isMe ? '.is-me' : '') + (open ? '.is-open' : ''), { 'data-person': p.id },
      h('button.lb__main', { type: 'button', 'aria-expanded': String(open), 'aria-label': t(open ? 'lb.collapse' : 'lb.expand', { name: name }), onclick: function () { toggle(p.id); } },
        h('b.lb__rank.num', { text: String(r.rank) }),
        avatar(p, { gold: r.rank <= 3 }),
        h('span.lb__who', h('b', { text: name }), h('small.muted', icon('bets', 13), h('span', { text: ' ' + t('lb.bets', { n: num(p.bets) }) }))),
        h('span.lb__pts',
          h('b.num', { text: signedIf(r.value) }), h('small', { text: t('pts') }),
          prize ? h('span.prize-chip', icon('trophy', 12), h('span.num', { text: money(prize) })) : null),
        icon(open ? 'up' : 'down', 18, 'lb__chev')));
    if (open) li.appendChild(details(p));
    return li;
  }

  /* Category totals can be negative (live and duels), so they carry their sign. */
  function signedIf(v) { return view.cat === 'bank' || view.cat === 'matches' ? num(v) : signed(v); }

  function details(p) {
    var c = lastChange(p, app.extra());
    var m = c.last.match === LIVE.id ? LIVE : PAST.filter(function (x) { return x.id === c.last.match; })[0];
    var when = m === LIVE ? at(0, LIVE.time) : at(m.day, m.time);
    /* Only the visitor's own pick is known here; other people's picks live on the Transparency page. */
    var line = p.id === ME && m.pick ? t('lb.pick', { x: score(m.pick) }) : '';
    var card = lastCard(t('tag.match'), when, team(m.home) + ' ' + t('vs') + ' ' + team(m.away), line, c.last.change);
    return h('div.lb__more',
      h('div.lb__tiles',
        h('div.lb-tile', h('small', { text: t('lb.before') }), h('b.num', { text: num(c.before) })),
        h('div.lb-tile' + (c.change > 0 ? '.lb-tile--up' : ''), h('small', { text: t('lb.change') }), h('b.num', h('span', { text: signed(c.change) }), c.change > 0 ? icon('trend', 16) : null)),
        h('div.lb-tile', h('small', { text: t('lb.now') }), h('b.num', { text: num(c.now) }))),
      h('small.lb__label', { text: t('lb.lastTime') }),
      card);
  }

  function lastCard(tag, when, title, line, change) {
    return h('div.last-card',
      h('div.last-card__top', pill(tag, 'tag'), h('small.muted.num', { text: shortDateTime(when) })),
      h('b', { text: title }),
      line ? h('small.muted', { text: line }) : null,
      h('span.pts-chip.pts-chip--' + (change > 0 ? 'green' : 'grey'), { text: change > 0 ? '+' + change : '0' }));
  }

  function toggle(id) {
    if (view.open[id]) delete view.open[id]; else view.open[id] = true;
    log('leaders', 'row', { person: id, open: !!view.open[id] });
    var old = el.querySelector('[data-person="' + id + '"]');
    var rows = standings(view.cat, app.extra());
    var r = rows.filter(function (x) { return x.id === id; })[0];
    var next = rowCard(r, view.cat === 'bank' ? prizeFor(r.rank, potSplit(PEOPLE.length)) : 0);
    old.replaceWith(next);
    next.querySelector('.lb__main').focus();
  }

  return { el: el, show: function () { render(); } };
}
