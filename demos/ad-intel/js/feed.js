/* Ad Intel demo: Fresh Finds, the main feed. KPIs on top, filters on the left, the ad table on the
   right. Picking one of our domains fills the Our Article column; HAVE and MISSING then show only
   the ads we already cover, or only the gaps. */

import { OUR_DOMAINS, OUR_ARTICLES } from './data.js';
import {
  num, pad, money, ratio, adUrl, filterAds, sortAds, counts, kpis, topVerticals, isWinner, ourVersions,
  activeFilters, policyLabel, brandOf, BRANDS, SORTS, csv, EMPTY_FILTERS
} from './logic.js';
import { h, icon, toast, segmented, log } from './dom.js';
import { creative } from './creative.js';

var BRAND_LABEL = {};
BRANDS.forEach(function (b) { BRAND_LABEL[b[0]] = b[1]; });

export function createFeed(app) {
  var el = h('section.view.feed', { 'aria-label': 'Fresh finds' });
  var lists = { domains: '', feeds: '', verticals: '' };
  var refreshing = false;

  function visible() {
    var f = Object.assign({}, app.filters, { query: app.query.feed || '' });
    return sortAds(filterAds(app.ads, f, OUR_ARTICLES), app.sort);
  }

  function render() {
    var rows = visible();
    app.order = rows.map(function (a) { return a.id; });
    app.keepFocus(el, function () {
      el.replaceChildren(kpiStrip(), h('div.feed__body', filters(), h('div.feed__main', toolbar(rows), table(rows))));
    });
  }

  /* ---------- KPIs ---------- */

  function kpiStrip() {
    var k = kpis(app.ads);
    var tile = function (n, label, hot) { return h('div.kpi', h('b.kpi__n' + (hot ? '.amber' : ''), { text: pad(n) }), h('small.kpi__l', { text: label })); };
    return h('div.kpis',
      tile(k.seen, 'SEEN THIS SCRAPE', true), tile(k.fresh, 'NEW 7D'), tile(k.winners, 'PROVEN WINNERS', true),
      tile(k.total, 'TOTAL TRACKED'), tile(k.competitors, 'COMPETITORS'), tile(k.verticals, 'VERTICALS'),
      h('div.kpis__tops', topVerticals(app.ads, 4).map(function (t) {
        return h('div.top', h('span.top__name', { text: t.vertical }), h('span.top__pct', { text: t.share + '%' }), h('span.top__bar', h('span', { style: { width: Math.min(100, t.share * 4) + '%' } })));
      })));
  }

  /* ---------- Filters ---------- */

  function set(key, value) { app.filters[key] = value; log('feed', 'filter', { key: key, value: value }); render(); }
  function toggleIn(key, value) {
    var list = app.filters[key].slice();
    var i = list.indexOf(value);
    if (i === -1) list.push(value); else list.splice(i, 1);
    set(key, list);
  }

  function filters() {
    var f = app.filters;
    var n = activeFilters(f);
    var domainSelect = h('select.input.select', { 'aria-label': 'Our domain', 'data-our-domain': '', onchange: function () {
      app.filters.ourDomain = domainSelect.value;
      if (!domainSelect.value) app.filters.ourArticle = 'all';
      render();
    } }, h('option', { value: '', text: 'choose a domain…' }), OUR_DOMAINS.map(function (d) {
      return h('option', { value: d.domain, selected: f.ourDomain === d.domain ? true : null, text: d.domain + ' (' + num(d.articles) + ')' });
    }));
    return h('aside.filters', { 'aria-label': 'Filters' },
      h('div.filters__head', h('span.cap', { text: 'FILTERS' }), h('button.link-btn.green', { type: 'button', 'data-clear': '', disabled: n ? null : true, onclick: function () {
        app.filters = Object.assign({}, EMPTY_FILTERS, { domains: [], feeds: [], verticals: [] });
        lists.domains = lists.feeds = lists.verticals = '';
        render();
      } }, 'CLEAR (' + n + ')')),
      group('OUR DOMAIN', domainSelect),
      group('OUR ARTICLE', segmented([['all', 'ALL'], ['have', 'HAVE'], ['missing', 'MISSING']], f.ourArticle, function (v) { set('ourArticle', v); }, { disabled: !f.ourDomain, label: 'Our article', key: 'our' }),
        f.ourDomain ? null : h('p.hint', 'Pick a domain to fill the ', h('b', { text: 'Our Article' }), ' column.')),
      group('LANDING PAGE', segmented([['all', 'ALL'], ['hide', 'HIDE DEAD'], ['only', 'ONLY DEAD']], f.landing, function (v) { set('landing', v); }, { label: 'Landing page', key: 'landing' })),
      checklist('DOMAIN', 'domains', 'domain', 'Filter domain…'),
      checklist('FEED', 'feeds', 'feed', 'Filter feed…'),
      checklist('VERTICAL', 'verticals', 'vertical', 'Filter vertical…'));
  }

  function group(title) {
    return h('div.fgroup', h('span.cap', { text: title }), Array.prototype.slice.call(arguments, 1));
  }

  function checklist(title, key, field, placeholder) {
    var q = lists[key].toLowerCase();
    var items = counts(app.ads, field).filter(function (c) { return !q || c.value.toLowerCase().indexOf(q) !== -1; });
    var input = h('input.input.input--sm', { type: 'search', placeholder: placeholder, 'aria-label': placeholder, value: lists[key], 'data-focus': 'list-' + key, oninput: function () { lists[key] = input.value; render(); } });
    return group(title, input, h('div.checks', items.length ? items.map(function (c) {
      var on = app.filters[key].indexOf(c.value) !== -1;
      return h('label.check', h('input', { type: 'checkbox', checked: on ? true : null, 'data-check': key + ':' + c.value, onchange: function () { toggleIn(key, c.value); } }),
        h('span.check__name', { text: c.value }), h('span.check__n', { text: num(c.count) }));
    }) : h('p.hint', { text: 'Nothing matches.' })));
  }

  /* ---------- Toolbar ---------- */

  function toolbar(rows) {
    var picked = rows.filter(function (a) { return app.selected.indexOf(a.id) !== -1; });
    var out = picked.length ? picked : rows;
    return h('div.toolbar',
      h('span.toolbar__count', h('b', { text: 'ads' }), ' · showing ' + (rows.length ? '1–' + rows.length : '0') + ' of ' + num(app.ads.length) + (picked.length ? ' · ' + picked.length + ' selected' : '')),
      h('span.toolbar__group', h('small.cap', { text: 'sorted by' }), SORTS.map(function (s) {
        var on = app.sort === s[0];
        return h('button.tool' + (on ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(on), 'data-sort': s[0], onclick: function () { app.sort = s[0]; render(); } }, s[1] + (on ? ' ↓' : ''));
      })),
      h('span.toolbar__group', h('small.cap', { text: 'images' }), ['s', 'm', 'l'].map(function (s) {
        var on = app.thumbs === s;
        return h('button.tool.tool--box' + (on ? '.is-amber' : ''), { type: 'button', 'aria-pressed': String(on), 'aria-label': 'Image size ' + s.toUpperCase(), 'data-thumbs': s, onclick: function () { app.thumbs = s; render(); } }, s.toUpperCase());
      })),
      h('span.toolbar__actions',
      h('button.obtn', { type: 'button', onclick: function () { toast('Choosing columns isn\'t part of this demo. Scroll the table sideways to see them all.'); } }, '≡ COLUMNS'),
      h('button.obtn', { type: 'button', 'data-metrics': '', disabled: refreshing ? true : null, onclick: refreshMetrics }, icon('refresh', 12), refreshing ? 'REFRESHING…' : 'METRICS'),
      h('button.obtn', { type: 'button', 'data-export': '', disabled: out.length ? null : true, onclick: function () { exportCsv(out); } }, icon('down', 12), 'EXPORT CSV (' + num(out.length) + ')'),
      h('button.obtn', { type: 'button', onclick: function () { toast('Export to Google Sheets isn\'t part of this demo. The CSV export works.'); } }, '↗ EXPORT TO SHEET')));
  }

  function refreshMetrics() {
    refreshing = true;
    render();
    setTimeout(function () {
      refreshing = false;
      render();
      var n = app.ads.filter(function (a) { return a.revenue != null; }).length;
      toast('Campaign metrics refreshed for ' + n + ' ads, matched by landing URL.');
    }, 1200);
  }

  function exportCsv(rows) {
    var text = csv(rows, [
      ['page', function (a) { return a.page; }], ['domain', function (a) { return a.domain; }], ['headline', function (a) { return a.headline; }],
      ['vertical', function (a) { return a.vertical; }], ['country', function (a) { return a.country; }], ['language', function (a) { return a.lang; }],
      ['days_running', function (a) { return a.days; }], ['revenue', function (a) { return a.revenue; }], ['rpc', function (a) { return a.rpc; }],
      ['url', function (a) { return adUrl(a); }]
    ]);
    var a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/csv' })), download: 'adintel-fresh-finds.csv' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('Exported ' + rows.length + ' ads to CSV.');
    log('feed', 'export', { rows: rows.length });
  }

  /* ---------- Table ---------- */

  function table(rows) {
    var all = rows.length && rows.every(function (a) { return app.selected.indexOf(a.id) !== -1; });
    var head = ['', '', 'PAGE', 'DOMAIN', 'BRAND', 'CREATIVE LANG', 'POLICY', 'HEADLINE', 'OUR ARTICLE', 'DAYS RUN', 'REVENUE', 'RPC', 'VERTICAL', 'GEO', 'URL'];
    return h('div.table-scroll',
      h('table.grid.grid--' + app.thumbs,
        h('thead', h('tr', head.map(function (t, i) {
          if (i === 0) return h('th.col-check', h('input', { type: 'checkbox', 'aria-label': 'Select all', checked: all ? true : null, onchange: function () {
            app.selected = all ? [] : rows.map(function (a) { return a.id; });
            render();
          } }));
          return h('th', { text: t });
        }))),
        h('tbody', rows.length ? rows.map(row) : h('tr', h('td.empty', { colspan: String(head.length) }, 'No ads match these filters. ', h('button.link-btn.green', { type: 'button', onclick: function () { el.querySelector('[data-clear]').click(); } }, 'Clear them'))))));
  }

  function row(ad) {
    var on = app.selected.indexOf(ad.id) !== -1;
    var mine = app.filters.ourDomain ? ourVersions(ad, OUR_ARTICLES, app.filters.ourDomain) : null;
    var brand = brandOf(ad, app.work);
    var open = function () { app.openAd(ad.id); };
    return h('tr.row' + (on ? '.is-picked' : '') + (app.lastAd === ad.id ? '.is-last' : ''), { 'data-ad': ad.id, tabindex: '0', onclick: function (e) {
      if (e.target.closest('input, button, a')) return;
      open();
    }, onkeydown: function (e) { if (e.key === 'Enter' && e.target === e.currentTarget) open(); } },
      h('td.col-check', h('input', { type: 'checkbox', 'aria-label': 'Select ' + ad.headline, checked: on ? true : null, onchange: function () {
        var i = app.selected.indexOf(ad.id);
        if (i === -1) app.selected.push(ad.id); else app.selected.splice(i, 1);
        render();
      } })),
      h('td.col-thumb', creative(ad, 'thumb')),
      h('td.col-page', h('b', { text: ad.page })),
      h('td.mono', { text: ad.domain }),
      h('td', h('span.chip' + (brand === 'car' ? '.chip--blue' : brand === 'brand' ? '.chip--blue' : ''), { text: BRAND_LABEL[brand] })),
      h('td.mono', { text: ad.lang }),
      h('td', h('span.chip.chip--dot' + (ad.policy === 'clear' ? '.chip--green' : '.chip--amber'), { text: policyLabel(ad) })),
      h('td.col-headline', h('span', { text: ad.headline })),
      h('td.col-our', ourCell(mine)),
      h('td.mono.nowrap', isWinner(ad) ? h('span.amber', { title: 'Proven winner: running ' + ad.days + ' days' }, '★ ') : null, ad.days + 'd'),
      h('td.mono.nowrap', { text: money(ad.revenue) }),
      h('td.mono', { text: ratio(ad.rpc) }),
      h('td', { text: ad.vertical }),
      h('td.mono', { text: ad.country }),
      h('td.col-url.mono', ad.dead ? h('span.chip.chip--red', { text: 'DEAD' }) : null, h('span', { title: adUrl(ad), text: adUrl(ad).replace('https://', '') })));
  }

  function ourCell(mine) {
    if (!mine) return h('span.muted', { text: '–' });
    if (!mine.any) return h('span.chip.chip--amber', { 'data-our': 'missing', text: 'MISSING' });
    var a = mine.clones[0] || mine.close[0];
    return h('span.our', { 'data-our': 'have', title: a.title }, h('span.green', { text: '● ' }), a.title);
  }

  return { el: el, show: render, render: render, visible: visible };
}
