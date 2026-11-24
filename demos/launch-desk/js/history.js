/* Launch Desk demo: Launches. Every batch that was launched, one launch per card, and what
   happened to each campaign in it, down to the launch trace. Launches made in this visit appear on top. */

import { TEAMMATES } from './data.js';
import { runStatus, runCampaigns, filterRuns, sortRuns, dayGroup, platformById, fmtInt, toCsv } from './logic.js';
import { h, icon, dot, clear, replace, toast, download, log } from './dom.js';

var STATUS = {
  succeeded: { label: 'Succeeded', icon: 'check', cls: 'ok' },
  partial: { label: 'Partial', icon: null, cls: 'warn' },
  failed: { label: 'Failed', icon: 'x', cls: 'bad' }
};

export function createHistory(app) {
  var el = h('section.screen.hist', { 'aria-label': 'Launches' });
  var f = { q: '', platform: '', status: '', result: '', user: '', time: '', mode: 'all', sort: 'newest' };
  var view = { selected: null, filter: 'all', open: {}, refreshing: false };
  var listEl = null;
  var detailEl = null;
  var countEl = null;

  function runs() { return sortRuns(filterRuns(app.runs, f, app.now), f.sort); }

  function render(opts) {
    if (opts && opts.run) { view.selected = opts.run; view.filter = 'all'; view.open = {}; }
    if (!view.selected) view.selected = app.runs[0] && app.runs[0].id;
    var p = platformById(app.platform);
    var search = h('input.input', { type: 'search', placeholder: 'Search launch #, brand, platform or user…', value: f.q, 'aria-label': 'Search launches', oninput: function () { f.q = search.value; paint(); } });
    countEl = h('span.muted.count-runs', {});
    var sortSel = select('Sort launches', [['newest', 'Newest first'], ['oldest', 'Oldest first'], ['number', 'Launch number'], ['campaigns', 'Most campaigns'], ['live', 'Most live'], ['failed', 'Most failed']], f.sort, function (v) { f.sort = v; paint(); });

    listEl = h('div.runlist__items', { role: 'listbox', 'aria-label': 'Launches' });
    detailEl = h('div.detail', {});

    el.replaceChildren(h('div.screen__in',
      h('div.page-head',
        h('div',
          h('h1', { text: 'Launches' }),
          h('p.sub', { text: 'Every batch that went out. Select a launch to see each campaign in it.' }),
          h('p.note', icon('clock', 12), p.name + ' campaign statuses update every hour')),
        h('div.page-head__actions',
          h('div.seg', { role: 'group', 'aria-label': 'Which launches' },
            segBtn('All launches', f.mode === 'all', function () { f.mode = 'all'; render(); }),
            segBtn('Live', f.mode === 'live', function () { f.mode = 'live'; render(); })),
          h('button.btn', { type: 'button', onclick: exportCsv }, icon('download', 14), 'Export CSV'))),

      h('div.card.filters',
        h('div.filters__row',
          h('label.input-wrap.input-wrap--grow', icon('search', 13), search),
          select('Platform', [['', 'All platforms']].concat(platformsInRuns().map(function (id) { return [id, platformById(id).name]; })), f.platform, function (v) { f.platform = v; paint(); }),
          select('Status', [['', 'All statuses'], ['succeeded', 'Succeeded'], ['partial', 'Partial'], ['failed', 'Failed']], f.status, function (v) { f.status = v; paint(); }),
          select('Result', [['', 'Any result'], ['live', 'Has live campaigns'], ['failures', 'Has failures'], ['none', 'Nothing went live']], f.result, function (v) { f.result = v; paint(); }),
          select('User', [['', 'All users']].concat(TEAMMATES.map(function (u) { return [u, u]; })), f.user, function (v) { f.user = v; paint(); }),
          select('Time', [['', 'All time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days']], f.time, function (v) { f.time = v; paint(); }),
          countEl)),

      h('div.hist__body',
        h('div.card.runlist',
          h('div.runlist__head', h('span.mono.muted.count-head', {}), sortSel),
          listEl),
        h('div.card.detail-card', detailEl))));
    paint();
  }

  function platformsInRuns() {
    var ids = [];
    app.runs.forEach(function (r) { if (ids.indexOf(r.platform) === -1) ids.push(r.platform); });
    return ids;
  }

  function paint() {
    var list = runs();
    var label = fmtInt(list.length) + (list.length === 1 ? ' launch' : ' launches');
    countEl.textContent = label;
    el.querySelector('.count-head').textContent = label;
    clear(listEl);
    if (!list.length) {
      listEl.appendChild(h('p.empty', { text: 'No launch matches these filters.' }, h('br'), h('button.link', { type: 'button', onclick: resetFilters }, 'Clear the filters')));
      replace(detailEl, h('p.empty', { text: 'Pick a launch on the left to see its campaigns.' }));
      return;
    }
    var group = null;
    list.forEach(function (r) {
      var g = dayGroup(r.daysAgo);
      if (f.sort === 'newest' && g !== group) {
        group = g;
        var n = list.filter(function (x) { return dayGroup(x.daysAgo) === g; }).length;
        listEl.appendChild(h('div.runlist__day', h('span', { text: g }), h('small', { text: String(n) })));
      }
      listEl.appendChild(runCard(r));
    });
    if (!list.some(function (r) { return r.id === view.selected; })) view.selected = list[0].id;
    paintSelection();
    paintDetail();
  }

  function resetFilters() {
    f.q = ''; f.platform = ''; f.status = ''; f.result = ''; f.user = ''; f.time = ''; f.mode = 'all';
    render();
  }

  function runCard(r) {
    var st = STATUS[runStatus(r)];
    var p = platformById(r.platform);
    return h('button.runcard' + (r.fresh ? '.is-fresh' : ''), {
      type: 'button', role: 'option', 'data-run': String(r.id),
      onclick: function () { view.selected = r.id; view.filter = 'all'; view.open = {}; log('history', 'select launch', { run: r.id }); paintSelection(); paintDetail(); }
    },
    h('span.runcard__l1', h('b.accent-text', { text: '#' + r.id }), dot(p.color), h('span', { text: p.name }), h('span.muted', { text: '· ' + r.brand })),
    h('span.runcard__l2',
      h('span.avatar.avatar--xs', { text: r.user.slice(0, 2).toUpperCase() }),
      h('span', { text: r.user }),
      h('span.muted', { text: r.campaigns + (r.campaigns === 1 ? ' campaign · ' : ' campaigns · ') }),
      h('span.ok', { text: r.live + ' live' }),
      r.failed ? h('span.bad', { text: ' · ' + r.failed + ' failed' }) : null),
    h('span.runcard__r', statusPill(st), h('small.mono', { text: r.time })));
  }

  function paintSelection() {
    listEl.querySelectorAll('.runcard').forEach(function (c) {
      var on = c.getAttribute('data-run') === String(view.selected);
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-selected', String(on));
    });
  }

  function paintDetail() {
    var r = app.runs.filter(function (x) { return x.id === view.selected; })[0];
    if (!r) { replace(detailEl, h('p.empty', { text: 'Pick a launch on the left to see its campaigns.' })); return; }
    var p = platformById(r.platform);
    var st = STATUS[runStatus(r)];
    var items = runCampaigns(r, app.now);
    var shown = items.filter(function (c) { return view.filter === 'all' || (view.filter === 'live' ? c.ok : !c.ok); });
    var creatives = items.reduce(function (a, c) { return a + c.creatives; }, 0);
    var livePct = r.campaigns ? r.live / r.campaigns * 100 : 0;
    var failPct = r.campaigns ? r.failed / r.campaigns * 100 : 0;

    replace(detailEl, h('div.detail__in',
      h('div.detail__head',
        h('div',
          h('div.detail__title', h('b', { text: 'Launch #' + r.id }), dot(p.color), h('span', { text: p.name }), h('span.muted', { text: '· ' + r.brand })),
          h('div.detail__meta.muted',
            h('span.avatar.avatar--xs', { text: r.user.slice(0, 2).toUpperCase() }),
            h('span', { text: r.user + ' · ' + (r.daysAgo === 0 ? 'Today' : r.daysAgo === 1 ? 'Yesterday' : r.daysAgo + ' days ago') + ' ' + r.time + ' · took ' + r.took + ' · Batch ' }),
            h('button.link', { type: 'button', onclick: function () { app.go('workspace'); } }, '#' + r.workspace),
            r.task ? h('span', { text: ' · Task ' + r.task }) : null)),
        h('div.row', statusPill(st), h('button.btn' + (view.refreshing ? '.is-busy' : ''), { type: 'button', onclick: refresh }, icon('refresh', 13), 'Refresh'))),
      h('div.tiles',
        tile('CAMPAIGNS', String(r.campaigns), '', 'all'),
        tile('LIVE', String(r.live), 'ok', 'live'),
        tile('FAILED', String(r.failed), r.failed ? 'bad' : '', 'failed'),
        h('div.tile', h('b', { text: String(creatives) }), h('span.cap', { text: 'CREATIVES' }), h('small.ok', { text: creatives + ' up' }))),
      h('div.progress', { role: 'img', 'aria-label': r.live + ' live, ' + r.failed + ' failed' }, h('span.progress__ok', { style: { width: livePct + '%' } }), h('span.progress__bad', { style: { width: failPct + '%' } })),
      h('div.legend', h('span', dot('#2e8a55'), r.live + ' live'), h('span', dot('#d23c2c'), r.failed + ' failed')),
      h('div.detail__bar',
        h('span.cap', { text: 'CAMPAIGNS' }),
        h('span.tabstrip__fill'),
        h('div.seg', { role: 'group', 'aria-label': 'Show campaigns' },
          segBtn('All ' + r.campaigns, view.filter === 'all', function () { setFilter('all'); }),
          segBtn('Live ' + r.live, view.filter === 'live', function () { setFilter('live'); }),
          segBtn('Failed ' + r.failed, view.filter === 'failed', function () { setFilter('failed'); })),
        h('button.link', { type: 'button', onclick: toggleAll }, Object.keys(view.open).length ? 'Collapse all' : 'Expand all')),
      h('div.ctable',
        h('div.ctable__head', ['', 'CAMPAIGN', 'ACCOUNT', 'GEO', 'TASK', 'STATUS', 'CREATIVES', 'OUTCOME'].map(function (t) { return h('span', { text: t }); })),
        shown.length ? shown.map(function (c, i) { return campaignRow(c, items.indexOf(c)); }) : h('p.empty', { text: 'No campaigns in this view.' }))));
  }

  function campaignRow(c, idx) {
    var open = !!view.open[idx];
    var row = h('div.crow' + (c.ok ? '' : '.is-bad') + (open ? '.is-open' : ''),
      h('button.crow__main', { type: 'button', 'aria-expanded': String(open), onclick: function () { if (open) delete view.open[idx]; else view.open[idx] = true; paintDetail(); } },
        h('span.crow__chev', icon(open ? 'down' : 'right', 12)),
        h('span.crow__name', h('b.mono', { text: c.name, title: c.name }), h('small.muted', { text: c.strategy + ' · ' + c.vertical + ' · row ' + c.rowNo })),
        h('span', { text: c.account || '—' }),
        h('span.mono', { text: c.geo }),
        h('span.mono', { text: c.task || '—' }),
        h('span', c.ok ? h('span.pill.pill--ok', icon('check', 10), 'Live') : h('span.stack', h('span.pill.pill--bad', icon('x', 10), 'Failed'), h('small.muted', { text: 'Platform' }))),
        h('span.mono', h('span', { text: c.creatives + '/' + c.creativesTotal }), h('small.muted', { text: c.creativesTotal + ' × 1 × 1' })),
        h('span.crow__out' + (c.ok ? '' : '.is-bad'), { title: c.ok ? '' : 'Show the full error', text: c.ok ? 'Campaign ' + c.campaignId : c.error })));
    if (!open) return row;
    row.appendChild(h('div.crow__more',
      h('p.kvline', ['Account ' + (c.account || '—'), 'Geo ' + c.geo, 'Vertical ' + c.vertical, 'Strategy ' + c.strategy, 'Bid ' + c.bid, 'Budget ' + c.budget, 'Keywords ' + c.keywords, c.campaignId ? 'Campaign id ' + c.campaignId : null, 'Link ' + (c.linkId || '—')].filter(Boolean).join('   ')),
      h('p.kvline', 'Landing page ', h('span.accent-text', { text: c.landing })),
      c.ok ? h('div',
        h('p.cap', { text: 'CREATIVES · ' + c.creatives + ' OF ' + c.creativesTotal + ' UP · ' + c.creativesTotal + ' × ' + c.creativesTotal + ' IMAGES × 1 HEADLINE × 1 DESCRIPTION' }),
        Array.apply(null, Array(c.creatives)).map(function (x, k) { return h('p.creative', h('span.pill.pill--ok', icon('check', 10), 'Live'), h('span.mono', { text: 'Creative ' + c.campaignId + '-' + (k + 1) })); })) : h('p.err', { text: c.error }),
      h('p.cap', { text: 'LAUNCH TRACE · ' + c.trace.length + ' STEPS' }),
      h('div.trace', c.trace.map(function (t) { return h('div.trace__row', h('span.mono.muted', { text: t[0] }), h('span.mono', { text: t[1] })); }))));
    return row;
  }

  function setFilter(v) { view.filter = v; view.open = {}; paintDetail(); }
  function toggleAll() {
    var r = app.runs.filter(function (x) { return x.id === view.selected; })[0];
    if (Object.keys(view.open).length) view.open = {};
    else runCampaigns(r, app.now).forEach(function (c, i) { view.open[i] = true; });
    paintDetail();
  }
  function tile(label, value, cls, filter) {
    return h('button.tile' + (view.filter === filter ? '.is-active' : ''), { type: 'button', 'aria-pressed': String(view.filter === filter), onclick: function () { setFilter(filter); } },
      h('b' + (cls ? '.' + cls : ''), { text: value }), h('span.cap', { text: label }));
  }
  function refresh() {
    if (view.refreshing) return;
    view.refreshing = true;
    paintDetail();
    log('history', 'refresh', { run: view.selected });
    setTimeout(function () { view.refreshing = false; paintDetail(); toast('Statuses are up to date.'); }, 700);
  }
  function exportCsv() {
    var list = runs();
    download('launches.csv', toCsv(['Launch', 'Platform', 'Brand', 'User', 'Campaigns', 'Live', 'Failed', 'Status', 'Time'],
      list.map(function (r) { return [r.id, platformById(r.platform).name, r.brand, r.user, r.campaigns, r.live, r.failed, STATUS[runStatus(r)].label, r.time]; })), 'text/csv');
    toast('Exported ' + list.length + (list.length === 1 ? ' launch.' : ' launches.'));
  }

  return { el: el, show: render };
}

/* ---------- Helpers ---------- */

function statusPill(st) {
  return h('span.pill.pill--' + st.cls, st.icon ? icon(st.icon, 10) : h('span.pill__dot'), st.label);
}
function segBtn(label, on, run) {
  return h('button.seg__btn' + (on ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(on), onclick: run }, label);
}
function select(label, options, value, onChange) {
  var s = h('select.select', { 'aria-label': label, onchange: function () { onChange(s.value); } },
    options.map(function (o) { return h('option', { value: o[0], text: o[1] }); }));
  s.value = value;
  return s;
}
