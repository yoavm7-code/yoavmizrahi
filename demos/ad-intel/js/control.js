/* Ad Intel demo: the Control Room. The scrape status with Run now and Stop, the feeds, and the
   tracked domains with their intervals. A run walks the active domains one at a time; new ads show
   up in Fresh Finds while it is still going, and stopping keeps whatever it saved. Nothing leaves
   the page. */

import { INCOMING } from './data.js';
import { ago, num, pad, nextDue, validInterval, parseTarget } from './logic.js';
import { h, icon, toast, log } from './dom.js';

var COUNTRIES = ['ALL', 'US', 'GB', 'CA', 'AU', 'DE', 'FR'];
var STEP_MS = 650;

export function createControl(app) {
  var el = h('section.view.control', { 'aria-label': 'Control room' });
  var form = { target: '', feed: '', country: 'ALL', max: '100', error: '' };
  var feedName = '';
  var feedError = '';
  var all = '3';
  var timer = null;

  function render() {
    app.keepFocus(el, function () { el.replaceChildren(h('div.control__wrap', status(), logPanel(), feeds(), tracked())); });
  }

  /* ---------- Scrape status ---------- */

  function active() { return app.tracked.filter(function (r) { return r.active; }); }

  function status() {
    var sc = app.scrape;
    var rows = active();
    var names = rows.slice(0, 3).map(function (r) { return r.domain; }).join(', ');
    return h('section.panel',
      h('span.cap', { text: 'SCRAPE STATUS' }),
      h('div.status',
        stat('NEXT DUE', sc.running ? 'running' : nextDue(app.tracked), true),
        stat('LAST RUN', sc.running ? 'now' : ago(sc.lastRunHours)),
        stat('LAST NEW / ERRORS', '+' + sc.lastNew + ' / ' + sc.lastErrors),
        stat('TOTAL RUNS', pad(sc.runs)),
        h('span.toolbar__fill'),
        h('div.status__actions',
          h('div.row-gap',
            h('button.obtn.obtn--red', { type: 'button', 'data-stop': '', disabled: sc.running ? null : true, title: 'Cancel any scrape running in the background. Whatever it saved is kept.', onclick: stop }, icon('stop', 10), 'STOP'),
            h('button.btn-amber', { type: 'button', 'data-run': '', disabled: sc.running || !rows.length ? true : null, onclick: run }, icon('play', 11), sc.running ? 'RUNNING ' + sc.done + '/' + sc.queue.length : 'RUN NOW')),
          h('small.muted', { text: rows.length
            ? 'Runs ' + rows.length + ' active ' + (rows.length === 1 ? 'domain' : 'domains') + ' (' + names + (rows.length > 3 ? ', +' + (rows.length - 3) + ' more' : '') + '), up to ' + num(rows.reduce(function (s, r) { return s + r.max; }, 0)) + ' ads total.'
            : 'No active domains. Turn one on below to run a scrape.' }))));
  }
  function stat(label, value, hot) { return h('div.stat', h('small.cap', { text: label }), h('b.mono' + (hot ? '.amber' : ''), { 'data-stat': label, text: value })); }

  function logPanel() {
    var lines = app.scrape.log;
    return h('section.panel',
      h('span.cap', { text: 'RUN LOG' }),
      h('div.runlog', { 'data-log': '', 'aria-live': 'polite' }, lines.length
        ? lines.map(function (l) { return h('div.runlog__line' + (l.hot ? '.amber' : ''), { text: l.text }); })
        : h('div.runlog__line.muted', { text: 'Last run ' + ago(app.scrape.lastRunHours) + ': ' + app.scrape.lastNew + ' new ads, no errors. Press RUN NOW to watch one.' })));
  }

  /* ---------- Running a scrape ---------- */

  function stamp() { var d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) { return String(n).padStart(2, '0'); }).join(':'); }
  function line(text, hot) { app.scrape.log.unshift({ text: '[' + stamp() + '] ' + text, hot: !!hot }); }

  function run() {
    var sc = app.scrape;
    sc.running = true;
    sc.queue = active().map(function (r) { return r.domain; });
    sc.done = 0;
    sc.found = 0;
    sc.log = [];
    line('Run started: ' + sc.queue.length + ' domains.');
    log('scrape', 'run', { domains: sc.queue.length });
    app.paintTop();
    render();
    timer = setTimeout(stepRun, STEP_MS);
  }

  function stepRun() {
    var sc = app.scrape;
    var domain = sc.queue[sc.done];
    var row = app.tracked.filter(function (r) { return r.domain === domain; })[0];
    var fresh = INCOMING.filter(function (a) { return a.domain === domain && !app.ads.some(function (x) { return x.id === a.id; }); });
    fresh.forEach(function (a) { app.ads.unshift(Object.assign({}, a)); });
    if (row) { row.last = 0; row.held += fresh.length; }
    sc.found += fresh.length;
    sc.done += 1;
    line(domain + ' · ' + (row ? row.max : 100) + ' ads checked · ' + (fresh.length ? '+' + fresh.length + ' new' : 'nothing new'), fresh.length > 0);
    if (sc.done >= sc.queue.length) finish('Run finished: +' + sc.found + ' new ' + (sc.found === 1 ? 'ad' : 'ads') + ', no errors.');
    else timer = setTimeout(stepRun, STEP_MS);
    app.paintTop();
    render();
  }

  function stop() {
    if (!app.scrape.running) return;
    finish('Stopped after ' + app.scrape.done + ' of ' + app.scrape.queue.length + ' domains. Kept the ' + app.scrape.found + ' new ' + (app.scrape.found === 1 ? 'ad' : 'ads') + ' it saved.');
    app.paintTop();
    render();
  }

  function finish(text) {
    var sc = app.scrape;
    clearTimeout(timer);
    sc.running = false;
    sc.runs += 1;
    sc.lastRunHours = 0;
    sc.lastNew = sc.found;
    line(text, true);
    toast(text);
    log('scrape', 'done', { found: sc.found, done: sc.done });
  }

  /* ---------- Feeds ---------- */

  function feeds() {
    var input = h('input.input.input--sm', { type: 'text', placeholder: 'new feed name', 'aria-label': 'New feed name', maxlength: '24', value: feedName, 'data-focus': 'feed', oninput: function () { feedName = input.value; },
      onkeydown: function (e) { if (e.key === 'Enter') addFeed(); } });
    return h('section.panel',
      h('span.cap', { text: 'FEEDS' }),
      h('div.feeds', app.feeds.map(function (f) { return h('span.fchip', { text: f }); }), input, h('button.obtn', { type: 'button', 'data-add-feed': '', onclick: addFeed }, '+ FEED')),
      feedError ? h('p.error', { role: 'alert', text: feedError }) : null);
  }

  function addFeed() {
    var name = feedName.trim().replace(/\s+/g, ' ');
    if (!name) feedError = 'Give the feed a name first.';
    else if (app.feeds.some(function (f) { return f.toLowerCase() === name.toLowerCase(); })) feedError = name + ' is already a feed.';
    else { feedError = ''; app.feeds.push(name); feedName = ''; toast('Added the ' + name + ' feed.'); }
    render();
  }

  /* ---------- Tracked domains ---------- */

  function tracked() {
    var q = String(app.query.control || '').trim().toLowerCase();
    var rows = app.tracked.filter(function (r) { return !q || [r.domain, r.feed, r.country, r.active ? 'active' : 'paused'].join(' ').toLowerCase().indexOf(q) !== -1; });
    var allInput = h('input.input.input--num', { type: 'number', min: '1', max: '365', value: all, 'aria-label': 'Days between scrapes for every domain', 'data-focus': 'all', oninput: function () { all = allInput.value; } });
    var target = h('input.input', { type: 'text', placeholder: 'competitor.com or keyword', 'aria-label': 'Domain or keyword to track', value: form.target, 'data-add-target': '', 'data-focus': 'target',
      oninput: function () { form.target = target.value; }, onkeydown: function (e) { if (e.key === 'Enter') addRow(); } });
    var feed = h('select.input.select', { 'aria-label': 'Feed', onchange: function () { form.feed = feed.value; } }, h('option', { value: '', text: '(no feed)' }),
      app.feeds.map(function (f) { return h('option', { value: f, selected: form.feed === f ? true : null, text: f }); }));
    var country = h('select.input.select', { 'aria-label': 'Country', onchange: function () { form.country = country.value; } },
      COUNTRIES.map(function (c) { return h('option', { value: c, selected: form.country === c ? true : null, text: c }); }));
    var max = h('input.input.input--num', { type: 'number', min: '1', max: '500', value: form.max, 'aria-label': 'Most ads per scrape', oninput: function () { form.max = max.value; } });
    return h('section.panel',
      h('div.cap-row', h('span.cap', { text: 'TRACKED DOMAINS / QUERIES' }), h('span.muted.mono', { 'data-tracked-count': '', text: rows.length + ' of ' + app.tracked.length }), h('span.toolbar__fill'),
        h('small.muted', { text: 'Set all to every' }), allInput, h('small.muted', { text: 'days' }),
        h('button.obtn', { type: 'button', 'data-apply-all': '', onclick: function () {
          if (!validInterval(all)) { toast('Use a whole number of days from 1 to 365.'); return; }
          app.tracked.forEach(function (r) { r.every = Number(all); });
          toast('Every domain now runs every ' + all + ' ' + (all === '1' ? 'day' : 'days') + '.');
          render();
        } }, 'APPLY TO ALL')),
      h('div.addrow', target, feed, country, max, h('button.btn-amber', { type: 'button', 'data-add': '', onclick: addRow }, '+ ADD')),
      form.error ? h('p.error', { role: 'alert', text: form.error }) : null,
      h('table.grid.tracked',
        h('thead', h('tr', ['DOMAIN / QUERY', 'FEED', 'COUNTRY', 'MAX ADS', 'HELD', 'FREQUENCY', 'STATUS', ''].map(function (t) { return h('th', { text: t }); }))),
        h('tbody', rows.length ? rows.map(trackedRow) : h('tr', h('td.empty', { colspan: '8', text: 'Nothing matches "' + q + '".' })))));
  }

  function trackedRow(r) {
    var running = app.scrape.running && app.scrape.queue[app.scrape.done] === r.domain;
    var every = h('input.input.input--num', { type: 'number', min: '1', max: '365', value: String(r.every), 'aria-label': 'Days between scrapes for ' + r.domain, 'data-every': r.domain, 'data-focus': 'every-' + r.domain,
      onchange: function () {
        if (!validInterval(every.value)) { toast('Use a whole number of days from 1 to 365.'); every.value = String(r.every); return; }
        r.every = Number(every.value);
        render();
      } });
    return h('tr.row' + (running ? '.is-running' : '') + (r.active ? '' : '.is-paused'), { 'data-tracked': r.domain },
      h('td', h('span' + (r.domain.indexOf('.') === -1 ? '.muted' : '.mono'), { text: r.domain.indexOf('.') === -1 ? '"' + r.domain + '"' : r.domain })),
      h('td', { text: r.feed || '–' }),
      h('td.mono', { text: r.country }),
      h('td.mono.num', { text: num(r.max) }),
      h('td.mono.num', { text: num(r.held) }),
      h('td.nowrap', h('small.muted', { text: 'every ' }), every, h('small.muted', { text: ' days' })),
      h('td', h('button.state' + (r.active ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(r.active), 'data-toggle': r.domain, title: r.active ? 'Pause' : 'Resume', onclick: function () {
        r.active = !r.active;
        render();
      } }, running ? '● RUNNING' : r.active ? '● ACTIVE' : '○ PAUSED')),
      h('td', h('button.xbtn', { type: 'button', 'aria-label': 'Stop tracking ' + r.domain, 'data-remove': r.domain, disabled: running ? true : null, onclick: function () {
        app.tracked.splice(app.tracked.indexOf(r), 1);
        toast('Stopped tracking ' + r.domain + '. Its ads stay in the feed.');
        render();
      } }, icon('x', 12))));
  }

  function addRow() {
    var t = parseTarget(form.target);
    var max = Number(form.max);
    if (!t) form.error = 'Enter a domain like competitor.com, or a keyword.';
    else if (app.tracked.some(function (r) { return r.domain === t.value; })) form.error = t.value + ' is already tracked.';
    else if (!Number.isInteger(max) || max < 1 || max > 500) form.error = 'Max ads must be a whole number from 1 to 500.';
    else {
      form.error = '';
      app.tracked.unshift({ domain: t.value, feed: form.feed, country: form.country, max: max, held: 0, every: 3, last: 3, active: true });
      toast('Tracking ' + (t.kind === 'domain' ? t.value : '"' + t.value + '"') + '. It runs with the next scrape.');
      form.target = '';
    }
    render();
  }

  return { el: el, show: render, render: render };
}
