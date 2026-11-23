/* LoreWire demo: the story popup, the heart of the product. Key art and title, then four tabs:
   Watch (the doodle short, the debate, the "You decide" poll, more like this), Read (the article or
   the gallery), Read-along (the text with a highlight walking word by word) and Comments. */

import { STORIES, LABEL } from './data.js';
import { storyById, moreLike, pollResult, words, wordAt, readSeconds, readMinutes, clock } from './logic.js';
import { h, icon, toast, log } from './dom.js';
import { art, wideCard } from './cards.js';

var TABS = ['watch', 'read', 'readalong', 'comments'];
var TAB_NAMES = { watch: 'WATCH', read: 'READ', readalong: 'READ-ALONG', comments: 'COMMENTS' };

export function createStory(app) {
  var root = null;
  var view = { id: null, tab: 'watch', readMode: 'article', along: null };

  function open(id, tab) {
    view.id = id;
    view.tab = tab || 'watch';
    view.readMode = 'article';
    stopAlong();
    if (!root) {
      root = h('div.modal', { role: 'dialog', 'aria-modal': 'true', onmousedown: function (e) { if (e.target === root) close(); } });
      document.body.appendChild(root);
      document.body.classList.add('is-locked');
    }
    render();
    root.scrollTop = 0;
    requestAnimationFrame(function () { root.classList.add('is-on'); });
    log('story', 'open', { story: id, tab: view.tab });
  }

  function close() {
    if (!root) return;
    stopAlong();
    root.remove();
    root = null;
    document.body.classList.remove('is-locked');
    app.refresh();
    log('story', 'close', {});
  }

  function render() {
    var s = storyById(view.id);
    var saved = app.saved.indexOf(s.id) !== -1;
    root.setAttribute('aria-label', s.title);
    root.replaceChildren(h('div.modal__panel',
      h('button.modal__close', { type: 'button', 'aria-label': 'Close', onclick: close }, icon('x', 20)),
      h('div.sheet-hero',
        h('img', { src: art(s.id, 'wide'), alt: '' }),
        h('div.sheet-hero__shade'),
        h('button.big-play', { type: 'button', 'aria-label': 'Play ' + s.title, onclick: function () { setTab('watch'); playVideo(); } }, icon('play', 30)),
        h('h1.sheet-hero__title', { text: s.title })),
      h('div.sheet-body',
        h('div.sheet-top',
          h('div',
            h('div.meta', h('span', { text: '2026' }), h('span.dur', { text: s.duration }), h('span.pill.pill--label', { text: LABEL }), h('span.pill.pill--cat', { text: s.category })),
            h('p.sheet-line', { text: s.summary })),
          h('div.sheet-actions',
            h('button.btn.btn--light', { type: 'button', onclick: function () { setTab('watch'); playVideo(); } }, icon('play', 16), 'PLAY'),
            h('button.round' + (saved ? '.is-on' : ''), { type: 'button', 'aria-label': saved ? 'Remove from My List' : 'Add to My List', 'aria-pressed': String(saved), 'data-save': '', onclick: function () { app.toggleSaved(s.id); render(); toast(saved ? 'Removed from your list.' : 'Saved to your list.'); } }, icon(saved ? 'check' : 'plus', 18)),
            h('button.round', { type: 'button', 'aria-label': 'Rate', onclick: function () { toast('Ratings sync once you sign in, which isn\'t part of this demo.'); } }, icon('star', 18)),
            h('button.round', { type: 'button', 'aria-label': 'Share', onclick: function () { toast('Sharing isn\'t part of this demo.'); } }, icon('share', 18)))),
        h('div.tabs', { role: 'tablist', 'aria-label': 'Story' }, TABS.map(function (t) {
          var on = view.tab === t;
          var label = t === 'comments' ? 'COMMENTS (' + (app.comments[s.id] || []).length + ')' : TAB_NAMES[t];
          return h('button.tab' + (on ? '.is-on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(on), 'data-tab': t, onclick: function () { setTab(t); }, text: label });
        })),
        view.tab === 'read' ? read(s) : view.tab === 'readalong' ? readAlong(s) : view.tab === 'comments' ? comments(s) : watch(s)),
      app.votes[s.id] ? null : h('button.vote-now', { type: 'button', onclick: toPoll }, 'VOTE NOW', icon('arrowDown', 16))));
  }

  function setTab(t) { stopAlong(); view.tab = t; render(); }

  /* ---------- Watch ---------- */

  function watch(s) {
    return h('div.stack',
      debate(s),
      h('div.player',
        s.video
          ? h('video.player__video', { src: 'media/' + s.id + '/video.mp4', poster: art(s.id, 'poster'), controls: true, playsinline: true, preload: 'metadata', 'aria-label': s.title + ', doodle short' })
          : h('div.player__poster', h('img', { src: art(s.id, 'poster'), alt: s.title }), h('small.mono', { text: 'THIS STORY\'S VIDEO ISN\'T IN THE DEMO. THREE ARE: TRY THE WIRES TAB.' })),
        h('span.player__speed.mono', { text: '1×' })),
      h('small.mono.caption', { text: 'LOREWIRE ORIGINAL · DOODLE SHORT' }),
      h('div.duo',
        h('div.card.card--talk', icon('chat', 22), h('div', h('b', { text: 'START THE CONVERSATION' }), h('p', { text: 'Be the first to share your take on this story.' })),
          h('button.btn.btn--red.btn--sm', { type: 'button', onclick: function () { setTab('comments'); } }, 'WRITE →')),
        h('div.card.card--verdict', h('b', { text: 'YOUR VERDICT' }), h('p', { text: s.poll.question }),
          h('button.btn.btn--light.btn--sm', { type: 'button', onclick: toPoll }, 'CAST YOUR VERDICT', icon('arrowDown', 14)))),
      poll(s),
      h('button.btn.btn--outline.btn--sm.center-self', { type: 'button', onclick: function () { root.scrollTo({ top: 0, behavior: 'smooth' }); } }, icon('arrowUp', 14), 'BACK TO TOP'),
      h('h2.row__title', { text: 'More like this' }),
      h('div.more', moreLike(STORIES, s, 6).map(function (x) { return wideCard(app, x); })));
  }

  function debate(s) {
    return h('div.debate', h('span.debate__dot', { 'aria-hidden': 'true' }),
      h('span', h('small.mono.red', { text: 'TODAY\'S DEBATE' }), h('b', { text: s.poll.question })),
      h('button.btn.btn--redline.btn--sm', { type: 'button', onclick: toPoll }, 'VOTE', icon('arrowDown', 13)));
  }

  /* "You decide": two sides; after a vote, both turn into result bars with the visitor's side marked. */
  function poll(s) {
    var side = app.votes[s.id];
    var r = pollResult(null, side);
    var choice = function (key, label) {
      var mine = side === key;
      return h('button.side' + (side ? '.is-done' : '') + (mine ? '.is-mine' : ''), { type: 'button', 'data-side': key, disabled: side ? true : null, onclick: function () { app.vote(s.id, key); render(); toPoll(); } },
        h('small.mono', { text: 'SIDE ' + key.toUpperCase() }),
        h('b', { text: label.toUpperCase() }),
        side ? h('span.side__bar', h('span', { style: { width: (key === 'a' ? r.pctA : r.pctB) + '%' } })) : null,
        side ? h('span.side__pct.mono', { text: (key === 'a' ? r.pctA : r.pctB) + '%' + (mine ? ' · YOUR VERDICT' : '') }) : null);
    };
    return h('section.poll', { 'data-poll': s.id },
      h('small.mono.red', h('span.debate__dot'), ' YOU DECIDE'),
      h('h2.poll__q', { text: s.poll.question.toUpperCase() }),
      h('div.poll__sides', choice('a', s.poll.a), h('span.vs', { text: 'VS' }), choice('b', s.poll.b)),
      h('small.mono.muted', { text: side ? (r.total === 1 ? 'YOU\'RE THE FIRST TO VOTE. RESULTS UPDATE LIVE AS OTHERS VOTE.' : r.total + ' VOTES') : 'BE ONE OF THE FIRST TO VOTE.' }));
  }

  function toPoll() {
    if (view.tab !== 'watch') setTab('watch');
    var node = root && root.querySelector('[data-poll]');
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function playVideo() {
    var v = root && root.querySelector('.player__video');
    if (v) { v.scrollIntoView({ behavior: 'smooth', block: 'center' }); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    else toPoll();
  }

  /* ---------- Read ---------- */

  function read(s) {
    var mode = function (key, label) {
      return h('button.pill' + (view.readMode === key ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(view.readMode === key), onclick: function () { view.readMode = key; render(); } }, label);
    };
    return h('div.stack',
      h('div.pills', mode('article', 'Article'), mode('gallery', 'Gallery')),
      view.readMode === 'gallery'
        ? h('div.gallery', h('img', { src: art(s.id, 'wide'), alt: s.title }), h('img', { src: art(s.id, 'poster'), alt: s.title + ', poster' }))
        : h('article.article',
            h('small.mono.red', { text: s.category.toUpperCase() + ' · ' + readMinutes(s.article) + ' MIN READ' }),
            h('h2.article__title', { text: s.title }),
            s.article.map(function (p, i) { return h('p' + (i === 0 ? '.dropcap' : ''), { text: p }); }),
            h('p.article__end.mono', { text: LABEL.toUpperCase() })));
  }

  /* ---------- Read-along ---------- */
  /* The highlight walks through the text at an ordinary reading pace. In the real product it follows
     the narration; this demo has no narration track, so it reads silently. */

  function readAlong(s) {
    var list = words(s.article);
    var total = readSeconds(list.length);
    var st = view.along || (view.along = { t: 0, playing: false, timer: null });
    var spans = [];
    var text = h('div.along__text');
    var para = null;
    var lastPara = -1;
    list.forEach(function (w, i) {
      if (w.para !== lastPara) { para = h('p'); text.appendChild(para); lastPara = w.para; }
      var sp = h('span.along__word', { text: w.text });
      spans.push(sp);
      para.appendChild(sp);
      para.appendChild(document.createTextNode(' '));
    });
    var time = h('span.mono.along__time');
    var head = h('span.wave__head');
    var btn = h('button.along__play', { type: 'button', 'aria-label': 'Play the read-along', 'data-along-play': '', onclick: toggle });
    var bars = [];
    for (var i = 0; i < 64; i++) bars.push(h('span.wave__bar', { style: { height: (20 + ((i * 37) % 70)) + '%' } }));
    var wave = h('div.wave', bars, head);
    function paint() {
      var idx = wordAt(st.t, list.length);
      spans.forEach(function (sp, i) { sp.classList.toggle('is-read', i < idx); sp.classList.toggle('is-now', i === idx && st.t > 0); });
      time.textContent = clock(st.t) + ' / ' + clock(total);
      head.style.left = (st.t / total * 100) + '%';
      btn.replaceChildren(icon(st.playing ? 'pause' : 'play', 22));
      btn.setAttribute('aria-label', st.playing ? 'Pause the read-along' : 'Play the read-along');
      /* Keep the word being read in view: scroll only when it nears the bottom of the box. */
      var now = spans[idx];
      if (st.playing && now && now.offsetTop - text.scrollTop > text.clientHeight * 0.7) text.scrollTop = now.offsetTop - text.clientHeight * 0.3;
    }
    function toggle() {
      st.playing = !st.playing;
      clearInterval(st.timer);
      if (st.playing) {
        if (st.t >= total) st.t = 0;
        st.timer = setInterval(function () { st.t = Math.min(total, st.t + 0.1); if (st.t >= total) { st.playing = false; clearInterval(st.timer); } paint(); }, 100);
      }
      paint();
      log('story', 'read-along', { playing: st.playing });
    }
    paint();
    return h('div.stack', h('div.along__bar', btn, wave, time), text, h('small.mono.muted', { text: 'IN THE REAL APP THE HIGHLIGHT FOLLOWS THE NARRATION. HERE IT READS SILENTLY, AT AN EASY PACE.' }));
  }

  function stopAlong() { if (view.along) { clearInterval(view.along.timer); } view.along = null; }

  /* ---------- Comments ---------- */

  function comments(s) {
    var list = app.comments[s.id] || [];
    var name = h('input.input', { type: 'text', placeholder: 'Your name', 'aria-label': 'Your name', maxlength: '40' });
    var body = h('textarea.input', { rows: '3', placeholder: 'Share your take…', 'aria-label': 'Share your take', maxlength: '600' });
    return h('div.stack',
      h('div.row-between', h('b', { text: 'Discussion · ' + list.length }), h('span.mono.muted', { text: 'NEWEST · TOP' })),
      h('form.comment-form', { onsubmit: function (e) {
        e.preventDefault();
        if (!body.value.trim()) { toast('Write something first.'); return; }
        app.comment(s.id, { name: name.value.trim() || 'Guest', text: body.value.trim() });
        toast('Posted. In the real app it\'s checked by moderation first.');
        render();
      } }, name, body, h('div.row-between', h('small.mono.muted', { text: 'BE KIND. SPAM AND HATE GET REMOVED.' }), h('button.btn.btn--red.btn--sm', { type: 'submit' }, 'Post'))),
      list.length ? list.map(function (c) { return h('div.comment', h('b', { text: c.name }), h('small.mono.muted', { text: 'JUST NOW · ONLY YOU SEE IT IN THIS DEMO' }), h('p', { text: c.text })); })
        : h('p.empty', { text: 'No comments yet. Start the conversation.' }));
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root) close(); });

  return { open: open, close: close, isOpen: function () { return !!root; } };
}
