/* DOM helpers every replica uses, in one place. Each replica's own js/dom.js re-exports these next
   to its own icons and widgets, so screens keep importing from './dom.js'.
   Text always goes in through textContent, so nothing a visitor types can become markup. */

/* Logs print only with ?debug in the address (the portfolio passes it on to the replica), so a
   visitor's console stays clean and debugging is one parameter away. */
export var DEBUG = new URLSearchParams(location.search).has('debug');

/* Returns log(ns, msg, values), printing "[prefix ns] msg {values}". */
export function makeLog(prefix) {
  return function log(ns, msg, values) {
    if (DEBUG) console.info('[' + prefix + ' ' + ns + '] ' + msg, values || {});
  };
}

/* h('button.btn.btn--ghost', { onclick, title, 'data-x': 1 }, 'Label', child...)
   on* attributes become listeners; style takes an object; text, value and checked set the property. */
export function h(spec, attrs) {
  var parts = spec.split('.');
  var el = document.createElement(parts[0] || 'div');
  if (parts.length > 1) el.className = parts.slice(1).join(' ');
  var children = Array.prototype.slice.call(arguments, 2);
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { children.unshift(attrs); attrs = null; }
  if (attrs) {
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'style') Object.assign(el.style, v);
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    });
  }
  append(el, children);
  return el;
}

/* Appends children: nodes, text, nested arrays; null, false and '' are skipped. */
export function append(el, list) {
  list.forEach(function (c) {
    if (c === null || c === undefined || c === false || c === '') return;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  });
  return el;
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/* GitHub Pages now and then answers a burst of requests with a 503. A picture that fails to load is
   asked for once more a second later, so a visitor doesn't see a gap. A picture with a srcset drops
   it on the retry and loads its plain src. */
export function retryFailedImages(log) {
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!(img instanceof HTMLImageElement) || img.hasAttribute('data-retried')) return;
    img.setAttribute('data-retried', '');
    setTimeout(function () {
      var src = img.getAttribute('src') || '';
      img.removeAttribute('srcset');
      img.src = src + (src.indexOf('?') === -1 ? '?' : '&') + 'retry=1';
      if (log) log('ui', 'image retried', { src: src });
    }, 1000);
  }, true);
}

/* Returns toast(text, tone): one status line at a time, announced politely, gone after opts.ms.
   tone adds toast--<tone>; opts.attrs adds attributes to the toast (a language, say). */
export function makeToast(opts) {
  var timer = null;
  var log = opts.log || function () {};
  return function toast(text, tone) {
    var el = document.querySelector('.toast');
    if (!el) {
      el = h('div.toast', Object.assign({ role: 'status', 'aria-live': 'polite' }, opts.attrs));
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.className = 'toast' + (tone ? ' toast--' + tone : '');
    void el.offsetWidth;
    el.classList.add('is-on');
    clearTimeout(timer);
    timer = setTimeout(function () { el.classList.remove('is-on'); }, opts.ms);
    log('ui', 'toast', { text: text, tone: tone || '' });
  };
}
