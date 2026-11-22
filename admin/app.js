/* The admin. Connects to GitHub with a key, loads the site's content, and lets you edit, preview
   and publish it. See _plans/2026-11-22-admin-and-mobile.md for how it is put together. */

import { createClient, explain } from './github.js';
import { createStore } from './store.js';
import { createPreview } from './preview.js';
import { prepare, fromBase64, mimeFor } from './media.js';
import { publish, describeChanges, check, commitMessage, waitForLive } from './publish.js';
import * as panels from './panels.js';
import { h, clear, icon, button, toast, dialog, confirm, plural } from './ui.js';
import { REPO, NEW_KEY_URL, SITE_ROOT } from './config.js';

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
      var info = await createClient(key).repoInfo();
      if (!info.permissions || !info.permissions.push) throw Object.assign(new Error('read only'), { status: 403 });
      saveKey(key, remember.checked);
      start(key);
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

/* ---------- Start ---------- */

async function start(key) {
  document.body.className = 'is-loading';
  clear(app).appendChild(h('main.loading', h('span.loading__dot'), h('p', 'Opening your site…')));
  gh = createClient(key);
  store = createStore(gh);
  try {
    var info = await gh.repoInfo();
    if (!info.permissions || !info.permissions.push) throw Object.assign(new Error('read only'), { status: 403 });
    var source = await store.load();
    buildShell();
    window.addEventListener('hashchange', route);
    route();
    if (source && source.stale) staleDraftNotice();
    else if (source && source.fromOtherDevice) toast('Picked up your draft from another device.');
    expiryNotice();
  } catch (e) {
    if (e.status === 401 || e.status === 403 || e.status === 404) { forgetKey(); showConnect(explain(e)); return; }
    clear(app).appendChild(h('main.loading',
      h('p', explain(e)),
      button('Try again', { kind: 'primary', onClick: function () { start(key); } })
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

function buildShell() {
  document.body.className = '';
  var undoBtn = button('Undo', { iconOnly: true, icon: 'undo', kind: 'ghost', title: 'Undo (Ctrl+Z)', onClick: function () { if (store.undo()) toast('Undone.'); } });
  var redoBtn = button('Redo', { iconOnly: true, icon: 'redo', kind: 'ghost', title: 'Redo (Ctrl+Shift+Z)', onClick: function () { if (store.redo()) toast('Redone.'); } });
  var previewBtn = button('Preview', { icon: 'eye', kind: 'ghost', small: true, onClick: openPreview });
  var publishBtn = h('button.btn.btn--primary.publish', { type: 'button', on: { click: function () { openPublish(); } } }, icon('rocket'), h('span.publish__label', 'Publish'), h('span.publish__count'));
  var status = h('span.status', { 'aria-live': 'polite' });
  var main = h('main.main', { id: 'main', tabindex: '-1' });

  preview = createPreview({
    device: window.matchMedia('(max-width: 720px)').matches ? 'phone' : 'desktop',
    getContent: function () { return store.state.draft; },
    mediaUrl: mediaUrl,
    onDesk: onDesk,
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
    selectedDeskKey: null,
    onDeskSelect: null
  };

  store.onChange(function (info) {
    updateTop();
    if (!info.quiet && !info.sync) preview.refresh();
    if (info.structural) renderPanel(true);
    if (info.sync && store.state.syncError && store.state.syncError.status === 401) keyStopped();
  });
  wide.addEventListener('change', function () { renderPanel(true); });
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') store.sync(); });
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
  else text = 'All published';
  shell.status.textContent = text;
  shell.status.className = 'status' + (liveState === 'waiting' ? ' is-busy' : dirty ? ' is-draft' : ' is-clean');
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
  if (current.name !== 'desk' && preview.mode() === 'arrange') preview.setMode('preview');
  if (current.name !== 'history') preview.showVersion(null);
  ctx.onDeskSelect = null;
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

function onDesk(msg) {
  if (msg.type === 'desk:moved') {
    store.update(function (d) {
      var t = panels.deskTarget(d, msg.key);
      if (t) { t.x = Math.max(0, Math.round(msg.x)); t.y = Math.max(0, Math.round(msg.y)); }
    }, 'move:' + msg.key + ':' + Date.now(), { quiet: true });
    ctx.selectedDeskKey = msg.key;
    if (ctx.onDeskSelect) ctx.onDeskSelect(msg.key);
  } else if (msg.type === 'desk:selected') {
    ctx.selectedDeskKey = msg.key;
    if (ctx.onDeskSelect) ctx.onDeskSelect(msg.key);
  } else if (msg.type === 'desk:ready' && ctx.selectedDeskKey) {
    preview.tellDesk({ type: 'desk:select', key: ctx.selectedDeskKey });
  }
}

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
  catch (e) { throw new Error(explain(e)); }
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
  var body = h('div.stack',
    h('ul.changes', changes.map(function (c) { return h('li', c); })),
    result.warnings.length ? h('p.callout', plural(result.warnings.length, 'thing is', 'things are') + ' still missing (listed on the Overview). That is fine to publish.') : null
  );
  dialog('Publish ' + plural(changes.length, 'change') + '?', body, [
    { label: 'Not yet', kind: 'ghost' },
    { label: 'Publish', kind: 'primary', icon: 'rocket', onClick: function () { runPublish(messageOverride || commitMessage(changes), false); } }
  ]);
}

async function runPublish(message, force) {
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
    var res = await publish(gh, st.draft, st.media, st.liveCommit, message, mark, force);
    await store.published(res.content, res.commit);
    mark('live');
    liveState = 'waiting';
    updateTop();
    note.textContent = 'Saved. GitHub is putting it live, which usually takes about a minute. You can close this and keep working.';
    dlg.foot.appendChild(button('Keep working', { kind: 'ghost', onClick: dlg.close }));
    dlg.el.appendChild(dlg.foot);
    var live = await waitForLive(res.build, function (ms) {
      note.textContent = 'Saved. Going live… (' + Math.round(ms / 1000) + 's). You can close this and keep working.';
    });
    liveState = null;
    updateTop();
    if (live) {
      steps.live.className = 'is-done';
      dlg.el.querySelector('.dialog__title').textContent = 'Your changes are live';
      note.textContent = 'Live. Some visitors may see the old version for up to 10 minutes while their browser catches up.';
      clear(dlg.foot).appendChild(h('a.btn.btn--primary', { href: SITE_ROOT, target: '_blank', rel: 'noopener' }, icon('external'), h('span', 'Open the site')));
      dlg.foot.appendChild(button('Done', { kind: 'ghost', onClick: dlg.close }));
      toast('Your changes are live.');
    } else {
      note.textContent = 'Your changes are saved on GitHub, but the site has not updated after 10 minutes. Check that GitHub Pages is turned on (repository Settings, Pages, branch main).';
    }
  } catch (e) {
    dlg.close();
    if (e.moved) {
      var ok = await confirm('The live site changed', 'Something was published after you started this draft (from another device, a restore or the rescue page). Publishing replaces it with your version.', 'Publish anyway');
      if (ok) runPublish(message, true);
      return;
    }
    if (e.invalid) { openPublish(); return; }
    if (e.status === 401) { keyStopped(); return; }
    dialog("Publishing didn't finish", h('p.dialog__text', explain(e) + ' Nothing on the live site changed.'), [
      { label: 'Close', kind: 'ghost' },
      { label: 'Try again', kind: 'primary', onClick: function () { runPublish(message, force); } }
    ]);
  }
}

async function discardDraft() {
  if (!(await confirm('Discard your unpublished changes?', 'Your draft goes back to what is live now. You can undo this until you leave the page.', 'Discard', 'danger'))) return;
  store.replace(store.state.live, {});
  toast('Draft discarded. Press Undo to bring it back.');
}

function keyStopped() {
  dialog('Your GitHub key stopped working', h('p.dialog__text', 'It may have expired or been deleted. Your draft is safe on this device. Connect a new key to keep going.'), [
    { label: 'Later', kind: 'ghost' },
    { label: 'Connect a new key', kind: 'primary', onClick: ctx.reconnect }
  ]);
}

async function signOut() {
  var dirty = store.isDirty();
  if (!(await confirm('Sign out on this device?', dirty ? 'Your draft stays saved on GitHub, so you can continue on any device.' : 'You will need your key to sign in again.', 'Sign out'))) return;
  await store.sync();
  store.forgetLocal();
  forgetKey();
  location.hash = '';
  showConnect();
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

var existing = getKey();
if (existing) start(existing); else showConnect();
