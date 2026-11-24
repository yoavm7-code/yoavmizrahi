/* The admin. Signs in, loads the site's content, and lets you edit, preview and publish it.
   Login mode (username + password through worker/) is the default; key mode (a GitHub key pasted
   on each device) is the fallback when config.LOGIN_API is empty.
   See _plans/2026-11-22-admin-and-mobile.md and _plans/2026-11-22-admin-login.md. */

import { createClient, explain } from './github.js';
import { createStore } from './store.js';
import { createPreview } from './preview.js';
import { prepare, fromBase64, mimeFor } from './media.js';
import { publish, describeChanges, isRemoval, check, commitMessage, waitForLive } from './publish.js';
import * as panels from './panels.js';
import * as auth from './auth.js';
import { h, clear, icon, button, toast, dialog, confirm, plural } from './ui.js';
import { REPO, NEW_KEY_URL, SITE_ROOT, LOGIN_API } from './config.js';

/* Never run inside someone else's page (protects against click tricks). */
if (window.top !== window.self) {
  document.documentElement.textContent = '';
  throw new Error('The admin cannot run inside a frame.');
}

var app = document.getElementById('app');
var KEY = 'ym-admin-key';
var KEY_EXPIRES = 'ym-admin-key-expires';
/* On a shared github.io address other sites could read saved data, so the key is only kept
   for the open tab there. On your own domain you can stay signed in. */
var sharedHost = /\.github\.io$/i.test(location.hostname);
var wide = window.matchMedia('(min-width: 1100px)');

var gh = null;
var store = null;
var preview = null;
var ctx = null;
var shell = null;
var mediaCache = {};
var mediaLoading = {};
var liveState = null;
var account = null;
var session = null;      // the signed-in run: its listeners and timers end with it (endSession)
var signInOpen = false;

/* ---------- The key ---------- */

function getKey() {
  try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY); } catch (e) { return null; }
}
function saveKey(key, remember) {
  try {
    sessionStorage.setItem(KEY, key);
    if (remember && !sharedHost) localStorage.setItem(KEY, key); else localStorage.removeItem(KEY);
    if (!localStorage.getItem(KEY_EXPIRES)) localStorage.setItem(KEY_EXPIRES, new Date(Date.now() + 366 * 86400000).toISOString());
  } catch (e) { /* private mode: the key lasts for this tab */ }
}
function forgetKey() {
  try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); localStorage.removeItem(KEY_EXPIRES); } catch (e) { /* ignore */ }
}
function keyExpiry() { try { return localStorage.getItem(KEY_EXPIRES); } catch (e) { return null; } }

/* ---------- Connect screen ---------- */

function showConnect(message) {
  endSession();
  document.body.className = 'is-connect';
  var input = h('input.input', { type: 'password', id: 'key', autocomplete: 'off', spellcheck: 'false', placeholder: 'github_pat_...' });
  var remember = h('input', { type: 'checkbox', id: 'remember', checked: !sharedHost, disabled: sharedHost });
  var note = h('p.field__note', { 'aria-live': 'polite' }, message || '');
  if (message) note.className = 'field__note field__note--error';
  var go = button('Connect', { kind: 'primary', icon: 'key' });

  async function connect() {
    var key = input.value.trim();
    if (!key) { note.textContent = 'Paste your key first.'; note.className = 'field__note field__note--error'; input.focus(); return; }
    go.disabled = true;
    note.textContent = 'Checking the key…';
    note.className = 'field__note';
    try {
      var info = await createClient(function () { return key; }).repoInfo();
      if (!info.permissions || !info.permissions.push) throw Object.assign(new Error('read only'), { status: 403 });
      saveKey(key, remember.checked);
      startWithKey(key);
    } catch (e) {
      go.disabled = false;
      note.textContent = explain(e);
      note.className = 'field__note field__note--error';
    }
  }
  go.addEventListener('click', connect);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') connect(); });

  clear(app).appendChild(h('main.connect',
    h('div.connect__card',
      h('span.connect__kicker', 'ADMIN'),
      h('h1.connect__title', 'Connect to GitHub'),
      h('p.connect__lead', 'Your site lives on GitHub. The admin needs a key that can only touch your ' + REPO.name + ' repository. You do this once on each device.'),
      h('ol.steps',
        h('li', h('strong', 'Open the key form on GitHub. '), 'It opens already filled in.', h('br'),
          h('a.btn.btn--secondary.btn--small', { href: NEW_KEY_URL, target: '_blank', rel: 'noopener' }, icon('external'), h('span', 'Open GitHub'))),
        h('li', h('strong', 'Repository access: '), 'choose "Only select repositories", then pick ', h('code', REPO.name), '.'),
        h('li', h('strong', 'Leave the rest. '), 'Contents is already "Read and write" and the key lasts a year.'),
        h('li', h('strong', 'Press "Generate token", then Copy. '), 'Save it in your password manager too, so the next device takes seconds.'),
        h('li', h('strong', 'Paste it here.'))
      ),
      h('div.field',
        h('div.field__top', h('label.field__label', { for: 'key' }, 'Your GitHub key')),
        h('div.connect__row', input, go),
        note
      ),
      h('label.check', remember, h('span', sharedHost ? 'Stay signed in (available once the site is on your own domain)' : 'Keep me signed in on this device')),
      h('p.small-text', 'The key is only ever sent to GitHub. Lost or worried? Delete it on GitHub any time and make a new one.')
    )
  ));
  input.focus();
}

/* ---------- Sign-in screens (login mode) ---------- */

/* One card with three forms: sign in, first-time setup, and reset a forgotten password.
   Real <form>s with autocomplete hints, so the iPhone Passwords app and Face ID can fill them. */
function showLogin(message, mode) {
  endSession();
  document.body.className = 'is-connect';
  mode = mode || 'signin';
  var card = h('div.connect__card');
  clear(app).appendChild(h('main.connect', card));
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  var note = h('p.field__note', { 'aria-live': 'polite' });
  function say(text, bad) { note.textContent = text || ''; note.className = 'field__note' + (bad ? ' field__note--error' : ''); }
  function input(id, label, type, autocomplete, extra) {
    var el = h('input.input', Object.assign({ id: id, name: id, type: type, autocomplete: autocomplete, autocapitalize: 'none', spellcheck: 'false', required: true }, extra || {}));
    return { el: el, field: h('div.field', h('div.field__top', h('label.field__label', { for: id }, label)), el) };
  }
  /* Appends children, skipping empty ones (Element.append would print "null"). */
  function put(el) {
    Array.prototype.slice.call(arguments, 1).forEach(function (c) { if (c) el.appendChild(c); });
  }
  function switcher(text, target) {
    return h('button.link.link--button', { type: 'button', on: { click: function () { showLogin('', target); } } }, text);
  }

  var remember = h('input', { type: 'checkbox', id: 'remember', checked: true });
  var rememberRow = h('label.check', remember, h('span', 'Keep me signed in on this device'));
  var submit;
  var form = h('form.stack', { novalidate: true });

  if (mode === 'signin') {
    var user = input('username', 'Username', 'text', 'username', { value: auth.lastUser() });
    var pass = input('password', 'Password', 'password', 'current-password');
    submit = button('Sign in', { kind: 'primary', icon: 'key' });
    submit.type = 'submit';
    put(form, user.field, pass.field, rememberRow, submit, note);
    put(card,
      h('span.connect__kicker', 'ADMIN'),
      h('h1.connect__title', 'Sign in'),
      standalone ? h('p.callout', 'This Home Screen app signs in separately from Safari. Sign in once here and it remembers you.') : null,
      form,
      h('div.connect__links', switcher('Forgot your password?', 'reset'), switcher('First time here? Set up your login', 'setup'))
    );
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!user.el.value.trim() || !pass.el.value) { say('Fill in your username and password.', true); return; }
      submit.disabled = true;
      say('Signing in…');
      try {
        await auth.login(user.el.value.trim(), pass.el.value, remember.checked);
        startWithLogin();
      } catch (err) {
        submit.disabled = false;
        say(auth.explainAuth(err), true);
        pass.el.select();
      }
    });
    setTimeout(function () { (user.el.value ? pass.el : user.el).focus(); }, 50);
  } else {
    var isSetup = mode === 'setup';
    var code = input('code', 'Setup code', 'password', 'one-time-code');
    var nuser = input('username', 'Choose a username', 'text', 'username', { value: auth.lastUser() });
    var npass = input('new-password', isSetup ? 'Choose a password' : 'New password', 'password', 'new-password', { minlength: 12 });
    var keyInput = input('github-key', isSetup ? 'Your GitHub key' : 'GitHub key (only if you also want to replace it)', 'password', 'off', { required: !isSetup ? null : true, placeholder: 'github_pat_...' });
    submit = button(isSetup ? 'Create my login' : 'Reset my password', { kind: 'primary', icon: 'key' });
    submit.type = 'submit';
    put(form,
      code.field,
      h('p.field__hint', 'The setup code was given to you when the admin was set up. It is saved in your Passwords app or on your card.'),
      nuser.field, npass.field,
      h('p.field__hint', 'At least 12 characters. Your phone can suggest a strong one and remember it.'),
      keyInput.field,
      isSetup ? h('p.field__hint', h('a.link', { href: NEW_KEY_URL, target: '_blank', rel: 'noopener' }, 'Make the GitHub key', icon('external')), ' (choose "Only select repositories" and pick ', h('code', REPO.name), '). You paste it here once; it is kept safely on the sign-in service, never in your browser.') : null,
      rememberRow, submit, note
    );
    put(card,
      h('span.connect__kicker', 'ADMIN'),
      h('h1.connect__title', isSetup ? 'Set up your login' : 'Reset your password'),
      h('p.connect__lead', isSetup ? 'Do this once. Afterwards you sign in with just a username and password, on any device.' : 'Use your setup code to choose a new password. Every device is signed out.'),
      form,
      h('div.connect__links', switcher('Back to sign in', 'signin'))
    );
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!code.el.value.trim()) { say('Enter your setup code.', true); code.el.focus(); return; }
      if (npass.el.value.length < 12) { say('Passwords need at least 12 characters.', true); npass.el.focus(); return; }
      submit.disabled = true;
      say(isSetup ? 'Setting up…' : 'Resetting…');
      try {
        await auth.setup(code.el.value.trim(), nuser.el.value.trim(), npass.el.value, keyInput.el.value.trim(), remember.checked);
        forgetKey();
        toast(isSetup ? 'Your login is ready.' : 'Password changed. Other devices are signed out.');
        startWithLogin();
      } catch (err) {
        submit.disabled = false;
        say(auth.explainAuth(err), true);
      }
    });
    setTimeout(function () { code.el.focus(); }, 50);
  }
  if (message) say(message, true);

  /* Tell people up front if the sign-in service is unreachable, and where the way out is. */
  auth.health().then(function (hs) {
    if (mode === 'signin' && hs && hs.ready === false) showLogin('', 'setup');
  }).catch(function () {
    card.insertBefore(h('p.callout.callout--warn', "Can't reach the sign-in service right now. If you need to undo a publish, use the ", h('a.link', { href: 'rescue.html' }, 'rescue page'), '.'), card.children[2] || null);
  });
}

/* A sign-in sheet over the editor when the session ends mid-work. Nothing is lost. */
function signInAgain() {
  if (signInOpen) return;
  signInOpen = true;
  var user = h('input.input', { type: 'text', name: 'username', autocomplete: 'username', value: auth.lastUser(), autocapitalize: 'none', spellcheck: 'false' });
  var pass = h('input.input', { type: 'password', name: 'password', autocomplete: 'current-password' });
  var note = h('p.field__note', { 'aria-live': 'polite' });
  var form = h('form.stack', { novalidate: true },
    h('p.dialog__text', 'You were signed out. Your draft is safe. Sign in to keep going.'),
    h('div.field', h('label.field__label', 'Username'), user),
    h('div.field', h('label.field__label', 'Password'), pass),
    note
  );
  var d = dialog('Sign in again', form, [
    { label: 'Sign in', kind: 'primary', icon: 'key', onClick: function () { form.requestSubmit(); return false; } }
  ], { locked: true, onClose: function () { signInOpen = false; } });
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    note.textContent = 'Signing in…';
    note.className = 'field__note';
    try {
      await auth.login(user.value.trim(), pass.value, true);
      d.close();
      toast('Signed in. Carrying on where you were.');
      refreshAccount();
      store.sync();
    } catch (err) {
      note.textContent = auth.explainAuth(err);
      note.className = 'field__note field__note--error';
    }
  });
  setTimeout(function () { (user.value ? pass : user).focus(); }, 80);
}

/* Account details (key expiry, recent sign-ins) and a renewed session, every 20 minutes. */
async function refreshAccount() {
  if (!auth.enabled) return;
  try {
    account = await auth.me();
    if (ctx && current.name === 'settings') renderPanel(true);
  } catch (e) {
    if (e.status === 401) signInAgain();
  }
}

/* ---------- Start ---------- */

function startWithKey(key) { start(function () { return key; }, null); }
function startWithLogin() { start(auth.token, LOGIN_API + '/gh'); }

/* Everything a signed-in run starts (listeners, the account refresh, the draft's sync timer) stops
   here, so signing out and in again without a reload never doubles them. */
function endSession() {
  if (session) session.abort();
  session = null;
  if (store) store.stop();
}

async function start(getToken, api) {
  endSession();
  session = new AbortController();
  var signal = session.signal;
  document.body.className = 'is-loading';
  clear(app).appendChild(h('main.loading', h('span.loading__dot'), h('p', 'Opening your site…')));
  gh = createClient(getToken, api);
  store = createStore(gh);
  try {
    var info = await gh.repoInfo();
    if (!info.permissions || !info.permissions.push) throw Object.assign(new Error('read only'), { status: 403 });
    var source = await store.load();
    if (auth.enabled) {
      account = await auth.me().catch(function () { return null; });
      var refresh = setInterval(refreshAccount, 20 * 60000);
      signal.addEventListener('abort', function () { clearInterval(refresh); });
    }
    buildShell(signal);
    window.addEventListener('hashchange', route, { signal: signal });
    route();
    if (source && source.stale) staleDraftNotice();
    else if (source && source.caughtUp) toast('The site changed since you started this draft. Your edits are kept, and so is everything published since.', null, 8000);
    else if (source && source.fromOtherDevice) toast('Picked up your draft from another device.');
    expiryNotice();
  } catch (e) {
    if (auth.enabled && e.session) { auth.clearToken(); showLogin(); return; }
    if (!auth.enabled && (e.status === 401 || e.status === 403 || e.status === 404)) { forgetKey(); showConnect(explain(e)); return; }
    clear(app).appendChild(h('main.loading',
      h('p', explain(e)),
      e.loginServer ? h('p.small-text', 'If you need to undo a publish right now, use the ', h('a.link', { href: 'rescue.html' }, 'rescue page'), '.') : null,
      button('Try again', { kind: 'primary', onClick: function () { start(getToken, api); } })
    ));
  }
}

function staleDraftNotice() {
  dialog('Your draft is older than the live site', h('p.dialog__text', 'Something was published after you started this draft (from another device, a restore or the rescue page). Publishing your draft will replace that.'), [
    { label: 'Start fresh from the live site', kind: 'ghost', onClick: function () { store.replace(store.state.live, {}); toast('Started fresh from the live site.'); } },
    { label: 'Keep my draft', kind: 'primary' }
  ]);
}

function expiryNotice() {
  var exp = keyExpiry();
  if (!exp && account && account.patExpires) {
    var left = Math.round((new Date(account.patExpires) - Date.now()) / 86400000);
    if (left <= 14) toast('The GitHub key expires in ' + plural(Math.max(left, 0), 'day') + '. Replace it in Settings.', 'error', 10000);
    return;
  }
  if (!exp) return;
  var days = Math.round((new Date(exp) - Date.now()) / 86400000);
  if (days <= 21) toast('Your GitHub key expires in ' + plural(Math.max(days, 0), 'day') + '. Make a new one in Settings.', 'error', 10000);
}

/* ---------- Shell ---------- */

var NAV = [
  { hash: '#/', label: 'Overview', icon: 'home' },
  { hash: '#/desk', label: 'Desk', icon: 'desk' },
  { hash: '#/works', label: 'Works', icon: 'works' },
  { hash: '#/films', label: 'Films', icon: 'films' },
  { hash: '#/about', label: 'About', icon: 'about' },
  { hash: '#/settings', label: 'Settings', icon: 'settings' },
  { hash: '#/history', label: 'History', icon: 'history' }
];
var TABS = ['#/', '#/desk', '#/works', '#/films', '#/about', '#/more'];

function buildShell(signal) {
  document.body.className = '';
  var undoBtn = button('Undo', { iconOnly: true, icon: 'undo', kind: 'ghost', title: 'Undo (Ctrl+Z)', onClick: function () { if (store.undo()) toast('Undone.'); } });
  var redoBtn = button('Redo', { iconOnly: true, icon: 'redo', kind: 'ghost', title: 'Redo (Ctrl+Shift+Z)', onClick: function () { if (store.redo()) toast('Redone.'); } });
  var previewBtn = button('Preview', { icon: 'eye', kind: 'ghost', small: true, onClick: openPreview });
  var publishBtn = h('button.btn.btn--primary.publish', { type: 'button', on: { click: function () { openPublish(); } } }, icon('rocket'), h('span.publish__label', 'Publish'), h('span.publish__count'));
  var status = h('span.status', { 'aria-live': 'polite' });
  var main = h('main.main', { id: 'main', tabindex: '-1' });

  preview = createPreview({
    signal: signal,
    device: window.matchMedia('(max-width: 720px)').matches ? 'phone' : 'desktop',
    getContent: function () { return store.state.draft; },
    mediaUrl: mediaUrl,
    onClose: closePreview
  });

  var nav = h('nav.nav', { 'aria-label': 'Sections' }, NAV.map(function (n) {
    return h('a.nav__link', { href: n.hash, 'data-hash': n.hash }, icon(n.icon), h('span', n.label));
  }), h('div.nav__foot', h('a.nav__link', { href: SITE_ROOT, target: '_blank', rel: 'noopener' }, icon('external'), h('span', 'Live site'))));

  var tabs = h('nav.tabs', { 'aria-label': 'Sections' }, TABS.map(function (hash) {
    var n = NAV.filter(function (x) { return x.hash === hash; })[0] || { hash: '#/more', label: 'More', icon: 'grip' };
    return h('a.tabs__link', { href: n.hash, 'data-hash': n.hash }, icon(n.icon), h('span', n.label));
  }));

  shell = {
    root: h('div.app',
      h('header.top',
        h('a.top__brand', { href: '#/' }, h('span.top__dot', { 'aria-hidden': 'true' }), h('span', 'Admin')),
        status,
        h('div.top__actions', undoBtn, redoBtn, previewBtn, publishBtn)
      ),
      nav, main, h('aside.app__preview', { 'aria-label': 'Preview' }, preview.el), tabs
    ),
    main: main, status: status, undo: undoBtn, redo: redoBtn, publish: publishBtn
  };
  clear(app).appendChild(shell.root);

  ctx = {
    store: store, gh: gh, preview: preview, siteRoot: SITE_ROOT,
    go: function (hash) { if (location.hash === hash) route(); else location.hash = hash; },
    rerender: function () { renderPanel(true); },
    isWide: function () { return wide.matches; },
    mediaUrl: mediaUrl,
    uploadMedia: uploadMedia,
    openPublish: openPublish,
    discardDraft: discardDraft,
    openPreview: openPreview,
    fix: fix,
    explain: explain,
    keyExpiry: keyExpiry,
    reconnect: function () { forgetKey(); location.hash = ''; showConnect(); },
    signOut: signOut,
    loginMode: auth.enabled,
    account: function () { return account; },
    changePassword: changePassword,
    replaceGithubKey: replaceGithubKey,
    signOutEverywhere: signOutEverywhere
  };

  store.onChange(function (info) {
    updateTop();
    if (!info.quiet && !info.sync) preview.refresh();
    if (info.structural) renderPanel(true);
    if (info.sync && store.state.syncError && (store.state.syncError.status === 401 || store.state.syncError.githubKey)) keyStopped(store.state.syncError);
  });
  wide.addEventListener('change', function () { renderPanel(true); }, { signal: signal });
  document.addEventListener('keydown', onKey, { signal: signal });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') store.sync(); }, { signal: signal });
  updateTop();
  preview.refresh(true);
}

function updateTop() {
  var st = store.state;
  var dirty = store.isDirty();
  var changes = dirty ? describeChanges(st.live, st.draft).length : 0;
  var text;
  if (liveState === 'waiting') text = 'Going live…';
  else if (st.syncing) text = 'Saving draft…';
  else if (st.syncError && dirty) text = 'Draft saved on this device';
  else if (dirty) text = 'Draft saved';
  else if (liveState === 'blocked') text = 'Check failed';
  else text = 'All published';
  shell.status.textContent = text;
  shell.status.title = liveState === 'blocked' ? 'The site check stopped the last publish. The live site still shows the previous version.' : '';
  shell.status.className = 'status' + (liveState === 'waiting' ? ' is-busy' : dirty ? ' is-draft' : liveState === 'blocked' ? ' is-error' : ' is-clean');
  shell.undo.disabled = !store.canUndo();
  shell.redo.disabled = !store.canRedo();
  shell.publish.disabled = !dirty;
  shell.publish.querySelector('.publish__count').textContent = changes ? String(changes) : '';
  shell.publish.setAttribute('aria-label', dirty ? 'Publish ' + plural(changes, 'change') : 'Nothing to publish');
}

/* ---------- Routing ---------- */

var current = { name: null, id: null };

function parse() {
  var hash = location.hash || '#/';
  var m = hash.match(/^#\/(works|films)\/([^/]+)$/);
  if (m) return { name: m[1] === 'works' ? 'work' : 'film', id: decodeURIComponent(m[2]) };
  var name = hash.replace(/^#\/?/, '') || 'home';
  return { name: ['home', 'desk', 'works', 'films', 'about', 'settings', 'history', 'more'].indexOf(name) !== -1 ? name : 'home', id: null };
}

function route() {
  current = parse();
  if (current.name !== 'history') preview.showVersion(null);
  closePreview();
  renderPanel(false);
}

function renderPanel(keepScroll) {
  if (!shell) return;
  var main = shell.main;
  var y = keepScroll ? main.scrollTop : 0;
  var winY = keepScroll ? window.scrollY : 0;
  clear(main);
  var el = h('div.panel');
  main.appendChild(el);
  var c = current;
  if (c.name === 'desk') panels.renderDesk(ctx, el);
  else if (c.name === 'works') panels.renderWorks(ctx, el);
  else if (c.name === 'work') panels.renderWork(ctx, el, c.id);
  else if (c.name === 'films') panels.renderFilms(ctx, el);
  else if (c.name === 'film') panels.renderFilm(ctx, el, c.id);
  else if (c.name === 'about') panels.renderAbout(ctx, el);
  else if (c.name === 'settings') panels.renderSettings(ctx, el);
  else if (c.name === 'history') panels.renderHistory(ctx, el);
  else if (c.name === 'more') renderMore(el);
  else panels.renderHome(ctx, el);
  var active = { work: '#/works', film: '#/films', home: '#/' }[c.name] || '#/' + c.name;
  Array.prototype.forEach.call(shell.root.querySelectorAll('[data-hash]'), function (a) {
    var on = a.getAttribute('data-hash') === active || (active === '#/settings' || active === '#/history') && a.getAttribute('data-hash') === '#/more';
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  main.scrollTop = y;
  window.scrollTo(0, winY);
  if (!keepScroll) main.focus({ preventScroll: true });
}

function renderMore(el) {
  el.appendChild(h('header.panel__head', h('h1.panel__title', 'More')));
  el.appendChild(h('ul.more',
    h('li', h('a.more__link', { href: '#/settings' }, icon('settings'), h('span', 'Settings'), icon('next'))),
    h('li', h('a.more__link', { href: '#/history' }, icon('history'), h('span', 'History'), icon('next'))),
    h('li', h('a.more__link', { href: SITE_ROOT, target: '_blank', rel: 'noopener' }, icon('external'), h('span', 'Open the live site'), icon('next'))),
    h('li', h('a.more__link', { href: 'rescue.html' }, icon('alert'), h('span', 'Rescue page'), icon('next')))
  ));
  el.appendChild(button('Sign out on this device', { kind: 'ghost', onClick: signOut }));
}

/* Opens the screen and field a validation message points at. */
function fix(path) {
  var d = store.state.draft;
  var parts = path.split('.');
  var hash = '#/';
  if (parts[0] === 'site') hash = '#/settings';
  else if (parts[0] === 'desk') hash = '#/desk';
  else if (parts[0] === 'about') hash = '#/about';
  else if (parts[0] === 'works') hash = d.works[+parts[1]] ? '#/works/' + d.works[+parts[1]].id : '#/works';
  else if (parts[0] === 'films') hash = d.films[+parts[1]] ? '#/films/' + d.films[+parts[1]].id : '#/films';
  ctx.go(hash);
  setTimeout(function () {
    var target = shell.main.querySelector('[data-path="' + path + '"]');
    for (var n = parts.length; !target && n > 1; n--) target = shell.main.querySelector('[data-path^="' + parts.slice(0, n).join('.') + '"]');
    if (!target) return;
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    var focusable = target.matches('input, textarea') ? target : target.querySelector('input, textarea, button');
    if (focusable) focusable.focus({ preventScroll: true });
    var box = target.closest('.field, .switch, .media-pick') || target;
    box.classList.add('is-flash');
    setTimeout(function () { box.classList.remove('is-flash'); }, 1600);
  }, 80);
}

/* ---------- Preview helpers ---------- */

function openPreview() { if (!wide.matches) { shell.root.classList.add('is-preview-open'); preview.fit(); preview.refresh(true); } }
function closePreview() { if (shell) shell.root.classList.remove('is-preview-open'); }

/* ---------- Media ---------- */

/* Unpublished uploads are not on the live site yet, so the preview shows them from memory,
   fetching them back from GitHub after a reload. */
function mediaUrl(path) {
  if (mediaCache[path]) return mediaCache[path];
  var sha = store.state.media[path];
  if (sha && !mediaLoading[path]) {
    mediaLoading[path] = true;
    gh.getBlob(sha).then(function (b) {
      mediaCache[path] = URL.createObjectURL(fromBase64(b.content, mimeFor(path)));
      preview.refresh();
      renderPanel(true);
    }).catch(function () { mediaLoading[path] = false; });
  }
  return SITE_ROOT + path;
}

async function uploadMedia(file, onStep) {
  var prepared = await prepare(file);
  onStep('Uploading (' + Math.max(1, Math.round(prepared.base64.length * 0.75 / 1024)) + ' KB)…');
  var blob;
  try { blob = await gh.createBlob(prepared.base64); }
  catch (e) { throw new Error(explain(e), { cause: e }); }
  mediaCache[prepared.path] = prepared.previewUrl;
  return { path: prepared.path, sha: blob.sha, type: prepared.type, width: prepared.width, height: prepared.height };
}

/* ---------- Publish ---------- */

async function openPublish(messageOverride) {
  if (typeof messageOverride !== 'string') messageOverride = null;
  var st = store.state;
  var result = check(st.draft);
  if (result.errors.length) {
    var d = dialog('A few things need fixing first', h('div.stack',
      h('p.dialog__text', 'Publishing is paused so nothing broken reaches the site.'),
      h('ul.todo', result.errors.map(function (e) {
        return h('li.todo__item.is-error', h('span', e.msg), button('Fix', { small: true, kind: 'ghost', icon: 'next', onClick: function () { d.close(); fix(e.path); } }));
      }))
    ), [{ label: 'OK', kind: 'ghost' }]);
    return;
  }
  var changes = describeChanges(st.live, st.draft);
  if (!changes.length) { toast('Nothing to publish. The site is up to date.'); return; }
  var removals = changes.filter(isRemoval).length;
  var body = h('div.stack',
    removals ? h('p.callout.callout--danger', 'This takes ' + plural(removals, 'thing') + ' off the live site. If that is not what you meant, choose Not yet.') : null,
    h('ul.changes', changes.map(function (c) { return h('li' + (isRemoval(c) ? '.is-removal' : ''), c); })),
    result.warnings.length ? h('p.callout', plural(result.warnings.length, 'thing is', 'things are') + ' still missing (listed on the Overview). That is fine to publish.') : null
  );
  dialog('Publish ' + plural(changes.length, 'change') + '?', body, [
    { label: 'Not yet', kind: 'ghost' },
    { label: 'Publish', kind: 'primary', icon: 'rocket', onClick: function () { runPublish(messageOverride || commitMessage(changes)); } }
  ]);
}

async function runPublish(message) {
  var steps = {
    checking: h('li', 'Checking the live site'),
    building: h('li', 'Building the pages'),
    saving: h('li', 'Saving to GitHub'),
    live: h('li', 'Going live')
  };
  var note = h('p.dialog__text');
  var list = h('ol.progress', steps.checking, steps.building, steps.saving, steps.live);
  var dlg = dialog('Publishing', h('div.stack', list, note), [], { locked: true });
  var order = ['checking', 'building', 'saving', 'live'];
  function mark(step) {
    var idx = order.indexOf(step === 'saved' ? 'live' : step);
    order.forEach(function (k, i) { steps[k].className = i < idx ? 'is-done' : i === idx ? 'is-active' : ''; });
  }
  try {
    var st = store.state;
    var res = await publish(gh, st.draft, st.media, st.liveCommit, message, mark);
    await store.published(res.content, res.commit);
    mark('live');
    liveState = 'waiting';
    updateTop();
    note.textContent = 'Saved. GitHub is putting it live, which usually takes about a minute. You can close this and keep working.';
    dlg.foot.appendChild(button('Keep working', { kind: 'ghost', onClick: dlg.close }));
    dlg.el.appendChild(dlg.foot);
    var watch = await waitForLive(res.build, res.commit, function (ms) {
      note.textContent = 'Saved. Checking the site and going live… (' + Math.round(ms / 1000) + 's). You can close this and keep working.';
    });
    liveState = watch.result === 'blocked' ? 'blocked' : null;
    updateTop();
    if (watch.result === 'live') {
      steps.live.className = 'is-done';
      dlg.el.querySelector('.dialog__title').textContent = 'Your changes are live';
      note.textContent = 'Live. Some visitors may see the old version for up to 10 minutes while their browser catches up.';
      clear(dlg.foot).appendChild(h('a.btn.btn--primary', { href: SITE_ROOT, target: '_blank', rel: 'noopener' }, icon('external'), h('span', 'Open the site')));
      dlg.foot.appendChild(button('Done', { kind: 'ghost', onClick: dlg.close }));
      toast('Your changes are live.');
    } else if (watch.result === 'blocked') {
      steps.live.className = 'is-error';
      dlg.el.querySelector('.dialog__title').textContent = 'The site check stopped this publish';
      note.textContent = 'Your changes are saved, but the live site still shows the previous version. The automatic check found a problem in the site itself, so nothing broken went live. This needs a fix in the code, not in your content.';
      clear(dlg.foot);
      if (watch.url) dlg.foot.appendChild(h('a.btn.btn--ghost', { href: watch.url, target: '_blank', rel: 'noopener' }, icon('external'), h('span', 'See what failed')));
      dlg.foot.appendChild(button('Close', { kind: 'primary', onClick: dlg.close }));
      if (!dlg.el.isConnected) toast('The site check stopped your last publish. The live site is unchanged.', 'error');
    } else if (watch.result === 'replaced') {
      steps.live.className = 'is-done';
      dlg.el.querySelector('.dialog__title').textContent = 'A newer publish went live instead';
      note.textContent = 'Someone published again before this one went out, so GitHub skipped straight to the newer version. Nothing to do.';
      clear(dlg.foot).appendChild(button('Done', { kind: 'primary', onClick: dlg.close }));
    } else {
      note.textContent = 'Your changes are saved on GitHub, but the site has not updated after 10 minutes. Check the Actions tab of the repository on GitHub, and that Pages is set to deploy with GitHub Actions (repository Settings, Pages).';
    }
  } catch (e) {
    dlg.close();
    if (e.moved) {
      catchUpAndReview();
      return;
    }
    if (e.invalid) { openPublish(); return; }
    if (e.status === 401 || e.githubKey) { keyStopped(e); return; }
    dialog("Publishing didn't finish", h('p.dialog__text', explain(e) + ' Nothing on the live site changed.'), [
      { label: 'Close', kind: 'ghost' },
      { label: 'Try again', kind: 'primary', onClick: function () { runPublish(message); } }
    ]);
  }
}

/* The live site changed while this draft was open: keep that newer work, then show the list again,
   since it may now be different. */
async function catchUpAndReview() {
  try {
    await store.catchUp();
    if (!store.isDirty()) { toast('The live site already has all of your changes. Nothing to publish.'); return; }
    toast('The site changed while you were editing. Your edits now sit on top of the newest version. Check the list and publish.', null, 8000);
    openPublish();
  } catch (e) {
    if (e.status === 401 || e.githubKey) { keyStopped(e); return; }
    dialog("Publishing didn't finish", h('p.dialog__text', explain(e) + ' Nothing on the live site changed.'), [
      { label: 'Close', kind: 'ghost' },
      { label: 'Try again', kind: 'primary', onClick: catchUpAndReview }
    ]);
  }
}

async function discardDraft() {
  if (!(await confirm('Discard your unpublished changes?', 'Your draft goes back to what is live now. You can undo this until you leave the page.', 'Discard', 'danger'))) return;
  store.replace(store.state.live, {});
  toast('Draft discarded. Press Undo to bring it back.');
}

/* The session ended (login mode) or the GitHub key stopped working. */
function keyStopped(err) {
  if (auth.enabled && err && err.session) { signInAgain(); return; }
  if (auth.enabled) {
    dialog('The GitHub key stopped working', h('p.dialog__text', 'It may have expired or been deleted on GitHub. Your draft is safe. Make a new key and replace it in Settings.'), [
      { label: 'Later', kind: 'ghost' },
      { label: 'Open Settings', kind: 'primary', onClick: function () { ctx.go('#/settings'); } }
    ]);
    return;
  }
  dialog('Your GitHub key stopped working', h('p.dialog__text', 'It may have expired or been deleted. Your draft is safe on this device. Connect a new key to keep going.'), [
    { label: 'Later', kind: 'ghost' },
    { label: 'Connect a new key', kind: 'primary', onClick: ctx.reconnect }
  ]);
}

async function signOut() {
  var dirty = store.isDirty();
  if (!(await confirm('Sign out on this device?', dirty ? 'Your draft stays saved, so you can continue on any device.' : 'You can sign in again any time.', 'Sign out'))) return;
  await store.sync();
  store.forgetLocal();
  location.hash = '';
  if (auth.enabled) { auth.clearToken(); showLogin(); return; }
  forgetKey();
  showConnect();
}

/* ---------- Account (login mode) ---------- */

function passwordField(label, autocomplete) {
  return h('input.input', { type: 'password', autocomplete: autocomplete, 'aria-label': label, placeholder: label });
}

function changePassword() {
  var current = passwordField('Current password', 'current-password');
  var next = passwordField('New password (12+ characters)', 'new-password');
  var note = h('p.field__note', { 'aria-live': 'polite' });
  var d = dialog('Change your password', h('div.stack', current, next, h('p.field__hint', 'Other devices are signed out. This one stays signed in.'), note), [
    { label: 'Cancel', kind: 'ghost' },
    { label: 'Change password', kind: 'primary', onClick: function () {
      if (next.value.length < 12) { note.textContent = 'Passwords need at least 12 characters.'; note.className = 'field__note field__note--error'; return false; }
      note.textContent = 'Saving…';
      note.className = 'field__note';
      auth.changePassword(current.value, next.value).then(function () {
        d.close();
        toast('Password changed. Other devices are signed out.');
      }).catch(function (e) {
        note.textContent = auth.explainAuth(e);
        note.className = 'field__note field__note--error';
      });
      return false;
    } }
  ]);
}

function replaceGithubKey() {
  var pass = passwordField('Your password', 'current-password');
  var key = h('input.input', { type: 'password', autocomplete: 'off', placeholder: 'github_pat_...', 'aria-label': 'New GitHub key' });
  var note = h('p.field__note', { 'aria-live': 'polite' });
  var d = dialog('Replace the GitHub key', h('div.stack',
    h('p.dialog__text', 'Make a new key on GitHub (choose "Only select repositories" and pick ' + REPO.name + '), then paste it here.'),
    h('a.btn.btn--secondary.btn--small', { href: NEW_KEY_URL, target: '_blank', rel: 'noopener' }, icon('external'), h('span', 'Open GitHub')),
    key, pass, note
  ), [
    { label: 'Cancel', kind: 'ghost' },
    { label: 'Replace key', kind: 'primary', onClick: function () {
      note.textContent = 'Checking the key with GitHub…';
      note.className = 'field__note';
      auth.replaceKey(pass.value, key.value.trim()).then(function () {
        d.close();
        toast('GitHub key replaced. You can delete the old one on GitHub.');
        refreshAccount();
      }).catch(function (e) {
        note.textContent = auth.explainAuth(e);
        note.className = 'field__note field__note--error';
      });
      return false;
    } }
  ]);
}

async function signOutEverywhere() {
  if (!(await confirm('Sign out on every device?', 'Every phone, tablet and computer signed in to the admin is signed out, this one too. Use this if a device was lost.', 'Sign out everywhere', 'danger'))) return;
  try {
    await store.sync();
    await auth.signOutEverywhere();
    store.forgetLocal();
    location.hash = '';
    showLogin();
  } catch (e) {
    toast(auth.explainAuth(e), 'error');
  }
}

/* ---------- Keyboard ---------- */

function onKey(e) {
  var mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  var inField = e.target.matches && e.target.matches('input, textarea');
  var k = e.key.toLowerCase();
  if (k === 's') { e.preventDefault(); store.sync(); toast('Draft saved.'); return; }
  if (inField) return;
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); if (store.undo()) toast('Undone.'); }
  else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); if (store.redo()) toast('Redone.'); }
}

/* ---------- Go ---------- */

if (auth.enabled) {
  if (auth.token()) startWithLogin(); else showLogin();
} else {
  var existing = getKey();
  if (existing) startWithKey(existing); else showConnect();
}
