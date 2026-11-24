/* Launch Desk demo: the Overview. Every platform at a glance: library size, launches per
   platform and launch activity. All figures come from data.js and are totalled in logic.js. */

import { DASHBOARD } from './data.js';
import { launchTotals, dashboardKpis, platformById, fmtInt, dateLabel } from './logic.js';
import { h, icon, dot, menuButton, toast } from './dom.js';

export function createDashboard(app) {
  var el = h('section.screen.dash', { 'aria-label': 'Overview' });
  var platformFilter = '';

  function render() {
    var totals = launchTotals(DASHBOARD);
    var kpi = dashboardKpis(DASHBOARD);
    var rows = DASHBOARD.platformRows.filter(function (r) { return !platformFilter || r.platform === platformFilter; });
    var maxLaunched = Math.max.apply(null, DASHBOARD.launched.map(function (p) { return p.live + p.failed; }));
    var filterLabel = platformFilter ? platformById(platformFilter).name : 'All Platforms';
    var filterBtn = h('button.btn.btn--select', { type: 'button', 'aria-haspopup': 'menu', onclick: function () { openFilter(filterBtn); } },
      dot(platformFilter ? platformById(platformFilter).color : 'currentColor'), h('span', { text: filterLabel }), icon('down', 13));

    var view = h('div.screen__in',
      h('div.page-head',
        h('div', h('h1', { text: 'Overview' }), h('p.sub', { text: (platformFilter ? filterLabel : 'All platforms') + ' · every launch at a glance.' })),
        h('div.page-head__actions', filterBtn)),

      h('div.kpis',
        kpiCard('CREATIVES IN LIBRARY', fmtInt(kpi.creatives), 'Shared across all platforms'),
        kpiCard('PLATFORMS CONNECTED', fmtInt(kpi.platforms), kpi.platforms + ' with build activity'),
        kpiCard('ACCOUNTS · ALL PLATFORMS', fmtInt(kpi.accounts), 'Checked before every launch'),
        kpiCard('VERTICALS', fmtInt(kpi.verticals), DASHBOARD.geos + ' geos · ' + DASHBOARD.languages + ' languages · shared')),

      h('div.card.perf',
        h('div.card__head', h('span.cap', { text: 'LAUNCHES · LAST 30 DAYS · ALL PLATFORMS' })),
        h('div.perf__nums',
          bigNum('CAMPAIGNS LAUNCHED', fmtInt(totals.launched)),
          bigNum('LIVE', fmtInt(totals.live), 'is-good'),
          bigNum('FAILED', fmtInt(totals.failed)),
          bigNum('SUCCESS RATE', totals.rate.toFixed(1) + '%')),
        h('div.perf__label.cap', { text: 'CAMPAIGNS LAUNCHED BY PLATFORM' }),
        h('div.bars', DASHBOARD.launched.map(function (p) {
          var plat = platformById(p.platform);
          var n = p.live + p.failed;
          return h('div.bar-row',
            h('span.bar-row__name', { text: plat.name }),
            h('span.track', h('span.fill', { style: { width: Math.max(0.6, n / maxLaunched * 100) + '%', background: plat.color } })),
            h('span.bar-row__val.mono', { text: fmtInt(n) }));
        }))),

      h('div.card.plats',
        h('div.card__head', h('span.cap', { text: 'PLATFORMS · CLICK TO OPEN' })),
        h('div.plat-row.plat-row--head', { 'aria-hidden': 'true' },
          ['Platform', 'Accounts', 'Launches', 'Last launch', 'Status', ''].map(function (t) { return h('span.cap', { text: t }); })),
        rows.map(function (r) {
          var p = platformById(r.platform);
          return h('button.plat-row', {
            type: 'button', style: { borderLeftColor: p.color },
            onclick: function () { app.setPlatform(p.id); app.go('workspace'); toast('Switched to ' + p.name + '. Here are its batches.'); }
          },
          h('span.plat-row__name', dot(p.color), h('span', h('b', { text: p.name }), h('small', { text: p.sub }))),
          h('span.plat-row__num.mono', { text: fmtInt(r.accounts), title: 'Accounts' }),
          h('span.plat-row__num.mono', { text: fmtInt(r.runs), title: 'Launches' }),
          h('span.plat-row__date.mono', { text: dateLabel(r.daysAgo, app.now), title: 'Last launch' }),
          h('span.pill.pill--ok', icon('check', 11), 'Connected'),
          icon('right', 14));
        })),

      h('div.two',
        listCard('CREATIVES BY BRAND · ALL PLATFORMS', DASHBOARD.creativesByBrand),
        listCard('TOP GEOS · BY CAMPAIGNS', DASHBOARD.topGeos))
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
