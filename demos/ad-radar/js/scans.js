/* Ad Radar demo: Scans. The scan status with Scan now and Stop, the live log, and the tracked
   domains with their intervals. A scan walks the active domains one at a time; new ads show up in
   Ads while it is still going, and stopping keeps whatever it saved. Nothing leaves the page. */

import { INCOMING } from './data.js';
import { ago, num, pad, nextDue, validInterval, parseTarget } from './logic.js';
import { h, icon, toast, log } from './dom.js';

var COUNTRIES = ['ALL', 'US', 'GB', 'CA', 'AU', 'DE', 'FR'];
var STEP_MS = 650;

export function createScans(app) {
  var el = h('section.view.scans', { 'aria-label': 'Scans' });
  var form = { target: '', country: 'ALL', max: '100', error: '' };
  var all = '3';
  var timer = null;

  function render() {
    app.keepFocus(el, function () {
      el.replaceChildren(
        h('div.page-head', h('h1', { text: 'Scans' }), h('p.muted', { text: 'Every active domain is checked on its own schedule. Scan now runs them all at once.' })),
        h('div.scans__top', status(), logPanel()),
        tracked());
    });
  }

  /* ---------- Scan status ---------- */

  function active() { return app.tracked.filter(function (r) { return r.active; }); }

  function status() {
    var sc = app.scan;
    var rows = active();
    var names = rows.slice(0, 3).map(function (r) { return r.domain; }).join(', ');
    return h('section.card.panel.status',
      h('div.stats',
        stat('Next due', sc.running ? 'running' : nextDue(app.tracked), true),
        stat('Last scan', sc.running ? 'now' : ago(sc.lastRunHours)),
        stat('New / errors', '+' + sc.lastNew + ' / ' + sc.lastErrors),
        stat('Scans run', pad(sc.runs))),
      sc.running ? h('div.progress', { 'aria-hidden': 'true' }, h('span', { style: { width: Math.round(sc.done / sc.queue.length * 100) + '%' } })) : null,
      h('div.status__actions',
        h('button.btn.btn--primary', { type: 'button', 'data-run': '', disabled: sc.running || !rows.length ? true : null, onclick: run }, icon('play', 12), sc.running ? 'Scanning ' + sc.done + ' of ' + sc.queue.length : 'Scan now'),
        h('button.btn.btn--danger', { type: 'button', 'data-stop': '', disabled: sc.running ? null : true, title: 'Stop the scan. Whatever it saved is kept.', onclick: stop }, icon('stop', 11), 'Stop')),
      h('small.muted', { text: rows.length
        ? 'Checks ' + rows.length + ' active ' + (rows.length === 1 ? 'domain' : 'domains') + ' (' + names + (rows.length > 3 ? ', +' + (rows.length - 3) + ' more' : '') + '), up to ' + num(rows.reduce(function (s, r) { return s + r.max; }, 0)) + ' ads in all.'
        : 'No active domains. Turn one on below to scan.' }));
  }
  function stat(label, value, hot) { return h('div.stat', h('small.label', { text: label }), h('b.mono' + (hot ? '.accent' : ''), { 'data-stat': label, text: value })); }

  function logPanel() {
    var lines = app.scan.log;
    return h('section.card.panel.logbox',
      h('div.cap-row', h('span.label', { text: 'Scan log' }), app.scan.running ? h('span.chip.chip--live', { text: 'Live' }) : null),
      h('div.runlog', { 'data-log': '', 'aria-live': 'polite' }, lines.length
        ? lines.map(function (l) { return h('div.runlog__line' + (l.hot ? '.is-hot' : ''), { text: l.text }); })
        : h('div.runlog__line.muted', { text: 'Last scan ' + ago(app.scan.lastRunHours) + ': ' + app.scan.lastNew + ' new ads, no errors. Press Scan now to watch one.' })));
  }

  /* ---------- Running a scan ---------- */

  function stamp() { var d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) { return String(n).padStart(2, '0'); }).join(':'); }
  function line(text, hot) { app.scan.log.unshift({ text: stamp() + '  ' + text, hot: !!hot }); }

  function run() {
    var sc = app.scan;
    sc.running = true;
    sc.queue = active().map(function (r) { return r.domain; });
    sc.done = 0;
    sc.found = 0;
    sc.log = [];
    line('Scan started: ' + sc.queue.length + ' domains.');
    log('scan', 'run', { domains: sc.queue.length });
    app.paintTop();
    render();
    timer = setTimeout(stepRun, STEP_MS);
  }

  function stepRun() {
    var sc = app.scan;
    var domain = sc.queue[sc.done];
    var row = app.tracked.filter(function (r) { return r.domain === domain; })[0];
    var fresh = INCOMING.filter(function (a) { return a.domain === domain && !app.ads.some(function (x) { return x.id === a.id; }); });
    fresh.forEach(function (a) { app.ads.unshift(Object.assign({}, a)); });
    if (row) { row.last = 0; row.held += fresh.length; }
    sc.found += fresh.length;
    sc.done += 1;
    line(domain + ': ' + (row ? row.max : 100) + ' ads checked, ' + (fresh.length ? '+' + fresh.length + ' new' : 'nothing new'), fresh.length > 0);
    log('scan', 'step', { domain: domain, found: fresh.length, done: sc.done, of: sc.queue.length });
    if (sc.done >= sc.queue.length) finish('Scan finished: +' + sc.found + ' new ' + (sc.found === 1 ? 'ad' : 'ads') + ', no errors.');
    else timer = setTimeout(stepRun, STEP_MS);
    app.paintTop();
    render();
    if (fresh.length && app.view === 'ads') app.views.ads.render();
  }

  function stop() {
    if (!app.scan.running) return;
    finish('Stopped after ' + app.scan.done + ' of ' + app.scan.queue.length + ' domains. Kept the ' + app.scan.found + ' new ' + (app.scan.found === 1 ? 'ad' : 'ads') + ' it saved.');
    app.paintTop();
    render();
  }

  function finish(text) {
    var sc = app.scan;
    clearTimeout(timer);
    sc.running = false;
    sc.runs += 1;
    sc.lastRunHours = 0;
    sc.lastNew = sc.found;
    line(text, true);
    toast(text);
    log('scan', 'done', { found: sc.found, done: sc.done });
  }

  /* ---------- Tracked domains ---------- */

  function tracked() {
    var q = String(app.query.scans || '').trim().toLowerCase();
    var rows = app.tracked.filter(function (r) { return !q || [r.domain, r.country, r.active ? 'active' : 'paused'].join(' ').toLowerCase().indexOf(q) !== -1; });
    var allInput = h('input.input.input--num', { type: 'number', min: '1', max: '365', value: all, 'aria-label': 'Days between scans for every domain', 'data-focus': 'all', oninput: function () { all = allInput.value; } });
    var target = h('input.input', { type: 'text', placeholder: 'competitor.com or a keyword', 'aria-label': 'Domain or keyword to track', value: form.target, 'data-add-target': '', 'data-focus': 'target',
      oninput: function () { form.target = target.value; }, onkeydown: function (e) { if (e.key === 'Enter') addRow(); } });
    var country = h('select.input.select', { 'aria-label': 'Country', onchange: function () { form.country = country.value; } },
      COUNTRIES.map(function (c) { return h('option', { value: c, selected: form.country === c ? true : null, text: c === 'ALL' ? 'All countries' : c }); }));
    var max = h('input.input.input--num', { type: 'number', min: '1', max: '500', value: form.max, 'aria-label': 'Most ads per scan', oninput: function () { form.max = max.value; } });
    return h('section.card.panel',
      h('div.cap-row', h('b', { text: 'Tracked domains' }), h('span.chip.mono', { 'data-tracked-count': '', text: rows.length + ' of ' + app.tracked.length }), h('span.fill'),
        h('small.muted', { text: 'Scan every domain every' }), allInput, h('small.muted', { text: 'days' }),
        h('button.btn.btn--sm', { type: 'button', 'data-apply-all': '', onclick: function () {
          if (!validInterval(all)) { toast('Use a whole number of days from 1 to 365.'); return; }
          app.tracked.forEach(function (r) { r.every = Number(all); });
          toast('Every domain is now scanned every ' + all + ' ' + (all === '1' ? 'day' : 'days') + '.');
          log('scan', 'interval', { all: Number(all) });
          render();
        } }, 'Apply to all')),
      h('div.addrow', target, country, h('label.addrow__max', h('small.muted', { text: 'Max ads' }), max), h('button.btn.btn--primary', { type: 'button', 'data-add': '', onclick: addRow }, '+ Track')),
      form.error ? h('p.error', { role: 'alert', text: form.error }) : null,
      h('table.grid.tracked',
        h('thead', h('tr', [['Domain or keyword'], ['Country'], ['Max ads', 'num'], ['Ads held', 'num'], ['Interval'], ['Status'], ['']].map(function (t) { return h('th' + (t[1] ? '.' + t[1] : ''), { text: t[0] }); }))),
        h('tbody', rows.length ? rows.map(trackedRow) : h('tr', h('td.empty', { colspan: '7', text: 'Nothing matches "' + q + '".' })))));
  }

  function trackedRow(r) {
    var running = app.scan.running && app.scan.queue[app.scan.done] === r.domain;
    var every = h('input.input.input--num', { type: 'number', min: '1', max: '365', value: String(r.every), 'aria-label': 'Days between scans for ' + r.domain, 'data-every': r.domain, 'data-focus': 'every-' + r.domain,
      onchange: function () {
        if (!validInterval(every.value)) { toast('Use a whole number of days from 1 to 365.'); every.value = String(r.every); return; }
        r.every = Number(every.value);
        log('scan', 'interval', { domain: r.domain, every: r.every });
        render();
      } });
    var keyword = r.domain.indexOf('.') === -1;
    return h('tr.row' + (running ? '.is-running' : '') + (r.active ? '' : '.is-paused'), { 'data-tracked': r.domain },
      h('td', h('span' + (keyword ? '' : '.mono'), { text: keyword ? '"' + r.domain + '"' : r.domain })),
      h('td.mono', { text: r.country }),
      h('td.mono.num', { text: num(r.max) }),
      h('td.mono.num', { text: num(r.held) }),
      h('td.nowrap', h('small.muted', { text: 'every ' }), every, h('small.muted', { text: ' days' })),
      h('td', h('button.state' + (running ? '.is-running' : r.active ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(r.active), 'data-toggle': r.domain, title: r.active ? 'Pause' : 'Resume', onclick: function () {
        r.active = !r.active;
        log('scan', 'toggle', { domain: r.domain, active: r.active });
        render();
      } }, h('span.state__dot'), running ? 'Scanning' : r.active ? 'Active' : 'Paused')),
      h('td', h('button.xbtn', { type: 'button', 'aria-label': 'Stop tracking ' + r.domain, title: 'Stop tracking', 'data-remove': r.domain, disabled: running ? true : null, onclick: function () {
        app.tracked.splice(app.tracked.indexOf(r), 1);
        toast('Stopped tracking ' + r.domain + '. Its ads stay in Ads.');
        log('scan', 'remove', { domain: r.domain });
        render();
      } }, icon('x', 14))));
  }

  function addRow() {
    var t = parseTarget(form.target);
    var max = Number(form.max);
    if (!t) form.error = 'Enter a domain like competitor.com, or a keyword.';
    else if (app.tracked.some(function (r) { return r.domain === t.value; })) form.error = t.value + ' is already tracked.';
    else if (!Number.isInteger(max) || max < 1 || max > 500) form.error = 'Max ads must be a whole number from 1 to 500.';
    else {
      form.error = '';
      app.tracked.unshift({ domain: t.value, country: form.country, max: max, held: 0, every: 3, last: 3, active: true });
      toast('Tracking ' + (t.kind === 'domain' ? t.value : '"' + t.value + '"') + '. It runs with the next scan.');
      log('scan', 'track', { kind: t.kind, value: t.value });
      form.target = '';
    }
    render();
  }

  return { el: el, show: render, render: render };
}
