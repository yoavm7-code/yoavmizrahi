/* I.M demo: the pages. Home (hero, about, projects, clients, contact, footer), all projects, and one
   project (hero, details, works, challenge, gallery). Links that would leave the site go through
   app.outside(), which explains instead of opening. */

import { COMPANY, HERO, ABOUT, CLIENTS, PROJECTS } from './data.js';
import { homeProjects, nextProject, twoTone } from './logic.js';
import { h, icon, whatsapp } from './dom.js';
import { createForm } from './form.js';

export function media(name) { return 'media/' + name + (/\.\w+$/.test(name) ? '' : '.webp'); }

/* The section header used everywhere: a gold eyebrow and a two-tone H2. */
export function sectionHead(eyebrow, title, sub, tag) {
  var t = twoTone(title);
  return h('header.shead.reveal',
    h('span.shead__eyebrow', { text: eyebrow }),
    h((tag || 'h2') + '.shead__title', t[0] ? t[0] + ' ' : '', h('span.gold', { text: t[1] })),
    sub ? h('p.shead__sub', { text: sub }) : null);
}

/* ---------- Home ---------- */

export function home(app) {
  return h('div.page.page--home',
    hero(app), about(), projectsSection(app, homeProjects(), true), clients(), contact(app), footer(app));
}

function hero(app) {
  var video = h('video.hero__video', { src: media('hero.mp4'), poster: media('hero-poster'), muted: true, autoplay: true, loop: true, playsinline: true, preload: 'auto', 'aria-hidden': 'true' });
  video.muted = true;
  return h('section.hero', { id: 'hero', 'data-section': 'hero', 'aria-label': 'ראשי' },
    video, h('div.hero__shade'),
    h('div.hero__inner',
      h('img.hero__logo', { src: media('logo-hero'), alt: COMPANY.name }),
      h('h1.hero__title', { lang: 'en', dir: 'ltr', text: HERO.headline }),
      h('p.hero__sub', { text: HERO.sub }),
      h('p.hero__text', { text: HERO.text }),
      ctaCard(app, 'hero__cta--inline')),
    ctaCard(app, 'hero__cta--float'),
    h('button.hero__cue', { type: 'button', 'aria-label': 'גלילה לאודות', onclick: function () { app.scrollTo('about'); } }, h('span.hero__mouse'), icon('down', 16)));
}

function ctaCard(app, where) {
  return h('div.cta.' + where,
    h('button.cta__row.cta__row--gold', { type: 'button', 'data-cta': 'contact', onclick: function () { app.scrollTo('contact'); } }, h('span', { text: 'תיאום פגישת ייעוץ' }), h('span.cta__btn', icon('arrow', 14))),
    h('button.cta__row', { type: 'button', 'data-cta': 'projects', onclick: function () { app.scrollTo('projects'); } }, h('span', { text: 'הפרויקטים שלנו' }), h('span.cta__btn', icon('arrow', 14))));
}

function about() {
  return h('section.band.about', { id: 'about', 'data-section': 'about' },
    sectionHead('אודות', 'מי אנחנו'),
    h('div.about__grid',
      h('img.about__photo.reveal', { src: media('ido'), alt: COMPANY.owner, loading: 'lazy' }),
      h('div.about__text.reveal',
        h('h3.about__name', { text: COMPANY.owner }),
        h('p.about__role', { text: COMPANY.role }),
        ABOUT.map(function (p) { return h('p', { text: p }); }))));
}

/* ---------- Projects ---------- */

export function projectsSection(app, list, onHome) {
  return h('section.band.band--warm.projects', { id: onHome ? 'projects' : null, 'data-section': onHome ? 'projects' : null },
    sectionHead('פרויקטים', 'הפרויקטים שלנו', 'פרויקטים מסחריים שביצענו בשנים האחרונות', onHome ? 'h2' : 'h1'),
    h('div.cards', list.map(function (p) { return card(app, p, !onHome); })),
    onHome ? h('div.center', h('button.pill-btn', { type: 'button', 'data-all-projects': '', onclick: function () { app.go('projects'); } }, 'כל הפרויקטים', icon('arrow', 16))) : null);
}

function card(app, p, more) {
  return h('a.pcard.reveal', { href: '#', 'data-project': p.slug, onclick: function (e) { e.preventDefault(); app.go('project', p.slug); } },
    h('img.pcard__img', { src: media(p.cover), alt: p.title, loading: 'lazy' }),
    h('span.pcard__shade'),
    h('span.pcard__body',
      h('span.chip', { text: p.category }),
      h('strong.pcard__title', { text: p.title }),
      h('span.pcard__desc', { text: p.desc }),
      more ? h('span.pcard__more', 'צפה בפרויקט', icon('arrow', 14)) : null));
}

export function projectsPage(app) {
  return h('div.page.page--projects', h('div.page-top'), projectsSection(app, PROJECTS, false), footer(app));
}

export function projectPage(app, p) {
  var next = nextProject(p.slug);
  return h('div.page.page--project',
    h('article.project',
      h('button.back', { type: 'button', 'data-back': '', onclick: function () { app.go('projects'); } }, icon('arrowBack', 16), 'חזרה לכל הפרויקטים'),
      h('div.project__hero',
        h('img', { src: media(p.cover), alt: p.title }),
        h('span.pcard__shade'),
        h('div.project__head', h('span.chip', { text: p.category }), h('h1.project__title', { text: p.title }))),
      h('div.project__body',
        p.intro.map(function (t) { return h('p.reveal', { text: t }); }),
        p.details.length ? [h('h2.project__h', { text: 'נתוני הפרויקט' }),
          h('dl.specs.reveal', p.details.map(function (d) { return h('div.spec', h('dt', { text: d[0] }), h('dd', { text: d[1] })); }))] : null,
        p.works.length ? [h('h2.project__h', { text: 'עבודות שבוצעו' }),
          h('ul.works.reveal', p.works.map(function (w) { return h('li', icon('check', 16), h('span', { text: w })); }))] : null,
        p.challenge.length ? [h('h2.project__h', { text: 'האתגר' }), p.challenge.map(function (t) { return h('p.reveal', { text: t }); })] : null,
        p.extra ? [h('h2.project__h', { text: p.extra[0] }), h('p.reveal', { text: p.extra[1] })] : null),
      p.gallery.length ? h('section.gallery',
        sectionHead('גלריה', 'גלריית תמונות'),
        h('div.gallery__grid', p.gallery.map(function (g, i) {
          return h('button.shot.reveal', { type: 'button', 'data-shot': String(i), 'aria-label': 'הגדלת התמונה: ' + g[1], onclick: function () { app.lightbox(p, i); } },
            h('img', { src: media(g[0]), alt: g[2], loading: 'lazy' }), h('span.pcard__shade'), h('span.shot__caption', { text: g[1] }));
        }))) : null,
      h('button.next', { type: 'button', 'data-next-project': next.slug, onclick: function () { app.go('project', next.slug); } },
        h('small', { text: 'לפרויקט הבא' }), h('strong', { text: next.title }), icon('arrow', 18))),
    footer(app));
}

/* ---------- Clients ---------- */

function clients() {
  var row = function (hidden) {
    return h('div.marquee__row', { 'aria-hidden': hidden ? 'true' : null }, CLIENTS.map(function (c) {
      return h('div.logo-card', h('img', { src: media(c.logo), alt: hidden ? '' : c.name, loading: 'lazy' }));
    }));
  };
  return h('section.band.clients', { id: 'clients', 'data-section': 'clients' },
    sectionHead('לקוחותינו', 'עובדים איתנו'),
    h('div.marquee', h('div.marquee__track', row(false), row(true))));
}

/* ---------- Contact ---------- */

function contact(app) {
  var info = [
    ['phone', 'טלפון', COMPANY.phone, 'phone'],
    ['mail', 'אימייל', COMPANY.email, 'email'],
    ['pin', 'כתובת', COMPANY.address, 'map'],
    ['insta', 'אינסטגרם', COMPANY.instagram, 'instagram']
  ];
  return h('section.band.band--warm.contact', { id: 'contact', 'data-section': 'contact' },
    sectionHead('צור קשר', 'בואו נדבר'),
    h('div.contact__grid',
      createForm(app),
      h('div.contact__side.reveal',
        info.map(function (i) {
          return h('button.info', { type: 'button', 'data-info': i[3], onclick: function () { app.outside(i[3]); } },
            h('span.info__icon', icon(i[0], 20)), h('span.info__text', h('small', { text: i[1] }), h('b', { dir: i[3] === 'map' ? null : 'ltr', text: i[2] })));
        }),
        h('button.wa-pill', { type: 'button', 'data-whatsapp': 'pill', onclick: function () { app.outside('whatsapp'); } }, whatsapp(20), 'שלחו הודעה ב‑WhatsApp'))));
}

/* ---------- Footer ---------- */

export function footer(app) {
  var nav = [['ראשי', 'hero'], ['אודות', 'about'], ['פרויקטים', 'projects-page'], ['צור קשר', 'contact']];
  return h('footer.footer',
    h('div.footer__grid',
      h('div.footer__brand', h('img', { src: media('logo'), alt: COMPANY.name }), h('p', { text: COMPANY.blurb })),
      h('nav.footer__col', { 'aria-label': 'קישורים מהירים' }, h('h3', { text: 'קישורים מהירים' }), nav.map(function (n) {
        return h('button.footer__link', { type: 'button', onclick: function () { if (n[1] === 'projects-page') app.go('projects'); else app.scrollTo(n[1]); } }, n[0]);
      })),
      h('div.footer__col', h('h3', { text: 'יצירת קשר' }),
        h('button.footer__link', { type: 'button', onclick: function () { app.outside('phone'); } }, 'טלפון: ', h('span', { dir: 'ltr', text: COMPANY.phone })),
        h('button.footer__link', { type: 'button', onclick: function () { app.outside('email'); } }, 'אימייל: ', h('span', { dir: 'ltr', text: COMPANY.email })),
        h('p.footer__plain', { text: 'כתובת: ' + COMPANY.address }),
        h('button.round-wa', { type: 'button', 'aria-label': 'WhatsApp', onclick: function () { app.outside('whatsapp'); } }, whatsapp(18)))),
    h('div.footer__bar', h('span', { text: '© 2026 ' + COMPANY.name + '. כל הזכויות שמורות.' })));
}
