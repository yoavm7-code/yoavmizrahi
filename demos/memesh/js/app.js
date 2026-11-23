/* Memesh demo: start-up. Three apps share one state (store.js); the demo bar switches between them.
   Screens switch in memory, never through the URL, so inside the portfolio's frame the Back button
   still leaves the page. ?role=desk|manager and ?lang=en open elsewhere; ?record adds a visible
   pointer for the video. */

import { setLang, applyWording, t } from './i18n.js';
import { loadSettings } from './settings.js';
import { h, icon, closeModal, log } from './dom.js';
import { createShell } from './shell.js';
import { createParent } from './parent.js';
import { createDesk } from './desk.js';
import { createManager } from './manager.js';

var params = new URLSearchParams(location.search);
var embedded = window.self !== window.top;
var settings = await loadSettings('memesh');
applyWording(settings.strings);

var app = {
  recording: params.has('record'),
  logo: settings.logo,
  lang: params.get('lang') === 'en' ? 'en' : 'he',
  role: '',
  views: {},
  shell: null,

  setRole: function (role, opts) {
    if (!app.views[role]) role = 'parent';
    closeModal();
    var changed = role !== app.role;
    app.role = role;
    app.shell.render();
    app.views[role].show(opts || {});
    if (changed) { app.shell.main.replaceChildren(app.views[role].el); window.scrollTo(0, 0); }
    log('nav', 'role', { role: role });
  },
  setLang: function (lang) {
    app.lang = lang;
    setLang(lang);
    document.title = t('demo.title');
    app.shell.render();
    app.views[app.role].render();
    paintBackLink();
    log('ui', 'language', { lang: lang, dir: document.documentElement.dir });
  }
};

setLang(app.lang);
document.title = t('demo.title');
app.shell = createShell(app);
app.views.parent = createParent(app);
app.views.desk = createDesk(app);
app.views.manager = createManager(app);

document.body.appendChild(app.shell.el);
document.body.classList.toggle('is-embedded', embedded);
var back = null;
if (!embedded && !app.recording) { back = h('a.backlink', { href: '../../#/work/memesh' }); document.body.appendChild(back); paintBackLink(); }
if (app.recording) startRecordCursor();
app.setRole(params.get('role') || 'parent');
log('ui', 'ready', { embedded: embedded, lang: app.lang, role: app.role });

/* Full-screen visits get a quiet way back to the portfolio. */
function paintBackLink() {
  if (!back) return;
  back.replaceChildren(icon('back', 13), h('span', { text: t('demo.back') }), h('small', { text: t('demo.madeUp') }));
}

/* For the recorded video: a visible pointer that follows the mouse and pulses on click. */
function startRecordCursor() {
  var c = h('div.rec-cursor', { 'aria-hidden': 'true' });
  document.body.appendChild(c);
  document.addEventListener('mousemove', function (e) { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
  document.addEventListener('mousedown', function () { c.classList.remove('is-click'); void c.offsetWidth; c.classList.add('is-click'); }, true);
  log('ui', 'record cursor on', {});
}
