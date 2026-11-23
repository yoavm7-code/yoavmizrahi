/* Mega Uploader demo: the Workspace (batch builder). A spreadsheet of campaigns to create.
   Fill it (by hand or with the Data tools), create tracking links, then Run live and watch the log.
   Everything is simulated in the page: nothing is sent anywhere. */

import { BRANDS, WORKSPACE, USER } from './data.js';
import {
  COLUMNS, RESOLVED, columnLetter, blankRow, copyRow, isReady, isResolved, canResolve, missing, cellValue, accountFor,
  resolveFields, exampleRow, autoAsset, assetUrl, assetColor, autoHeadline, autoKeywords, fixGrammar, hasPlaceholders,
  fillPlaceholders, planRun, runSummary, runFromPlan, platformById, daysBefore, shortDate, clockSeconds, toCsv, isBlank
} from './logic.js';
import { h, icon, dot, clear, replace, toast, notInDemo, popover, closePopover, menu, menuButton, modal, closeModal, download, copyText, log } from './dom.js';

var TAB_COLORS = ['#d6342c', '#e8742c', '#d99a1e', '#c9b21c', '#2e9a52', '#1aa79c', '#1f9bc2', '#2f6fd6', '#4553c9', '#6b4fd1', '#8a49c9', '#c94f9b', '#545b6a'];
var FILL_STEP = 70;
var LOG_STEP = 110;

export function createWorkspace(app) {
  var ws = {
    tabs: WORKSPACE.tabs.map(function (name, i) {
      return { id: WORKSPACE.id + i, name: name, color: i === 0 ? '#2f6fd6' : TAB_COLORS[(i * 3) % TAB_COLORS.length], rows: blankRows(WORKSPACE.rows) };
    }),
    active: 0,
    undo: [],
    redo: [],
    sel: null,
    query: '',
    hidden: {},
    focus: false,
    simple: false,
    busy: false,
    running: false,
    saved: true,
    runOpts: { notify: false },
    colorByTask: true,
    guideOpen: true,
    done: { fill: false, creatives: false, run: false, history: false },
    panel: null
  };

  /* ---------- Model ---------- */

  function blankRows(n) { var r = []; for (var i = 0; i < n; i++) r.push(blankRow()); return r; }
  function brand() { return BRANDS.filter(function (b) { return b.id === WORKSPACE.brand; })[0]; }
  function tab() { return ws.tabs[ws.active]; }
  function rows() { return tab().rows; }
  function ctx() { return { platform: app.platform, now: app.now }; }
  function rowById(id) { return rows().filter(function (r) { return r.id === id; })[0]; }
  function visibleRows() {
    var q = ws.query.trim().toLowerCase();
    if (!q) return rows();
    return rows().filter(function (r) {
      return COLUMNS.some(function (c) { return String(cellValue(r, c.key, ctx()) || '').toLowerCase().indexOf(q) !== -1; });
    });
  }
  function columns() {
    return COLUMNS.filter(function (c) {
      if (ws.hidden[c.key]) return false;
      if (ws.simple && (RESOLVED.indexOf(c.key) !== -1 || ['notes', 'kwList', 'cpa', 'roas'].indexOf(c.key) !== -1)) return false;
      return true;
    });
  }
  function readyCount() { return rows().filter(isReady).length; }
  function resolveCount() { return rows().filter(canResolve).length; }

  /* The first row comes filled in, with its link made and its last run done on an earlier day. */
  (function seed() {
    var first = rows()[0];
    var f = WORKSPACE.firstRow;
    Object.keys(f).forEach(function (k) { if (k !== 'resolved') first[k] = f[k]; });
    Object.assign(first, f.resolved);
    var then = { platform: app.platform, now: daysBefore(WORKSPACE.lastRun.daysAgo, app.now) };
    ws.panel = {
      state: 'done', date: shortDate(WORKSPACE.lastRun.daysAgo, app.now), uploaded: 1, failed: 0, total: 1, open: false, collapsed: false, runId: null,
      lines: planRun([first], then)[0].lines.map(function (l) {
        return { time: WORKSPACE.lastRun.time, name: cellValue(first, 'name', then), step: l.step, msg: l.msg, bad: l.bad };
      })
    };
  })();

  /* ---------- Changes, undo and redo ---------- */

  function snapshot() { return JSON.stringify(rows()); }
  function commit(label, fn, opts) {
    ws.undo.push({ tab: tab(), rows: snapshot() });
    if (ws.undo.length > 60) ws.undo.shift();
    ws.redo = [];
    fn();
    log('grid', 'change', { what: label, ready: readyCount(), rows: rows().length });
    markSaved();
    if (!opts || opts.render !== false) render();
  }
  function restore(from, to) {
    var step = from.pop();
    if (!step) return false;
    to.push({ tab: step.tab, rows: JSON.stringify(step.tab.rows) });
    step.tab.rows = JSON.parse(step.rows);
    return true;
  }
  function undo() {
    if (ws.busy || ws.running) { toast('Wait for the current step to finish.'); return; }
    if (restore(ws.undo, ws.redo)) { log('grid', 'undo', { left: ws.undo.length }); markSaved(); render(); } else toast('Nothing to undo.');
  }
  function redo() {
    if (ws.busy || ws.running) { toast('Wait for the current step to finish.'); return; }
    if (restore(ws.redo, ws.undo)) { log('grid', 'redo', { left: ws.redo.length }); markSaved(); render(); } else toast('Nothing to redo.');
  }
  var saveTimer = null;
  function markSaved() {
    ws.saved = false;
    paintSaved();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { ws.saved = true; paintSaved(); }, 450);
  }

  /* Fills cells one row at a time, so the grid visibly fills itself. One undo step for the whole fill. */
  function animateFill(label, targets, apply, done) {
    if (ws.busy || ws.running) { toast('Wait for the current step to finish.'); return; }
    if (!targets.length) { done(0); return; }
    ws.undo.push({ tab: tab(), rows: snapshot() });
    ws.redo = [];
    ws.busy = true;
    log('data', label + ' start', { rows: targets.length });
    var i = 0;
    (function next() {
      if (i >= targets.length) {
        ws.busy = false;
        markSaved();
        log('data', label + ' done', { rows: targets.length, ready: readyCount() });
        done(targets.length);
        render();
        return;
      }
      apply(targets[i], i);
      paintRow(targets[i].id, true);
      paintCounts();
      i++;
      setTimeout(next, FILL_STEP);
    })();
  }

  /* ---------- Data tools ---------- */

  function fillExample() {
    var targets = rows().filter(function (r, i) { return i > 0 && !r.geo; });
    if (!targets.length) { toast('Every row already has data. Add rows first, or Clear all rows.'); return; }
    animateFill('fill example', targets, function (r) { Object.assign(r, exampleRow(r, rows().indexOf(r))); }, function (n) {
      ws.done.fill = true;
      toast('Filled ' + n + ' rows. Asset and Headline are still red: try Data → Auto-fill creatives, then Auto-generate headlines.');
    });
  }
  function fillCreatives() {
    var targets = rows().filter(function (r) { return r.vertical && !r.asset; });
    if (!targets.length) { toast(rows().some(function (r) { return r.vertical; }) ? 'Every row with a vertical already has a creative.' : 'Pick a Vertical first, or use Data → Fill example data.'); return; }
    animateFill('auto-fill creatives', targets, function (r) { r.asset = autoAsset(r); }, function (n) { checkCreativesDone(); toast('Added a creative to ' + n + (n === 1 ? ' row.' : ' rows.')); });
  }
  function fillHeadlines() {
    var targets = rows().filter(function (r) { return r.vertical && !r.headline; });
    if (!targets.length) { toast(rows().some(function (r) { return r.vertical; }) ? 'Every row with a vertical already has a headline.' : 'Pick a Vertical first, or use Data → Fill example data.'); return; }
    animateFill('auto-generate headlines', targets, function (r) { r.headline = autoHeadline(r, rows().indexOf(r), app.now); }, function (n) { checkCreativesDone(); toast('Wrote ' + n + (n === 1 ? ' headline.' : ' headlines.')); });
  }
  function fillKeywords(max) {
    var targets = rows().filter(function (r) { return r.vertical; });
    if (!targets.length) { toast('Pick a Vertical first, or use Data → Fill example data.'); return; }
    animateFill('auto-fill keywords', targets, function (r) { r.keywords = autoKeywords(r, max); }, function (n) { toast('Keywords filled on ' + n + (n === 1 ? ' row.' : ' rows.')); });
  }
  function checkCreativesDone() {
    var touched = rows().filter(function (r) { return r.vertical; });
    if (touched.length && touched.every(function (r) { return r.asset && r.headline; })) ws.done.creatives = true;
  }
  function fixHeadlines() {
    var n = 0;
    commit('fix headline grammar', function () { rows().forEach(function (r) { var f = fixGrammar(r.headline); if (f !== r.headline) { r.headline = f; n++; } }); });
    toast(n ? 'Fixed ' + n + (n === 1 ? ' headline.' : ' headlines.') : 'Every headline already looks right.');
  }
  function removePlaceholders() {
    var n = rows().filter(function (r) { return hasPlaceholders(r.headline) || hasPlaceholders(r.description); }).length;
    if (!n) { toast('No placeholders like {city} found.'); return; }
    commit('remove placeholders', function () { rows().forEach(function (r) { r.headline = fillPlaceholders(r.headline, app.now); r.description = fillPlaceholders(r.description, app.now); }); });
    toast('Filled placeholders in ' + n + (n === 1 ? ' row.' : ' rows.'));
  }
  function clearAll() {
    if (ws.running) { toast('Wait for the run to finish.'); return; }
    var n = rows().length;
    commit('clear all rows', function () { tab().rows = blankRows(n); });
    ws.sel = null;
    toast('Cleared ' + n + ' rows. Undo with Ctrl+Z.');
  }
  function addRows(n) {
    n = Math.max(1, Math.min(50, parseInt(n, 10) || 5));
    commit('add rows', function () { for (var i = 0; i < n; i++) rows().push(blankRow()); });
    toast('Added ' + n + (n === 1 ? ' row.' : ' rows.'));
    var last = grid.scroller;
    setTimeout(function () { last.scrollTop = last.scrollHeight; }, 0);
  }
  function csvRows() {
    return rows().filter(function (r) { return !isBlank(r); }).map(function (r) { return COLUMNS.map(function (c) { return cellValue(r, c.key, ctx()); }); });
  }
  function exportCsv() {
    var data = csvRows();
    if (!data.length) { toast('The grid is empty, so there is nothing to export.'); return; }
    download('workspace-' + tab().id + '.csv', toCsv(COLUMNS.map(function (c) { return c.label; }), data), 'text/csv');
    toast('Exported ' + data.length + (data.length === 1 ? ' row.' : ' rows.'));
  }
  function copyTsv() {
    var data = csvRows();
    if (!data.length) { toast('The grid is empty, so there is nothing to copy.'); return; }
    copyText([COLUMNS.map(function (c) { return c.label; })].concat(data).map(function (r) { return r.join('\t'); }).join('\n'), 'Copied ' + data.length + ' rows as TSV');
  }

  function openData(anchor) {
    menuButton(anchor, [
      { label: 'Fill example data', icon: 'trend', run: fillExample },
      { label: 'Import CSV…', icon: 'upload', run: function () { notInDemo('Importing a CSV'); } },
      { label: 'Export CSV', icon: 'download', run: exportCsv },
      { label: 'Apply preferences to all rows', icon: 'settings', run: function () { notInDemo('Preferences'); } },
      { sep: true },
      { label: 'Bulk add assets…', icon: 'plus', run: function () { notInDemo('Bulk add assets'); } },
      { label: 'Bulk add headlines…', icon: 'plus', run: function () { notInDemo('Bulk add headlines'); } },
      { label: 'Auto-fill creatives…', icon: 'trend', run: fillCreatives },
      { label: 'Auto-fill keywords (all rows)', icon: 'trend', run: function () { fillKeywords(3); } },
      { label: 'Fill up to 10 keywords (all rows)', icon: 'trend', run: function () { fillKeywords(10); } },
      { label: 'Generate keywords from title (all rows)', icon: 'trend', run: function () { fillKeywords(4); } },
      { label: 'Auto-generate headlines…', icon: 'trend', run: fillHeadlines },
      { label: 'Generate all missing headlines…', icon: 'trend', run: fillHeadlines },
      { label: 'Headlines from landing page…', icon: 'file', run: function () { notInDemo('Headlines from a landing page'); } },
      { label: 'Fix headline grammar', icon: 'check', run: fixHeadlines },
      { label: 'Remove placeholders like {city}', icon: 'minus', run: removePlaceholders },
      { sep: true },
      { label: 'Upload selected as new campaigns…', icon: 'refresh', run: function () { notInDemo('Uploading a selection'); } },
      { sep: true },
      { label: 'Copy grid as TSV', icon: 'copy', run: copyTsv },
      { label: 'Clear all rows', icon: 'trash', danger: true, run: clearAll }
    ]);
  }

  /* ---------- Tracking links ---------- */

  function resolve(then) {
    var targets = rows().filter(canResolve);
    if (!targets.length) {
      toast(rows().some(isResolved) ? 'Every row with Geo, Landing page and Product ID already has its link.' : 'No links to make yet. A row needs Geo, Landing page and Product ID first.');
      return;
    }
    animateFill('resolve', targets, function (r) { Object.assign(r, resolveFields(r)); }, function (n) {
      toast('Made ' + n + (n === 1 ? ' tracking link. It is' : ' tracking links. They are') + ' in the grid.');
      if (then) then();
    });
  }

  /* ---------- Run live ---------- */

  function openRun() {
    if (ws.running) { toast('A run is already going. Watch it in the live run panel.'); return; }
    if (ws.busy) { toast('Wait for the current step to finish.'); return; }
    var plan = planRun(rows(), ctx());
    if (!plan.length) {
      var anyLive = rows().some(function (r) { return r.status === 'live'; });
      toast(anyLive ? 'Every ready row is already live. Add rows, or start a new workspace with +.' : 'No rows are ready yet. Fill Geo, Landing page, Product ID, Image and Headline, or use Data → Fill example data.');
      log('run', 'nothing to run', { ready: readyCount(), live: anyLive });
      return;
    }
    var s = runSummary(plan);
    var p = platformById(app.platform);
    var notify = h('input', { type: 'checkbox', checked: ws.runOpts.notify });
    modal(h('div.confirm',
      h('h2', { text: 'Go live with ' + s.campaigns + (s.campaigns === 1 ? ' campaign?' : ' campaigns?') }),
      h('p.sub', { text: p.name + ' · ' + brand().name + ' · ' + tab().name }),
      h('div.kv',
        kv('Campaigns', String(s.campaigns)),
        kv('Accounts', s.accounts + ' (all checked ✓)'),
        kv('Geos', s.geos.join(', ')),
        kv('Daily budget', '$' + s.budget.toFixed(2))),
      h('div.notice', icon('warn', 14), h('span', { text: 'Campaigns start paused, ads go live after review. In the real app this spends real money. Here nothing leaves the page.' })),
      h('label.check', notify, h('span', { text: 'Notify me when done' })),
      h('div.confirm__actions',
        h('button.btn.btn--ghost', { type: 'button', onclick: closeModal }, 'Cancel'),
        h('button.btn.btn--danger-solid', { type: 'button', autofocus: true, onclick: function () { ws.runOpts.notify = notify.checked; closeModal(); startRun(plan); } }, 'Run live · ' + s.campaigns))
    ), { label: 'Confirm run live' });
    log('run', 'confirm opened', { campaigns: s.campaigns, geos: s.geos });
  }

  function startRun(plan) {
    var started = Date.now();
    var s = runSummary(plan);
    ws.running = true;
    ws.panel = { state: 'running', date: shortDate(0, app.now), uploaded: 0, failed: 0, total: plan.length, open: true, collapsed: false, lines: [], runId: null };
    plan.forEach(function (p) { var r = rowById(p.rowId); if (r) { r.status = 'queued'; r.error = ''; } });
    log('run', 'start', { campaigns: s.campaigns, expectedFailures: s.failed });
    render();
    var k = 0;
    (function nextRow() {
      if (k >= plan.length) return finish();
      var p = plan[k];
      var r = rowById(p.rowId);
      if (r) { r.status = 'running'; paintRow(r.id); }
      var j = 0;
      (function nextLine() {
        if (j >= p.lines.length) {
          if (r) {
            if (!isResolved(r)) Object.assign(r, resolveFields(r));
            r.status = p.ok ? 'live' : 'failed';
            r.error = p.error;
            paintRow(r.id);
          }
          if (p.ok) ws.panel.uploaded++; else ws.panel.failed++;
          log('run', 'row done', { row: p.name, ok: p.ok, error: p.error || null });
          paintPanel();
          k++;
          return setTimeout(nextRow, LOG_STEP);
        }
        var l = p.lines[j++];
        ws.panel.lines.push({ time: clockSeconds(new Date()), name: p.name, step: l.step, msg: l.msg, bad: l.bad });
        paintPanel();
        setTimeout(nextLine, LOG_STEP);
      })();
    })();

    function finish() {
      var secs = Math.max(1, Math.round((Date.now() - started) / 1000));
      var run = runFromPlan(plan, {
        id: app.nextRunId(), platform: app.platform, brand: brand().name, user: USER.name.split(' ')[0].toLowerCase(),
        workspace: tab().id, took: secs + 's', now: new Date()
      });
      app.addRun(run);
      ws.running = false;
      ws.done.run = true;
      ws.panel.state = 'done';
      ws.panel.runId = run.id;
      log('run', 'finished', { run: run.id, live: run.live, failed: run.failed, took: run.took });
      render();
      if (ws.runOpts.notify) toast('Run #' + run.id + ' finished: ' + run.live + ' live, ' + run.failed + ' failed.');
    }
  }

  /* ---------- Layout ---------- */

  var el = h('section.screen.ws', { 'aria-label': 'Workspace' });
  var parts = {};
  var grid = { table: null, scroller: null, body: null };

  function render() {
    closePopover();
    var b = brand();
    var t = tab();
    var p = platformById(app.platform);

    parts.brandbar = h('div.brandbar',
      h('span.brandbar__label', { text: 'Batch builder' }),
      BRANDS.map(function (bd) {
        var on = bd.id === WORKSPACE.brand;
        return h('button.brand-chip' + (on ? '.is-active' : ''), {
          type: 'button', title: 'Show ' + bd.name + ' workspaces', 'aria-pressed': String(on),
          onclick: function () { if (!on) toast('This demo only has ' + b.short + ' workspaces. Every brand gets its own set.'); }
        }, dot(bd.color), h('span', { text: bd.name }), bd.count ? h('small', { text: String(bd.count) }) : null);
      }));

    parts.tabs = h('div.tabstrip',
      ws.tabs.map(function (tb, i) { return tabEl(tb, i); }),
      iconBtnSm('plus', 'New workspace', newTab),
      h('button.btn.btn--sm', { type: 'button', title: 'Copy a tab from another platform into ' + p.name, onclick: function () { notInDemo('Copying a tab'); } }, icon('copy', 13), 'Copy from…'),
      h('button.btn.btn--sm', { type: 'button', title: 'Find a workspace by name or ID (open or closed)', onclick: findTab }, icon('search', 13), 'Find'),
      h('button.btn.btn--sm', { type: 'button', title: 'Manage tabs: archive, recolor or trash several at once', onclick: function () { notInDemo('Managing tabs'); } }, icon('list', 13), 'Manage'),
      h('button.btn.btn--sm', { type: 'button', title: 'Clean up: close every open tab', onclick: function () { notInDemo('Clean up'); } }, icon('broom', 13), 'Clean up'),
      h('span.tabstrip__fill'),
      parts.saved = h('span.saved', {}),
      h('span.split',
        h('button.btn.btn--sm' + (ws.focus ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(ws.focus), title: 'Fold the brand bar, toolbar and run panel away', onclick: function () { ws.focus = !ws.focus; log('ui', 'focus', { on: ws.focus }); render(); } }, icon('focus', 13), 'Focus'),
        h('button.btn.btn--sm.split__caret', { type: 'button', 'aria-label': 'Choose what to fold', onclick: function () { notInDemo('Choosing what to fold'); } }, icon('down', 12))));

    var ready = readyCount();
    parts.head = h('div.ws-head',
      dot(t.color, 'dot--sq'),
      h('b', { text: t.name }),
      h('span.muted', { text: p.name + ' · ' + b.name }),
      h('button.id-chip', { type: 'button', title: 'Workspace ID ' + t.id + ': click to copy, then send it to support', onclick: function () { copyText(String(t.id), 'Copied workspace ID ' + t.id); } }, h('span.mono', { text: 'ID' }), h('b', { text: String(t.id) }), icon('copy', 12)),
      parts.ready = h('span.ws-head__ready', { text: ready + (ready === 1 ? ' campaign ready' : ' campaigns ready') }),
      h('span.tabstrip__fill'),
      h('button.btn.btn--sm', { type: 'button', onclick: function () { notInDemo('Reporting a bug'); } }, icon('bug', 13), 'Report bug'),
      h('button.btn.btn--sm', { type: 'button', onclick: function () { notInDemo('Requesting a feature'); } }, 'Request feature'),
      h('button.btn.btn--sm.btn--ghost', { type: 'button', onclick: function () { app.shell.ask.toggle(true); } }, icon('help', 13), 'Need help?'));

    var nRes = resolveCount();
    var dataBtn = h('button.btn.btn--sm', { type: 'button', 'aria-haspopup': 'menu', 'data-tool': 'data', onclick: function () { openData(dataBtn); } }, icon('grid', 13), 'Data', icon('down', 12));
    var resolveCaret = h('button.btn.btn--sm.split__caret', { type: 'button', 'aria-label': 'Tracking link options', 'aria-haspopup': 'menu', onclick: function () {
      menuButton(resolveCaret, [
        { label: 'Create links only · ' + nRes, icon: 'check', title: 'Make the tracking links. Upload later with Run live.', run: function () { resolve(); } },
        { label: 'Create links & upload… · ' + nRes, icon: 'upload', title: 'Make the links, then go live as they come in.', run: function () { resolve(openRun); } }
      ]);
    } }, icon('down', 12));
    var moreBtn = h('button.btn.btn--sm.btn--blue', { type: 'button', 'aria-haspopup': 'menu', onclick: function () { openMore(moreBtn); } }, 'More', icon('down', 12));
    var runCaret = h('button.btn.btn--sm.btn--danger.split__caret', { type: 'button', 'aria-label': 'Run options', 'aria-haspopup': 'menu', onclick: function () { openRunOptions(runCaret); } }, icon('down', 12));
    var search = h('input.tool-search__input', {
      type: 'search', placeholder: 'Search rows…', value: ws.query, 'aria-label': 'Search rows',
      oninput: function () { ws.query = search.value; paintGrid(); paintCounts(); }
    });
    var addN = h('input.num', { type: 'number', min: 1, max: 50, value: 5, 'aria-label': 'Rows to add' });
    var colsBtn = h('button.btn.btn--sm', { type: 'button', title: 'Show, hide and reorder columns', 'aria-haspopup': 'dialog', onclick: function () { openColumns(colsBtn); } }, icon('eye', 13), 'Columns');

    parts.undo = iconBtnSm('undo', 'Undo (Ctrl+Z)', undo, !ws.undo.length);
    parts.redo = iconBtnSm('redo', 'Redo (Ctrl+Shift+Z)', redo, !ws.redo.length);
    parts.toolbar = h('div.toolbar',
      parts.undo,
      parts.redo,
      h('span.split', h('button.btn.btn--sm', { type: 'button', title: 'Add a number of blank rows', onclick: function () { addRows(addN.value); } }, icon('plus', 13), 'Add rows'), addN),
      dataBtn,
      h('span.split',
        h('button.btn.btn--sm' + (nRes ? '' : '.is-quiet'), { type: 'button', 'data-tool': 'resolve', title: 'Make ' + nRes + ' tracking links, one per row, and fill the link columns', onclick: function () { resolve(); } }, icon('check', 13), 'Create tracking links · ' + nRes),
        resolveCaret),
      h('label.tool-search', icon('search', 13), search),
      iconBtnSm('bookmark', 'Saved searches: keep the row searches you retype', function () { notInDemo('Saved searches'); }),
      colsBtn,
      h('span.tabstrip__fill'),
      moreBtn,
      h('span.runmode', h('span', dot('#2e9a52'), 'Live on'), h('span', dot('#d99a1e'), 'Starts paused, ads live')),
      h('span.split',
        h('button.btn.btn--sm.btn--danger', { type: 'button', 'data-tool': 'run', title: 'Create these campaigns live on the platform (in this demo, nothing is sent)', onclick: openRun }, 'Run live'),
        runCaret),
      iconBtnSm('help', 'How Run live works', function () { app.shell.ask.toggle(true); }));

    parts.strip = h('div.strip',
      parts.hint = h('span.strip__hint', {}),
      h('button.btn.btn--xs', { type: 'button', onclick: shortcuts }, 'Shortcuts'),
      h('span.tabstrip__fill'),
      parts.runChip = h('button.run-chip', { type: 'button', 'aria-expanded': 'false', onclick: function () { ws.panel.open = !ws.panel.open; paintPanel(); } }));

    parts.panel = h('div.runpanel', {});
    parts.cellbar = cellBar();
    buildGrid();

    var footN = h('input.num', { type: 'number', min: 1, max: 50, value: 5, 'aria-label': 'Rows to add at the bottom' });
    parts.footer = h('div.grid-foot',
      h('div.grid-nav',
        iconBtnSm('first', 'Jump to the first column', function () { grid.scroller.scrollLeft = 0; }),
        iconBtnSm('left', 'Scroll left', function () { grid.scroller.scrollLeft -= 300; }),
        h('span.tabstrip__fill'),
        iconBtnSm('right', 'Scroll right', function () { grid.scroller.scrollLeft += 300; }),
        iconBtnSm('last', 'Jump to the last column', function () { grid.scroller.scrollLeft = grid.scroller.scrollWidth; }),
        h('span.grid-nav__gap'),
        iconBtnSm('top', 'Jump to the first row', function () { grid.scroller.scrollTop = 0; }),
        iconBtnSm('up', 'Scroll up', function () { grid.scroller.scrollTop -= 200; }),
        iconBtnSm('down', 'Scroll down', function () { grid.scroller.scrollTop += 200; }),
        iconBtnSm('bottom', 'Jump to the last row', function () { grid.scroller.scrollTop = grid.scroller.scrollHeight; })),
      h('div.add-foot', h('button.btn.btn--sm', { type: 'button', onclick: function () { addRows(footN.value); } }, icon('plus', 13), 'Add rows'), footN, h('span.muted', 'at the bottom · '), h('button.link', { type: 'button', onclick: shortcuts }, 'Ctrl+/ shortcuts')));

    var view = h('div.ws__in' + (ws.focus ? '.is-focus' : ''),
      ws.focus ? null : parts.brandbar,
      parts.tabs, parts.head,
      ws.focus ? null : parts.toolbar,
      ws.focus ? null : parts.strip,
      ws.focus ? null : parts.panel,
      parts.cellbar, grid.wrap, parts.footer,
      guide());
    el.replaceChildren(view);
    paintSaved();
    paintPanel();
    paintHint();
    restoreSelection();
  }

  function tabEl(tb, i) {
    var on = i === ws.active;
    var caret = h('button.tab__caret', { type: 'button', 'aria-label': 'Tab menu for ' + tb.name, 'aria-haspopup': 'menu', onclick: function (e) { e.stopPropagation(); openTabMenu(caret, tb, i); } }, icon('down', 12));
    var node = h('div.tab' + (on ? '.is-active' : ''), {
      oncontextmenu: function (e) { e.preventDefault(); openTabMenu(caret, tb, i); }
    },
    h('span.tab__grip', icon('grip', 11)),
    h('button.tab__name', { type: 'button', 'aria-pressed': String(on), title: on ? 'Double-click to rename' : null, ondblclick: function () { renameTab(node, tb); }, onclick: function () { selectTab(i); } }, dot(tb.color), h('span', { text: tb.name })),
    caret);
    return node;
  }
  function selectTab(i) {
    if (i === ws.active) return;
    if (ws.running) { toast('Wait for the run to finish.'); return; }
    ws.active = i;
    ws.sel = null;
    log('nav', 'tab', { tab: tab().name });
    render();
  }
  function newTab() {
    var n = ws.tabs.length + 1;
    ws.tabs.push({ id: tab().id + 20 + n, name: 'Workspace ' + n, color: TAB_COLORS[(n * 3) % TAB_COLORS.length], rows: blankRows(WORKSPACE.rows) });
    selectTab(ws.tabs.length - 1);
    toast('New workspace with ' + WORKSPACE.rows + ' empty rows.');
  }
  function findTab() {
    var tabs = ws.tabs;
    app.shell.palette({
      label: 'Find a workspace', placeholder: 'Find a workspace by name or ID…',
      items: tabs.map(function (tb, i) { return { label: tb.name + ' · ID ' + tb.id, icon: 'grid', kind: 'OPEN', run: function () { selectTab(i); } }; })
    });
  }
  function renameTab(tabNode, tb) {
    var input = h('input.tab__rename', { type: 'text', value: tb.name, 'aria-label': 'Tab name', maxlength: 30 });
    var done = false;
    function finish(save) {
      if (done) return;
      done = true;
      var v = input.value.trim();
      if (save && v) { tb.name = v; log('grid', 'rename tab', { name: v }); }
      render();
    }
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
    input.addEventListener('blur', function () { finish(true); });
    replace(tabNode, input);
    input.focus();
    input.select();
  }
  function openTabMenu(anchor, tb, i) {
    var upAnyway = h('input', { type: 'checkbox', checked: tb.upAnyway, onchange: function () { tb.upAnyway = upAnyway.checked; } });
    popover(anchor, h('div.tabmenu',
      h('div.menu__section', { text: 'COLOUR' }),
      h('div.swatches', TAB_COLORS.map(function (c) {
        return h('button.swatch' + (c === tb.color ? '.is-on' : ''), { type: 'button', 'aria-label': 'Colour ' + c, style: { background: c }, onclick: function () { tb.color = c; closePopover(); render(); } });
      }), h('button.swatch.swatch--rainbow', { type: 'button', 'aria-label': 'Rainbow', onclick: function () { tb.color = TAB_COLORS[Math.floor(Math.random() * TAB_COLORS.length)]; closePopover(); render(); } })),
      h('label.check', upAnyway, h('span', { text: 'Upload anyway (skip our policy)' })),
      menu([
        { sep: true },
        { label: 'Rename', icon: 'pencil', run: function () { if (i !== ws.active) selectTab(i); setTimeout(function () { var node = el.querySelectorAll('.tab')[i]; if (node) renameTab(node, tb); }, 0); } },
        { label: 'Duplicate', icon: 'copy', run: function () { duplicateTab(tb, false); } },
        { label: 'Duplicate, fresh links', icon: 'refresh', run: function () { duplicateTab(tb, true); } },
        { label: 'Archive', icon: 'archive', run: function () { removeTab(i, 'Archived'); } },
        { label: 'Delete', icon: 'trash', danger: true, run: function () { removeTab(i, 'Deleted'); } }
      ])), { role: 'menu' });
  }
  function duplicateTab(tb, fresh) {
    var copy = { id: tb.id + 100 + ws.tabs.length, name: tb.name + ' copy', color: tb.color, rows: tb.rows.map(function (r) {
      var c = copyRow(r);
      c.status = 'new'; c.error = '';
      if (fresh) RESOLVED.forEach(function (k) { c[k] = ''; });
      return c;
    }) };
    ws.tabs.push(copy);
    selectTab(ws.tabs.length - 1);
    toast('Duplicated ' + tb.name + (fresh ? ' with fresh links.' : '.'));
  }
  function removeTab(i, verb) {
    if (ws.tabs.length === 1) { toast('Keep at least one workspace open.'); return; }
    if (ws.running) { toast('Wait for the run to finish.'); return; }
    var name = ws.tabs[i].name;
    ws.tabs.splice(i, 1);
    ws.active = Math.min(ws.active, ws.tabs.length - 1);
    ws.undo = ws.undo.filter(function (u) { return ws.tabs.indexOf(u.tab) !== -1; });
    render();
    toast(verb + ' ' + name + '.');
  }

  function openMore(anchor) {
    menuButton(anchor, [
      { note: 'Some tools moved here to fit the window.' },
      { section: 'BUILD' },
      { label: 'Setup', icon: 'settings', hint: '›', run: function () { notInDemo('Workspace setup'); } },
      { label: 'Fill creatives', icon: 'image', run: fillCreatives },
      { section: 'REVIEW' },
      { label: 'Go to column', icon: 'columns', hint: 'Ctrl+K', run: goToColumn },
      { label: 'Filter', icon: 'filter', run: function () { notInDemo('Filters'); } },
      { label: 'Checks', icon: 'check', run: checkRows },
      { label: 'Simple view', icon: 'eye', toggle: ws.simple, run: function () { ws.simple = !ws.simple; log('ui', 'simple view', { on: ws.simple }); render(); } },
      { label: 'Preferences', icon: 'settings', run: function () { notInDemo('Preferences'); } },
      { label: 'History', icon: 'clock', run: function () { app.go('history'); } },
      { label: 'Freeze…', icon: 'columns', run: function () { notInDemo('Freezing columns'); } },
      { label: 'Color by Task', icon: 'layers', toggle: ws.colorByTask, run: function () { ws.colorByTask = !ws.colorByTask; } },
      { sep: true },
      { label: 'Keyboard shortcuts', icon: 'terminal', hint: 'Ctrl+/', run: shortcuts },
      { label: 'Customize toolbar…', icon: 'settings', run: function () { notInDemo('Customizing the toolbar'); } }
    ], { align: 'right' });
  }
  function openRunOptions(anchor) {
    menuButton(anchor, [
      { label: 'Check accounts & geos', icon: 'check', title: 'Check every campaign\'s account and geo before running', run: checkRows },
      { label: 'Pick accounts', icon: 'users', title: 'Fill each row\'s Account with the exact account it will upload to', run: resolveAccounts },
      { label: 'Notify when done', icon: 'bell', toggle: ws.runOpts.notify, run: function () { ws.runOpts.notify = !ws.runOpts.notify; } },
      { label: 'Schedule…', icon: 'calendar', run: function () { notInDemo('Scheduling a run'); } }
    ], { align: 'right' });
  }
  function checkRows() {
    var filledRows = rows().filter(function (r) { return !isBlank(r); });
    var bad = filledRows.filter(function (r) { return !isReady(r); });
    log('grid', 'checks', { rows: filledRows.length, notReady: bad.length });
    if (!filledRows.length) toast('The grid is empty. Use Data → Fill example data to start.');
    else if (!bad.length) toast('All ' + filledRows.length + ' rows pass: accounts and geos match ' + platformById(app.platform).name + '.');
    else toast(bad.length + (bad.length === 1 ? ' row is' : ' rows are') + ' missing ' + missing(bad[0]).join(', ') + '. The red cells show where.', 'warn');
  }
  function resolveAccounts() {
    var targets = rows().filter(function (r) { return r.geo && r.account === 'Auto'; });
    if (!targets.length) { toast('Every row with a Geo already has an account.'); return; }
    animateFill('pick accounts', targets, function (r) { r.account = accountFor(r); }, function (n) { toast('Picked an account for ' + n + (n === 1 ? ' row.' : ' rows.')); });
  }
  function openColumns(anchor) {
    popover(anchor, h('div.panel.panel--cols',
      h('div.panel__head', h('b', { text: 'Columns' }), h('button.link-muted', { type: 'button', onclick: function () { ws.hidden = {}; closePopover(); render(); } }, 'Show all')),
      h('div.cols', COLUMNS.map(function (c) {
        var box = h('input', { type: 'checkbox', checked: !ws.hidden[c.key], disabled: c.required, onchange: function () { ws.hidden[c.key] = !box.checked; render(); openColumns(el.querySelector('[title^="Show, hide"]')); } });
        return h('label.check', box, h('span', { text: c.label + (c.required ? ' *' : '') }));
      }))), { reopen: true, focus: false });
  }
  function goToColumn() {
    app.shell.palette({
      label: 'Go to column', placeholder: 'Jump to a column by name…',
      items: columns().map(function (c) {
        return { label: c.label, icon: 'columns', kind: columnLetter(COLUMNS.indexOf(c)), run: function () {
          var r = ws.sel ? rowById(ws.sel.id) : visibleRows()[0];
          if (r) select(r.id, c.key, true);
        } };
      })
    });
  }
  function shortcuts() {
    modal(h('div.confirm',
      h('h2', { text: 'Keyboard shortcuts' }),
      h('div.kv', [
        ['Arrows', 'Move between cells'], ['Enter or typing', 'Edit the selected cell'], ['Esc', 'Cancel an edit'], ['Tab', 'Save and move right'],
        ['Delete', 'Clear the cell'], ['Ctrl+Z / Ctrl+Shift+Z', 'Undo / Redo'], ['Ctrl+K', 'Go to column'], ['Ctrl+Shift+P', 'Command palette'], ['/', 'Search']
      ].map(function (x) { return kv(x[0], x[1]); })),
      h('div.confirm__actions', h('button.btn', { type: 'button', autofocus: true, onclick: closeModal }, 'Close'))), { label: 'Keyboard shortcuts' });
  }

  /* ---------- Live run panel ---------- */

  function paintPanel() {
    var pn = ws.panel;
    if (!parts.panel) return;
    var running = pn.state === 'running';
    replace(parts.runChip, h('span.run-chip__in',
      running ? h('span.spin') : icon('check', 12),
      h('b', { text: 'Live run · ' + pn.date }),
      h('small', { text: running ? pn.uploaded + ' of ' + pn.total + ' uploaded' : pn.uploaded + ' uploaded · ' + pn.total + ' total' }),
      icon(pn.open ? 'up' : 'down', 12)));
    parts.runChip.setAttribute('aria-expanded', String(pn.open));
    parts.runChip.classList.toggle('is-running', running);
    if (!pn.open) { clear(parts.panel); parts.panel.hidden = true; return; }
    parts.panel.hidden = false;
    var logBox = h('div.runlog', { role: 'log', 'aria-live': 'polite' }, pn.lines.map(function (l) {
      return h('div.runlog__line' + (l.bad ? '.is-bad' : ''), h('span.runlog__time', { text: l.time }), h('span.runlog__name', { text: l.name }), h('span', { text: ' · ' + l.step + ': ' + l.msg }));
    }));
    var finished = pn.state === 'done';
    replace(parts.panel, h('div.runpanel__in',
      h('div.runpanel__head',
        running ? h('span.spin') : icon('check', 13),
        h('b', { text: 'Live run · ' + pn.date }),
        h('small', { text: running ? pn.uploaded + ' of ' + pn.total + ' uploaded' : pn.uploaded + ' uploaded · ' + pn.total + ' total' }),
        h('span.tabstrip__fill'),
        finished && pn.runId ? h('button.btn.btn--xs.btn--blue', { type: 'button', 'data-tool': 'open-run', onclick: function () { app.go('history', { run: pn.runId }); } }, 'Open in Run history', icon('right', 12)) : null,
        iconBtnSm(pn.collapsed ? 'down' : 'up', pn.collapsed ? 'Show the log' : 'Hide the log', function () { pn.collapsed = !pn.collapsed; paintPanel(); }),
        iconBtnSm('x', 'Close the live run panel', function () { pn.open = false; paintPanel(); })),
      h('div.runpanel__sum' + (running ? '.is-running' : pn.failed ? '.is-partial' : ''),
        running ? h('span.spin') : icon(pn.failed ? 'warn' : 'check', 13),
        h('b', { text: running ? 'Uploading…' : 'Upload finished' }),
        h('span', h('b', { text: String(pn.uploaded) }), ' Uploaded'),
        pn.failed ? h('span.is-bad', h('b', { text: String(pn.failed) }), ' Failed') : null,
        h('span', h('b', { text: String(pn.total) }), ' Total')),
      pn.collapsed ? null : logBox));
    logBox.scrollTop = logBox.scrollHeight;
  }

  /* ---------- Formula bar ---------- */

  function cellBar() {
    var addr = h('span.cellbar__addr.mono', { text: '—' });
    var input = h('input.cellbar__input', {
      type: 'text', placeholder: 'Select a cell to view and edit its full content', 'aria-label': 'Cell content', disabled: true,
      onkeydown: function (e) {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); focusGrid(); }
        if (e.key === 'Escape') { paintCellBar(); input.blur(); focusGrid(); }
      },
      onchange: function () { if (ws.sel) setCell(ws.sel.id, ws.sel.key, input.value); }
    });
    parts.cellAddr = addr;
    parts.cellInput = input;
    return h('div.cellbar', addr, input, iconBtnSm('down', 'Expand for long content', function () { notInDemo('The expanded editor'); }));
  }
  function paintCellBar() {
    if (!parts.cellInput) return;
    var col = ws.sel && COLUMNS.filter(function (c) { return c.key === ws.sel.key; })[0];
    var r = ws.sel && rowById(ws.sel.id);
    if (!col || !r) {
      parts.cellAddr.textContent = '—';
      parts.cellInput.value = '';
      parts.cellInput.disabled = true;
      parts.cellInput.placeholder = 'Select a cell to view and edit its full content';
      return;
    }
    parts.cellAddr.textContent = columnLetter(COLUMNS.indexOf(col)) + (rows().indexOf(r) + 1);
    parts.cellInput.value = cellValue(r, col.key, ctx()) || '';
    var editable = isEditable(col);
    parts.cellInput.disabled = !editable;
    parts.cellInput.placeholder = editable ? 'Edit ' + col.label + '…' : (col.kind === 'select' ? 'Pick from the list in the cell' : col.kind === 'resolved' ? 'Resolve fills this column' : 'Built from the other columns');
  }

  /* ---------- Grid ---------- */

  function buildGrid() {
    var cols = columns();
    var colgroup = h('colgroup', h('col', { style: { width: '34px' } }), h('col', { style: { width: '42px' } }), h('col', { style: { width: '30px' } }),
      cols.map(function (c) { return h('col', { style: { width: c.width + 'px' } }); }));
    var letters = h('tr.grid__letters', h('th.fz.fz1'), h('th.fz.fz2'), h('th.fz.fz3'), cols.map(function (c) { return h('th', { text: columnLetter(COLUMNS.indexOf(c)) }); }));
    var allBox = h('input', { type: 'checkbox', 'aria-label': 'Select all rows', onchange: function () { el.querySelectorAll('.rowbox').forEach(function (b) { b.checked = allBox.checked; }); } });
    var head = h('tr.grid__head', h('th.fz.fz1', allBox), h('th.fz.fz2', { text: '#' }), h('th.fz.fz3', icon('check', 11)),
      cols.map(function (c) {
        return h('th', { title: c.label }, h('span.th', icon('grip', 10), h('span.th__box'), h('span.th__label', { text: c.label.toUpperCase() }), c.required ? h('i.req', { text: '*' }) : null));
      }));
    grid.body = h('tbody', {});
    grid.table = h('table.grid', { role: 'grid', 'aria-label': tab().name + ' rows', 'aria-rowcount': String(rows().length) }, colgroup, h('thead', letters, head), grid.body);
    grid.scroller = h('div.grid-scroll', { tabindex: '0', onkeydown: onGridKey }, grid.table);
    grid.wrap = h('div.grid-wrap', grid.scroller);
    paintGrid();
  }

  function paintGrid() {
    if (!grid.body) return;
    var list = visibleRows();
    clear(grid.body);
    if (!list.length) {
      grid.body.appendChild(h('tr', h('td.grid__empty', { colspan: String(columns().length + 3), text: 'No row matches "' + ws.query + '". Clear the search to see every row.' })));
      return;
    }
    list.forEach(function (r) { grid.body.appendChild(rowEl(r)); });
    restoreSelection();
  }

  function paintRow(id, flash) {
    var old = grid.body && grid.body.querySelector('tr[data-row="' + id + '"]');
    var r = rowById(id);
    if (!old || !r) return;
    var fresh = rowEl(r);
    if (flash) fresh.classList.add('is-flash');
    old.replaceWith(fresh);
    restoreSelection();
  }

  function rowEl(r) {
    var n = rows().indexOf(r) + 1;
    return h('tr' + (r.status === 'failed' ? '.is-failed' : r.status === 'live' ? '.is-live' : ''), { 'data-row': String(r.id), 'data-status': r.status },
      h('td.fz.fz1', h('input.rowbox', { type: 'checkbox', 'aria-label': 'Select row ' + n })),
      h('td.fz.fz2.rownum', { text: String(n) }),
      h('td.fz.fz3', statusEl(r)),
      columns().map(function (c) { return cellEl(r, c); }));
  }
  function statusEl(r) {
    if (r.status === 'running') return h('span.spin', { title: 'Uploading' });
    if (r.status === 'live') return h('span.st.st--live', { title: 'Live' }, icon('check', 10));
    if (r.status === 'failed') return h('span.st.st--failed', { title: r.error }, icon('x', 10));
    return h('span.st.st--new', { title: r.status === 'queued' ? 'Waiting' : 'Not run yet' });
  }

  function cellEl(r, c) {
    var v = cellValue(r, c.key, ctx());
    var empty = v === '' || v === undefined || v === null;
    var td = h('td.cell.cell--' + c.kind + (c.required && empty ? '.is-missing' : '') + (c.mono ? '.mono' : ''), {
      'data-key': c.key, role: 'gridcell',
      onmousedown: function (e) { if (e.target.closest('select, button')) return; select(r.id, c.key); },
      ondblclick: function () { startEdit(r.id, c.key); }
    });
    if (c.kind === 'select') {
      var sel = h('select.cell__select', {
        'aria-label': c.label + ' row ' + (rows().indexOf(r) + 1),
        onfocus: function () { select(r.id, c.key); },
        onchange: function () { setCell(r.id, c.key, sel.value); }
      }, (c.key === 'account' || c.key === 'kwList' || c.key === 'strategy' ? [] : [h('option', { value: '', text: '—' })]).concat(c.options.map(function (o) { return h('option', { value: o, text: o }); })));
      sel.value = v || (c.key === 'account' ? 'Auto' : '');
      td.appendChild(sel);
      return td;
    }
    if (empty) {
      td.appendChild(h('span.ph', { text: c.kind === 'auto' && c.key === 'name' ? 'auto' : c.placeholder || '—' }));
    } else if (c.kind === 'link' || c.kind === 'resolved') {
      td.appendChild(h('span.cell__txt' + (String(v).indexOf('http') === 0 ? '.is-link' : ''), { text: v, title: v }));
    } else if (c.kind === 'asset') {
      td.appendChild(h('span.thumb', { style: { background: assetColor(v) }, 'aria-hidden': 'true' }));
      td.appendChild(h('span.cell__txt.is-link', { text: assetUrl(v).replace('https://', ''), title: assetUrl(v) }));
    } else if (c.kind === 'headline') {
      td.appendChild(h('span.cell__txt', { text: v, title: v }));
      td.appendChild(h('small.count' + (String(v).length > 70 ? '.is-bad' : ''), { text: String(String(v).length) }));
    } else if (c.kind === 'keywords') {
      var kws = String(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      td.appendChild(h('span.kw', h('span', { text: kws[0] || '' }), h('small', { text: String(kws.length) })));
    } else {
      td.appendChild(h('span.cell__txt', { text: v, title: v }));
    }
    if (c.key === 'url' || c.key === 'bid' || c.key === 'notes') {
      td.appendChild(h('button.cell__tool', {
        type: 'button', tabindex: '-1',
        'aria-label': c.key === 'url' ? 'Choose a landing page' : c.key === 'bid' ? 'Suggest a bid from performance data' : 'Open the notes',
        title: c.key === 'url' ? 'Choose a landing page' : c.key === 'bid' ? 'Suggest a value from your performance data (by geo, vertical, language…)' : 'Open the notes',
        onclick: function (e) { e.stopPropagation(); cellTool(r, c); }
      }, icon(c.key === 'url' ? 'search' : c.key === 'bid' ? 'chart' : 'comment', 11)));
    }
    return td;
  }

  function cellTool(r, c) {
    if (c.key === 'bid') {
      if (!r.geo) { toast('Pick a Geo first, so the suggestion has data to work from.'); return; }
      var suggestion = (0.03 + (r.id % 6) / 100).toFixed(2);
      setCell(r.id, 'bid', suggestion);
      toast('Suggested ' + suggestion + ' from ' + r.geo + (r.vertical ? ' · ' + r.vertical : '') + ' performance.');
    } else if (c.key === 'url') notInDemo('The landing page picker');
    else notInDemo('Row notes');
  }

  function isEditable(c) { return ['text', 'link', 'asset', 'headline', 'keywords', 'number'].indexOf(c.kind) !== -1; }

  function setCell(id, key, value) {
    var r = rowById(id);
    if (!r || r[key] === value) return;
    if (r.status === 'running' || r.status === 'queued') { toast('This row is uploading. Edit it when the run finishes.'); paintRow(id); return; }
    commit('edit ' + key, function () {
      r[key] = value;
      if (key === 'geo' && value && !r.lang) r.lang = { DE: 'de', FR: 'fr', IT: 'it', ES: 'es', MX: 'es', NL: 'nl' }[value] || 'en';
      if (['geo', 'url', 'product'].indexOf(key) !== -1 && isResolved(r)) { RESOLVED.forEach(function (k) { r[k] = ''; }); }
      if (r.status === 'failed' && key === 'headline') { r.status = 'new'; r.error = ''; }
    }, { render: false });
    paintRow(id);
    paintCounts();
    paintCellBar();
  }

  /* ---------- Selection and editing ---------- */

  function select(id, key, scroll) {
    ws.sel = { id: id, key: key };
    restoreSelection(scroll);
    paintCellBar();
    paintHint();
  }
  function restoreSelection(scroll) {
    if (!grid.body) return;
    var prev = grid.body.querySelector('.is-sel');
    if (prev) prev.classList.remove('is-sel');
    if (!ws.sel) return;
    var td = grid.body.querySelector('tr[data-row="' + ws.sel.id + '"] td[data-key="' + ws.sel.key + '"]');
    if (!td) return;
    td.classList.add('is-sel');
    if (scroll) td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function focusGrid() { if (grid.scroller) grid.scroller.focus({ preventScroll: true }); }

  function startEdit(id, key, seed) {
    var c = COLUMNS.filter(function (x) { return x.key === key; })[0];
    var r = rowById(id);
    if (!c || !r) return;
    if (!isEditable(c)) {
      if (c.kind === 'select') { var s = grid.body.querySelector('tr[data-row="' + id + '"] td[data-key="' + key + '"] select'); if (s) s.focus(); }
      else toast(c.kind === 'resolved' ? 'Create tracking links fills this column.' : 'This column builds itself from the others.');
      return;
    }
    var td = grid.body.querySelector('tr[data-row="' + id + '"] td[data-key="' + key + '"]');
    if (!td) return;
    var input = h('input.cell__edit', { type: 'text', value: seed !== undefined ? seed : (r[key] || ''), 'aria-label': c.label });
    var done = false;
    function finish(save, move) {
      if (done) return;
      done = true;
      if (save) setCell(id, key, input.value.trim());
      paintRow(id);
      if (move) moveSel(move[0], move[1]);
      focusGrid();
    }
    input.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true, [1, 0]); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      else if (e.key === 'Tab') { e.preventDefault(); finish(true, [0, e.shiftKey ? -1 : 1]); }
    });
    input.addEventListener('blur', function () { finish(true); });
    clear(td);
    td.appendChild(input);
    input.focus();
    if (seed === undefined) input.select();
    log('grid', 'edit', { row: rows().indexOf(r) + 1, column: c.label });
  }

  function moveSel(dr, dc) {
    var list = visibleRows();
    var cols = columns();
    if (!list.length) return;
    if (!ws.sel) { select(list[0].id, cols[0].key, true); return; }
    var ri = Math.max(0, list.map(function (r) { return r.id; }).indexOf(ws.sel.id));
    var ci = Math.max(0, cols.map(function (c) { return c.key; }).indexOf(ws.sel.key));
    ri = Math.max(0, Math.min(list.length - 1, ri + dr));
    ci = Math.max(0, Math.min(cols.length - 1, ci + dc));
    select(list[ri].id, cols[ci].key, true);
    focusGrid();
  }

  function onGridKey(e) {
    if (e.target.tagName === 'SELECT' && /^Arrow(Up|Down)$/.test(e.key)) return;
    var map = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (map[e.key]) { e.preventDefault(); moveSel(map[e.key][0], map[e.key][1]); return; }
    if (!ws.sel) return;
    if (e.key === 'Tab') { e.preventDefault(); moveSel(0, e.shiftKey ? -1 : 1); }
    else if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEdit(ws.sel.id, ws.sel.key); }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      var c = COLUMNS.filter(function (x) { return x.key === ws.sel.key; })[0];
      if (c && (isEditable(c) || c.kind === 'select') && c.key !== 'account' && c.key !== 'strategy') { e.preventDefault(); setCell(ws.sel.id, ws.sel.key, ''); }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'SELECT') {
      var col = COLUMNS.filter(function (x) { return x.key === ws.sel.key; })[0];
      if (col && isEditable(col)) { e.preventDefault(); startEdit(ws.sel.id, ws.sel.key, e.key); }
    }
  }

  document.addEventListener('keydown', function (e) {
    if (app.screen !== 'workspace' || document.querySelector('.backdrop')) return;
    var typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    var mod = e.ctrlKey || e.metaKey;
    if (mod && !typing && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if (mod && !typing && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); }
    else if (mod && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); goToColumn(); }
    else if (mod && e.key === '/') { e.preventDefault(); shortcuts(); }
  });

  /* ---------- Small repaints ---------- */

  function paintCounts() {
    if (parts.ready) { var n = readyCount(); parts.ready.textContent = n + (n === 1 ? ' campaign ready' : ' campaigns ready'); }
    if (parts.undo) { parts.undo.disabled = !ws.undo.length; parts.redo.disabled = !ws.redo.length; }
    var res = el.querySelector('[data-tool="resolve"]');
    if (res) { var k = resolveCount(); res.lastChild.textContent = 'Create tracking links · ' + k; res.classList.toggle('is-quiet', !k); }
    paintGuide();
  }
  function paintSaved() { if (parts.saved) parts.saved.textContent = ws.saved ? 'All changes saved' : 'Saving…'; }
  function paintHint() {
    if (!parts.hint) return;
    var c = ws.sel && COLUMNS.filter(function (x) { return x.key === ws.sel.key; })[0];
    var r = ws.sel && rowById(ws.sel.id);
    replace(parts.hint, c && r
      ? h('span', icon('info', 12), 'Row ' + (rows().indexOf(r) + 1) + ' · ' + c.label + '. ' + (isEditable(c) ? 'Type or press Enter to edit.' : c.kind === 'select' ? 'Pick a value from the list.' : c.kind === 'resolved' ? 'Resolve fills this.' : 'Built from the other columns.'))
      : h('span', icon('info', 12), 'Select cells to see what you can do with them.'));
  }

  /* ---------- Guide ---------- */
  /* A short "try it" card for visitors. Each step names the real control and can do it for them. */

  var guideEl = null;
  function guide() {
    if (app.recording) return null;
    guideEl = h('div.guide' + (ws.guideOpen ? '' : '.is-min'), { 'aria-label': 'Try the demo' });
    paintGuide();
    return guideEl;
  }
  function paintGuide() {
    if (!guideEl) return;
    guideEl.classList.toggle('is-min', !ws.guideOpen);
    if (!ws.guideOpen) {
      replace(guideEl, h('button.guide__open', { type: 'button', onclick: function () { ws.guideOpen = true; paintGuide(); } }, icon('sparkle', 13), 'Try the demo'));
      return;
    }
    var steps = [
      { done: ws.done.fill, text: 'Fill the grid', how: 'Data → Fill example data', run: fillExample, tool: 'data' },
      { done: ws.done.creatives, text: 'Add creatives and headlines', how: 'Data → Auto-fill creatives, then Auto-generate headlines', run: function () { fillCreatives(); waitIdle(fillHeadlines); }, tool: 'data' },
      { done: ws.done.run, text: 'Go live', how: 'Run live, then confirm', run: openRun, tool: 'run' },
      { done: ws.done.history, text: 'See what happened', how: 'Open in Run history', run: function () { if (ws.panel.runId) app.go('history', { run: ws.panel.runId }); else toast('Run live first, then open the run.'); }, tool: 'open-run' }
    ];
    var next = steps.filter(function (s) { return !s.done; })[0];
    replace(guideEl, h('div.guide__in',
      h('div.guide__head', h('b', { text: 'Try the demo' }), h('small', { text: 'Fake data. Nothing is sent.' }), iconBtnSm('minus', 'Hide the guide', function () { ws.guideOpen = false; paintGuide(); })),
      h('ol.guide__steps', steps.map(function (s, i) {
        return h('li' + (s.done ? '.is-done' : '') + (s === next ? '.is-next' : ''),
          h('span.guide__n', s.done ? icon('check', 11) : String(i + 1)),
          h('span.guide__txt', h('b', { text: s.text }), h('small', { text: s.how })),
          s === next ? h('button.btn.btn--xs.btn--blue', { type: 'button', 'data-guide-step': String(i + 1), onclick: function () { flash(s.tool); s.run(); } }, 'Do it') : null);
      }))));
  }
  function waitIdle(fn) { (function check() { if (ws.busy) setTimeout(check, 60); else fn(); })(); }
  function flash(tool) {
    var t = el.querySelector('[data-tool="' + tool + '"]');
    if (!t) return;
    t.classList.remove('is-flash'); void t.offsetWidth; t.classList.add('is-flash');
  }

  /* ---------- Screen API ---------- */

  return {
    el: el,
    show: function () { render(); },
    onPlatform: function () { if (app.screen === 'workspace') render(); },
    markHistorySeen: function () { if (ws.done.run) { ws.done.history = true; } }
  };
}

/* ---------- Helpers ---------- */

function kv(k, v) { return h('div.kv__row', h('span', { text: k }), h('b.mono', { text: v })); }
function iconBtnSm(name, label, run, disabled) {
  return h('button.icon-btn.icon-btn--sm', { type: 'button', 'aria-label': label, title: label, disabled: !!disabled, onclick: function (e) { run(e.currentTarget); } }, icon(name, 13));
}
