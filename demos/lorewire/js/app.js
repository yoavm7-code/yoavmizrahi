/* LoreWire demo: start-up, the top bar and the state every screen shares (votes, your list, likes,
   comments). Views switch in memory, never through the URL, so inside the portfolio's frame the Back
   button still leaves the page. ?view=wires opens the feed; ?record adds a pointer for the video. */

import { h, icon, toast, log } from './dom.js';
import { createHome } from './home.js';
import { createWires } from './wires.js';
import { createBrowse, createVerdicts, createSaved, createSearch } from './pages.js';
import { createStory } from './story.js';

var params = new URLSearchParams(location.search);
var embedded = window.self !== window.top;
var NAV = [['home', 'Home'], ['wires', 'Wires'], ['browse', 'Browse'], ['verdicts', 'Today\'s Verdicts'], ['saved', 'Saved']];

var app = {
  view: '',
  views: {},
  votes: {},
  saved: [],
  liked: [],
  comments: {},
  query: '',
  recording: params.has('record'),

  go: function (name) {
    if (!app.views[name]) name = 'home';
    if (app.views[app.view] && app.views[app.view].hide) app.views[app.view].hide();
    app.view = name;
    main.replaceChildren(app.views[name].el);
    app.views[name].show();
    paintTop();
    window.scrollTo(0, 0);
    log('nav', 'view', { view: name });
  },
  openStory: function (id, tab) { story.open(id, tab); },
  modalOpen: function () { return story.isOpen(); },
  /* After the popup closes, the page behind it catches up (a vote moves a poster out of a row). */
  refresh: function () { if (app.views[app.view].render) app.views[app.view].render(); },
  vote: function (id, side) { if (!app.votes[id]) { app.votes[id] = side; log('poll', 'vote', { story: id, side: side }); } },
  toggleSaved: function (id) { toggle(app.saved, id); },
  toggleLiked: function (id) { toggle(app.liked, id); },
  comment: function (id, c) { (app.comments[id] = app.comments[id] || []).unshift(c); log('comments', 'posted', { story: id }); }
};

function toggle(list, id) { var i = list.indexOf(id); if (i === -1) list.push(id); else list.splice(i, 1); }

/* ---------- Top bar ---------- */

var top = h('header.topbar');
var main = h('main.main');
var searchOpen = false;

function paintTop() {
  var input = h('input.search__input', { type: 'search', placeholder: 'Stories, categories…', 'aria-label': 'Search stories', value: app.query, oninput: function () {
    app.query = input.value;
    if (app.view !== 'search') app.go('search'); else app.views.search.render();
    var again = top.querySelector('.search__input');
    if (again && document.activeElement !== again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
  } });
  top.replaceChildren(
    h('button.logo', { type: 'button', 'aria-label': 'LoreWire home', onclick: function () { app.go('home'); } }, h('span', { text: 'LORE' }), h('span.logo__red', { text: 'WIRE' })),
    h('nav.nav', { 'aria-label': 'Sections' }, NAV.map(function (n) {
      var on = app.view === n[0];
      return h('button.nav__item' + (on ? '.is-on' : ''), { type: 'button', 'aria-current': on ? 'page' : null, 'data-nav': n[0], onclick: function () { app.go(n[0]); } }, n[1]);
    })),
    h('span.topbar__fill'),
    searchOpen || app.view === 'search'
      ? h('label.search', icon('search', 16), input)
      : h('button.icon-btn', { type: 'button', 'aria-label': 'Search', 'data-search': '', onclick: function () { searchOpen = true; paintTop(); top.querySelector('.search__input').focus(); } }, icon('search', 18)),
    h('button.icon-btn', { type: 'button', 'aria-label': 'Settings', onclick: function () { toast('Playback settings aren\'t part of this demo.'); } }, icon('gear', 18)),
    h('button.btn.btn--outline.btn--sm.signin', { type: 'button', onclick: function () { toast('Signing in isn\'t part of this demo. Votes and saves work without it.'); } }, 'Sign in'));
}

/* ---------- Start ---------- */

app.views.home = createHome(app);
app.views.wires = createWires(app);
app.views.browse = createBrowse(app);
app.views.verdicts = createVerdicts(app);
app.views.saved = createSaved(app);
app.views.search = createSearch(app);
var story = createStory(app);

document.body.append(top, main);
document.body.classList.toggle('is-embedded', embedded);
if (!embedded && !app.recording) {
  document.body.appendChild(h('a.backlink', { href: '../../#/work/lorewire' }, icon('back', 14), h('span', { text: 'Back to the portfolio' }), h('small', { text: 'Demo with LoreWire\'s own stories' })));
}
if (app.recording) startRecordCursor();
app.go(params.get('view') || 'home');
log('ui', 'ready', { embedded: embedded, view: app.view });

/* For the recorded video: a visible pointer that follows the mouse and pulses on click. */
function startRecordCursor() {
  var c = h('div.rec-cursor', { 'aria-hidden': 'true' });
  document.body.appendChild(c);
  document.addEventListener('mousemove', function (e) { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
  document.addEventListener('mousedown', function () { c.classList.remove('is-click'); void c.offsetWidth; c.classList.add('is-click'); }, true);
}
