/* Toto Mundial demo: the frame around every screen, phone layout. A top bar (logo, language, points
   bank, avatar), the scrolling page, and the bottom tab bar with a More sheet for the other pages. */

import { t, num } from './i18n.js';
import { standings, myRow } from './logic.js';
import { h, icon, cup, sheet, closeSheet, toast, log } from './dom.js';

var TABS = [
  { screen: 'home', key: 'nav.home', icon: 'home' },
  { screen: 'bets', key: 'nav.bets', icon: 'bets' },
  { screen: 'leaders', key: 'nav.leaders', icon: 'trophy' },
  { screen: 'live', key: 'nav.live', icon: 'live' }
];

/* Pages the real app has that this demo leaves out. */
var MORE = [
  { key: 'page.duels', icon: 'swords' },
  { key: 'page.zone', icon: 'zone' },
  { key: 'page.transparency', icon: 'eye' },
  { key: 'page.rules', icon: 'book' },
  { key: 'page.admin', icon: 'shield' }
];

export function createShell(app) {
  var main = h('main.main', { id: 'main' });
  var top = h('header.top');
  var tabs = h('nav.tabs');
  var root = h('div.app', top, main, tabs);

  function render() {
    var me = myRow(standings('bank', app.extra()));
    tabs.setAttribute('aria-label', t('nav.aria'));
    top.replaceChildren(
      h('button.logo', { type: 'button', onclick: function () { app.go('home'); } },
        cup(26), h('span.logo__txt', h('b', { text: t('app.name') }), h('small', { text: '2026' }))),
      h('span.top__fill'),
      h('button.chip-btn.lang-btn', { type: 'button', 'aria-label': t('lang.switch'), title: t('lang.switch'), 'data-lang-toggle': '', onclick: function () { app.setLang(app.lang === 'he' ? 'en' : 'he'); } },
        icon('globe', 15), h('span', { text: t('lang.short') })),
      h('button.bank', { type: 'button', 'aria-label': t('bank.aria', { n: num(me.value) }), onclick: function () { notInDemo('page.profile'); } },
        icon('coins', 15), h('b.num', { text: num(me.value) })),
      h('button.avatar.avatar--me', { type: 'button', 'aria-label': t('menu.aria'), 'aria-haspopup': 'dialog', onclick: openProfile, text: app.me()[app.lang].charAt(0) }));

    tabs.replaceChildren.apply(tabs, TABS.map(function (tab) {
      var on = app.screen === tab.screen;
      return h('button.tab' + (on ? '.is-on' : ''), { type: 'button', 'aria-current': on ? 'page' : null, 'data-tab': tab.screen, onclick: function () { app.go(tab.screen); } },
        icon(tab.icon, 22), h('span', { text: t(tab.key) }));
    }).concat([
      h('button.tab', { type: 'button', 'aria-haspopup': 'dialog', 'data-tab': 'more', onclick: openMore }, icon('more', 22), h('span', { text: t('nav.more') }))
    ]));
  }

  function notInDemo(key) { toast(t('toast.notInDemo', { page: t(key) })); }

  function row(iconName, label, run, extra, cls) {
    return h('button.sheet-row' + (cls ? '.' + cls : ''), { type: 'button', onclick: run }, icon(iconName, 20), h('span', { text: label }), extra || null);
  }

  function langRow() {
    return row('globe', t('lang.label'), function () { closeSheet(); app.setLang(app.lang === 'he' ? 'en' : 'he'); }, h('small.sheet-row__end', { text: t('lang.other') }));
  }

  function openMore() {
    log('nav', 'more sheet', {});
    sheet(h('div.sheet__list',
      h('h2.sheet__title', { text: t('more.title') }),
      MORE.map(function (p) { return row(p.icon, t(p.key), function () { closeSheet(); notInDemo(p.key); }); }),
      langRow()), { label: t('more.title') });
  }

  function openProfile() {
    log('nav', 'profile menu', {});
    sheet(h('div.sheet__list',
      h('h2.sheet__title', { text: app.me()[app.lang] }),
      row('user', t('page.profile'), function () { closeSheet(); notInDemo('page.profile'); }),
      row('shield', t('page.admin'), function () { closeSheet(); notInDemo('page.admin'); }),
      row('book', t('page.rules'), function () { closeSheet(); notInDemo('page.rules'); }),
      row('chat', t('page.whatsapp'), function () { closeSheet(); toast(t('toast.whatsapp')); }, null, 'is-wa'),
      langRow(),
      row('logout', t('signout'), function () { closeSheet(); toast(t('toast.signout')); }, null, 'is-danger')), { label: t('menu.aria') });
  }

  return { el: root, main: main, render: render, notInDemo: notInDemo };
}
