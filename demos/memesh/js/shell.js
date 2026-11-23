/* Memesh demo: the frame. A slim demo bar on top (portfolio chrome, not the product: who you are
   viewing as, the language, "made-up data"), then the product's own header: the logo, and the main
   site link for parents or Sign out for staff. */

import { t } from './i18n.js';
import { h, icon, toast } from './dom.js';

var ROLES = ['parent', 'desk', 'manager'];

export function createShell(app) {
  var bar = h('div.demo-bar');
  var header = h('header.top');
  var main = h('div.main', { id: 'main' });
  var root = h('div.app', bar, header, main);

  function render() {
    bar.replaceChildren(
      h('span.demo-bar__label', { text: t('demo.viewAs') }),
      h('div.demo-bar__roles', { role: 'tablist', 'aria-label': t('demo.viewAs') }, ROLES.map(function (r) {
        var on = app.role === r;
        return h('button.demo-role' + (on ? '.is-on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(on), 'data-role': r, onclick: function () { app.setRole(r); } },
          h('b', { text: t('demo.role.' + r) }), h('small', { text: t('demo.roleSub.' + r) }));
      })),
      h('span.demo-bar__fill'),
      h('small.demo-bar__note', { text: t('demo.madeUp') }),
      h('button.demo-lang', { type: 'button', 'data-lang-toggle': '', 'aria-label': t('demo.langSwitch'), onclick: function () { app.setLang(app.lang === 'he' ? 'en' : 'he'); } }, icon('globe', 14), h('span', { text: t('demo.langShort') })));

    header.replaceChildren(
      logo(app.logo),
      app.role === 'parent'
        ? h('button.home-pill', { type: 'button', onclick: function () { toast(t('toast.mainSite')); } }, icon('home', 15), h('span', { text: t('p.mainSite') }))
        : h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: function () { toast(t('toast.signout')); } }, t('common.signout')));
  }

  return { el: root, main: main, render: render };
}

/* The Memesh logo: the image uploaded in the admin, or a text wordmark until then. */
function logo(src) {
  if (src) return h('img.logo__img', { src: src, alt: 'Memesh' });
  return h('span.logo', { role: 'img', 'aria-label': 'Memesh' },
    h('span.logo__word', { text: 'ממש', 'aria-hidden': 'true' }),
    h('span.logo__dots', { 'aria-hidden': 'true' }, h('i'), h('i'), h('i')));
}
