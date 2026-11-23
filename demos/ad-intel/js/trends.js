/* Ad Intel demo: Trends. Verticals ranked by what competitors pushed this week, with who pushes
   them. Clicking a vertical opens Fresh Finds filtered to it. */

import { trends, pad, num } from './logic.js';
import { h } from './dom.js';

export function createTrends(app) {
  var el = h('section.view.trends', { 'aria-label': 'Trends' });

  function render() {
    var q = String(app.query.trends || '').trim().toLowerCase();
    var rows = trends(app.ads).filter(function (r) { return !q || r.vertical.toLowerCase().indexOf(q) !== -1; });
    el.replaceChildren(
      h('div.page-head', h('b.cap.white', { text: 'TRENDS' }), h('span.muted.mono', { text: 'what competitors are pushing · sorted by fresh activity' })),
      h('div.table-scroll', h('table.grid.trends__table',
        h('thead', h('tr', ['VERTICAL', 'ACTIVITY', 'TOTAL', 'NEW 7D', 'RIVALS', 'COMPETITORS'].map(function (t) { return h('th', { text: t }); }))),
        h('tbody', rows.length ? rows.map(function (r) {
          var shown = r.competitors.slice(0, 4);
          return h('tr.row', { 'data-vertical': r.vertical, tabindex: '0', title: 'Show ' + r.vertical + ' ads in Fresh Finds',
            onclick: function () { app.showVertical(r.vertical); },
            onkeydown: function (e) { if (e.key === 'Enter') app.showVertical(r.vertical); } },
            h('td', { text: r.vertical }),
            h('td.col-bar', h('span.bar', h('span', { style: { width: Math.round(r.bar * 100) + '%' } }))),
            h('td.mono.num', { text: num(r.total) }),
            h('td.mono.num' + (r.fresh ? '.amber' : '.muted'), { text: pad(r.fresh) }),
            h('td.mono.num', { text: pad(r.rivals) }),
            h('td', h('div.dchips', shown.map(function (d) { return h('span.dchip', { text: d }); }), r.competitors.length > shown.length ? h('span.muted.mono', { text: '+' + (r.competitors.length - shown.length) }) : null)));
        }) : h('tr', h('td.empty', { colspan: '6', text: 'No vertical matches "' + q + '".' }))))));
  }

  return { el: el, show: render, render: render };
}
