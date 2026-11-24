/* Ad Radar demo: Ads, the main list. KPIs on top, filters on the left, the ad table on the right.
   Picking one of our sites fills the Our coverage column; Have and Missing then show only the ads
   we already cover, or only the gaps. */

import { OUR_SITES, OUR_ARTICLES } from './data.js';
import {
  num, adUrl, filterAds, sortAds, counts, kpis, topVerticals, isLongRunner, ourVersions,
  activeFilters, policyLabel, brandOf, BRANDS, SORTS, csv, EMPTY_FILTERS
} from './logic.js';
import { h, icon, toast, segmented, log } from './dom.js';
import { creative } from './creative.js';

var BRAND_LABEL = {};
BRANDS.forEach(function (b) { BRAND_LABEL[b[0]] = b[1]; });

export function createAds(app) {
  var el = h('section.view.ads', { 'aria-label': 'Ads' });
  var lists = { domains: '', languages: '', verticals: '' };

  function visible() {
    var f = Object.assign({}, app.filters, { query: app.query.ads || '' });
    return sortAds(filterAds(app.ads, f, OUR_ARTICLES), app.sort);
  }

  function render() {
    var rows = visible();
    app.order = rows.map(function (a) { return a.id; });
    app.keepFocus(el, function () {
      el.replaceChildren(kpiStrip(), h('div.ads__body', filters(), h('div.card.ads__main', toolbar(rows), table(rows))));
    });
  }

  /* ---------- KPIs ---------- */

  function kpiStrip() {
    var k = kpis(app.ads);
    var tile = function (n, label, hot) { return h('div.kpi', h('b.kpi__n' + (hot ? '.accent' : ''), { text: num(n) }), h('small.kpi__l', { text: label })); };
    return h('div.kpis',
      tile(k.found, 'Found this scan', true), tile(k.fresh, 'New this week'), tile(k.longRunners, 'Long runners', true),
      tile(k.total, 'Ads tracked'), tile(k.competitors, 'Competitors'), tile(k.verticals, 'Verticals'),
      h('div.kpi.kpi--tops', h('small.kpi__l', { text: 'Busiest verticals' }), h('div.tops', topVerticals(app.ads, 4).map(function (t) {
        return h('div.top', h('span.top__name', { text: t.vertical }), h('span.top__pct.mono', { text: t.share + '%' }), h('span.top__bar', h('span', { style: { width: Math.min(100, t.share * 4) + '%' } })));
      }))));
  }

  /* ---------- Filters ---------- */

  function set(key, value) { app.filters[key] = value; log('ads', 'filter', { key: key, value: value }); render(); }
  function toggleIn(key, value) {
    var list = app.filters[key].slice();
    var i = list.indexOf(value);
    if (i === -1) list.push(value); else list.splice(i, 1);
    set(key, list);
  }

  function filters() {
    var f = app.filters;
    var n = activeFilters(f);
    var siteSelect = h('select.input.select', { 'aria-label': 'Our site', 'data-our-site': '', onchange: function () {
      app.filters.ourSite = siteSelect.value;
      if (!siteSelect.value) app.filters.coverage = 'all';
      log('ads', 'filter', { key: 'ourSite', value: siteSelect.value });
      render();
    } }, h('option', { value: '', text: 'Choose a site' }), OUR_SITES.map(function (d) {
      return h('option', { value: d.domain, selected: f.ourSite === d.domain ? true : null, text: d.domain + ' (' + num(d.articles) + ')' });
    }));
    return h('aside.card.filters', { 'aria-label': 'Filters' },
      h('div.filters__head', h('b', { text: 'Filters' }), h('button.link-btn', { type: 'button', 'data-clear': '', disabled: n ? null : true, onclick: function () {
        app.filters = Object.assign({}, EMPTY_FILTERS, { domains: [], languages: [], verticals: [] });
        lists.domains = lists.languages = lists.verticals = '';
        log('ads', 'filter', { key: 'all', value: 'cleared' });
        render();
      } }, 'Clear (' + n + ')')),
      h('div.fgroup.fgroup--gap',
        h('span.label', { text: 'Gap finder' }),
        siteSelect,
        segmented([['all', 'All'], ['have', 'Have'], ['missing', 'Missing']], f.coverage, function (v) { set('coverage', v); }, { disabled: !f.ourSite, label: 'Our coverage', key: 'cov' }),
        h('p.hint', f.ourSite ? 'Have: we already cover the topic. Missing: a gap to write.' : 'Pick one of our sites to see which ads we already cover.')),
      group('Landing page', segmented([['all', 'All'], ['hide', 'Hide dead'], ['only', 'Only dead']], f.landing, function (v) { set('landing', v); }, { label: 'Landing page', key: 'landing' })),
      checklist('Domain', 'domains', 'domain', 'Filter domains'),
      checklist('Vertical', 'verticals', 'vertical', 'Filter verticals'),
      checklist('Language', 'languages', 'lang', 'Filter languages'));
  }

  function group(title) {
    return h('div.fgroup', h('span.label', { text: title }), Array.prototype.slice.call(arguments, 1));
  }

  function checklist(title, key, field, placeholder) {
    var q = lists[key].toLowerCase();
    var items = counts(app.ads, field).filter(function (c) { return !q || c.value.toLowerCase().indexOf(q) !== -1; });
    var input = h('input.input.input--sm', { type: 'search', placeholder: placeholder, 'aria-label': placeholder, value: lists[key], 'data-focus': 'list-' + key, oninput: function () { lists[key] = input.value; render(); } });
    return group(title, input, h('div.checks', items.length ? items.map(function (c) {
      var on = app.filters[key].indexOf(c.value) !== -1;
      return h('label.check', h('input', { type: 'checkbox', checked: on ? true : null, 'data-check': key + ':' + c.value, onchange: function () { toggleIn(key, c.value); } }),
        h('span.check__name' + (field === 'domain' || field === 'lang' ? '.mono' : ''), { text: c.value }), h('span.check__n.mono', { text: num(c.count) }));
    }) : h('p.hint', { text: 'Nothing matches.' })));
  }

  /* ---------- Toolbar ---------- */

  function toolbar(rows) {
    var picked = rows.filter(function (a) { return app.selected.indexOf(a.id) !== -1; });
    var out = picked.length ? picked : rows;
    return h('div.toolbar',
      h('span.toolbar__count', { 'data-count': '' }, h('b', { text: num(rows.length) }), ' of ' + num(app.ads.length) + ' ads' + (picked.length ? ', ' + picked.length + ' selected' : '')),
      h('span.toolbar__group', h('small.label', { text: 'Sort' }), h('div.pills', SORTS.map(function (s) {
        var on = app.sort === s[0];
        return h('button.pill' + (on ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(on), 'data-sort': s[0], onclick: function () { app.sort = s[0]; log('ads', 'sort', { by: s[0] }); render(); } }, s[1]);
      }))),
      h('span.toolbar__group', h('small.label', { text: 'Images' }), h('div.pills', ['s', 'm', 'l'].map(function (s) {
        var on = app.thumbs === s;
        return h('button.pill.pill--sq' + (on ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(on), 'aria-label': 'Image size ' + s.toUpperCase(), 'data-thumbs': s, onclick: function () { app.thumbs = s; render(); } }, s.toUpperCase());
      }))),
      h('span.fill'),
      h('button.btn', { type: 'button', 'data-export': '', disabled: out.length ? null : true, onclick: function () { exportCsv(out); } }, icon('down', 14), 'Export CSV (' + num(out.length) + ')'));
  }

  function exportCsv(rows) {
    var text = csv(rows, [
      ['advertiser', function (a) { return a.page; }], ['domain', function (a) { return a.domain; }], ['headline', function (a) { return a.headline; }],
      ['vertical', function (a) { return a.vertical; }], ['country', function (a) { return a.country; }], ['language', function (a) { return a.lang; }],
      ['days_running', function (a) { return a.days; }], ['url', function (a) { return adUrl(a); }]
    ]);
    var a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/csv' })), download: 'ad-radar-ads.csv' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('Exported ' + rows.length + ' ads to CSV.');
    log('ads', 'export', { rows: rows.length });
  }

  /* ---------- Table ---------- */

  function table(rows) {
    var all = rows.length && rows.every(function (a) { return app.selected.indexOf(a.id) !== -1; });
    var head = ['', '', 'Advertiser', 'Domain', 'Brand', 'Policy', 'Headline', 'Our coverage', 'Days', 'Vertical', 'Geo', 'Landing page'];
    return h('div.table-scroll',
      h('table.grid.grid--' + app.thumbs,
        h('thead', h('tr', head.map(function (t, i) {
          if (i === 0) return h('th.col-check', h('input', { type: 'checkbox', 'aria-label': 'Select all', checked: all ? true : null, onchange: function () {
            app.selected = all ? [] : rows.map(function (a) { return a.id; });
            render();
          } }));
          return h('th' + (t === 'Days' ? '.num' : ''), { text: t });
        }))),
        h('tbody', rows.length ? rows.map(row) : h('tr', h('td.empty', { colspan: String(head.length) }, 'No ads match these filters. ', h('button.link-btn', { type: 'button', onclick: function () { el.querySelector('[data-clear]').click(); } }, 'Clear them'))))));
  }

  function row(ad) {
    var on = app.selected.indexOf(ad.id) !== -1;
    var mine = app.filters.ourSite ? ourVersions(ad, OUR_ARTICLES, app.filters.ourSite) : null;
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
      h('td.mono.muted', { text: ad.domain }),
      h('td', brand === 'none' ? h('span.faint', { text: 'None' }) : h('span.chip.chip--info', { text: BRAND_LABEL[brand] })),
      h('td', h('span.chip.chip--dot' + (ad.policy === 'clear' ? '.chip--ok' : '.chip--warn'), { text: policyLabel(ad) })),
      h('td.col-headline', h('span', { text: ad.headline })),
      h('td.col-our', ourCell(mine)),
      h('td.mono.num.nowrap', { 'data-days': String(ad.days) }, isLongRunner(ad) ? h('span.accent', { title: 'Long runner: running ' + ad.days + ' days' }, '★ ') : null, ad.days + 'd'),
      h('td.col-vertical', { text: ad.vertical }),
      h('td.mono.nowrap', { text: ad.country + ' · ' + ad.lang }),
      h('td.col-url.mono', ad.dead ? h('span.chip.chip--bad', { text: 'Dead' }) : null, h('span', { title: adUrl(ad), text: adUrl(ad).replace('https://', '') })));
  }

  function ourCell(mine) {
    if (!mine) return h('span.faint', { text: '–' });
    if (!mine.any) return h('span.chip.chip--gap', { 'data-our': 'missing', text: 'Missing' });
    var a = mine.clones[0] || mine.close[0];
    return h('span.our', { 'data-our': 'have', title: a.title }, h('span.ok', { text: '● ' }), a.title);
  }

  return { el: el, show: render, render: render, visible: visible };
}
