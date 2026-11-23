/* Mega Uploader demo: start-up and the little bit of state every screen shares.
   Screens switch in memory, never through the URL, so inside the portfolio's frame the Back button
   still leaves the page instead of stepping through the demo. */

import { RUNS } from './data.js';
import { h, icon, closePopover, closeModal, log } from './dom.js';
import { createShell } from './shell.js';
import { createDashboard } from './dashboard.js';
import { createWorkspace } from './workspace.js';
import { createHistory } from './history.js';

var params = new URLSearchParams(location.search);
var embedded = window.self !== window.top;

var app = {
  now: new Date(),
  recording: params.has('record'),
  screen: '',
  platform: 'outbrain',
  theme: 'light',
  runs: RUNS.slice(),
  shell: null,
  screens: {},

  go: function (name, opts) {
    if (!app.screens[name]) name = 'workspace';
    closePopover();
    closeModal();
    var changed = name !== app.screen;
    app.screen = name;
    if (name === 'history') app.screens.workspace.markHistorySeen();
    app.screens[name].show(opts);
    if (changed) { app.shell.main.replaceChildren(app.screens[name].el); app.shell.main.scrollTop = 0; }
    app.shell.update();
    log('nav', 'screen', { screen: name, run: opts && opts.run || null });
  },
  setPlatform: function (id) {
    app.platform = id;
    log('nav', 'platform', { platform: id });
    app.shell.update();
    app.screens.workspace.onPlatform();
    if (app.screen === 'history') app.screens.history.show();
  },
  setTheme: function (theme) {
    app.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    log('ui', 'theme', { theme: theme });
    app.shell.update();
  },
  nextRunId: function () { return Math.max.apply(null, app.runs.map(function (r) { return r.id; })) + 1; },
  addRun: function (run) { app.runs.unshift(run); log('history', 'run added', { run: run.id, live: run.live, failed: run.failed }); }
};

app.shell = createShell(app);
app.screens.dashboard = createDashboard(app);
app.screens.workspace = createWorkspace(app);
app.screens.history = createHistory(app);

document.body.appendChild(app.shell.el);
document.body.classList.toggle('is-embedded', embedded);
if (!embedded && !app.recording) document.body.appendChild(backLink());
if (app.recording) startRecordCursor();
app.go(params.get('screen') || 'workspace');
log('ui', 'ready', { embedded: embedded, screen: app.screen, runs: app.runs.length });

/* Full-screen visits get a quiet way back to the portfolio. */
function backLink() {
  return h('a.backlink', { href: '../../#/work/uploader' }, icon('left', 13), 'Back to the portfolio', h('small', { text: 'Demo with made-up data' }));
}

/* For the recorded video: a visible pointer that follows the mouse and pulses on click. */
function startRecordCursor() {
  var c = h('div.rec-cursor', { 'aria-hidden': 'true' });
  document.body.appendChild(c);
  document.addEventListener('mousemove', function (e) { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
  document.addEventListener('mousedown', function () { c.classList.remove('is-click'); void c.offsetWidth; c.classList.add('is-click'); }, true);
  log('ui', 'record cursor on', {});
}
