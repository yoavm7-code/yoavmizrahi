/* Ad Radar demo: Trends. Verticals ranked by what competitors pushed this week, with who pushes
   them. Clicking a vertical opens Ads filtered to it. */

import { trends, pad, num } from './logic.js';
import { h, icon } from './dom.js';

export function createTrends(app) {
  var el = h('section.view.trends', { 'aria-label': 'Trends' });

  function render() {
    var q = String(app.query.trends || '').trim().toLowerCase();
    var rows = trends(app.ads).filter(function (r) { return !q || r.vertical.toLowerCase().indexOf(q) !== -1; });
    el.replaceChildren(
      h('div.page-head', h('h1', { text: 'Trends' }), h('p.muted', { text: 'What competitors are pushing, busiest this week first. Click a vertical to see its ads.' })),
      h('div.card.table-scroll', h('table.grid.trends__table',
        h('thead', h('tr', [['Vertical'], ['Activity'], ['Ads', 'num'], ['New this week', 'num'], ['Rivals', 'num'], ['Competitors'], ['']].map(function (t) { return h('th' + (t[1] ? '.' + t[1] : ''), { text: t[0] }); }))),
        h('tbody', rows.length ? rows.map(function (r) {
          var shown = r.competitors.slice(0, 4);
          return h('tr.row', { 'data-vertical': r.vertical, tabindex: '0', title: 'Show ' + r.vertical + ' ads',
            onclick: function () { app.showVertical(r.vertical); },
            onkeydown: function (e) { if (e.key === 'Enter') app.showVertical(r.vertical); } },
            h('td', h('b', { text: r.vertical })),
            h('td.col-bar', h('span.bar', h('span', { style: { width: Math.round(r.bar * 100) + '%' } }))),
            h('td.mono.num', { text: num(r.total) }),
            h('td.mono.num' + (r.fresh ? '.accent' : '.faint'), { text: r.fresh ? '+' + pad(r.fresh) : '00' }),
            h('td.mono.num', { text: pad(r.rivals) }),
            h('td', h('div.dchips', shown.map(function (d) { return h('span.dchip.mono', { text: d }); }), r.competitors.length > shown.length ? h('span.muted.mono', { text: '+' + (r.competitors.length - shown.length) }) : null)),
            h('td.col-go', icon('arrow', 15)));
        }) : h('tr', h('td.empty', { colspan: '7', text: 'No vertical matches "' + q + '".' }))))));
  }

  return { el: el, show: render, render: render };
}
