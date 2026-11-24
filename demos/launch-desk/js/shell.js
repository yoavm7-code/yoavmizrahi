/* Launch Desk demo: the app frame around every screen. One dark top bar: the logo, the three screen
   tabs, then the platform switcher, notifications, the theme toggle and the user menu. */

import { USER, PLATFORMS, NOTIFICATIONS } from './data.js';
import { platformById } from './logic.js';
import { h, icon, dot, replace, popover, closePopover, menu, toast, notInDemo, copyText, log } from './dom.js';

/* The screens the top bar switches between, in order. */
var TABS = [['dashboard', 'Overview'], ['workspace', 'Batches'], ['history', 'Launches']];

export function createShell(app) {
  var main = h('main.main', { id: 'main' });
  var tabs = TABS.map(function (t) {
    return h('button.topnav__tab', { type: 'button', 'data-screen': t[0], onclick: function () { app.go(t[0]); } }, t[1]);
  });
  var platformBtn = h('button.plat-switch', { type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', title: 'Switch platform', onclick: function () { openPlatforms(platformBtn); } });
  var themeBtn = iconBtn('moon', 'Theme', function () { app.setTheme(app.theme === 'dark' ? 'light' : 'dark'); });

  var topbar = h('header.topbar',
    h('button.brand', { type: 'button', onclick: function () { app.go('dashboard'); } }, h('span.brand__logo', icon('logo', 20)), h('span.brand__name', { text: 'Launch Desk' })),
    h('nav.topnav', { 'aria-label': 'Screens' }, tabs),
    h('span.topbar__fill'),
    platformBtn,
    badgeBtn('bell', 'Notifications, ' + NOTIFICATIONS.accounts.length + ' unread', String(NOTIFICATIONS.accounts.length), openNotifications),
    themeBtn,
    h('button.top-user', { type: 'button', 'aria-haspopup': 'menu', 'aria-label': 'Account menu for ' + USER.name, onclick: function (e) { openUser(e.currentTarget); } },
      h('span.avatar', { text: USER.initials }),
      icon('down', 12))
  );

  var root = h('div.app', topbar, main);

  /* ---------- Platform switcher ---------- */

  function renderPlatform() {
    var p = platformById(app.platform);
    replace(platformBtn, h('span.plat-switch__in', dot(p.color, 'dot--sq'), h('span', { text: p.name }), icon('down', 12)));
  }

  function openPlatforms(anchor) {
    popover(anchor, h('div.plat-list', { role: 'menu' }, PLATFORMS.map(function (p) {
      var on = p.id === app.platform;
      return h('button.plat-list__item' + (on ? '.is-active' : ''), {
        type: 'button', role: 'menuitemradio', 'aria-checked': String(on),
        onclick: function () { closePopover(); app.setPlatform(p.id); }
      }, dot(p.color, 'dot--sq'), h('span.plat-list__txt', h('b', { text: p.name }), h('small.mono', { text: p.sub })), on ? icon('check', 14) : null);
    })), { role: 'menu', align: 'right' });
  }

  /* ---------- Top bar popovers ---------- */

  function openNotifications(anchor) {
    popover(anchor, h('div.panel.panel--notes',
      h('div.panel__head', h('b', { text: 'Notifications' }), h('button.link-muted', { type: 'button', onclick: function () { notInDemo('Notification settings'); } }, 'Settings')),
      h('div.panel__label', { text: 'ACCOUNTS' }),
      NOTIFICATIONS.accounts.map(function (n) {
        return h('div.note-card', h('span.note-ic.note-ic--' + n.tone, icon('clock', 12)), h('span', h('b', { text: n.title }), h('small', { text: n.sub })));
      }),
      h('div.panel__label', { text: 'TEAM ACTIVITY' }),
      NOTIFICATIONS.activity.map(function (n) {
        return h('div.note-row', h('span.note-ic.note-ic--' + n.tone, icon('users', 12)), h('span.note-row__txt', h('b', { text: n.title }), h('small', { text: n.sub })), h('small.note-row__age', { text: n.age }));
      }),
      h('button.panel__foot', { type: 'button', onclick: function () { closePopover(); notInDemo('The activity feed'); } }, 'See all activity')), { align: 'right' });
  }

  function openUser(anchor) {
    popover(anchor, h('div.panel.panel--user',
      h('div.user-head', h('span.avatar.avatar--lg', { text: USER.initials }), h('span', h('b', { text: USER.name }), h('small', { text: USER.email })), h('span.pill.pill--muted', { text: USER.role.toUpperCase() })),
      menu([
        { label: 'Profile & settings', icon: 'settings', run: function () { notInDemo('Profile & settings'); } },
        { label: app.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', icon: app.theme === 'dark' ? 'sun' : 'moon', run: function () { app.setTheme(app.theme === 'dark' ? 'light' : 'dark'); } },
        { label: 'Copy email', icon: 'copy', run: function () { copyText(USER.email, 'Email copied'); } },
        { label: 'Sign out', icon: 'external', danger: true, run: function () { toast('You can\'t sign out of a demo. Nothing here is real.'); } }
      ])), { align: 'right' });
  }

  /* ---------- Updates ---------- */

  function update() {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-screen') === app.screen;
      t.classList.toggle('is-active', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    renderPlatform();
    replace(themeBtn, icon(app.theme === 'dark' ? 'sun' : 'moon', 15));
    themeBtn.setAttribute('aria-label', app.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    themeBtn.title = themeBtn.getAttribute('aria-label');
    log('ui', 'shell', { screen: app.screen, platform: app.platform, theme: app.theme });
  }

  return { el: root, main: main, update: update };
}

/* ---------- Small parts ---------- */

function iconBtn(name, label, run) {
  return h('button.icon-btn', { type: 'button', 'aria-label': label, title: label, onclick: function (e) { run(e.currentTarget); } }, icon(name, 15));
}
function badgeBtn(name, label, badge, run) {
  var b = iconBtn(name, label, run);
  b.setAttribute('aria-haspopup', 'dialog');
  b.appendChild(h('span.badge', { text: badge, 'aria-hidden': 'true' }));
  return b;
}
