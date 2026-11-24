/* I.M demo: start-up and the frame around the pages. The right-hand nav rail (a bottom tab bar and a
   slim top bar on phones), the floating accessibility and WhatsApp buttons, the photo lightbox, and
   moving between pages. Pages switch in memory, never through the URL, so inside the portfolio's
   frame the Back button still leaves the page. ?view=projects or ?project=<slug> opens a page;
   ?record adds a pointer for the video. */

import { COMPANY } from './data.js';
import { bySlug } from './logic.js';
import { h, icon, whatsapp, toast, log } from './dom.js';
import { home, projectsPage, projectPage, media } from './pages.js';
import { createA11y } from './a11y.js';

var params = new URLSearchParams(location.search);
var embedded = window.self !== window.top;

var NAV = [['hero', 'home', 'ראשי'], ['about', 'info', 'אודות'], ['projects', 'grid', 'פרויקטים'], ['clients', 'users', 'לקוחות'], ['contact', 'phone', 'צור קשר']];
var OUTSIDE = {
  whatsapp: 'On the real site this opens a WhatsApp chat with Ido. The demo stays here.',
  phone: 'On the real site this calls ' + COMPANY.phone + '. The demo stays here.',
  email: 'On the real site this opens an email to ' + COMPANY.email + '. The demo stays here.',
  instagram: 'On the real site this opens ' + COMPANY.instagram + ' on Instagram.',
  map: 'On the real site this is the office address: ' + COMPANY.address + '.'
};

var app = {
  view: '',
  slug: null,
  lead: { values: {}, errors: {}, sending: false, sent: false, failed: false },
  recording: params.has('record'),

  go: function (view, slug) {
    app.view = view;
    app.slug = slug || null;
    var p = view === 'project' ? bySlug(slug) : null;
    if (view === 'project' && !p) { app.view = 'projects'; }
    main.replaceChildren(app.view === 'home' ? home(app) : app.view === 'projects' ? projectsPage(app) : projectPage(app, p));
    window.scrollTo(0, 0);
    watchReveals();
    paintNav(app.view === 'home' ? 'hero' : 'projects');
    log('nav', 'view', { view: app.view, slug: app.slug });
  },
  /* Scroll to a home section, coming back to Home first when needed. */
  scrollTo: function (id) {
    if (app.view !== 'home') app.go('home');
    var target = document.getElementById(id);
    if (!target) return;
    var still = document.documentElement.classList.contains('a11y-still') || matchMedia('(prefers-reduced-motion: reduce)').matches;
    var top = target.getBoundingClientRect().top + window.scrollY - (isPhone() ? 56 : 0);
    window.scrollTo({ top: id === 'hero' ? 0 : top, behavior: still ? 'auto' : 'smooth' });
  },
  outside: function (kind) { toast(OUTSIDE[kind]); },
  lightbox: function (p, i) { openLightbox(p, i); }
};

function isPhone() { return matchMedia('(max-width: 767px)').matches; }

/* ---------- Navigation: the rail, the phone tab bar and top bar ---------- */

var rail = h('nav.rail', { 'aria-label': 'ניווט ראשי' });
var tabbar = h('nav.tabbar', { 'aria-label': 'ניווט ראשי' });
var topbar = h('header.topbar',
  h('button.topbar__logo', { type: 'button', 'aria-label': COMPANY.name + ', לראש הדף', onclick: function () { app.scrollTo('hero'); } }, h('img', { src: media('logo'), alt: '' })),
  h('button.topbar__call', { type: 'button', 'aria-label': 'התקשרו אלינו', onclick: function () { app.outside('phone'); } }, icon('phone', 18)));
var main = h('main.main');

function navTo(id) { if (id === 'projects') app.go('projects'); else app.scrollTo(id); }

function paintNav(active) {
  var item = function (n, labels) {
    var on = n[0] === active;
    return h('button.nav__btn' + (on ? '.is-on' : ''), { type: 'button', 'data-nav': n[0], 'aria-label': labels ? null : n[2], 'aria-current': on ? 'true' : null, title: labels ? null : n[2], onclick: function () { navTo(n[0]); } },
      icon(n[1], 22), labels ? h('span', { text: n[2] }) : null);
  };
  rail.replaceChildren(
    h('button.rail__logo', { type: 'button', 'aria-label': COMPANY.name + ', לראש הדף', onclick: function () { app.scrollTo('hero'); } }, h('img', { src: media('logo'), alt: '' })),
    h('div.rail__items', NAV.map(function (n) { return item(n, false); })),
    h('button.rail__wa', { type: 'button', 'aria-label': 'WhatsApp', onclick: function () { app.outside('whatsapp'); } }, whatsapp(22)));
  tabbar.replaceChildren.apply(tabbar, NAV.map(function (n) { return item(n, true); }));
}

/* Which home section is in view, for the active nav icon; the top bar shows once past the hero. */
function onScroll() {
  topbar.classList.toggle('is-shown', window.scrollY > window.innerHeight * 0.6);
  if (app.view !== 'home') return;
  var mid = window.innerHeight * 0.4;
  var current = 'hero';
  NAV.forEach(function (n) {
    var el = document.getElementById(n[0]);
    if (el && el.getBoundingClientRect().top <= mid) current = n[0];
  });
  var on = rail.querySelector('.is-on');
  if (!on || on.getAttribute('data-nav') !== current) paintNav(current);
}

/* Sections fade up as they come into view. */
var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
  entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); observer.unobserve(e.target); } });
}, { rootMargin: '0px 0px -8% 0px' }) : null;
function watchReveals() {
  main.querySelectorAll('.reveal').forEach(function (el) { if (observer) observer.observe(el); else el.classList.add('is-in'); });
}

/* ---------- Lightbox ---------- */

var box = h('div.lightbox', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'גלריית תמונות', hidden: true });
var lb = { p: null, i: 0, from: null, x: null };

function openLightbox(p, i) {
  lb.p = p; lb.i = i; lb.from = document.activeElement;
  drawLightbox();
  box.hidden = false;
  box.querySelector('.lightbox__close').focus();
}
function closeLightbox() { box.hidden = true; if (lb.from && lb.from.focus) lb.from.focus(); }
function step(d) { var n = lb.p.gallery.length; lb.i = (lb.i + d + n) % n; drawLightbox(); }
function drawLightbox() {
  var g = lb.p.gallery[lb.i];
  box.replaceChildren(
    h('button.lightbox__close', { type: 'button', 'aria-label': 'סגירה', onclick: closeLightbox }, icon('x', 24)),
    h('button.lightbox__nav.lightbox__prev', { type: 'button', 'aria-label': 'התמונה הקודמת', 'data-lb': 'prev', onclick: function () { step(-1); } }, icon('arrowBack', 22)),
    h('figure.lightbox__figure', h('img', { src: media(g[0]), alt: g[2], draggable: 'false' }), h('figcaption', h('b', { text: g[1] }), h('span', { text: g[2] }), h('small', { text: (lb.i + 1) + ' / ' + lb.p.gallery.length }))),
    h('button.lightbox__nav.lightbox__next', { type: 'button', 'aria-label': 'התמונה הבאה', 'data-lb': 'next', onclick: function () { step(1); } }, icon('arrow', 22)));
}
box.addEventListener('click', function (e) { if (e.target === box) closeLightbox(); });
box.addEventListener('pointerdown', function (e) { lb.x = e.clientX; });
box.addEventListener('pointercancel', function () { lb.x = null; });
box.addEventListener('pointerup', function (e) {
  if (lb.x === null) return;
  var dx = e.clientX - lb.x;
  lb.x = null;
  if (Math.abs(dx) > 50) step(dx > 0 ? 1 : -1);
});
document.addEventListener('keydown', function (e) {
  if (box.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') step(1);
  if (e.key === 'ArrowRight') step(-1);
});

/* ---------- Start ---------- */

var floats = h('div.floats',
  h('button.float.float--a11y', { type: 'button', 'aria-label': 'הגדרות נגישות', 'aria-controls': 'a11y-panel', 'data-a11y-open': '', onclick: function (e) { a11y.open(e.currentTarget); } }, icon('person', 22)),
  h('button.float.float--wa', { type: 'button', 'aria-label': 'WhatsApp', 'data-whatsapp': 'float', onclick: function () { app.outside('whatsapp'); } }, whatsapp(24)));

document.body.append(topbar, rail, main, tabbar, floats, box);
document.body.classList.toggle('is-embedded', embedded);
var a11y = createA11y();
window.addEventListener('scroll', onScroll, { passive: true });
if (!embedded && !app.recording) {
  document.body.appendChild(h('a.backlink', { href: '../../#/work/im-eng', dir: 'ltr', lang: 'en' }, '← Back to the portfolio'));
}
if (app.recording) startRecordCursor();
var start = params.get('project');
if (start) app.go('project', start); else app.go(params.get('view') === 'projects' ? 'projects' : 'home');
log('ui', 'ready', { embedded: embedded, view: app.view });

/* For the recorded video: a visible pointer that follows the mouse and pulses on click. */
function startRecordCursor() {
  var c = h('div.rec-cursor', { 'aria-hidden': 'true' });
  document.body.appendChild(c);
  document.addEventListener('mousemove', function (e) { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
  document.addEventListener('mousedown', function () { c.classList.remove('is-click'); void c.offsetWidth; c.classList.add('is-click'); }, true);
}
