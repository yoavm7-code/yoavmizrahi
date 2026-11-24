/* Ad Radar demo: start-up, the top bar and the state every screen shares (the ads, the team's work
   on each ad, filters, tracked domains and the scan). Views switch in memory, never through the
   URL, so inside the portfolio's frame the Back button still leaves the page.
   ?view=trends|board|scans opens a screen; ?record adds a pointer for the video. */

import { ADS, TRACKED, SCAN } from './data.js';
import { ago, EMPTY_FILTERS } from './logic.js';
import { h, icon, log } from './dom.js';
import { createAds } from './ads.js';
import { createDetail } from './detail.js';
import { createTrends } from './trends.js';
import { createBoard } from './board.js';
import { createScans } from './scans.js';

var params = new URLSearchParams(location.search);
var embedded = window.self !== window.top;

/* The tabs: every one of them works in the demo. */
var TABS = [['ads', 'Ads'], ['trends', 'Trends'], ['board', 'Board'], ['scans', 'Scans']];
var SEARCH = { ads: 'Search ads', trends: 'Search verticals', board: 'Search the board', scans: 'Search domains' };

var app = {
  view: '',
  views: {},
  ads: ADS.map(function (a) { return Object.assign({}, a); }),
  work: {},
  filters: Object.assign({}, EMPTY_FILTERS, { domains: [], languages: [], verticals: [] }),
  sort: 'freshness',
  thumbs: 's',
  selected: [],
  order: [],
  adId: null,
  lastAd: null,
  query: {},
  tracked: TRACKED.map(function (r) { return Object.assign({}, r); }),
  scan: Object.assign({ running: false, queue: [], done: 0, found: 0, log: [] }, SCAN),
  recording: params.has('record'),

  go: function (name) {
    if (!app.views[name]) name = 'ads';
    if (app.views[app.view] && app.views[app.view].hide) app.views[app.view].hide();
    app.view = name;
    main.replaceChildren(app.views[name].el);
    app.views[name].show();
    app.paintTop();
    main.scrollTop = 0;
    log('nav', 'view', { view: name });
  },
  openAd: function (id) {
    if (app.order.indexOf(id) === -1) app.order = app.views.ads.visible().map(function (a) { return a.id; });
    if (app.order.indexOf(id) === -1) app.order = app.ads.map(function (a) { return a.id; });
    app.adId = id;
    app.go('ad');
  },
  showVertical: function (v) {
    app.filters = Object.assign({}, EMPTY_FILTERS, { domains: [], languages: [], verticals: [v] });
    app.query.ads = '';
    app.go('ads');
  },
  /* Re-render a view without losing the field being typed in (matched by data-focus). */
  keepFocus: function (root, draw) {
    var a = document.activeElement;
    var key = a && root.contains(a) && a.getAttribute('data-focus');
    var at = key && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
    draw();
    if (!key) return;
    var again = root.querySelector('[data-focus="' + key + '"]');
    if (!again) return;
    again.focus();
    if (at) try { again.setSelectionRange(at[0], at[1]); } catch (e) { /* number inputs have no selection */ }
  },
  paintTop: paintTop
};

/* ---------- Top bar ---------- */

var top = h('header.topbar');
var main = h('main.main');

function paintTop() {
  var tab = app.view === 'ad' ? 'ads' : app.view;
  var place = SEARCH[tab];
  var input = h('input.search__input', { type: 'search', placeholder: place, 'aria-label': place, value: app.query[tab] || '', 'data-search': '',
    oninput: function () {
      app.query[tab] = input.value;
      if (app.view === 'ad') app.go('ads'); else app.views[tab].render();
      var again = top.querySelector('.search__input');
      if (again && document.activeElement !== again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    } });
  var sc = app.scan;
  top.replaceChildren(
    h('button.logo', { type: 'button', 'aria-label': 'Ad Radar, all ads', onclick: function () { app.go('ads'); } }, logoMark(), h('b', { text: 'Ad Radar' })),
    h('nav.tabs', { 'aria-label': 'Sections' }, TABS.map(function (t) {
      var on = tab === t[0];
      return h('button.tab' + (on ? '.is-on' : ''), { type: 'button', 'aria-current': on ? 'page' : null, 'data-tab': t[0], onclick: function () { app.go(t[0]); } },
        icon(t[0], 16), h('span', { text: t[1] }));
    })),
    h('span.fill'),
    h('label.search', icon('search', 15), input, h('kbd', { text: '/' })),
    h('button.live' + (sc.running ? '.is-running' : ''), { type: 'button', 'data-live': '', title: 'Open Scans', onclick: function () { app.go('scans'); } },
      h('span.live__dot'), h('span', { text: sc.running ? 'Scanning ' + sc.done + ' of ' + sc.queue.length : 'Last scan ' + ago(sc.lastRunHours) })));
}

/* Three rings and a sweep: the radar. Drawn here, a fixed string. */
function logoMark() {
  var m = h('span.logo__mark', { 'aria-hidden': 'true' });
  m.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
    + '<circle cx="12" cy="12" r="9.5" opacity=".35"/><circle cx="12" cy="12" r="5.5" opacity=".6"/><path d="M12 12 18.7 5.3"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>';
  return m;
}

document.addEventListener('keydown', function (e) {
  var typing = e.target.closest && e.target.closest('input, textarea, select');
  if (e.key === '/' && !typing) {
    var s = top.querySelector('.search__input');
    if (s) { e.preventDefault(); s.focus(); }
  }
});

/* ---------- Start ---------- */

app.views.ads = createAds(app);
app.views.ad = createDetail(app);
app.views.trends = createTrends(app);
app.views.board = createBoard(app);
app.views.scans = createScans(app);

document.body.append(top, main);
document.body.classList.toggle('is-embedded', embedded);
if (!embedded && !app.recording) {
  document.body.appendChild(h('a.backlink', { href: '../../#/work/ad-radar' }, '← Back to the portfolio', h('small', { text: 'Demo with made-up data' })));
}
if (app.recording) startRecordCursor();
app.go(params.get('view') || 'ads');
log('ui', 'ready', { embedded: embedded, view: app.view });

/* For the recorded video: a visible pointer that follows the mouse and pulses on click. */
function startRecordCursor() {
  var c = h('div.rec-cursor', { 'aria-hidden': 'true' });
  document.body.appendChild(c);
  document.addEventListener('mousemove', function (e) { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
  document.addEventListener('mousedown', function () { c.classList.remove('is-click'); void c.offsetWidth; c.classList.add('is-click'); }, true);
}
