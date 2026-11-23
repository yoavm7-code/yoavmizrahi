/* The editing screens. Each render function fills the main area for one admin route.
   ctx gives access to the store, the preview, uploads and navigation (see app.js). */

import { STYLES, DEMOS, LIMITS, deskKeys, uniqueId, youtubeId, hasPlaceholder, isSafeUrl } from '../js/schema.js';
import { h, clear, icon, button, field, toggle, choiceCards, section, toast, dialog, confirm, when, plural } from './ui.js';
import { ACCEPT } from './media.js';
import { REPO } from './config.js';
import { describeChanges, check, history, contentAt } from './publish.js';

/* ---------- Shared bits ---------- */

function draft(ctx) { return ctx.store.state.draft; }
function workIndex(ctx, id) { return draft(ctx).works.map(function (w) { return w.id; }).indexOf(id); }
function filmIndex(ctx, id) { return draft(ctx).films.map(function (f) { return f.id; }).indexOf(id); }

function pageHead(title, intro, back) {
  return h('header.panel__head',
    back ? h('a.panel__back', { href: back.href }, icon('back'), h('span', back.label)) : null,
    h('h1.panel__title', title),
    intro ? h('p.panel__intro', intro) : null
  );
}

/* A text field bound to a value in the draft. get/set read and write it. */
function bound(ctx, opts) {
  var f = field({
    label: opts.label, hint: opts.hint, max: opts.max, multiline: opts.multiline, rows: opts.rows,
    placeholder: opts.placeholder, caps: opts.caps, type: opts.type, inputmode: opts.inputmode,
    spellcheck: opts.spellcheck, path: opts.path,
    value: opts.get(draft(ctx)),
    onInput: function (v) {
      ctx.store.update(function (d) { opts.set(d, v); }, 'field:' + opts.path);
      placeholderNote();
      if (opts.after) opts.after(v);
    }
  });
  function placeholderNote() {
    var v = f.input.value;
    if (opts.type === 'url' && v.trim() && !youtubeId(v) && !isSafeUrl(v.trim())) f.setNote('Links must start with https://', 'error');
    else if (opts.type === 'email' && v.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) f.setNote('That email address does not look right yet.', 'error');
    else if (hasPlaceholder(v)) f.setNote('Still has a placeholder in [brackets]. Replace it with the real text.', 'warn');
    else if (opts.required && !v.trim()) f.setNote("This one can't be empty.", 'error');
    else f.setNote('');
  }
  placeholderNote();
  return f;
}

function moveItem(list, from, to) {
  if (to < 0 || to >= list.length) return;
  var item = list.splice(from, 1)[0];
  list.splice(to, 0, item);
}

/* A list row with move up/down buttons. */
function orderButtons(label, index, count, onMove) {
  return h('div.row__order',
    button('Move ' + label + ' up', { iconOnly: true, icon: 'up', kind: 'ghost', small: true, disabled: index === 0, onClick: function () { onMove(index, index - 1); } }),
    button('Move ' + label + ' down', { iconOnly: true, icon: 'down', kind: 'ghost', small: true, disabled: index === count - 1, onClick: function () { onMove(index, index + 1); } })
  );
}

/* A small drawing of each object style, for the style picker and the lists. */
export function styleArt(style) {
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 64 48');
  svg.setAttribute('class', 'style-art');
  svg.setAttribute('aria-hidden', 'true');
  var shapes = {
    device: [['rect', { x: 10, y: 8, width: 44, height: 32, rx: 7, class: 'ink' }], ['rect', { x: 14, y: 12, width: 36, height: 20, rx: 4, class: 'paper' }]],
    phone: [['rect', { x: 22, y: 4, width: 20, height: 40, rx: 6, class: 'ink' }], ['rect', { x: 25, y: 9, width: 14, height: 30, rx: 3, class: 'screen' }]],
    polaroid: [['rect', { x: 16, y: 6, width: 32, height: 36, rx: 1, class: 'paper', transform: 'rotate(-5 32 24)' }], ['rect', { x: 20, y: 10, width: 24, height: 20, class: 'line', transform: 'rotate(-5 32 24)' }]],
    screen: [['rect', { x: 8, y: 8, width: 48, height: 32, rx: 5, class: 'ink' }], ['rect', { x: 12, y: 12, width: 40, height: 22, rx: 2, class: 'screen' }]],
    film: [['rect', { x: 10, y: 12, width: 44, height: 26, rx: 4, class: 'ink' }], ['rect', { x: 14, y: 15, width: 36, height: 7, rx: 1, class: 'paper' }], ['circle', { cx: 24, cy: 30, r: 4, class: 'screen' }], ['circle', { cx: 40, cy: 30, r: 4, class: 'screen' }]]
  };
  (shapes[style] || shapes.polaroid).forEach(function (s) {
    var el = document.createElementNS(ns, s[0]);
    Object.keys(s[1]).forEach(function (k) { el.setAttribute(k, s[1][k]); });
    svg.appendChild(el);
  });
  return svg;
}

function deskLabel(d, key) {
  if (key === 'note') return 'Sticky note';
  if (key === 'monitor') return 'Monitor';
  if (key === 'tapes') return 'Tapes (on computers they sit with the monitor)';
  var id = key.split(':')[1];
  if (key.indexOf('work:') === 0) { var w = d.works.filter(function (x) { return x.id === id; })[0]; return w ? w.title : id; }
  if (key.indexOf('tape:') === 0) { var f = d.films.filter(function (x) { return x.id === id; })[0]; return f ? 'Tape: ' + (f.tape.label || f.title) : id; }
  return key;
}

/* ---------- Overview ---------- */

export function renderHome(ctx, el) {
  var st = ctx.store.state;
  var d = st.draft;
  var changes = describeChanges(st.live, d);
  var result = check(d);
  el.appendChild(pageHead('Your site', 'Edit anything, check it in the preview, and publish when it looks right.'));

  var status = section(changes.length ? plural(changes.length, 'unpublished change') : 'Everything is published');
  if (changes.length) {
    status.body.appendChild(h('ul.changes', changes.map(function (c) { return h('li', c); })));
    status.body.appendChild(h('div.row-gap',
      button('Publish now', { kind: 'primary', icon: 'rocket', onClick: ctx.openPublish }),
      button('Discard these changes', { kind: 'ghost', onClick: ctx.discardDraft })
    ));
  } else {
    status.body.appendChild(h('p.muted-text', 'Your draft matches the live site. Changes you make are saved as a draft until you publish.'));
  }
  status.body.appendChild(h('p.small-text', h('a.link', { href: ctx.siteRoot, target: '_blank', rel: 'noopener' }, 'Open the live site', icon('external'))));
  el.appendChild(status);

  var todo = section(result.warnings.length ? 'Still missing' : 'Nothing missing',
    result.warnings.length ? "These don't stop you from publishing. They're just not finished yet." : 'Every piece of content is filled in.');
  if (result.warnings.length) {
    todo.body.appendChild(h('ul.todo', result.warnings.map(function (w) {
      return h('li.todo__item', h('span', w.msg), button('Fix', { small: true, kind: 'ghost', icon: 'next', onClick: function () { ctx.fix(w.path); } }));
    })));
  }
  el.appendChild(todo);

  var quick = section('Quick actions');
  quick.body.appendChild(h('div.quick',
    h('button.quick__btn', { type: 'button', on: { click: function () { addWork(ctx); } } }, styleArt('polaroid'), h('strong', 'Add a work'), h('span', 'A product or project')),
    h('button.quick__btn', { type: 'button', on: { click: function () { addFilm(ctx); } } }, styleArt('film'), h('strong', 'Add a film'), h('span', 'Paste a YouTube link')),
    h('button.quick__btn', { type: 'button', on: { click: function () { ctx.go('#/desk'); } } }, styleArt('device'), h('strong', 'The desk'), h('span', 'What sits on it, in what order'))
  ));
  el.appendChild(quick);
  ctx.preview.go('#/');
}

/* ---------- Desk ---------- */

export function renderDesk(ctx, el) {
  var d = draft(ctx);
  el.appendChild(pageHead('Desk', 'The home page. It arranges itself to fit every screen, and visitors can move and play with everything on it.'));

  var note = section('Sticky note');
  note.body.appendChild(bound(ctx, { label: 'Greeting', path: 'desk.note.hi', max: LIMITS.short, required: true, get: function (x) { return x.desk.note.hi; }, set: function (x, v) { x.desk.note.hi = v; } }));
  note.body.appendChild(bound(ctx, { label: 'Main line', path: 'desk.note.line', max: LIMITS.title, get: function (x) { return x.desk.note.line; }, set: function (x, v) { x.desk.note.line = v; } }));
  note.body.appendChild(bound(ctx, { label: 'Small print', path: 'desk.note.small', max: LIMITS.line, multiline: true, rows: 2, get: function (x) { return x.desk.note.small; }, set: function (x, v) { x.desk.note.small = v; } }));
  el.appendChild(note);

  var hints = section('Hints', 'The small line that tells people what they can do. Shown in capitals.');
  hints.body.appendChild(bound(ctx, { label: 'On computers', path: 'desk.hint', max: LIMITS.line, caps: true, get: function (x) { return x.desk.hint; }, set: function (x, v) { x.desk.hint = v; } }));
  hints.body.appendChild(bound(ctx, { label: 'On phones and tablets', path: 'desk.hintMobile', max: LIMITS.line, caps: true, get: function (x) { return x.desk.hintMobile; }, set: function (x, v) { x.desk.hintMobile = v; } }));
  el.appendChild(hints);

  var onDesk = section('What sits on the desk');
  d.works.forEach(function (w, i) {
    onDesk.body.appendChild(toggle({ label: w.title || 'Untitled work', hint: STYLES[w.style].name, path: 'works.' + i + '.desk', value: w.desk.show !== false, onChange: function (on) {
      ctx.store.update(function (x) {
        x.works[i].desk.show = on;
      });
      ctx.rerender();
    } }));
  });
  d.films.forEach(function (f, i) {
    if (f.soon) return;
    onDesk.body.appendChild(toggle({ label: 'Tape: ' + (f.tape.label || f.title || 'Untitled film'), hint: 'Plays on the monitor', path: 'films.' + i + '.tape', value: !!f.tape.show, onChange: function (on) {
      ctx.store.update(function (x) { setTape(x.films[i], on); });
      ctx.rerender();
    } }));
  });
  el.appendChild(onDesk);

  var order = section('Order on the desk', 'Top of this list comes first, on computers (left to right, top to bottom) and on phones (top to bottom).');
  renderOrder(ctx, order.body);
  el.appendChild(order);
  ctx.preview.go('#/');
}

function renderOrder(ctx, box) {
  clear(box);
  var d = draft(ctx);
  var keys = d.desk.order.filter(function (k) { return deskKeys(d).indexOf(k) !== -1; });
  deskKeys(d).forEach(function (k) { if (keys.indexOf(k) === -1) keys.push(k); });
  var list = h('ol.order');
  keys.forEach(function (k, i) {
    list.appendChild(h('li.order__item',
      h('span.order__num', String(i + 1)),
      h('span.order__name', deskLabel(d, k)),
      orderButtons(deskLabel(d, k), i, keys.length, function (from, to) {
        ctx.store.update(function (x) { x.desk.order = keys.slice(); moveItem(x.desk.order, from, to); });
        renderOrder(ctx, box);
        ctx.preview.refresh();
      })
    ));
  });
  box.appendChild(list);
}

function setTape(f, on) {
  if (on && !f.tape.show && !f.tape.label) f.tape.label = autoTapeLabel(f);
  f.tape.show = on;
}

/* ---------- Works ---------- */

export function renderWorks(ctx, el) {
  var d = draft(ctx);
  el.appendChild(pageHead('Works', 'Your products and projects. Each one has a card on the Work page, a page of its own and an object on the desk.'));
  el.appendChild(h('div.row-gap', button('Add a work', { kind: 'primary', icon: 'plus', onClick: function () { addWork(ctx); } })));
  var list = h('ul.items');
  d.works.forEach(function (w, i) {
    var thumb = w.media && w.media.type === 'image' ? h('img.items__thumb', { src: ctx.mediaUrl(w.media.src), alt: '' }) : h('span.items__thumb', styleArt(w.style));
    var badges = [];
    if (w.demo) badges.push(h('span.badge', 'Live demo'));
    if (w.desk.show === false) badges.push(h('span.badge.badge--muted', 'Not on desk'));
    if (!w.demo && !w.media) badges.push(h('span.badge.badge--warn', 'No picture'));
    if (hasPlaceholder(w.year + w.description)) badges.push(h('span.badge.badge--warn', 'Placeholder'));
    list.appendChild(h('li.items__row',
      h('a.items__main', { href: '#/works/' + encodeURIComponent(w.id) }, thumb,
        h('span.items__text', h('strong', w.title || 'Untitled'), h('span', [String(i + 1).padStart(2, '0'), w.kind].filter(Boolean).join(' · '))),
        h('span.items__badges', badges), icon('next', 'items__go')),
      orderButtons(w.title, i, d.works.length, function (from, to) {
        ctx.store.update(function (x) { moveItem(x.works, from, to); });
        ctx.rerender();
      })
    ));
  });
  el.appendChild(list);
  if (!d.works.length) el.appendChild(h('p.empty', 'No works yet. Add your first one.'));
  ctx.preview.go('#/work');
}

export function addWork(ctx) {
  var name = field({ label: 'Name', placeholder: 'For example: Ad Intel', max: LIMITS.title });
  var style = 'polaroid';
  var picker = choiceCards({
    label: 'How it looks on the desk',
    value: style,
    choices: Object.keys(STYLES).map(function (k) { return { value: k, title: STYLES[k].name, hint: STYLES[k].hint, art: styleArt(k) }; }),
    onChange: function (v) { style = v; }
  });
  dialog('Add a work', h('div.stack', name, picker), [
    { label: 'Cancel', kind: 'ghost' },
    { label: 'Add work', kind: 'primary', icon: 'plus', onClick: function () {
      var title = name.input.value.trim();
      if (!title) { name.setNote('Give it a name first.', 'error'); name.input.focus(); return false; }
      var id;
      ctx.store.update(function (x) {
        id = uniqueId(title, x.works.map(function (w) { return w.id; }));
        x.works.push({
          id: id, title: title, kind: '', year: String(new Date().getFullYear()), madeWith: 'AI coding agents',
          description: '', link: '', style: style, demo: null, media: null,
          desk: { show: true }
        });
        x.desk.order = (x.desk.order || []).concat('work:' + id);
      });
      ctx.go('#/works/' + id);
      toast('Added "' + title + '". Fill in the details, then publish.');
    } }
  ]);
}

export function renderWork(ctx, el, id) {
  var i = workIndex(ctx, id);
  if (i === -1) { ctx.go('#/works'); return; }
  var w = draft(ctx).works[i];
  var p = 'works.' + i;
  function set(fn) { return function (x, v) { fn(x.works[workIndex(ctx, id)], v); }; }
  function get(fn) { return function (x) { return fn(x.works[workIndex(ctx, id)]); }; }

  el.appendChild(pageHead(w.title || 'Untitled work', null, { href: '#/works', label: 'All works' }));

  var basics = section('Details');
  basics.body.appendChild(bound(ctx, { label: 'Name', path: p + '.title', max: LIMITS.title, required: true, get: get(function (x) { return x.title; }), set: set(function (x, v) { x.title = v; }) }));
  basics.body.appendChild(bound(ctx, { label: 'Type', hint: 'For example: Web app, Production tool. Shown in capitals.', path: p + '.kind', max: LIMITS.short, caps: true, get: get(function (x) { return x.kind; }), set: set(function (x, v) { x.kind = v; }) }));
  basics.body.appendChild(h('div.grid-2',
    bound(ctx, { label: 'Year', path: p + '.year', max: 12, inputmode: 'numeric', get: get(function (x) { return x.year; }), set: set(function (x, v) { x.year = v; }) }),
    bound(ctx, { label: 'Made with', path: p + '.madeWith', max: LIMITS.title, get: get(function (x) { return x.madeWith; }), set: set(function (x, v) { x.madeWith = v; }) })
  ));
  basics.body.appendChild(bound(ctx, { label: 'Description', hint: 'One or two sentences: what it is and who it is for.', path: p + '.description', max: LIMITS.text, multiline: true, rows: 4, get: get(function (x) { return x.description; }), set: set(function (x, v) { x.description = v; }) }));
  basics.body.appendChild(bound(ctx, { label: 'Design notes (optional)', hint: 'How it was designed. Shown under the demo on its page. Leave an empty line between paragraphs.', path: p + '.design', max: LIMITS.notes, multiline: true, rows: 6, get: get(function (x) { return x.design; }), set: set(function (x, v) { x.design = v; }) }));
  basics.body.appendChild(bound(ctx, { label: 'Live link (optional)', hint: 'If people can use it, paste its address. Adds a "Visit the live product" link.', path: p + '.link', type: 'url', inputmode: 'url', spellcheck: false, placeholder: 'https://', get: get(function (x) { return x.link; }), set: set(function (x, v) { x.link = v.trim(); }) }));
  el.appendChild(basics);

  var pic = section('Picture', w.demo ? null : 'A screenshot or a short screen recording. It shows on the desk object and the project page.');
  if (w.demo) pic.body.appendChild(h('p.callout', 'This work shows its built-in live demo (' + DEMOS[w.demo].name + ') instead of a picture.'));
  else pic.body.appendChild(mediaPicker(ctx, {
    path: p + '.media', video: true, alt: true,
    title: 'Choose a screenshot or video', hint: 'JPG, PNG, WebP or a short MP4. Or drop a file here.',
    get: function (x) { return x.works[workIndex(ctx, id)].media; },
    set: function (x, res) {
      var work = x.works[workIndex(ctx, id)];
      work.media = res ? { type: res.type, src: res.path, alt: (work.media && work.media.alt) || '', width: res.width, height: res.height } : null;
    }
  }));
  el.appendChild(pic);

  var editable = w.demo && DEMOS[w.demo].replica && DEMOS[w.demo].replica.editable;
  if (editable) el.appendChild(replicaSection(ctx, id, p, editable));

  var look = section('On the desk');
  look.body.appendChild(choiceCards({
    label: 'Object style',
    value: w.style,
    disabled: !!w.demo,
    hint: w.demo ? 'This style is fixed because the live demo is built for it.' : null,
    choices: Object.keys(STYLES).map(function (k) { return { value: k, title: STYLES[k].name, hint: STYLES[k].hint, art: styleArt(k) }; }),
    onChange: function (v) { ctx.store.update(function (x) { x.works[workIndex(ctx, id)].style = v; }); }
  }));
  look.body.appendChild(toggle({ label: 'Show on the desk', hint: 'Off keeps it on the Work page only.', path: p + '.desk', value: w.desk.show !== false, onChange: function (on) {
    ctx.store.update(function (x) {
      x.works[workIndex(ctx, id)].desk.show = on;
    });
  } }));
  el.appendChild(look);

  var adv = section('Advanced');
  adv.body.appendChild(addressField(ctx, 'work', id, p));
  adv.body.appendChild(h('div.danger-zone', h('div', h('strong', 'Delete this work'), h('p.muted-text', 'Removes its card, page and desk object when you publish.' + (w.demo ? ' Its live demo can only be brought back by rebuilding it.' : ''))),
    button('Delete work', { kind: 'danger', icon: 'trash', onClick: async function () {
      if (!(await confirm('Delete "' + w.title + '"?', 'It disappears from the site when you publish. You can undo this until then.', 'Delete', 'danger'))) return;
      ctx.store.update(function (x) { x.works.splice(workIndex(ctx, id), 1); });
      ctx.go('#/works');
      toast('Deleted. Press Undo if that was a mistake.');
    } })));
  el.appendChild(adv);
  ctx.preview.go('#/work/' + id);
}

/* The "web address" of a work or film, with a warning about old links. */
function addressField(ctx, kind, id, p) {
  var f = field({
    label: 'Web address', path: p + '.id', value: id, spellcheck: false, max: 40,
    hint: 'The end of the link to this ' + kind + '. Changing it breaks links you already shared.'
  });
  var apply = button('Change address', { small: true, onClick: function () {
    var list = kind === 'work' ? draft(ctx).works : draft(ctx).films;
    var next = uniqueId(f.input.value, list.map(function (x) { return x.id; }).filter(function (x) { return x !== id; }));
    if (next === id) { f.input.value = id; return; }
    ctx.store.update(function (x) {
      var arr = kind === 'work' ? x.works : x.films;
      arr.filter(function (it) { return it.id === id; })[0].id = next;
      x.desk.order = (x.desk.order || []).map(function (k) { return k === 'work:' + id ? 'work:' + next : k; });
    });
    toast('The address is now "' + next + '".');
    ctx.go(kind === 'work' ? '#/works/' + next : '#/films/' + next);
  } });
  f.appendChild(apply);
  return f;
}

/* Upload, replace or remove a picture: a work's screenshot or video, a replica's logo or a film's still.
   opts: path (for messages), get(draft) -> the current value, set(draft, upload result or null),
   video (videos allowed), alt (ask for a description), title and hint (the empty drop zone),
   changed (optional: called instead of redrawing the picker, for lists that redraw themselves). */
function mediaPicker(ctx, opts) {
  var box = h('div.media-pick', { 'data-path': opts.path });
  var fileInput = h('input', { type: 'file', accept: opts.video ? ACCEPT : IMAGES, hidden: true });
  var status = h('p.media-pick__status', { 'aria-live': 'polite' });
  box.appendChild(fileInput);

  function current() { return opts.get(draft(ctx)); }

  function draw() {
    Array.prototype.slice.call(box.children).forEach(function (c) { if (c !== fileInput) c.remove(); });
    var m = current();
    if (m) {
      var url = ctx.mediaUrl(m.src);
      box.appendChild(h('div.media-pick__preview', m.type === 'video'
        ? h('video', { src: url, muted: true, loop: true, autoplay: true, playsinline: true })
        : h('img', { src: url, alt: '' })));
      box.appendChild(h('div.row-gap',
        button('Replace', { icon: 'image', onClick: function () { fileInput.click(); } }),
        button('Remove', { kind: 'ghost', icon: 'trash', onClick: function () {
          ctx.store.update(function (x) { opts.set(x, null); });
          if (opts.changed) opts.changed(); else draw();
        } })
      ));
      if (opts.alt) {
        box.appendChild(bound(ctx, {
          label: m.type === 'video' ? 'What the video shows' : 'Describe the picture',
          hint: 'For people using screen readers, and for search engines.',
          path: opts.path + '.alt', max: LIMITS.line,
          get: function (x) { var mm = opts.get(x); return mm ? mm.alt : ''; },
          set: function (x, v) { var mm = opts.get(x); if (mm) mm.alt = v; }
        }));
      }
    } else {
      var drop = h('button.media-pick__drop', { type: 'button', on: { click: function () { fileInput.click(); } } },
        icon('image'), h('strong', opts.title), h('span', opts.hint),
        h('span', 'Photos are cleaned of hidden location data.' + (opts.video ? ' Videos are uploaded as they are, so use screen recordings rather than phone videos.' : '')));
      ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove('is-over'); }); });
      drop.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]); });
      box.appendChild(drop);
    }
    box.appendChild(status);
  }

  async function upload(file) {
    status.textContent = 'Preparing the file…';
    status.className = 'media-pick__status';
    try {
      var res = await ctx.uploadMedia(file, function (step) { status.textContent = step; });
      if (!opts.video && res.type !== 'image') throw new Error('Please choose an image (PNG, JPG or WebP).');
      ctx.store.update(function (x, st) {
        opts.set(x, res);
        st.media[res.path] = res.sha;
      });
      status.textContent = '';
      if (opts.changed) opts.changed(); else draw();
      toast('Picture added.');
    } catch (e) {
      status.textContent = e.message;
      status.className = 'media-pick__status is-error';
    }
  }
  fileInput.addEventListener('change', function () { if (fileInput.files[0]) upload(fileInput.files[0]); fileInput.value = ''; });
  draw();
  return box;
}

/* ---------- Replica settings ---------- */
/* A replica's logo and wording. The replica reads them from the published content when it loads,
   so changes show in the clickable demo after publishing (the preview runs the live demo). */

var IMAGES = 'image/png,image/jpeg,image/webp';
var LANG_NAMES = { he: 'Hebrew', en: 'English' };
var PAGE_SIZE = 40;

function replicaSection(ctx, id, p, editable) {
  var sec = section(editable.logo ? 'Demo logo and wording' : 'Demo wording', 'Changes show in the clickable demo after you publish.');
  function settings(x) { var work = x.works[workIndex(ctx, id)]; work.replica = work.replica || { logo: null, strings: {} }; return work.replica; }
  if (editable.logo) {
    sec.body.appendChild(h('h3.subhead', 'Logo'));
    sec.body.appendChild(mediaPicker(ctx, {
      path: p + '.replica.logo', video: false, alt: false,
      title: 'Choose the logo', hint: 'A PNG with a transparent background works best. Shown in the demo\'s top bar.',
      get: function (x) { return settings(x).logo ? { type: 'image', src: settings(x).logo.src } : null; },
      set: function (x, res) { settings(x).logo = res ? { src: res.path } : null; }
    }));
  }
  sec.body.appendChild(h('h3.subhead', 'Wording'));
  sec.body.appendChild(wordingEditor(ctx, editable, settings));
  return sec;
}

/* Every line of the demo's text, searchable. Type over a line to change it; Reset brings the
   original back. Lines keep their {placeholders}, which the demo fills in (a number, a name). */
function wordingEditor(ctx, editable, settings) {
  var box = h('div.wording');
  var state = { lang: editable.languages[0], q: '', shown: PAGE_SIZE, defaults: null };
  var list = h('div.wording__list');
  var count = h('p.muted-text');
  var search = h('input.input', { type: 'search', placeholder: 'Search the wording…', 'aria-label': 'Search the wording', on: { input: function () { state.q = search.value; state.shown = PAGE_SIZE; paint(); } } });
  var tabs = h('div.row-gap', { role: 'group', 'aria-label': 'Language' });

  import('../' + editable.strings).then(function (mod) {
    state.defaults = mod.STRINGS;
    paint();
  }).catch(function () {
    clear(list).appendChild(h('p.callout', 'The demo\'s wording could not be loaded. Refresh the page and try again.'));
  });

  function overrides(x) { var st = settings(x).strings; st[state.lang] = st[state.lang] || {}; return st[state.lang]; }
  function vars(text) { return (String(text).match(/\{\w+\}/g) || []).sort().join(' '); }

  function paint() {
    clear(tabs);
    editable.languages.forEach(function (l) {
      tabs.appendChild(button(LANG_NAMES[l] || l, { small: true, kind: state.lang === l ? 'primary' : 'ghost', onClick: function () { state.lang = l; state.shown = PAGE_SIZE; paint(); } }));
    });
    if (!state.defaults) { clear(list).appendChild(h('p.muted-text', 'Loading the wording…')); return; }
    var base = state.defaults[state.lang];
    var other = state.defaults[editable.languages.filter(function (l) { return l !== state.lang; })[0]] || {};
    var changed = overrides(draft(ctx));
    var q = state.q.trim().toLowerCase();
    var keys = Object.keys(base).filter(function (k) {
      var now = changed[k] !== undefined ? changed[k] : base[k];
      return !q || (k + ' ' + base[k] + ' ' + now + ' ' + (other[k] || '')).toLowerCase().indexOf(q) !== -1;
    });
    count.textContent = keys.length + (keys.length === 1 ? ' line' : ' lines') + ' · ' + Object.keys(changed).length + ' changed';
    clear(list);
    keys.slice(0, state.shown).forEach(function (k) { list.appendChild(row(k, base[k], other[k], changed[k])); });
    if (keys.length > state.shown) list.appendChild(button('Show ' + Math.min(PAGE_SIZE, keys.length - state.shown) + ' more', { small: true, onClick: function () { state.shown += PAGE_SIZE; paint(); } }));
    if (!keys.length) list.appendChild(h('p.muted-text', 'No line matches "' + state.q + '".'));
  }

  function row(key, original, reference, override) {
    var value = override !== undefined ? override : original;
    var warn = h('p.wording__warn');
    var area = h('textarea.input.wording__text', { rows: String(Math.min(4, Math.ceil(original.length / 60) || 1)), dir: state.lang === 'he' ? 'rtl' : 'ltr', 'aria-label': key, value: value, 'data-key': key });
    function check() { warn.textContent = vars(area.value) !== vars(original) ? 'Keep ' + vars(original) + ' in the text: the demo fills it in.' : ''; }
    area.addEventListener('input', check);
    area.addEventListener('change', function () {
      var v = area.value.trim();
      ctx.store.update(function (x) {
        var map = overrides(x);
        if (!v || v === original) delete map[key]; else map[key] = v;
      });
      paint();
    });
    check();
    return h('div.wording__row' + (override !== undefined ? '.is-changed' : ''),
      h('div.wording__head', h('code', key), override !== undefined ? button('Reset', { small: true, kind: 'ghost', onClick: function () {
        ctx.store.update(function (x) { delete overrides(x)[key]; });
        paint();
      } }) : null),
      reference ? h('p.muted-text.wording__ref', { dir: 'auto' }, reference) : null,
      area, warn);
  }

  box.appendChild(h('div.row-gap.wording__bar', tabs, search));
  box.appendChild(count);
  box.appendChild(list);
  paint();
  return box;
}

/* ---------- Films ---------- */

function autoLabel(f) { return [f.title, f.part].filter(Boolean).join(' · '); }
function autoTapeLabel(f) { return autoLabel(f).slice(0, 24); }
function autoFile(f) { return (f.title || 'FILM').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) + '.MOV'; }

export function renderFilms(ctx, el) {
  var d = draft(ctx);
  el.appendChild(pageHead('Films', 'The reel on the Films page, in this order. Released films can also sit on the desk as tapes.'));
  el.appendChild(h('div.row-gap', button('Add a film', { kind: 'primary', icon: 'plus', onClick: function () { addFilm(ctx); } })));
  var list = h('ul.items');
  d.films.forEach(function (f, i) {
    var thumb = f.youtube ? h('img.items__thumb', { src: 'https://i.ytimg.com/vi/' + f.youtube + '/mqdefault.jpg', alt: '' }) : h('span.items__thumb', styleArt('film'));
    var badges = [];
    if (f.soon) badges.push(h('span.badge.badge--muted', 'In production'));
    else if (!f.youtube) badges.push(h('span.badge.badge--warn', 'No video'));
    if (f.tape.show) badges.push(h('span.badge', 'Tape on desk'));
    list.appendChild(h('li.items__row',
      h('a.items__main', { href: '#/films/' + encodeURIComponent(f.id) }, thumb,
        h('span.items__text', h('strong', f.label || f.title || 'Untitled'), h('span', [f.genre, f.runtime].filter(Boolean).join(' · ') || (f.soon ? 'Coming soon' : ''))),
        h('span.items__badges', badges), icon('next', 'items__go')),
      orderButtons(f.label || f.title, i, d.films.length, function (from, to) {
        ctx.store.update(function (x) { moveItem(x.films, from, to); });
        ctx.rerender();
      })
    ));
  });
  el.appendChild(list);
  if (!d.films.length) el.appendChild(h('p.empty', 'No films yet. Add your first one.'));
  ctx.preview.go('#/films');
}

export function addFilm(ctx) {
  var link = field({ label: 'YouTube link', placeholder: 'https://youtu.be/...', hint: 'Not on YouTube yet? Leave it empty and add it later.', type: 'url', inputmode: 'url', spellcheck: false });
  var title = field({ label: 'Title', placeholder: 'For example: Leviathan', caps: true, max: LIMITS.short });
  var soon = toggle({ label: 'Still in production', hint: 'Shows as "coming soon" at the end of the reel.' });
  var thumb = h('div.yt-thumb');
  link.input.addEventListener('input', function () {
    var yt = youtubeId(link.input.value);
    clear(thumb);
    if (yt) { thumb.appendChild(h('img', { src: 'https://i.ytimg.com/vi/' + yt + '/mqdefault.jpg', alt: '' })); link.setNote('Found the video.', 'ok'); }
    else if (link.input.value.trim()) link.setNote("That doesn't look like a YouTube link.", 'error');
    else link.setNote('');
  });
  dialog('Add a film', h('div.stack', link, thumb, title, soon), [
    { label: 'Cancel', kind: 'ghost' },
    { label: 'Add film', kind: 'primary', icon: 'plus', onClick: function () {
      var t = title.input.value.trim();
      if (!t) { title.setNote('Give it a title first.', 'error'); title.input.focus(); return false; }
      var yt = youtubeId(link.input.value);
      if (link.input.value.trim() && !yt) { link.input.focus(); return false; }
      var id;
      ctx.store.update(function (x) {
        id = uniqueId(t, x.films.map(function (f) { return f.id; }));
        var film = {
          id: id, title: t.toUpperCase(), part: '', label: '', presents: ((x.site.channel || '') + ' presents').trim().toUpperCase(),
          genre: '', runtime: '', file: '', youtube: yt, soon: soon.input.checked,
          tape: { show: false, label: '', x: 1000, y: 500, r: 0 }
        };
        film.label = autoLabel(film);
        film.file = autoFile(film);
        if (!film.soon) setTape(film, true);
        film.tape.r = Math.round(Math.random() * 10 - 5);
        var firstSoon = x.films.map(function (f) { return f.soon; }).indexOf(true);
        if (!film.soon && firstSoon !== -1) x.films.splice(firstSoon, 0, film); else x.films.push(film);
      });
      ctx.go('#/films/' + id);
      toast('Added "' + t + '".');
    } }
  ]);
}

export function renderFilm(ctx, el, id) {
  var i = filmIndex(ctx, id);
  if (i === -1) { ctx.go('#/films'); return; }
  var f = draft(ctx).films[i];
  var p = 'films.' + i;
  function film(x) { return x.films[filmIndex(ctx, id)]; }

  el.appendChild(pageHead(f.label || f.title || 'Untitled film', null, { href: '#/films', label: 'All films' }));

  /* Fields derived from the title follow it until you change them yourself. */
  function follow(x, before) {
    var fl = film(x);
    if (fl.label === autoLabel(before)) fl.label = autoLabel(fl);
    if (fl.tape.label === autoTapeLabel(before)) fl.tape.label = autoTapeLabel(fl);
    if (fl.file === autoFile(before)) fl.file = autoFile(fl);
  }
  function titled(key) {
    return function (x, v) {
      var before = JSON.parse(JSON.stringify(film(x)));
      film(x)[key] = v;
      follow(x, before);
    };
  }

  var video = section('Video');
  var thumb = h('div.yt-thumb');
  function drawThumb(yt) { clear(thumb); if (yt) thumb.appendChild(h('img', { src: 'https://i.ytimg.com/vi/' + yt + '/mqdefault.jpg', alt: 'Video thumbnail' })); }
  var yt = bound(ctx, {
    label: 'YouTube link', hint: 'Paste the link from YouTube. Leave empty until the film is online.', path: p + '.youtube', type: 'url', inputmode: 'url', spellcheck: false,
    placeholder: 'https://youtu.be/...',
    get: function (x) { var v = film(x).youtube; return v ? 'https://youtu.be/' + v : ''; },
    set: function (x, v) { film(x).youtube = youtubeId(v); },
    after: function (v) {
      var id2 = youtubeId(v);
      drawThumb(id2);
      if (v.trim() && !id2) yt.setNote("That doesn't look like a YouTube link.", 'error');
      else if (id2) yt.setNote('Found the video.', 'ok');
    }
  });
  video.body.appendChild(yt);
  video.body.appendChild(thumb);
  drawThumb(f.youtube);
  video.body.appendChild(toggle({ label: 'Still in production', hint: 'Shows as "coming soon" at the end of the reel, with no play button.', path: p + '.soon', value: f.soon, onChange: function (on) {
    ctx.store.update(function (x) { film(x).soon = on; if (on) film(x).tape.show = false; });
    ctx.rerender();
  } }));
  el.appendChild(video);

  var titles = section('Titles', 'Shown in capitals, like film credits.');
  titles.body.appendChild(bound(ctx, { label: 'Title', path: p + '.title', max: LIMITS.short, caps: true, required: true, get: function (x) { return film(x).title; }, set: titled('title') }));
  titles.body.appendChild(bound(ctx, { label: 'Subtitle', hint: 'For example: Part one.', path: p + '.part', max: LIMITS.short, caps: true, get: function (x) { return film(x).part; }, set: titled('part') }));
  titles.body.appendChild(bound(ctx, { label: 'Credit line', hint: 'The small line above the title.', path: p + '.presents', max: LIMITS.short, caps: true, get: function (x) { return film(x).presents; }, set: function (x, v) { film(x).presents = v; } }));
  titles.body.appendChild(h('div.grid-2',
    bound(ctx, { label: 'Genre', placeholder: 'Sci-fi short', path: p + '.genre', max: LIMITS.short, caps: true, get: function (x) { return film(x).genre; }, set: function (x, v) { film(x).genre = v; } }),
    bound(ctx, { label: 'Runtime', placeholder: '12:40', hint: 'Minutes:seconds.', path: p + '.runtime', max: 12, inputmode: 'numeric', get: function (x) { return film(x).runtime; }, set: function (x, v) { film(x).runtime = v; } })
  ));
  el.appendChild(titles);

  var tape = section('Tape on the desk');
  if (f.soon) tape.body.appendChild(h('p.callout', 'Films in production have no tape. Turn off "Still in production" to add one.'));
  else {
    tape.body.appendChild(toggle({ label: 'Put a tape on the desk', hint: 'Visitors drop it in the monitor to play the film.', path: p + '.tape', value: f.tape.show, onChange: function (on) {
      ctx.store.update(function (x) { setTape(film(x), on); });
      ctx.rerender();
    } }));
    if (f.tape.show) tape.body.appendChild(bound(ctx, { label: 'Tape label', path: p + '.tape.label', max: 24, caps: true, get: function (x) { return film(x).tape.label; }, set: function (x, v) { film(x).tape.label = v; } }));
  }
  el.appendChild(tape);

  var stills = section('Stills', 'Up to ' + LIMITS.stills + ' frames from the film. They run along the Films card on the Work page, in this order.');
  function stillsOf(x) { var fl = film(x); fl.stills = Array.isArray(fl.stills) ? fl.stills : []; return fl.stills; }
  var frames = h('div.grid-2.stills');
  (f.stills || []).forEach(function (src, k) {
    frames.appendChild(mediaPicker(ctx, {
      path: p + '.stills.' + k, video: false, alt: false, changed: ctx.rerender,
      get: function (x) { var s = stillsOf(x)[k]; return s ? { type: 'image', src: s } : null; },
      set: function (x, res) { if (res) stillsOf(x)[k] = res.path; else stillsOf(x).splice(k, 1); }
    }));
  });
  if ((f.stills || []).length < LIMITS.stills) {
    frames.appendChild(mediaPicker(ctx, {
      path: p + '.stills.' + (f.stills || []).length, video: false, alt: false, changed: ctx.rerender,
      title: 'Add a still', hint: 'A wide frame from the film (16:9). JPG, PNG or WebP. Or drop a file here.',
      get: function () { return null; },
      set: function (x, res) { if (res) stillsOf(x).push(res.path); }
    }));
  }
  stills.body.appendChild(frames);
  el.appendChild(stills);

  var adv = section('Advanced');
  adv.body.appendChild(bound(ctx, { label: 'Timeline label', hint: 'The name on the reel clip. Follows the title unless you change it.', path: p + '.label', max: LIMITS.short, caps: true, get: function (x) { return film(x).label; }, set: function (x, v) { film(x).label = v; } }));
  adv.body.appendChild(bound(ctx, { label: 'File name', hint: 'The decorative file name in the corner of the viewer.', path: p + '.file', max: LIMITS.short, caps: true, get: function (x) { return film(x).file; }, set: function (x, v) { film(x).file = v; } }));
  adv.body.appendChild(addressField(ctx, 'film', id, p));
  adv.body.appendChild(h('div.danger-zone', h('div', h('strong', 'Delete this film'), h('p.muted-text', 'Removes it from the reel and the desk when you publish.')),
    button('Delete film', { kind: 'danger', icon: 'trash', onClick: async function () {
      if (!(await confirm('Delete "' + (f.label || f.title) + '"?', 'It disappears from the site when you publish. You can undo this until then.', 'Delete', 'danger'))) return;
      ctx.store.update(function (x) { x.films.splice(filmIndex(ctx, id), 1); });
      ctx.go('#/films');
      toast('Deleted. Press Undo if that was a mistake.');
    } })));
  el.appendChild(adv);
  ctx.preview.go('#/films/' + id);
}

/* ---------- About ---------- */

export function renderAbout(ctx, el) {
  el.appendChild(pageHead('About', 'Who you are, in a few lines.'));
  var main = section('Main text');
  main.body.appendChild(bound(ctx, { label: 'About you', path: 'about.lead', max: LIMITS.lead, multiline: true, rows: 5, required: true, get: function (x) { return x.about.lead; }, set: function (x, v) { x.about.lead = v; } }));
  el.appendChild(main);

  var before = section('Background', 'Shown under "Before". One line each: past companies, studies.');
  var rows = h('div.stack');
  function drawRows() {
    clear(rows);
    draft(ctx).about.before.forEach(function (line, i) {
      rows.appendChild(h('div.line-row',
        bound(ctx, { label: 'Line ' + (i + 1), path: 'about.before.' + i, max: LIMITS.line, get: function (x) { return x.about.before[i] || ''; }, set: function (x, v) { x.about.before[i] = v; } }),
        button('Remove line ' + (i + 1), { iconOnly: true, icon: 'trash', kind: 'ghost', onClick: function () {
          ctx.store.update(function (x) { x.about.before.splice(i, 1); });
          drawRows();
        } })
      ));
    });
  }
  drawRows();
  before.body.appendChild(rows);
  before.body.appendChild(button('Add a line', { icon: 'plus', onClick: function () {
    ctx.store.update(function (x) { x.about.before.push(''); });
    drawRows();
    var inputs = rows.querySelectorAll('input');
    if (inputs.length) inputs[inputs.length - 1].focus();
  } }));
  el.appendChild(before);

  var design = section('Web design', 'Shown under "Web design". A short intro, then one point per line.');
  design.body.appendChild(bound(ctx, { label: 'Intro', path: 'about.design.lead', max: LIMITS.text, multiline: true, rows: 3, get: function (x) { return x.about.design.lead; }, set: function (x, v) { x.about.design.lead = v; } }));
  var points = h('div.stack');
  function drawPoints() {
    clear(points);
    draft(ctx).about.design.points.forEach(function (line, i) {
      points.appendChild(h('div.line-row',
        bound(ctx, { label: 'Point ' + (i + 1), path: 'about.design.points.' + i, max: LIMITS.line, get: function (x) { return x.about.design.points[i] || ''; }, set: function (x, v) { x.about.design.points[i] = v; } }),
        button('Remove point ' + (i + 1), { iconOnly: true, icon: 'trash', kind: 'ghost', onClick: function () {
          ctx.store.update(function (x) { x.about.design.points.splice(i, 1); });
          drawPoints();
        } })
      ));
    });
  }
  drawPoints();
  design.body.appendChild(points);
  design.body.appendChild(button('Add a point', { icon: 'plus', onClick: function () {
    ctx.store.update(function (x) { x.about.design.points.push(''); });
    drawPoints();
    var inputs = points.querySelectorAll('input');
    if (inputs.length) inputs[inputs.length - 1].focus();
  } }));
  el.appendChild(design);
  el.appendChild(h('p.callout', 'Your email and links live in Settings and show here automatically.', ' ', h('a.link', { href: '#/settings' }, 'Open Settings')));
  ctx.preview.go('#/about');
}

/* ---------- Settings ---------- */

export function renderSettings(ctx, el) {
  el.appendChild(pageHead('Settings', 'Your name, contact details and how the site appears in search and link previews.'));
  var who = section('You');
  who.body.appendChild(bound(ctx, { label: 'Your name', hint: 'Top left of every page.', path: 'site.name', max: LIMITS.title, required: true, get: function (x) { return x.site.name; }, set: function (x, v) { x.site.name = v; } }));
  who.body.appendChild(bound(ctx, { label: 'Email', hint: 'Shown on the About page and in the menu. Leave empty to hide it.', path: 'site.email', type: 'email', inputmode: 'email', spellcheck: false, get: function (x) { return x.site.email; }, set: function (x, v) { x.site.email = v.trim(); } }));
  who.body.appendChild(bound(ctx, { label: 'YouTube channel name', hint: 'Used on the Films card and in new film credits.', path: 'site.channel', max: LIMITS.title, get: function (x) { return x.site.channel; }, set: function (x, v) { x.site.channel = v; } }));
  el.appendChild(who);

  var links = section('Links', 'Shown on the About page. A link without an address stays hidden.');
  var rows = h('div.stack');
  function drawLinks() {
    clear(rows);
    draft(ctx).site.links.forEach(function (l, i) {
      rows.appendChild(h('div.link-row',
        bound(ctx, { label: 'Name', path: 'site.links.' + i + '.label', max: LIMITS.short, get: function (x) { return x.site.links[i].label; }, set: function (x, v) { x.site.links[i].label = v; } }),
        bound(ctx, { label: 'Address', path: 'site.links.' + i + '.url', type: 'url', inputmode: 'url', spellcheck: false, placeholder: 'https://', get: function (x) { return x.site.links[i].url; }, set: function (x, v) { x.site.links[i].url = v.trim(); } }),
        button('Remove link ' + (l.label || i + 1), { iconOnly: true, icon: 'trash', kind: 'ghost', onClick: function () {
          ctx.store.update(function (x) { x.site.links.splice(i, 1); });
          drawLinks();
        } })
      ));
    });
  }
  drawLinks();
  links.body.appendChild(rows);
  links.body.appendChild(button('Add a link', { icon: 'plus', onClick: function () {
    ctx.store.update(function (x) { x.site.links.push({ label: '', url: '' }); });
    drawLinks();
  } }));
  el.appendChild(links);

  var seo = section('Search and sharing');
  seo.body.appendChild(bound(ctx, { label: 'Site address', hint: 'Your domain, for example https://yoavmizrahi.com. Makes link previews show the right pictures.', path: 'site.url', type: 'url', inputmode: 'url', spellcheck: false, placeholder: 'https://', get: function (x) { return x.site.url; }, set: function (x, v) { x.site.url = v.trim(); } }));
  seo.body.appendChild(bound(ctx, { label: 'Browser tab title', path: 'site.title', max: LIMITS.line, required: true, get: function (x) { return x.site.title; }, set: function (x, v) { x.site.title = v; } }));
  seo.body.appendChild(bound(ctx, { label: 'Search description', hint: 'The line Google and link previews show under your name.', path: 'site.description', max: LIMITS.text, multiline: true, rows: 2, get: function (x) { return x.site.description; }, set: function (x, v) { x.site.description = v; } }));
  seo.body.appendChild(bound(ctx, { label: 'Menu tagline', hint: 'Bottom of the full-screen menu. Shown in capitals.', path: 'site.tagline', max: LIMITS.line, caps: true, get: function (x) { return x.site.tagline; }, set: function (x, v) { x.site.tagline = v; } }));
  el.appendChild(seo);

  if (ctx.loginMode) {
    el.appendChild(renderAccount(ctx));
    ctx.preview.go('#/about');
    return;
  }
  var account = section('This device');
  var exp = ctx.keyExpiry();
  account.body.appendChild(h('div.card',
    h('div.card__row', icon('key'), h('span', 'Connected to GitHub, repository ', h('strong', REPO.owner + '/' + REPO.name))),
    h('p.muted-text', exp ? 'The key expires on ' + new Date(exp).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) + '. The admin reminds you three weeks before.' : 'Key expiry date unknown.'),
    h('div.row-gap',
      button('Connect a new key', { small: true, icon: 'key', onClick: ctx.reconnect }),
      button('Sign out on this device', { small: true, kind: 'ghost', onClick: ctx.signOut })
    )
  ));
  account.body.appendChild(h('p.small-text', 'If the admin ever breaks, the ', h('a.link', { href: 'rescue.html' }, 'rescue page'), ' can undo the last publish on its own.'));
  el.appendChild(account);
  ctx.preview.go('#/about');
}

/* Login mode: who is signed in, the GitHub key's expiry, recent sign-ins and account actions. */
function renderAccount(ctx) {
  var acc = ctx.account() || {};
  var box = section('Your login');
  var exp = acc.patExpires ? new Date(acc.patExpires) : null;
  var days = exp ? Math.round((exp - Date.now()) / 86400000) : null;
  box.body.appendChild(h('div.card',
    h('div.card__row', icon('key'), h('span', 'Signed in as ', h('strong', acc.username || '…'))),
    h('p.muted-text', exp
      ? 'The GitHub key works until ' + exp.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) + (days <= 14 ? '. Replace it soon.' : '. The admin reminds you two weeks before.')
      : 'The GitHub key has no expiry date.'),
    h('div.row-gap',
      button('Change password', { small: true, icon: 'key', onClick: ctx.changePassword }),
      button('Replace GitHub key', { small: true, onClick: ctx.replaceGithubKey })
    )
  ));
  if (acc.signins && acc.signins.length) {
    box.body.appendChild(h('div.stack',
      h('strong', 'Recent sign-ins'),
      h('ul.signins', acc.signins.map(function (s) {
        return h('li.signins__row' + (s.ok ? '' : '.is-failed'),
          h('span', when(s.at)),
          h('span', [s.device, s.place].filter(Boolean).join(' · ') || 'Unknown device'),
          h('span.badge' + (s.ok ? '.badge--muted' : '.badge--warn'), s.ok ? (s.kind === 'setup' ? 'Setup' : 'Signed in') : 'Wrong password'));
      })),
      h('p.small-text', "Don't recognise one? Change your password and sign out everywhere.")
    ));
  }
  box.body.appendChild(h('div.row-gap',
    button('Sign out on this device', { small: true, kind: 'ghost', onClick: ctx.signOut }),
    button('Sign out everywhere', { small: true, kind: 'danger', onClick: ctx.signOutEverywhere })
  ));
  box.body.appendChild(h('p.small-text', 'If the admin ever breaks, the ', h('a.link', { href: 'rescue.html' }, 'rescue page'), ' can undo the last publish on its own.'));
  return box;
}

/* ---------- History ---------- */

export async function renderHistory(ctx, el) {
  el.appendChild(pageHead('History', 'Every publish, newest first. Preview any version and bring it back if you need to.'));
  var list = h('ul.history', h('li.history__loading', 'Loading…'));
  el.appendChild(list);
  try {
    var items = await history(ctx.gh);
    clear(list);
    items.forEach(function (it, i) {
      list.appendChild(h('li.history__row',
        h('div.history__text', h('strong', when(it.date)), h('span', it.message), i === 0 ? h('span.badge', 'Live now') : null),
        h('div.row-gap',
          button('Preview', { small: true, kind: 'ghost', icon: 'eye', onClick: async function () {
            var content = await contentAt(ctx.gh, it.sha);
            if (content) { ctx.preview.showVersion(content, 'Showing the version from ' + when(it.date) + '. Your draft is untouched.'); ctx.openPreview(); }
          } }),
          i === 0 ? null : button('Restore', { small: true, icon: 'history', onClick: async function () {
            if (!(await confirm('Bring back this version?', 'Your draft becomes the version from ' + when(it.date) + '. Then you can check it and publish. Undo works until you publish.', 'Bring it back'))) return;
            var content = await contentAt(ctx.gh, it.sha);
            if (!content) { toast('That version could not be loaded.', 'error'); return; }
            ctx.preview.showVersion(null);
            ctx.store.replace(content, {});
            ctx.go('#/');
            ctx.openPublish('Restored the version from ' + when(it.date));
          } })
        )
      ));
    });
    if (!items.length) list.appendChild(h('li.history__loading', 'Nothing published from here yet.'));
  } catch (e) {
    clear(list);
    list.appendChild(h('li.history__loading', ctx.explain(e)));
  }
}
