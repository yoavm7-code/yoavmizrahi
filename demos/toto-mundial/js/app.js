/* Toto Mundial demo: start-up and the state every screen shares.
   Screens switch in memory, never through the URL, so inside the portfolio's frame the Back button
   still leaves the page. ?lang=he opens in Hebrew; ?record adds a visible pointer for the video. */

import { PEOPLE, ME, UPCOMING, LIVE, TOURNAMENT } from './data.js';
import { demoNow, liveMinute, isFinished, projected } from './logic.js';
import { setLang, applyWording, t } from './i18n.js';
import { loadSettings } from './settings.js';
import { h, icon, closeSheet, log } from './dom.js';
import { createShell } from './shell.js';
import { createHome } from './home.js';
import { createBets } from './bets.js';
import { createLeaders } from './leaderboard.js';
import { createLive } from './live.js';

var params = new URLSearchParams(location.search);
var embedded = window.self !== window.top;
applyWording((await loadSettings('toto')).strings);
var LIVE_MS_PER_MINUTE = 1200;

var app = {
  openedAt: Date.now(),
  recording: params.has('record'),
  lang: params.get('lang') === 'he' ? 'he' : 'en',
  screen: '',
  screens: {},
  shell: null,
  picks: {},
  tour: {},
  live: { startedAt: 0 },

  now: function () { return demoNow(app.openedAt, Date.now()); },
  me: function () { return PEOPLE.filter(function (p) { return p.id === ME; })[0]; },

  /* The live match's minute, and the points it has earned once it is over. */
  liveMinute: function () { return liveMinute(LIVE, app.live.startedAt, Date.now(), LIVE_MS_PER_MINUTE); },
  extra: function () { var m = app.liveMinute(); return isFinished(LIVE, m) ? projected(LIVE, m).points : 0; },
  startLive: function () { if (!app.live.startedAt) { app.live.startedAt = Date.now(); log('live', 'match clock started', { from: LIVE.from }); } },

  go: function (name, opts) {
    if (!app.screens[name]) name = 'home';
    closeSheet();
    var changed = name !== app.screen;
    app.screen = name;
    app.screens[name].show(opts || {});
    if (changed) { app.shell.main.replaceChildren(app.screens[name].el); app.shell.main.scrollTop = 0; }
    app.shell.render();
    log('nav', 'screen', { screen: name, opts: opts || {} });
  },
  setLang: function (lang) {
    app.lang = lang;
    setLang(lang);
    document.title = t('app.name') + ' · demo';
    app.screens[app.screen].show({ keepScroll: true });
    app.shell.render();
    paintBackLink();
    log('ui', 'language', { lang: lang, dir: document.documentElement.dir });
  },
  /* Called after a change that moves points or ranks, so the top bar follows. */
  refresh: function () { app.shell.render(); }
};

UPCOMING.forEach(function (m) { app.picks[m.id] = m.pick ? m.pick.slice() : null; });
TOURNAMENT.forEach(function (q) { app.tour[q.id] = q.pick || null; });

setLang(app.lang);
document.title = t('app.name') + ' · demo';
app.shell = createShell(app);
app.screens.home = createHome(app);
app.screens.bets = createBets(app);
app.screens.leaders = createLeaders(app);
app.screens.live = createLive(app);

document.body.appendChild(app.shell.el);
document.body.classList.toggle('is-embedded', embedded);
var back = null;
if (!embedded && !app.recording) { back = h('a.backlink', { href: '../../#/work/toto' }); document.body.appendChild(back); paintBackLink(); }
if (app.recording) startRecordPointer();
app.go(params.get('screen') || 'home');

/* Countdowns and the live match move once a second. When the live match ends on another screen, the
   top bar still picks up the points it earned. */
var lastExtra = app.extra();
setInterval(function () {
  var s = app.screens[app.screen];
  if (s.tick) s.tick();
  var extra = app.extra();
  if (extra !== lastExtra) { lastExtra = extra; app.refresh(); }
}, 1000);
log('ui', 'ready', { embedded: embedded, lang: app.lang, screen: app.screen });

/* Full-screen visits get a quiet way back to the portfolio. */
function paintBackLink() {
  if (!back) return;
  back.replaceChildren(icon('next', 13, 'ic--back'), h('span', { text: t('app.back') }), h('small', { text: t('app.madeUp') }));
}

/* For the recorded video: a visible fingertip that follows the pointer and pulses on tap. */
function startRecordPointer() {
  var c = h('div.rec-pointer', { 'aria-hidden': 'true' });
  document.body.appendChild(c);
  document.addEventListener('mousemove', function (e) { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
  document.addEventListener('mousedown', function () { c.classList.remove('is-tap'); void c.offsetWidth; c.classList.add('is-tap'); }, true);
  log('ui', 'record pointer on', {});
}
