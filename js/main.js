/* Yoav Mizrahi — portfolio. Plain JavaScript, no build step. */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function youtubeEmbed(id) {
    var f = document.createElement('iframe');
    f.className = 'embed';
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
    f.title = 'Film player';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    return f;
  }
  function placeholderPlayer() {
    var d = document.createElement('div');
    d.className = 'placeholder-player';
    d.textContent = '[ ADD THE YOUTUBE ID IN index.html — THE FILM PLAYS HERE ]';
    return d;
  }

  /* ---------- Split headings into letters ---------- */
  $$('[data-split]').forEach(function (el) {
    var text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    var i = 0;
    text.split(' ').forEach(function (word, w) {
      if (w > 0) { el.appendChild(document.createTextNode(' ')); i++; }
      var wrap = document.createElement('span');
      wrap.className = 'word';
      wrap.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (ch) {
        var s = document.createElement('span');
        s.className = 'ltr';
        s.style.animationDelay = (150 + i * 35) + 'ms';
        s.textContent = ch;
        wrap.appendChild(s);
        i++;
      });
      el.appendChild(wrap);
    });
  });

  /* ---------- Router + page wipe ---------- */
  var routes = {
    '/': { page: 'home', label: 'The desk', name: 'THE DESK' },
    '/work': { page: 'work', label: 'Work', name: 'WORK' },
    '/work/uploader': { page: 'uploader', label: 'Mega Uploader', name: 'WORK / MEGA UPLOADER' },
    '/work/toto': { page: 'toto', label: 'Toto Mundial', name: 'WORK / TOTO MUNDIAL' },
    '/work/memesh': { page: 'memesh', label: 'Memesh', name: 'WORK / MEMESH' },
    '/films': { page: 'films', label: 'Films', name: 'FILMS' },
    '/about': { page: 'about', label: 'About', name: 'ABOUT' }
  };
  var wipe = $('[data-wipe]');
  var wipeLabel = $('[data-wipe-label]');
  var pageName = $('[data-page-name]');
  var current = null;
  var busy = false;

  function routeFromHash() {
    var h = (location.hash || '#/').replace(/^#/, '');
    return routes[h] ? h : '/';
  }

  function show(path) {
    var r = routes[path];
    $$('.page').forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-page') === r.page); });
    document.body.setAttribute('data-page', r.page);
    document.body.setAttribute('data-theme', r.page === 'films' ? 'dark' : 'light');
    pageName.textContent = r.name;
    document.title = (r.page === 'home' ? 'Yoav Mizrahi — Products & films, built with AI' : r.label + ' — Yoav Mizrahi');
    window.scrollTo(0, 0);
    onPageLeave(current);
    current = r.page;
  }

  function navigate() {
    var path = routeFromHash();
    var r = routes[path];
    closeMenu();
    if (current === null || reduceMotion) { show(path); return; }
    if (r.page === current || busy) { if (!busy) show(path); return; }
    busy = true;
    setCursor('dot');
    wipeLabel.textContent = r.label;
    wipe.classList.remove('is-reveal');
    void wipe.offsetWidth;
    wipe.classList.add('is-cover');
    setTimeout(function () {
      show(path);
      wipe.classList.remove('is-cover');
      wipe.classList.add('is-reveal');
      setTimeout(function () {
        wipe.style.transition = 'none';
        wipe.classList.remove('is-reveal');
        void wipe.offsetWidth;
        wipe.style.transition = '';
        busy = false;
        if (routeFromHash() !== path) navigate();
      }, 700);
    }, 650);
  }
  window.addEventListener('hashchange', navigate);

  /* ---------- Menu ---------- */
  var menu = $('#menu');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    $$('[data-menu-toggle]').forEach(function (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
  }
  function closeMenu() { setMenu(false); }
  $$('[data-menu-toggle]').forEach(function (b) {
    b.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) closeMenu(); });

  /* ---------- Custom cursor (fine pointers only) ---------- */
  var cursor = $('[data-cursor-el]');
  var cursorText = $('[data-cursor-text]');
  var dragging = null;
  function setCursor(mode) {
    if (mode === 'dot') { cursor.classList.remove('is-big'); return; }
    cursorText.textContent = mode === 'drag' ? 'DRAG' : 'VIEW';
    cursor.classList.add('is-big');
  }
  if (window.matchMedia('(pointer: fine)').matches) {
    document.documentElement.classList.add('has-cursor');
    var cx = -100, cy = -100, tx = -100, ty = -100;
    window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() {
      cx += (tx - cx) * 0.35; cy += (ty - cy) * 0.35;
      cursor.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', function (e) {
      if (dragging) return;
      var el = e.target.closest('[data-cursor]');
      if (!el || e.target.closest('button, a:not([data-cursor])')) { setCursor('dot'); return; }
      setCursor(el.getAttribute('data-cursor'));
    });
  }

  /* ---------- Uploader demo (all instances share state) ---------- */
  var up = { files: [], running: false, timer: null };
  var upNames = ['launch-video.mp4', 'cover-image.png', 'captions.srt'];
  function renderUploader() {
    var total = up.files.length ? Math.round(up.files.reduce(function (a, f) { return a + f.pct; }, 0) / up.files.length) : 0;
    $$('[data-upload-total]').forEach(function (el) { el.textContent = total + '%'; });
    $$('[data-upload-led]').forEach(function (el) { el.classList.toggle('is-on', up.running); });
    $$('[data-widget="uploader"]').forEach(function (root) {
      var html = '';
      if (!up.files.length) {
        html = '<button class="btn u-btn" type="button" data-u-start>UPLOAD 3 SAMPLE FILES</button>';
      } else {
        up.files.forEach(function (f) {
          html += '<div class="u-file"><div class="u-file__row"><span>' + f.name + '</span><span>' + f.pct + '%</span></div>' +
                  '<div class="u-bar"><span style="width:' + f.pct + '%"></span></div></div>';
        });
        if (!up.running) html += '<button class="btn u-btn u-btn--ghost" type="button" data-u-reset>DONE · RUN AGAIN</button>';
      }
      root.innerHTML = html;
    });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-u-start]')) {
      clearInterval(up.timer);
      up.files = upNames.map(function (n) { return { name: n, pct: 0 }; });
      up.running = true;
      renderUploader();
      up.timer = setInterval(function () {
        up.files.forEach(function (f) { f.pct = Math.min(100, f.pct + Math.ceil(Math.random() * 11)); });
        if (up.files.every(function (f) { return f.pct >= 100; })) { up.running = false; clearInterval(up.timer); }
        renderUploader();
      }, 140);
    } else if (e.target.closest('[data-u-reset]')) {
      clearInterval(up.timer); up.files = []; up.running = false; renderUploader();
    }
  });
  renderUploader();

  /* ---------- Toto demo (shared state) ---------- */
  var toto = { home: 2, away: 1, locked: false };
  function renderToto() {
    var score = toto.home + '–' + toto.away;
    $$('[data-widget="toto"]').forEach(function (root) {
      root.innerHTML =
        '<div class="toto__match"><span class="label label--dark">DEMO MATCH</span>' +
        '<div class="toto__teams"><span>Brazil</span><span class="toto__score">' + score + '</span><span>Argentina</span></div>' +
        '<div class="toto__controls">' +
          '<div class="toto__pair"><button class="btn round" type="button" data-t="home:-1" aria-label="Brazil score down">−</button><button class="btn round" type="button" data-t="home:1" aria-label="Brazil score up">+</button></div>' +
          '<div class="toto__pair"><button class="btn round" type="button" data-t="away:-1" aria-label="Argentina score down">−</button><button class="btn round" type="button" data-t="away:1" aria-label="Argentina score up">+</button></div>' +
        '</div></div>' +
        (toto.locked
          ? '<button class="btn toto__lock is-locked" type="button" data-t="unlock">Locked ✓ ' + score + ' · change</button>'
          : '<button class="btn toto__lock" type="button" data-t="lock">Lock in prediction</button>');
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]');
    if (!b) return;
    var a = b.getAttribute('data-t');
    if (a === 'lock') toto.locked = true;
    else if (a === 'unlock') toto.locked = false;
    else if (!toto.locked) {
      var p = a.split(':');
      toto[p[0]] = Math.max(0, Math.min(9, toto[p[0]] + parseInt(p[1], 10)));
    }
    renderToto();
  });
  renderToto();

  /* ---------- The desk: dragging, tapes, monitor ---------- */
  var desk = $('[data-desk]');
  var objs = $$('.obj', desk);
  var monitorObj = $('[data-obj="monitor"]', desk);
  var screen = $('[data-monitor]');
  var monitorPlayer = $('[data-monitor-player]');
  var ejectBtn = $('[data-eject]');
  var power = $('[data-power]');
  var z = objs.length + 1;
  var tapeIn = null;

  function homePos(o) { return { x: +o.getAttribute('data-x'), y: +o.getAttribute('data-y'), r: +o.getAttribute('data-r') }; }
  function place(o, x, y) { o.style.left = x + 'px'; o.style.top = y + 'px'; }
  function rest(o) { o.style.transform = 'rotate(' + homePos(o).r + 'deg)'; }
  objs.forEach(function (o, i) { var h = homePos(o); place(o, h.x, h.y); rest(o); o.style.zIndex = i + 1; });

  objs.forEach(function (o) {
    o.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || e.target.closest('button, a')) return;
      o.setPointerCapture(e.pointerId);
      dragging = { o: o, sx: e.clientX, sy: e.clientY, ox: parseFloat(o.style.left), oy: parseFloat(o.style.top) };
      o.style.zIndex = ++z;
      o.classList.add('is-dragging');
      o.style.transform = 'rotate(0deg) scale(1.04)';
    });
    o.addEventListener('pointermove', function (e) {
      if (!dragging || dragging.o !== o) return;
      place(o, dragging.ox + e.clientX - dragging.sx, dragging.oy + e.clientY - dragging.sy);
    });
    function end() {
      if (!dragging || dragging.o !== o) return;
      dragging = null;
      o.classList.remove('is-dragging');
      rest(o);
      if (o.hasAttribute('data-tape')) {
        var t = o.getBoundingClientRect(), m = monitorObj.getBoundingClientRect();
        var cx = t.left + t.width / 2, cy = t.top + t.height / 2;
        if (cx > m.left && cx < m.right && cy > m.top && cy < m.bottom) insertTape(o);
      }
    }
    o.addEventListener('pointerup', end);
    o.addEventListener('pointercancel', end);
  });

  function setScreen(state) { screen.setAttribute('data-state', state); }
  function insertTape(tape) {
    if (tapeIn && tapeIn !== tape) returnTape(tapeIn);
    tapeIn = tape;
    tape.classList.add('is-inserted');
    $('[data-monitor-title]').textContent = tape.getAttribute('data-title');
    $('[data-monitor-part]').textContent = tape.getAttribute('data-part');
    monitorPlayer.innerHTML = '';
    var idle = $('.monitor__idle', screen);
    idle.classList.remove('tv-on'); void idle.offsetWidth; idle.classList.add('tv-on');
    setScreen('idle');
    ejectBtn.classList.add('is-visible');
    power.classList.add('is-on');
  }
  function returnTape(tape) {
    var h = homePos(tape);
    tape.classList.remove('is-inserted');
    place(tape, h.x, h.y);
    rest(tape);
  }
  function eject() {
    if (!tapeIn) return;
    returnTape(tapeIn);
    tapeIn = null;
    monitorPlayer.innerHTML = '';
    setScreen('empty');
    ejectBtn.classList.remove('is-visible');
    power.classList.remove('is-on');
  }
  $$('[data-insert]', desk).forEach(function (b) {
    b.addEventListener('click', function () { insertTape(b.closest('.obj')); });
  });
  ejectBtn.addEventListener('click', eject);
  $('[data-monitor-play]').addEventListener('click', function () {
    if (!tapeIn) return;
    var id = tapeIn.getAttribute('data-youtube');
    monitorPlayer.innerHTML = '';
    monitorPlayer.appendChild(id ? youtubeEmbed(id) : placeholderPlayer());
    setScreen('playing');
  });

  /* ---------- Films: the reel ---------- */
  var clips = $$('[data-clip]');
  var ruler = $('[data-scrub]');
  var playhead = $('[data-playhead]');
  var scene = $('[data-reel-scene]');
  var reelPlayer = $('[data-reel-player]');
  var toggleBtn = $('[data-reel-toggle]');
  var reel = { pos: 0, idx: -1, timer: null };
  var REEL_SECONDS = 150;

  for (var i = 0; i <= 30; i++) {
    var tick = document.createElement('span');
    tick.style.left = (i / 30 * 100) + '%';
    if (i % 6 === 0) tick.className = 'major';
    ruler.appendChild(tick);
  }
  clips.forEach(function (c) {
    var s = +c.getAttribute('data-start'), e = +c.getAttribute('data-end');
    c.style.left = 'calc(' + (s * 100) + '% + 2px)';
    c.style.width = 'calc(' + ((e - s) * 100) + '% - 4px)';
    c.addEventListener('click', function () { reelStop(); reelGo(clips.indexOf(c)); });
  });

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clipAt(p) {
    for (var k = 0; k < clips.length; k++) if (p < +clips[k].getAttribute('data-end')) return k;
    return clips.length - 1;
  }
  function renderReel() {
    var secs = reel.pos * REEL_SECONDS;
    $('[data-timecode]').textContent = '00:' + pad(Math.floor(secs / 60)) + ':' + pad(Math.floor(secs % 60)) + ':' + pad(Math.floor((secs % 1) * 24));
    playhead.style.left = (reel.pos * 100) + '%';
    var idx = clipAt(Math.min(reel.pos, 0.9999));
    if (idx !== reel.idx) {
      reel.idx = idx;
      var c = clips[idx];
      clips.forEach(function (x, k) { x.classList.toggle('is-active', k === idx); x.setAttribute('aria-pressed', k === idx ? 'true' : 'false'); });
      $('[data-reel-presents]').textContent = c.getAttribute('data-presents');
      $('[data-reel-title]').textContent = c.getAttribute('data-title');
      $('[data-reel-part]').textContent = c.getAttribute('data-part');
      $('[data-reel-file]').textContent = c.getAttribute('data-file');
      $('[data-reel-label]').textContent = c.getAttribute('data-label') + ' · ' + c.getAttribute('data-meta');
      scene.classList.remove('is-playing', 'scene-in');
      scene.classList.toggle('is-soon', c.hasAttribute('data-soon'));
      reelPlayer.innerHTML = '';
      void scene.offsetWidth;
      scene.classList.add('scene-in');
    }
  }
  function reelGo(k) {
    k = Math.max(0, Math.min(clips.length - 1, k));
    playhead.classList.remove('is-running');
    reel.pos = +clips[k].getAttribute('data-start');
    reel.idx = -1;
    renderReel();
  }
  function reelStop() {
    clearInterval(reel.timer); reel.timer = null;
    toggleBtn.classList.remove('is-playing');
    toggleBtn.setAttribute('aria-label', 'Play reel');
  }
  function reelPlay() {
    if (reel.pos >= 0.999) reelGo(0);
    scene.classList.remove('is-playing');
    reelPlayer.innerHTML = '';
    playhead.classList.add('is-running');
    toggleBtn.classList.add('is-playing');
    toggleBtn.setAttribute('aria-label', 'Pause reel');
    reel.timer = setInterval(function () {
      reel.pos += 0.1 / 30;
      if (reel.pos >= 1) { reel.pos = 1; reelStop(); }
      renderReel();
    }, 100);
  }
  toggleBtn.addEventListener('click', function () { if (reel.timer) reelStop(); else reelPlay(); });
  $('[data-reel-prev]').addEventListener('click', function () { reelStop(); reelGo(reel.idx - 1); });
  $('[data-reel-next]').addEventListener('click', function () { reelStop(); reelGo(reel.idx + 1); });
  ruler.addEventListener('click', function (e) {
    var r = ruler.getBoundingClientRect();
    reelStop();
    playhead.classList.remove('is-running');
    reel.pos = Math.max(0, Math.min(0.999, (e.clientX - r.left) / r.width));
    renderReel();
  });
  $('[data-reel-filmplay]').addEventListener('click', function () {
    reelStop();
    var id = clips[reel.idx].getAttribute('data-youtube');
    reelPlayer.innerHTML = '';
    reelPlayer.appendChild(id ? youtubeEmbed(id) : placeholderPlayer());
    scene.classList.add('is-playing');
  });
  renderReel();

  /* Stop anything playing when leaving a page. */
  function onPageLeave(page) {
    if (page === 'films') { reelStop(); reelPlayer.innerHTML = ''; scene.classList.remove('is-playing'); }
    if (page === 'home' && screen.getAttribute('data-state') === 'playing') { monitorPlayer.innerHTML = ''; setScreen('idle'); }
  }

  /* ---------- Start ---------- */
  navigate();
})();
