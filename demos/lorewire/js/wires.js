/* LoreWire demo: Wires, the vertical feed. One doodle short at a time (its captions are burned in),
   with an inline A/B poll. Move with the arrows on the right, the arrow keys or the mouse wheel.
   Unvoted shows only what you haven't voted on; the funnel picks categories. */

import { STORIES, CATEGORIES } from './data.js';
import { wires, pollResult, clock } from './logic.js';
import { h, icon, toast, log } from './dom.js';
import { art } from './cards.js';

export function createWires(app) {
  var el = h('section.view.wires', { 'aria-label': 'Wires' });
  var st = { mode: 'unvoted', picked: [], i: 0, muted: true, filter: false, keep: null };
  var video = null;
  var wheelLock = 0;

  /* The wire just voted on stays in the Unvoted feed until you move on, so you see your result. */
  function list() {
    var votes = Object.assign({}, app.votes);
    if (st.keep) delete votes[st.keep];
    return wires(STORIES, votes, st.mode, st.picked);
  }

  function render() {
    var feed = list();
    if (st.i >= feed.length) st.i = Math.max(0, feed.length - 1);
    var s = feed[st.i];
    el.replaceChildren(h('div.wires__stage',
      h('div.wire',
        s ? h('video.wire__video', { src: 'media/' + s.id + '/video.mp4', poster: art(s.id, 'poster'), playsinline: true, loop: true, autoplay: true, muted: st.muted ? true : null, preload: 'auto', 'aria-label': s.title + ', doodle short' })
          : h('div.wire__empty', h('b', { text: 'You voted on every wire.' }), h('p', { text: 'Switch to All to watch them again.' })),
        h('div.wire__top',
          h('div.toggle', { role: 'group', 'aria-label': 'Which wires' },
            h('button' + (st.mode === 'unvoted' ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(st.mode === 'unvoted'), onclick: function () { st.mode = 'unvoted'; st.i = 0; render(); } }, 'UNVOTED'),
            h('button' + (st.mode === 'all' ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(st.mode === 'all'), 'data-wires-all': '', onclick: function () { st.mode = 'all'; render(); } }, 'ALL')),
          h('button.round.round--sm', { type: 'button', 'aria-label': 'Pick categories', 'aria-expanded': String(st.filter), onclick: function () { st.filter = !st.filter; render(); } }, icon('filter', 15))),
        s ? h('span.chip.wire__cat', { text: s.category.toUpperCase() }) : null,
        s ? h('button.wire__sound', { type: 'button', 'data-sound': '', onclick: function () { st.muted = !st.muted; if (video) video.muted = st.muted; render(); } }, icon(st.muted ? 'mute' : 'sound', 14), st.muted ? 'Tap for sound' : 'Sound on') : null,
        s ? h('span.wire__mark', { text: '@lorewire' }) : null,
        s ? h('span.wire__time.mono', { 'data-wire-time': '', text: '0:00 / ' + s.duration }) : null,
        h('span.wire__progress', h('span', { 'data-wire-progress': '' })),
        st.filter ? filterPop() : null),
      s ? h('div.wire__under',
        h('div.wire__head',
        h('b.wire__title', { text: s.title, title: s.title }),
        h('span.wire__icons',
          h('button.icon-btn', { type: 'button', 'aria-label': 'Next wire', onclick: function () { move(1); } }, icon('next', 18)),
          h('button.icon-btn' + (app.liked.indexOf(s.id) !== -1 ? '.is-red' : ''), { type: 'button', 'aria-label': 'Like', onclick: function () { app.toggleLiked(s.id); render(); } }, icon('heart', 18)),
          h('button.icon-btn' + (app.saved.indexOf(s.id) !== -1 ? '.is-red' : ''), { type: 'button', 'aria-label': 'Save', onclick: function () { app.toggleSaved(s.id); render(); } }, icon('bookmark', 18)),
          h('button.icon-btn', { type: 'button', 'aria-label': 'Share', onclick: function () { toast('Sharing isn\'t part of this demo.'); } }, icon('share', 18)),
          h('button.icon-btn', { type: 'button', 'aria-label': 'Open the story', onclick: function () { app.openStory(s.id); } }, icon('expand', 18)))),
        miniPoll(s)) : null,
      h('div.wires__nav',
        h('button.round', { type: 'button', 'aria-label': 'Previous wire', 'data-wire-prev': '', disabled: st.i === 0 ? true : null, onclick: function () { move(-1); } }, icon('up', 20)),
        h('button.round', { type: 'button', 'aria-label': 'Next wire', 'data-wire-next': '', disabled: st.i >= feed.length - 1 ? true : null, onclick: function () { move(1); } }, icon('down', 20)))));
    video = el.querySelector('.wire__video');
    if (video) {
      video.addEventListener('timeupdate', paintTime);
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }
  }

  function paintTime() {
    if (!video || !video.duration) return;
    var t = el.querySelector('[data-wire-time]');
    var bar = el.querySelector('[data-wire-progress]');
    if (t) t.textContent = clock(video.currentTime) + ' / ' + clock(video.duration);
    if (bar) bar.style.width = (video.currentTime / video.duration * 100) + '%';
  }

  function miniPoll(s) {
    var side = app.votes[s.id];
    var r = pollResult(null, side);
    var opt = function (key, label) {
      return h('button.mini__opt.mini__opt--' + key + (side === key ? '.is-mine' : ''), { type: 'button', 'data-mini': key, disabled: side ? true : null, onclick: function () { st.keep = s.id; app.vote(s.id, key); log('wires', 'vote', { story: s.id, side: key }); render(); } },
        h('small.mono', { text: key.toUpperCase() }), h('b', { text: label.toUpperCase() }), side ? h('small.mono', { text: (key === 'a' ? r.pctA : r.pctB) + '%' }) : null);
    };
    return h('div.mini', h('b.mini__q', { text: s.poll.question.toUpperCase() }), h('div.mini__opts', opt('a', s.poll.a), opt('b', s.poll.b)),
      h('small.mono.muted', { text: side ? 'YOUR VERDICT IS IN. SWIPE ON FOR THE NEXT ONE.' : 'BE ONE OF THE FIRST TO VOTE.' }));
  }

  function filterPop() {
    return h('div.pop', { role: 'dialog', 'aria-label': 'Categories' },
      h('b.mono', { text: 'CATEGORIES' }),
      h('p', { text: 'Show only wires in the categories you pick.' }),
      h('div.pop__chips', CATEGORIES.map(function (c) {
        var on = st.picked.indexOf(c.name) !== -1;
        return h('button.chip.chip--pick' + (on ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(on), onclick: function () {
          if (on) st.picked.splice(st.picked.indexOf(c.name), 1); else st.picked.push(c.name);
          st.i = 0; render();
        } }, c.mark + ' ' + c.name.toUpperCase());
      })),
      st.picked.length ? h('button.btn.btn--outline.btn--sm', { type: 'button', onclick: function () { st.picked = []; render(); } }, 'CLEAR') : null);
  }

  function move(d) {
    var feed = list();
    var next = Math.max(0, Math.min(feed.length - 1, st.i + d));
    if (next === st.i) return;
    var target = feed[next].id;
    st.keep = null;
    var after = list();
    st.i = Math.max(0, after.map(function (x) { return x.id; }).indexOf(target));
    log('wires', 'move', { index: st.i });
    render();
  }

  el.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaY) < 20 || Date.now() < wheelLock) return;
    wheelLock = Date.now() + 700;
    move(e.deltaY > 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('keydown', function (e) {
    if (app.view !== 'wires' || app.modalOpen()) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  });

  return {
    el: el,
    show: function () { render(); },
    /* Leaving the feed counts as moving on: the wire you just voted on leaves Unvoted. */
    hide: function () { if (video) video.pause(); st.keep = null; },
    render: render
  };
}
