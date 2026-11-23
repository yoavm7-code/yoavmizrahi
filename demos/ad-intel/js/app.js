/* Ad Intel demo: start-up, the top bar and the state every screen shares (the ads, the team's work
   on each ad, filters, tracked domains and the scrape). Views switch in memory, never through the
   URL, so inside the portfolio's frame the Back button still leaves the page.
   ?view=trends|pipeline|control opens a screen; ?record adds a pointer for the video. */

import { ADS, TRACKED, FEEDS, SCRAPE, QUEUES } from './data.js';
import { ago, num, EMPTY_FILTERS } from './logic.js';
import { h, toast, log } from './dom.js';
import { createFeed } from './feed.js';
import { createDetail } from './detail.js';
import { createTrends } from './trends.js';
import { createPipeline } from './pipeline.js';
import { createControl } from './control.js';

var params = new URLSearchParams(location.search);
var embedded = window.self !== window.top;

/* The tabs. Views without a module are not part of the demo and say so. */
var TABS = [
  ['feed', 'FRESH FINDS'], ['competitors', 'COMPETITORS'], ['trends', 'TRENDS'], ['pipeline', 'PIPELINE'],
  ['kits', 'CLIENT KITS'], ['review', 'REVIEW', QUEUES.review], ['filtered', 'FILTERED', QUEUES.filtered],
  ['rejected', 'REJECTED', QUEUES.rejected], ['control', 'CONTROL ROOM']
];
var SEARCH = { feed: 'Search fresh finds…', trends: 'Search trends…', pipeline: 'Search pipeline…', control: 'Search domains…' };
var NOT_HERE = {
  competitors: ['COMPETITORS', 'One competitor at a time: how many ads it runs, video against image, how long its ads last, and which countries it targets.'],
  kits: ['CLIENT KITS', 'Pair a competitor\'s creative with one of our own article links, then export the set for a client.'],
  review: ['REVIEW', 'Ads a scrape found for a tracked domain that don\'t actually lead to it. Approve sends them to the feed, reject sets them aside.'],
  filtered: ['FILTERED', 'Ads the prohibited-content check hid from the feed. "Not prohibited" returns a false positive.'],
  rejected: ['REJECTED', 'Ads rejected in Review. Nothing is deleted, so any of them can be restored.']
};

var app = {
  view: '',
  views: {},
  ads: ADS.map(function (a) { return Object.assign({}, a); }),
  work: {},
  filters: Object.assign({}, EMPTY_FILTERS, { domains: [], feeds: [], verticals: [] }),
  sort: 'freshness',
  thumbs: 's',
  selected: [],
  order: [],
  adId: null,
  lastAd: null,
  query: {},
  tracked: TRACKED.map(function (r) { return Object.assign({}, r); }),
  feeds: FEEDS.slice(),
  scrape: Object.assign({ running: false, queue: [], done: 0, found: 0, log: [] }, SCRAPE),
  recording: params.has('record'),

  go: function (name) {
    if (!app.views[name]) name = 'feed';
    if (app.views[app.view] && app.views[app.view].hide) app.views[app.view].hide();
    app.view = name;
    main.replaceChildren(app.views[name].el);
    app.views[name].show();
    app.paintTop();
    main.scrollTop = 0;
    log('nav', 'view', { view: name });
  },
  openAd: function (id) {
    if (app.order.indexOf(id) === -1) app.order = app.views.feed.visible().map(function (a) { return a.id; });
    if (app.order.indexOf(id) === -1) app.order = app.ads.map(function (a) { return a.id; });
    app.adId = id;
    app.go('ad');
  },
  showVertical: function (v) {
    app.filters = Object.assign({}, EMPTY_FILTERS, { domains: [], feeds: [], verticals: [v] });
    app.query.feed = '';
    app.go('feed');
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
  var tab = app.view === 'ad' ? 'feed' : app.view;
  var place = SEARCH[tab];
  var input = place ? h('input.search__input', { type: 'search', placeholder: place, 'aria-label': place.replace('…', ''), value: app.query[tab] || '', 'data-search': '',
    oninput: function () {
      app.query[tab] = input.value;
      if (app.view === 'ad') app.go('feed'); else app.views[tab].render();
      var again = top.querySelector('.search__input');
      if (again && document.activeElement !== again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    } }) : null;
  var sc = app.scrape;
  top.replaceChildren(
    h('button.logo', { type: 'button', 'aria-label': 'Ad Intel, fresh finds', onclick: function () { app.go('feed'); } }, h('span.logo__mark', { 'aria-hidden': 'true' }), h('b', { text: 'ADINTEL' }), h('small', { text: 'v1' })),
    h('nav.tabs', { 'aria-label': 'Sections' }, TABS.map(function (t) {
      var on = tab === t[0];
      return h('button.tab' + (on ? '.is-on' : ''), { type: 'button', 'aria-current': on ? 'page' : null, 'data-tab': t[0], onclick: function () { app.go(t[0]); } },
        h('span', { text: t[1] }), t[2] ? h('span.badge', { text: num(t[2]) }) : null);
    })),
    h('span.toolbar__fill'),
    h('label.search' + (place ? '' : '.is-off'), h('span.search__mark', { text: '›' }), input || h('span.muted', { text: 'Nothing to search here' }), h('kbd', { text: '/' })),
    h('button.obtn.obtn--sq', { type: 'button', 'aria-label': 'Command palette', onclick: palette }, '⌘K'),
    h('span.live' + (sc.running ? '.is-running' : ''), { 'data-live': '' }, h('span.live__dot'), h('b', { text: sc.running ? 'SCRAPING' : 'LIVE' }), h('small', { text: sc.running ? sc.done + '/' + sc.queue.length : ago(sc.lastRunHours) })),
    h('button.obtn', { type: 'button', onclick: function () { toast('Managing users isn\'t part of this demo. Access is invite-only, with admin, editor and viewer roles.'); } }, 'USERS'),
    h('button.obtn', { type: 'button', onclick: function () { toast('There\'s nothing to sign out of in the demo.'); } }, 'EXIT'));
}

function palette() { toast('The command palette isn\'t part of this demo.'); }

document.addEventListener('keydown', function (e) {
  var typing = e.target.closest && e.target.closest('input, textarea, select');
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); palette(); return; }
  if (e.key === '/' && !typing) {
    var s = top.querySelector('.search__input');
    if (s) { e.preventDefault(); s.focus(); }
  }
});

/* ---------- Screens that aren't in the demo ---------- */

function createNote(key) {
  var note = NOT_HERE[key];
  var el = h('section.view.note', { 'aria-label': note[0] });
  function render() {
    el.replaceChildren(h('div.note__box',
      h('b.cap.white', { text: note[0] }),
      h('p', { text: note[1] }),
      h('p.muted', { text: 'This screen isn\'t part of the demo. Fresh Finds, Trends, Pipeline and Control Room are.' }),
      h('button.btn-amber', { type: 'button', onclick: function () { app.go('feed'); } }, 'OPEN FRESH FINDS')));
  }
  return { el: el, show: render, render: render };
}

/* ---------- Start ---------- */

app.views.feed = createFeed(app);
app.views.ad = createDetail(app);
app.views.trends = createTrends(app);
app.views.pipeline = createPipeline(app);
app.views.control = createControl(app);
Object.keys(NOT_HERE).forEach(function (k) { app.views[k] = createNote(k); });

document.body.append(top, main);
document.body.classList.toggle('is-embedded', embedded);
if (!embedded && !app.recording) {
  document.body.appendChild(h('a.backlink', { href: '../../#/work/ad-intel' }, '← Back to the portfolio', h('small', { text: 'Demo with made-up data' })));
}
if (app.recording) startRecordCursor();
app.go(params.get('view') || 'feed');
log('ui', 'ready', { embedded: embedded, view: app.view });

/* For the recorded video: a visible pointer that follows the mouse and pulses on click. */
function startRecordCursor() {
  var c = h('div.rec-cursor', { 'aria-hidden': 'true' });
  document.body.appendChild(c);
  document.addEventListener('mousemove', function (e) { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
  document.addEventListener('mousedown', function () { c.classList.remove('is-click'); void c.offsetWidth; c.classList.add('is-click'); }, true);
}
