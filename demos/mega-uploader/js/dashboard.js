/* Mega Uploader demo: the Dashboard. Every platform at a glance: library size, money, profit per
   platform and run activity. All figures come from data.js and are totalled in logic.js. */

import { DASHBOARD } from './data.js';
import { profitTotals, dashboardKpis, platformById, fmtInt, fmtMoney, dateLabel } from './logic.js';
import { h, icon, dot, menuButton, notInDemo, toast } from './dom.js';

export function createDashboard(app) {
  var el = h('section.screen.dash', { 'aria-label': 'Dashboard' });
  var platformFilter = '';

  function render() {
    var totals = profitTotals(DASHBOARD);
    var kpi = dashboardKpis(DASHBOARD);
    var rows = DASHBOARD.platformRows.filter(function (r) { return !platformFilter || r.platform === platformFilter; });
    var maxProfit = Math.max.apply(null, DASHBOARD.profit.map(function (p) { return p.value; }));
    var filterLabel = platformFilter ? platformById(platformFilter).name : 'All Platforms';
    var filterBtn = h('button.btn.btn--select', { type: 'button', 'aria-haspopup': 'menu', onclick: function () { openFilter(filterBtn); } },
      dot(platformFilter ? platformById(platformFilter).color : 'currentColor'), h('span', { text: filterLabel }), icon('down', 13));

    var view = h('div.screen__in',
      h('div.page-head',
        h('div', h('h1', { text: 'Dashboard' }), h('p.sub', { text: (platformFilter ? filterLabel : 'All platforms') + ' · your whole portfolio at a glance.' })),
        h('div.page-head__actions',
          filterBtn,
          h('button.btn', { type: 'button', onclick: function () { notInDemo('Editing the dashboard'); } }, icon('sun', 14), 'Edit dashboard'),
          h('button.btn.btn--ghost', { type: 'button', onclick: function () { notInDemo('Help'); } }, icon('help', 14), 'Need help?'))),

      h('div.kpis',
        kpiCard('ARTICLES IN LIBRARY', fmtInt(kpi.articles), 'Shared across all platforms'),
        kpiCard('PLATFORMS CONNECTED', fmtInt(kpi.platforms), kpi.platforms + ' with build activity'),
        kpiCard('ACCOUNTS · ALL PLATFORMS', fmtInt(kpi.accounts), 'Migrated from the sheets'),
        kpiCard('VERTICALS', fmtInt(kpi.verticals), DASHBOARD.geos + ' geos · ' + DASHBOARD.languages + ' languages · shared')),

      h('div.card.perf',
        h('div.card__head', h('span.cap', { text: 'COMBINED PERFORMANCE · ALL PLATFORMS' }),
          h('button.btn.btn--sm', { type: 'button', onclick: function () { notInDemo('Reports'); } }, 'Open in Reports', icon('down', 12))),
        h('div.perf__nums',
          bigNum('SPEND', fmtMoney(totals.spend)),
          bigNum('REVENUE', fmtMoney(totals.revenue)),
          bigNum('PROFIT 100%', fmtMoney(totals.profit), 'is-good'),
          bigNum('ROAS', totals.roas.toFixed(2))),
        h('div.perf__label.cap', { text: 'PROFIT BY PLATFORM' }),
        h('div.bars', DASHBOARD.profit.map(function (p) {
          var plat = platformById(p.platform);
          var w = p.value > 0 ? Math.max(0.6, p.value / maxProfit * 100) : 0;
          return h('div.bar-row',
            h('span.bar-row__name', { text: plat.name }),
            h('span.track', h('span.fill', { style: { width: w + '%', background: plat.color } })),
            h('span.bar-row__val.mono' + (p.value < 0 ? '.is-bad' : ''), { text: fmtMoney(p.value) }));
        }))),

      h('div.card.plats',
        h('div.card__head', h('span.cap', { text: 'PLATFORMS · CLICK TO OPEN' })),
        rows.map(function (r) {
          var p = platformById(r.platform);
          return h('button.plat-row', {
            type: 'button', style: { borderLeftColor: p.color },
            onclick: function () { app.setPlatform(p.id); app.go('workspace'); toast('Switched to ' + p.name + '. Here is its batch builder.'); }
          },
          h('span.plat-row__name', dot(p.color), h('span', h('b', { text: p.name }), h('small', { text: p.sub }))),
          h('span.plat-row__num.mono', { text: fmtInt(r.accounts), title: 'Accounts' }),
          h('span.plat-row__num.mono', { text: fmtInt(r.runs), title: 'Runs' }),
          h('span.plat-row__date.mono', { text: dateLabel(r.daysAgo, app.now), title: 'Last run' }),
          h('span.pill.pill--ok', icon('check', 11), r.runs + (r.runs === 1 ? ' run' : ' runs')),
          icon('right', 14));
        })),

      h('div.two',
        listCard('LIBRARY BY FEED · ALL PLATFORMS', DASHBOARD.libraryByFeed),
        listCard('TOP GEOS · BY ARTICLES', DASHBOARD.topGeos))
    );
    el.replaceChildren(view);
  }

  function openFilter(anchor) {
    var items = [{ label: 'All Platforms', check: !platformFilter, run: function () { setFilter(''); } }];
    DASHBOARD.platformRows.forEach(function (r) {
      items.push({ label: platformById(r.platform).name, check: platformFilter === r.platform, run: function () { setFilter(r.platform); } });
    });
    menuButton(anchor, items, { align: 'right' });
  }
  function setFilter(id) { platformFilter = id; render(); }

  return { el: el, show: render };
}

function kpiCard(label, value, caption) {
  return h('div.card.kpi', h('span.cap', { text: label }), h('b.kpi__num', { text: value }), h('small', { text: caption }));
}
function bigNum(label, value, cls) {
  return h('div.big', h('span.cap', { text: label }), h('b.big__num.mono' + (cls ? '.' + cls : ''), { text: value }));
}
function listCard(title, list) {
  var max = Math.max.apply(null, list.map(function (x) { return x.value; }));
  return h('div.card.list-card',
    h('div.card__head', h('span.cap', { text: title })),
    h('div.bars.bars--tight', list.map(function (x) {
      return h('div.bar-row',
        h('span.bar-row__name.mono', { text: x.label }),
        h('span.track', h('span.fill.fill--accent', { style: { width: Math.max(0.6, x.value / max * 100) + '%' } })),
        h('span.bar-row__val.mono', { text: fmtInt(x.value) }));
    })));
}
