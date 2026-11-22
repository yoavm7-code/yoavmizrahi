/* Small interface kit for the admin. Builds real DOM nodes; text always goes in as text. */

/* ---------- Elements ---------- */

/* h('button.btn.btn--primary', { type: 'button', on: { click: fn } }, 'Save') */
export function h(tag, attrs) {
  var parts = tag.split('.');
  var el = document.createElement(parts[0] || 'div');
  if (parts.length > 1) el.className = parts.slice(1).join(' ');
  var children = Array.prototype.slice.call(arguments, 2);
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { children.unshift(attrs); attrs = null; }
  Object.keys(attrs || {}).forEach(function (k) {
    var v = attrs[k];
    if (v === null || v === undefined || v === false) return;
    if (k === 'on') Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); });
    else if (k === 'text') el.textContent = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else el.setAttribute(k, v === true ? '' : v);
  });
  append(el, children);
  return el;
}

function append(el, children) {
  children.forEach(function (c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  });
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/* ---------- Icons (24px line icons, drawn here so nothing loads from outside) ---------- */

var ICONS = {
  plus: 'M12 5v14M5 12h14',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  desktop: 'M3 4h18v12H3zM8 20h8M12 16v4',
  check: 'M5 12l5 5L20 7',
  alert: 'M12 8v5M12 16.5v.5M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 18l6-6-6-6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5a1.5 1.5 0 1 0 0-.01',
  move: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 3',
  key: 'M15 7a4 4 0 1 1-3.9 4.9L4 19v2h3v-2h2v-2h2l1.1-1.1A4 4 0 0 1 15 7zM16 10h.01',
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  desk: 'M3 7h18M5 7v12M19 7v12M8 11h8',
  works: 'M4 6h7v7H4zM13 6h7v7h-7zM4 15h7v4H4zM13 15h7v4h-7z',
  films: 'M4 5h16v14H4zM4 9h16M4 15h16M8 5v4M16 5v4M8 15v4M16 15v4',
  about: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  rocket: 'M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1zM12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2zM9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5'
};

export function icon(name, cls) {
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'ico' + (cls ? ' ' + cls : ''));
  var path = document.createElementNS(ns, 'path');
  path.setAttribute('d', ICONS[name] || '');
  svg.appendChild(path);
  return svg;
}

/* ---------- Buttons ---------- */

export function button(label, opts) {
  opts = opts || {};
  var b = h('button.btn' + (opts.kind ? '.btn--' + opts.kind : '') + (opts.small ? '.btn--small' : ''), {
    type: 'button',
    title: opts.title,
    'aria-label': opts.iconOnly ? label : null,
    disabled: opts.disabled,
    on: opts.onClick ? { click: opts.onClick } : null
  }, opts.icon ? icon(opts.icon) : null, opts.iconOnly ? null : h('span', label));
  return b;
}

/* ---------- Form fields ---------- */

var fieldCount = 0;

/* A labelled text input or textarea. opts: label, hint, value, max, multiline, rows, placeholder,
   type, inputmode, caps (shown in capitals on the site), onInput(value), path (validation key). */
export function field(opts) {
  var id = 'f' + (++fieldCount);
  var input = h(opts.multiline ? 'textarea.input' : 'input.input', {
    id: id,
    type: opts.multiline ? null : (opts.type || 'text'),
    rows: opts.multiline ? (opts.rows || 3) : null,
    value: opts.value || '',
    placeholder: opts.placeholder,
    inputmode: opts.inputmode,
    autocomplete: 'off',
    spellcheck: opts.spellcheck === false ? 'false' : null,
    'data-path': opts.path,
    class: opts.caps ? 'input--caps' : null
  });
  var counter = opts.max ? h('span.field__count') : null;
  var note = h('p.field__note', { 'aria-live': 'polite' });
  function update() {
    if (counter) {
      var n = input.value.length;
      counter.textContent = n + ' / ' + opts.max;
      counter.classList.toggle('is-near', n > opts.max * 0.85);
      counter.classList.toggle('is-over', n > opts.max);
    }
  }
  input.addEventListener('input', function () { update(); if (opts.onInput) opts.onInput(input.value); });
  update();
  var wrap = h('div.field',
    h('div.field__top', h('label.field__label', { for: id }, opts.label), counter),
    input,
    opts.hint ? h('p.field__hint', opts.hint) : null,
    note
  );
  wrap.input = input;
  wrap.setNote = function (text, kind) {
    note.textContent = text || '';
    note.className = 'field__note' + (kind ? ' field__note--' + kind : '');
  };
  return wrap;
}

/* An on/off switch. */
export function toggle(opts) {
  var id = 'f' + (++fieldCount);
  var input = h('input.switch__input', { id: id, type: 'checkbox', role: 'switch', checked: !!opts.value, 'data-path': opts.path });
  input.addEventListener('change', function () { if (opts.onChange) opts.onChange(input.checked); });
  var wrap = h('div.switch',
    input,
    h('label.switch__label', { for: id }, h('span.switch__track', { 'aria-hidden': 'true' }, h('span.switch__thumb')), h('span.switch__text', h('strong', opts.label), opts.hint ? h('span', opts.hint) : null))
  );
  wrap.input = input;
  return wrap;
}

/* A row of choices shown as cards. opts: label, value, choices [{value, title, hint, art}], onChange */
export function choiceCards(opts) {
  var name = 'c' + (++fieldCount);
  var group = h('div.choices', { role: 'radiogroup', 'aria-label': opts.label });
  opts.choices.forEach(function (c) {
    var input = h('input.choice__input', { type: 'radio', name: name, value: c.value, checked: c.value === opts.value, disabled: opts.disabled, id: name + c.value });
    input.addEventListener('change', function () { if (input.checked && opts.onChange) opts.onChange(c.value); });
    group.appendChild(h('div.choice',
      input,
      h('label.choice__card', { for: name + c.value }, c.art || null, h('strong', c.title), c.hint ? h('span', c.hint) : null)
    ));
  });
  return h('div.field', h('div.field__top', h('span.field__label', opts.label)), group, opts.hint ? h('p.field__hint', opts.hint) : null);
}

export function section(title, intro) {
  var body = h('div.section__body');
  var el = h('section.section', h('div.section__head', h('h2.section__title', title), intro ? h('p.section__intro', intro) : null), body);
  el.body = body;
  return el;
}

/* ---------- Toasts ---------- */

var toastRoot = null;
export function toast(text, kind, ms) {
  if (!toastRoot) { toastRoot = h('div.toasts', { role: 'status', 'aria-live': 'polite' }); document.body.appendChild(toastRoot); }
  var t = h('div.toast' + (kind ? '.toast--' + kind : ''), icon(kind === 'error' ? 'alert' : 'check'), h('span', text));
  toastRoot.appendChild(t);
  requestAnimationFrame(function () { t.classList.add('is-in'); });
  setTimeout(function () {
    t.classList.remove('is-in');
    setTimeout(function () { t.remove(); }, 300);
  }, ms || (kind === 'error' ? 7000 : 3200));
}

/* ---------- Dialogs ---------- */

/* Opens a modal. content: Node. actions: [{label, kind, onClick (return false to keep open)}].
   Returns { close, el }. Escape and the backdrop close it unless opts.locked. */
export function dialog(title, content, actions, opts) {
  opts = opts || {};
  var previous = document.activeElement;
  var box = h('div.dialog__box', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  var foot = h('div.dialog__foot');
  var root = h('div.dialog', h('div.dialog__backdrop', { on: { click: function () { if (!opts.locked) close(); } } }), box);
  function close() {
    root.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    setTimeout(function () { root.remove(); }, 250);
    if (previous && previous.focus) previous.focus();
    if (opts.onClose) opts.onClose();
  }
  function onKey(e) {
    if (e.key === 'Escape' && !opts.locked) close();
    if (e.key === 'Tab') {
      var f = box.querySelectorAll('button, [href], input, textarea, select');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  (actions || []).forEach(function (a) {
    foot.appendChild(button(a.label, { kind: a.kind, icon: a.icon, onClick: function () {
      var keep = a.onClick ? a.onClick() : undefined;
      if (keep !== false) close();
    } }));
  });
  box.appendChild(h('div.dialog__head', h('h2.dialog__title', title), opts.locked ? null : button('Close', { iconOnly: true, icon: 'close', kind: 'ghost', onClick: close })));
  box.appendChild(h('div.dialog__body', content));
  if (actions && actions.length) box.appendChild(foot);
  document.body.appendChild(root);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(function () {
    root.classList.add('is-open');
    var focus = box.querySelector('.dialog__foot .btn--primary, .dialog__foot .btn--danger, .dialog__body input, .dialog__foot .btn');
    if (focus) focus.focus();
  });
  return { close: close, el: box, foot: foot };
}

export function confirm(title, text, okLabel, kind) {
  return new Promise(function (resolve) {
    var answered = false;
    dialog(title, h('p.dialog__text', text), [
      { label: 'Cancel', kind: 'ghost', onClick: function () { answered = true; resolve(false); } },
      { label: okLabel || 'OK', kind: kind || 'primary', onClick: function () { answered = true; resolve(true); } }
    ], { onClose: function () { if (!answered) resolve(false); } });
  });
}

/* ---------- Formatting ---------- */

export function when(date) {
  var d = new Date(date);
  var now = new Date();
  var time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  var diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return 'Today, ' + time;
  if (diffDays === 1) return 'Yesterday, ' + time;
  var sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' }) + ', ' + time;
}
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }

export function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
