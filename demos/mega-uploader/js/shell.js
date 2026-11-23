/* Mega Uploader demo: the app frame around every screen. Top bar, sidebar, platform switcher,
   tips, notifications, command palette, user menu, the Ask drawer and the floating buttons. */

import { ORG, USER, PLATFORMS, BRANDS, WORKSPACE, NAV, NOTIFICATIONS, TIPS, ASK } from './data.js';
import { platformById } from './logic.js';
import { h, icon, dot, clear, replace, popover, closePopover, menu, toast, notInDemo, modal, closeModal, copyText, log } from './dom.js';

export function createShell(app) {
  var main = h('main.main', { id: 'main' });
  var navList = h('nav.nav', { 'aria-label': 'Pages' });
  var platformCard = h('button.plat-card', { type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: function () { openPlatforms(platformCard); } });
  var findInput = h('input.nav-find__input', { type: 'search', placeholder: 'Find a page…', 'aria-label': 'Find a page', oninput: renderNav });
  var search = h('input.top-search__input', {
    type: 'search', 'aria-label': 'Search',
    onkeydown: function (e) { if (e.key === 'Enter') { toast('Global search is not part of this demo. Use the search above the grid or in Run history.'); search.blur(); } }
  });
  var themeBtn = iconBtn('moon', 'Theme', function () { app.setTheme(app.theme === 'dark' ? 'light' : 'dark'); });
  var drawer = createAsk(app);

  var sidebar = h('aside.sidebar', { 'aria-label': 'Sidebar' },
    platformCard,
    h('label.nav-find', icon('search', 13), findInput),
    navList,
    h('button.side-user', { type: 'button', 'aria-haspopup': 'menu', onclick: function (e) { openUser(e.currentTarget, 'up'); } },
      h('span.avatar', { text: USER.initials }),
      h('span.side-user__who', h('b', { text: USER.name }), h('small', { text: USER.role })),
      icon('down', 13))
  );

  var topbar = h('header.topbar',
    h('div.topbar__left',
      h('div.brand',
        iconBtn('panel', 'Collapse the sidebar', function () { document.body.classList.toggle('is-collapsed'); log('ui', 'sidebar', { collapsed: document.body.classList.contains('is-collapsed') }); }),
        h('button.brand__home', { type: 'button', onclick: function () { app.go('dashboard'); } }, h('span.brand__logo', icon('logo', 20)), h('span.brand__name', { text: 'Mega Uploader' }))),
      h('span.org', dot('#e8742c'), h('span', { text: ORG }), icon('down', 12)),
      h('label.top-search', icon('search', 14), search, h('kbd', { text: '/' }))),
    h('div.topbar__right',
      badgeBtn('bulb', 'Tips: ' + TIPS.length + ' you haven\'t seen', '9+', openTips),
      iconBtn('info', 'Help center: search how-to guides and fixes (Ctrl+Shift+H)', function () { notInDemo('The help center'); }),
      iconBtn('terminal', 'Command palette: jump to any page or action (Ctrl+Shift+P)', function () { openPalette(); }),
      badgeBtn('bell', 'Notifications, ' + NOTIFICATIONS.accounts.length + ' unread', String(NOTIFICATIONS.accounts.length), openNotifications),
      themeBtn,
      h('button.top-user', { type: 'button', 'aria-haspopup': 'menu', onclick: function (e) { openUser(e.currentTarget); } },
        h('span.top-user__who', h('b', { text: USER.name }), h('small', { text: USER.role })),
        h('span.avatar', { text: USER.initials }),
        icon('down', 12)))
  );

  var floats = h('div.floats',
    h('button.ask-btn', { type: 'button', onclick: function () { drawer.toggle(); } }, icon('chat', 14), 'Ask'),
    h('button.log-btn', { type: 'button', onclick: function () { notInDemo('The change log'); } }, icon('trend', 12), 'Log'));

  var root = h('div.app', topbar, h('div.body', sidebar, main), floats, drawer.el);

  /* ---------- Sidebar ---------- */

  function renderNav() {
    var q = findInput.value.trim().toLowerCase();
    clear(navList);
    NAV.forEach(function (group) {
      var items = group.items.filter(function (it) { return !q || it[0].toLowerCase().indexOf(q) !== -1; });
      if (!items.length) return;
      if (group.section) navList.appendChild(h('div.nav__section', { text: group.section }));
      items.forEach(function (it) {
        var active = it[2] && it[2] === app.screen;
        navList.appendChild(h('button.nav__item' + (active ? '.is-active' : ''), {
          type: 'button', 'aria-current': active ? 'page' : null,
          onclick: function () { if (it[2]) app.go(it[2]); else notInDemo(it[0]); }
        }, icon(it[1], 14), h('span', { text: it[0] })));
      });
    });
    if (!navList.firstChild) navList.appendChild(h('p.nav__empty', { text: 'No page matches "' + findInput.value + '".' }));
  }

  function renderPlatform() {
    var p = platformById(app.platform);
    replace(platformCard, h('span.plat-card__in', dot(p.color, 'dot--sq'), h('span.plat-card__txt', h('b', { text: p.name }), h('small.mono', { text: p.sub })), icon('down', 13)));
  }

  function openPlatforms(anchor) {
    popover(anchor, h('div.plat-list', { role: 'menu' }, PLATFORMS.map(function (p) {
      var on = p.id === app.platform;
      return h('button.plat-list__item' + (on ? '.is-active' : ''), {
        type: 'button', role: 'menuitemradio', 'aria-checked': String(on),
        onclick: function () { closePopover(); app.setPlatform(p.id); }
      }, dot(p.color, 'dot--sq'), h('span.plat-card__txt', h('b', { text: p.name }), h('small.mono', { text: p.sub })), on ? icon('check', 14) : null);
    })), { role: 'menu' });
  }

  /* ---------- Top bar popovers ---------- */

  function openTips(anchor) {
    popover(anchor, h('div.panel.panel--tips',
      h('div.panel__head', h('b', { text: 'Did you know?' }), h('button.btn.btn--xs', { type: 'button', onclick: function () { closePopover(); toast('All tips marked as read'); } }, 'Mark all as read')),
      h('div.panel__label', { text: 'JUST SHIPPED' }),
      TIPS.map(function (t) {
        return h('div.tip', h('div.tip__top', h('b', { text: t.title }), h('span.tag', { text: 'NEW' })), h('p', { text: t.body }), h('small.mono', { text: t.meta }));
      })), { align: 'right' });
  }

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

  function openUser(anchor, dir) {
    popover(anchor, h('div.panel.panel--user',
      h('div.user-head', h('span.avatar.avatar--lg', { text: USER.initials }), h('span', h('b', { text: USER.name }), h('small', { text: USER.email })), h('span.pill.pill--muted', { text: USER.role.toUpperCase() })),
      menu([
        { label: 'Profile & settings', icon: 'settings', run: function () { notInDemo('Profile & settings'); } },
        { label: app.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', icon: app.theme === 'dark' ? 'sun' : 'moon', run: function () { app.setTheme(app.theme === 'dark' ? 'light' : 'dark'); } },
        { label: 'Copy email', icon: 'copy', run: function () { copyText(USER.email, 'Email copied'); } },
        { label: 'Sign out', icon: 'external', danger: true, run: function () { toast('You can\'t sign out of a demo. Nothing here is real.'); } }
      ])), { align: dir === 'up' ? 'left' : 'right' });
  }

  /* ---------- Command palette ---------- */

  function paletteItems() {
    var list = [];
    NAV.forEach(function (g) {
      g.items.forEach(function (it) {
        if (!list.some(function (x) { return x.label === it[0]; })) list.push({ label: it[0], icon: it[1], kind: 'GO TO', run: function () { if (it[2]) app.go(it[2]); else notInDemo(it[0]); } });
      });
    });
    PLATFORMS.forEach(function (p) { list.push({ label: 'Switch to ' + p.name, icon: 'layers', kind: 'PLATFORM', run: function () { app.setPlatform(p.id); } }); });
    list.push({ label: app.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', icon: 'moon', kind: 'ACTION', run: function () { app.setTheme(app.theme === 'dark' ? 'light' : 'dark'); } });
    return list.sort(function (a, b) { return (a.kind === 'GO TO' ? 0 : 1) - (b.kind === 'GO TO' ? 0 : 1); });
  }

  /* Shared by the command palette and "Go to column": a filtered list you drive with the arrows. */
  function openPalette(opts) {
    opts = opts || {};
    var items = opts.items || paletteItems();
    var sel = 0;
    var list = h('div.palette__list', { role: 'listbox' });
    var input = h('input.palette__input', {
      type: 'text', placeholder: opts.placeholder || 'Jump to a page, switch platform, run an action…', 'aria-label': opts.label || 'Command palette', autofocus: true,
      oninput: function () { sel = 0; draw(); },
      onkeydown: function (e) {
        var shown = filtered();
        if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); draw(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
        else if (e.key === 'Enter' && shown[sel]) { e.preventDefault(); pick(shown[sel]); }
      }
    });
    function filtered() {
      var q = input.value.trim().toLowerCase();
      return items.filter(function (it) { return !q || it.label.toLowerCase().indexOf(q) !== -1; });
    }
    function pick(it) { closeModal(); log('nav', 'palette pick', { label: it.label, kind: it.kind }); it.run(); }
    function draw() {
      var shown = filtered();
      clear(list);
      if (!shown.length) list.appendChild(h('p.palette__empty', { text: 'Nothing matches.' }));
      shown.forEach(function (it, i) {
        list.appendChild(h('button.palette__item' + (i === sel ? '.is-active' : ''), {
          type: 'button', role: 'option', 'aria-selected': String(i === sel),
          onmousemove: function () { if (sel !== i) { sel = i; draw(); } },
          onclick: function () { pick(it); }
        }, icon(it.icon || 'right', 14), h('span', { text: it.label }), h('small', { text: it.kind }), i === sel ? h('kbd', { text: '↵' }) : null));
      });
      var act = list.querySelector('.is-active');
      if (act) act.scrollIntoView({ block: 'nearest' });
    }
    modal(h('div.palette',
      h('label.palette__search', icon('search', 15), input, h('kbd', { text: 'Esc' })),
      list,
      h('div.palette__foot', { text: '↑↓ navigate · ↵ open · Esc close' })), { cls: 'modal--palette', label: opts.label || 'Command palette' });
    draw();
    input.focus();
  }

  /* ---------- Keyboard ---------- */

  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) { e.preventDefault(); openPalette(); }
    else if (e.key === '/' && !typing && !e.ctrlKey) { e.preventDefault(); search.focus(); }
  });

  /* ---------- Updates ---------- */

  function update() {
    renderNav();
    renderPlatform();
    search.placeholder = app.screen === 'workspace' ? 'Jump to a task (e.g. T-412)' : 'Search rows, runs, accounts…';
    replace(themeBtn, icon(app.theme === 'dark' ? 'sun' : 'moon', 15));
    themeBtn.setAttribute('aria-label', app.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    drawer.update();
  }

  return { el: root, main: main, update: update, palette: openPalette, ask: drawer };
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

/* ---------- Ask drawer ---------- */
/* A right-side chat. It answers a few questions about what the demo does, word by word. */

function createAsk(app) {
  var thread = h('div.ask__thread', { 'aria-live': 'polite' });
  var input = h('input.ask__input', {
    type: 'text', placeholder: 'Ask anything… / שאל אותי כל דבר', 'aria-label': 'Ask the assistant',
    onkeydown: function (e) { if (e.key === 'Enter') send(); }
  });
  var context = h('small', {});
  var busy = false;
  var el = h('aside.ask', { 'aria-label': 'Assistant', 'aria-hidden': 'true' },
    h('div.ask__head',
      h('span.ask__logo', icon('chat', 14)),
      h('div.ask__title', h('b', { text: 'Assistant' }), context),
      h('div.ask__tools',
        iconBtn('plus', 'New chat', function () { reset(); }),
        iconBtn('clock', 'Chat history', function () { notInDemo('Chat history'); }),
        iconBtn('settings', 'Assistant settings', function () { notInDemo('Assistant settings'); }),
        iconBtn('x', 'Close the assistant', function () { toggle(false); }))),
    thread,
    h('div.ask__foot',
      iconBtn('clip', 'Attach a file', function () { notInDemo('Attachments'); }),
      input,
      iconBtn('send', 'Send', function () { send(); })));

  function suggestions() {
    return h('div.ask__suggest',
      h('p', { text: 'Ask about your runs, the grid or an upload error. Try one:' }),
      ASK.map(function (a) { return h('button.chip', { type: 'button', onclick: function () { input.value = a.q; send(); } }, a.q); }));
  }
  function reset() { clear(thread); thread.appendChild(suggestions()); }

  function send() {
    var q = input.value.trim();
    if (!q || busy) return;
    input.value = '';
    var sug = thread.querySelector('.ask__suggest');
    if (sug) sug.remove();
    thread.appendChild(h('div.msg.msg--me', h('p', { text: q })));
    var known = ASK.filter(function (a) { return a.q.toLowerCase() === q.toLowerCase(); })[0];
    var answer = known ? known.a : 'This is a demo, so I only know a few answers. Try one of the suggestions with the + button above, or ask "' + ASK[0].q + '"';
    var p = h('p', {});
    var bubble = h('div.msg.msg--bot.is-typing', h('span.typing', h('i'), h('i'), h('i')));
    thread.appendChild(bubble);
    thread.scrollTop = thread.scrollHeight;
    busy = true;
    log('ui', 'ask', { question: q, known: !!known });
    setTimeout(function () {
      bubble.classList.remove('is-typing');
      replace(bubble, p);
      var words = answer.split(' ');
      var i = 0;
      var t = setInterval(function () {
        p.textContent = words.slice(0, ++i).join(' ');
        thread.scrollTop = thread.scrollHeight;
        if (i >= words.length) {
          clearInterval(t);
          busy = false;
          bubble.appendChild(h('button.msg__copy', { type: 'button', onclick: function () { copyText(answer, 'Answer copied'); } }, 'Copy'));
        }
      }, 28);
    }, 650);
  }

  function toggle(force) {
    var on = force === undefined ? !document.body.classList.contains('ask-open') : force;
    document.body.classList.toggle('ask-open', on);
    el.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (on) { update(); input.focus(); }
    log('ui', 'ask drawer', { open: on });
  }

  function update() {
    var p = platformById(app.platform);
    var b = BRANDS.filter(function (x) { return x.id === WORKSPACE.brand; })[0];
    context.textContent = p.name + ' · ' + b.name + ' · ' + ({ dashboard: 'Dashboard', workspace: 'Workspace', history: 'Run history' })[app.screen];
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('ask-open') && !document.querySelector('.pop, .backdrop')) toggle(false);
  });

  reset();
  return { el: el, toggle: toggle, update: update };
}
