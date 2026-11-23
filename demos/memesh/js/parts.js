/* Memesh demo: pieces more than one app uses. The punch grid, initials avatars, the capacity bar and
   the availability chip. */

import { PRICES } from './data.js';
import { initials, level, free } from './logic.js';
import { t } from './i18n.js';
import { h } from './dom.js';

/* Twelve squares, two rows of six: used entries filled. */
export function punchGrid(card) {
  var cells = [];
  for (var i = 0; i < PRICES.cardEntries; i++) cells.push(h('span.punch-cell' + (i < card.used ? '.is-used' : ''), { 'aria-hidden': 'true' }));
  return h('div.punch-grid', { role: 'img', 'aria-label': t('p.left', { n: PRICES.cardEntries - card.used, total: PRICES.cardEntries }) }, cells);
}

export function avatar(name, tone) {
  return h('span.avatar.avatar--' + (tone || 'peach'), { 'aria-hidden': 'true', text: initials(name) });
}

/* The green / amber / red capacity bar for a round. */
export function capacityBar(round) {
  var lv = level(round);
  return h('span.bar.bar--wide', h('span.bar__fill.bar__fill--' + lv, { style: { width: Math.max(2, round.booked / round.capacity * 100) + '%' } }));
}

export function freeLine(round) { return t('d.free', { n: free(round) }); }
