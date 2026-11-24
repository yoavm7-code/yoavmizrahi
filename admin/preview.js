/* Live preview: the real site, generated from the draft with the same js/render.js that publishes it.
   Two frames take turns, so a refresh swaps in a ready page instead of flashing a blank one. */

import { renderSite } from '../js/render.js';
import { SITE_ROOT } from './config.js';
import { h, icon } from './ui.js';

var WIDTHS = { desktop: 1440, phone: 390 };

export function createPreview(opts) {
  var view = { device: opts.device || 'desktop', hash: '#/', content: null, url: null, timer: null, banner: null };
  var frames = [makeFrame(), makeFrame()];
  var active = 0;
  var pending = null;

  var deviceBtns = {
    desktop: h('button.seg__btn', { type: 'button', 'aria-pressed': String(view.device === 'desktop'), on: { click: function () { setDevice('desktop'); } } }, icon('desktop'), h('span', 'Desktop')),
    phone: h('button.seg__btn', { type: 'button', 'aria-pressed': String(view.device === 'phone'), on: { click: function () { setDevice('phone'); } } }, icon('phone'), h('span', 'Phone'))
  };
  var bannerEl = h('div.preview__banner', { hidden: true });
  var stage = h('div.preview__stage', frames[0].wrap, frames[1].wrap);
  var root = h('div.preview',
    h('div.preview__bar',
      h('span.preview__label', 'Live preview'),
      h('div.seg', { role: 'group', 'aria-label': 'Preview size' }, deviceBtns.desktop, deviceBtns.phone),
      opts.onClose ? h('button.btn.btn--ghost.btn--small.preview__close', { type: 'button', on: { click: opts.onClose } }, icon('close'), h('span', 'Close')) : null
    ),
    bannerEl,
    stage
  );

  function makeFrame() {
    var iframe = h('iframe.preview__frame', { title: 'Preview of the site', tabindex: '-1' });
    var wrap = h('div.preview__frame-wrap', iframe);
    return { iframe: iframe, wrap: wrap, url: null };
  }

  /* ---------- Rendering ---------- */

  function content() { return view.content || opts.getContent(); }

  function refresh(now) {
    clearTimeout(view.timer);
    view.timer = setTimeout(render, now ? 0 : 300);
  }

  function render() {
    var next = frames[1 - active];
    var html = renderSite(content(), { root: SITE_ROOT, mode: 'preview', mediaUrl: opts.mediaUrl });
    var url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    var scroll = readScroll(frames[active].iframe);
    pending = next;
    next.iframe.onload = function () {
      if (pending !== next) return;
      restoreScroll(next.iframe, scroll);
      setTimeout(function () {
        if (pending !== next) return;
        var old = frames[active];
        next.wrap.classList.add('is-shown');
        old.wrap.classList.remove('is-shown');
        active = 1 - active;
        pending = null;
        if (old.url) { URL.revokeObjectURL(old.url); old.url = null; }
        old.iframe.removeAttribute('src');
      }, 60);
    };
    next.url = url;
    next.iframe.src = url + view.hash;
    fit();
  }

  function readScroll(iframe) {
    try {
      var w = iframe.contentWindow;
      var desk = w.document.querySelector('.desk-scroll');
      return { y: w.scrollY, dx: desk ? desk.scrollLeft : 0, dy: desk ? desk.scrollTop : 0, hash: w.location.hash };
    } catch (e) { return null; }
  }
  function restoreScroll(iframe, s) {
    if (!s || s.hash !== view.hash) return;
    try {
      var w = iframe.contentWindow;
      w.scrollTo(0, s.y);
      var desk = w.document.querySelector('.desk-scroll');
      if (desk) { desk.scrollLeft = s.dx; desk.scrollTop = s.dy; }
    } catch (e) { /* ignore */ }
  }

  /* ---------- Size ---------- */

  /* Desktop is drawn at a real 1440px and scaled down to fit; the phone is shown at its true size. */
  function fit() {
    var width = WIDTHS[view.device];
    var room = stage.clientWidth - 24;
    var scale = Math.min(1, room / width);
    var height = (stage.clientHeight - 24) / scale;
    frames.forEach(function (f) {
      f.iframe.style.width = width + 'px';
      f.iframe.style.height = Math.max(300, height) + 'px';
      f.iframe.style.transform = scale < 1 ? 'scale(' + scale + ')' : '';
      f.wrap.style.width = Math.round(width * scale) + 'px';
      f.wrap.style.height = Math.round(Math.max(300, height) * scale) + 'px';
    });
    stage.classList.toggle('is-phone', view.device === 'phone');
  }
  window.addEventListener('resize', fit, { signal: opts.signal });
  if (window.ResizeObserver) {
    var observer = new ResizeObserver(fit);
    observer.observe(stage);
    if (opts.signal) opts.signal.addEventListener('abort', function () { observer.disconnect(); clearTimeout(view.timer); });
  }

  function setDevice(d) {
    view.device = d;
    deviceBtns.desktop.setAttribute('aria-pressed', d === 'desktop' ? 'true' : 'false');
    deviceBtns.phone.setAttribute('aria-pressed', d === 'phone' ? 'true' : 'false');
    fit();
    refresh(true);
  }

  /* ---------- Navigation ---------- */

  function go(hash) {
    if (!hash || hash === view.hash) return;
    view.hash = hash;
    try {
      var w = frames[active].iframe.contentWindow;
      if (w && w.location.href.indexOf('blob:') === 0) { w.location.hash = hash; return; }
    } catch (e) { /* fall through to a full render */ }
    refresh(true);
  }

  /* ---------- Showing another version (history) ---------- */

  function showVersion(content, text) {
    if (!content && !view.content) return;
    view.content = content;
    bannerEl.hidden = !content;
    bannerEl.textContent = text || '';
    refresh(true);
  }

  return {
    el: root,
    refresh: refresh,
    go: go,
    showVersion: showVersion,
    fit: fit
  };
}
