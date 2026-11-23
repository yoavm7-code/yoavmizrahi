/* Toto Mundial demo: pieces more than one screen uses. Section headings, avatars, a team with its
   flag, the pot split card and countdowns that tick in place. */

import { ME, PEOPLE } from './data.js';
import { potSplit, countdown } from './logic.js';
import { t, num, money, team, duration } from './i18n.js';
import { h, icon } from './dom.js';
import { flag } from './flags.js';

/* "Up next" style heading: optional icon, the title, and an optional link on the far side. */
export function sectionHead(title, opts) {
  var o = opts || {};
  return h('div.sec-head',
    h('h2.sec-head__title' + (o.underline ? '.is-underlined' : ''), o.icon ? icon(o.icon, 20, 'ic--gold') : null, h('span', { text: title })),
    o.link ? h('button.link-btn', { type: 'button', onclick: o.link.run }, h('span', { text: o.link.label }), icon('out', 14)) : null);
}

export function avatar(person, opts) {
  var o = opts || {};
  var name = person[document.documentElement.lang === 'he' ? 'he' : 'en'];
  return h('span.avatar' + (o.gold ? '.avatar--gold' : '') + (person.id === ME ? '.avatar--me' : '') + (o.small ? '.avatar--sm' : ''), { 'aria-hidden': 'true', text: name.charAt(0).toUpperCase() });
}

export function teamLine(code, opts) {
  var o = opts || {};
  return h('span.team' + (o.end ? '.team--end' : ''), flag(code, o.size || 24), h('span.team__name', { text: team(code) }));
}

export function pill(text, tone) { return h('span.pill' + (tone ? '.pill--' + tone : ''), { text: text }); }

export function pointsChip(points, kind) {
  var tone = kind === 'exact' ? 'green' : kind === 'direction' ? 'green-soft' : 'grey';
  return h('span.pts-chip.pts-chip--' + tone, { text: points > 0 ? '+' + points : '0' });
}

/* ---------- The pot split ---------- */

var SHARE_ICON = { king: 'crown', second: 'medal', third: 'medal', picks: 'trophy', live: 'sparkle' };

export function potCard() {
  var s = potSplit(PEOPLE.length);
  var share = function (key) { return s.shares.filter(function (x) { return x.key === key; })[0]; };
  var tile = function (x, big) {
    return h('div.split-tile.split-tile--' + x.tone + (big ? '.split-tile--big' : ''),
      h('span.split-tile__label', icon(SHARE_ICON[x.key], 15), h('span', { text: t('share.' + x.key) }), h('small', { text: x.pct + '%' })),
      h('b.split-tile__amount.num', { text: money(x.amount) }));
  };
  return h('section.card.split', { 'aria-label': t('split.title') },
    h('h3.card-title', icon('trophy', 18, 'ic--gold'), h('span', { text: t('split.title') })),
    h('div.split__row',
      h('div.split-cell', h('small', { text: t('split.pot') }), h('b.num', { text: money(s.pot) })),
      h('div.split-cell', h('small', icon('wrench', 12), h('span', { text: t('split.cost') })), h('b.num', { text: '−' + money(s.cost) })),
      h('div.split-cell.split-cell--gold', h('small', { text: t('split.toSplit') }), h('b.num', { text: money(s.toSplit) }))),
    h('div.split__grid', tile(share('king'), true), tile(share('second')), tile(share('third')), tile(share('picks')), tile(share('live'))));
}

/* ---------- Countdowns ---------- */
/* A span that shows "Locks in 1h 47m" (or any key with {time}) and updates itself on tick(). */

export function countdownEl(target, key) {
  return h('span.countdown.num', { 'data-countdown': String(target.getTime()), 'data-key': key });
}
export function paintCountdowns(root, now) {
  root.querySelectorAll('[data-countdown]').forEach(function (el) {
    var cd = countdown(new Date(Number(el.getAttribute('data-countdown'))), now);
    el.textContent = t(el.getAttribute('data-key'), { time: duration(cd) });
  });
}

export function pointsLabel(n) { return h('span.pts', h('b.num', { text: num(n) }), h('small', { text: ' ' + t('pts') })); }
