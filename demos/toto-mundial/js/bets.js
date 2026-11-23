/* Toto Mundial demo: Bets. Five kinds of prediction behind pill tabs. Match picks are the heart of
   it: + and - set a score, it saves by itself after a short pause, and undo is one tap away.
   Tournament bets open a searchable player picker and show what a right answer is worth. */

import { UPCOMING, PAST, TOURNAMENT, PLAYERS, SCORING } from './data.js';
import { at, lockAt, isOpen, matchPoints, randomScore, clampGoal, standings, myRow, scenarios, playerById, searchPlayers } from './logic.js';
import { t, num, team, score, towards, relativeDay, dayHeading, shortDateTime } from './i18n.js';
import { h, icon, toast, sheet, closeSheet, log } from './dom.js';
import { flag } from './flags.js';
import { teamLine, pill, pointsChip, countdownEl, paintCountdowns } from './parts.js';

var CATS = ['matches', 'tournament', 'groups', 'live', 'duels'];
var NOT_HERE = { groups: 'page.groups', live: 'page.liveBets', duels: 'page.duels' };
var DEBOUNCE = 600;
var SAVING = 450;

export function createBets(app) {
  var el = h('section.screen.bets');
  var view = { cat: 'matches', time: 'upcoming' };
  var saves = {};
  var saved = {};
  UPCOMING.forEach(function (m) { saved[m.id] = app.picks[m.id]; saves[m.id] = { state: app.picks[m.id] ? 'saved' : 'none' }; });

  function show(opts) {
    if (opts.cat) view.cat = opts.cat;
    if (opts.time) view.time = opts.time;
    render();
    if (opts.focus) {
      var row = el.querySelector('[data-match="' + opts.focus + '"]');
      if (row) { row.scrollIntoView({ block: 'center' }); row.classList.add('is-flash'); setTimeout(function () { row.classList.remove('is-flash'); }, 1600); }
    }
  }

  function render() {
    el.setAttribute('aria-label', t('bets.title'));
    el.replaceChildren(h('div.page',
      h('h1.h-hero', { text: t('bets.title') }),
      h('div.pills', { role: 'tablist', 'aria-label': t('bets.title') }, CATS.map(function (c) {
        return pillTab(t('cat.' + c), view.cat === c, function () { view.cat = c; log('bets', 'category', { cat: c }); render(); }, 'cat-' + c);
      })),
      view.cat === 'matches' ? h('div.pills.pills--time', { role: 'tablist', 'aria-label': t('cat.matches') },
        pillTab(t('time.upcoming'), view.time === 'upcoming', function () { view.time = 'upcoming'; render(); }, 'time-upcoming', 'mint'),
        pillTab(t('time.past'), view.time === 'past', function () { view.time = 'past'; render(); }, 'time-past', 'mint')) : null,
      view.cat === 'matches' ? (view.time === 'upcoming' ? upcoming() : past()) : view.cat === 'tournament' ? tournament() : notHere(view.cat)));
    tick();
  }

  function pillTab(label, on, run, id, tone) {
    return h('button.pill-tab' + (on ? '.is-on' : '') + (tone ? '.pill-tab--' + tone : ''), { type: 'button', role: 'tab', 'aria-selected': String(on), 'data-tab-id': id, onclick: run, text: label });
  }

  /* ---------- Match picks: upcoming ---------- */

  function upcoming() {
    var now = app.now();
    var open = UPCOMING.filter(function (m) { return isOpen(m, now); });
    var days = [];
    open.forEach(function (m) { if (days.indexOf(m.day) === -1) days.push(m.day); });
    return h('div',
      h('h2.h-md', icon('bets', 22, 'ic--brand'), h('span', { text: t('picks.title') })),
      h('p.sub', { text: t('picks.sub') }),
      legend(),
      open.length ? days.map(function (d) {
        return h('div.day',
          h('h3.day__head', icon('calendar', 16, 'ic--gold'), h('span', { text: dayTitle(d) })),
          open.filter(function (m) { return m.day === d; }).map(pickRow));
      }) : h('div.card.empty', { text: t('picks.empty') }),
      h('p.hint', h('span', { text: t('picks.hint') + ' ' }), h('button.link-btn.link-btn--strong', { type: 'button', onclick: function () { view.cat = 'tournament'; render(); }, text: t('picks.hintLink') })));
  }

  /* "Today · Sunday, 28 June" for today and tomorrow, the date alone otherwise. */
  function dayTitle(d) {
    var date = at(d, '12:00');
    return d === 0 || d === 1 ? relativeDay(d, date) + ' · ' + dayHeading(date) : dayHeading(date);
  }

  function legend() {
    var chip = function (label, n) { return h('span.legend__chip', h('span', { text: label }), h('b.num', { text: n > 0 ? '+' + n : '0' })); };
    return h('div.legend', h('b', { text: t('legend.title') }),
      chip(t('legend.exact'), SCORING.exact), chip(t('legend.direction'), SCORING.direction), chip(t('legend.advances'), SCORING.advances), chip(t('legend.wrong'), SCORING.wrong));
  }

  function pickRow(m) {
    var pick = app.picks[m.id];
    var s = saves[m.id];
    var shown = pick || [0, 0];
    var stepper = function (side) {
      var name = team(side ? m.away : m.home);
      return h('div.stepper' + (pick ? '' : '.is-empty'),
        h('button.stepper__btn', { type: 'button', 'aria-label': t('goalsDown', { team: name }), 'data-step': side + ':-1', disabled: !pick || shown[side] === 0 ? true : null, onclick: function () { step(m, side, -1); } }, icon('minus', 18)),
        h('b.stepper__num.num', { 'aria-live': 'polite', 'aria-label': name + ' ' + shown[side], text: String(shown[side]) }),
        h('button.stepper__btn', { type: 'button', 'aria-label': t('goalsUp', { team: name }), 'data-step': side + ':1', disabled: shown[side] >= 9 ? true : null, onclick: function () { step(m, side, 1); } }, icon('plus', 18)));
    };
    return h('div.card.pick', { 'data-match': m.id },
      h('div.pick__top',
        teamLine(m.home), h('span.muted.pick__vs', { text: t('vs') }), teamLine(m.away, { end: true }),
        h('span.pick__time.num', { text: m.time })),
      h('div.pick__row',
        stepper(0), h('span.pick__colon', { text: ':' }), stepper(1),
        h('button.icon-btn.dice', { type: 'button', 'aria-label': t('surprise'), title: t('surprise'), 'data-dice': '', onclick: function () { set(m, randomScore(Math.random), 'dice'); } }, icon('dice', 22))),
      h('div.pick__foot',
        countdownEl(lockAt(m), 'locksIn'),
        status(m, s)));
  }

  function status(m, s) {
    var wrap = h('span.save' + '.save--' + s.state, { 'data-save': '', role: 'status' });
    if (s.state === 'saving' || s.state === 'pending') wrap.append(h('span.spinner', { 'aria-hidden': 'true' }), h('span', { text: t('status.saving') }));
    else if (s.state === 'saved') {
      wrap.append(icon('check', 16), h('span', { text: t('status.saved', { score: score(saved[m.id]) }) }));
      if (s.undoTo !== undefined) wrap.append(h('button.link-btn.undo', { type: 'button', 'data-undo': '', onclick: function () { undo(m); } }, icon('undo', 14), h('span', { text: t('status.undo') })));
    } else if (s.state === 'removed') wrap.append(h('span.muted', { text: t('status.removed') }));
    else wrap.append(h('span.muted', { text: t('status.none') }));
    return wrap;
  }

  function step(m, side, delta) {
    var next = (app.picks[m.id] || [0, 0]).slice();
    next[side] = clampGoal(next[side] + delta);
    set(m, next, 'step');
  }

  /* Every change waits a moment, then saves. The first change after a save remembers what to undo to. */
  function set(m, pick, how) {
    if (!isOpen(m, app.now())) { toast(t('picks.empty')); render(); return; }
    var s = saves[m.id];
    if (s.state !== 'pending' && s.state !== 'saving') s.undoTo = saved[m.id];
    app.picks[m.id] = pick;
    s.state = 'pending';
    clearTimeout(s.timer);
    s.timer = setTimeout(function () {
      s.state = 'saving';
      paintRow(m);
      s.timer = setTimeout(function () {
        saved[m.id] = app.picks[m.id].slice();
        s.state = 'saved';
        paintRow(m);
        log('bets', 'pick saved', { match: m.id, pick: score(saved[m.id]), how: how });
      }, SAVING);
    }, DEBOUNCE);
    paintRow(m);
  }

  function undo(m) {
    var s = saves[m.id];
    clearTimeout(s.timer);
    var to = s.undoTo;
    delete s.undoTo;
    app.picks[m.id] = to ? to.slice() : null;
    saved[m.id] = app.picks[m.id];
    s.state = to ? 'saved' : 'removed';
    paintRow(m);
    log('bets', 'undo', { match: m.id, to: to ? score(to) : null });
  }

  function paintRow(m) {
    var old = el.querySelector('[data-match="' + m.id + '"]');
    if (!old) return;
    var focused = document.activeElement && old.contains(document.activeElement) ? document.activeElement.getAttribute('data-step') || (document.activeElement.hasAttribute('data-dice') ? 'dice' : null) : null;
    var row = pickRow(m);
    old.replaceWith(row);
    paintCountdowns(row, app.now());
    if (focused) {
      var again = focused === 'dice' ? row.querySelector('[data-dice]') : row.querySelector('[data-step="' + focused + '"]');
      if (again && !again.disabled) again.focus();
    }
  }

  /* ---------- Match picks: past ---------- */

  function past() {
    var days = [];
    PAST.forEach(function (m) { if (days.indexOf(m.day) === -1) days.push(m.day); });
    return h('div',
      h('h2.h-md', icon('history', 22, 'ic--brand'), h('span', { text: t('past.title') })),
      h('p.sub', { text: t('past.sub') }),
      days.map(function (d) {
        return h('div.day',
          h('h3.day__head', icon('calendar', 16, 'ic--gold'), h('span', { text: dayTitle(d) })),
          PAST.filter(function (m) { return m.day === d; }).map(pastCard));
      }));
  }

  function pastCard(m) {
    var res = matchPoints(m.pick, m.score, m);
    var base = res.points - (res.advances ? SCORING.advances : 0);
    return h('div.card.past', { 'data-past': m.id },
      h('div.past__top', pill(t('past.final'), 'grey'), pill(t('stage.' + m.stage), 'green'), h('small.past__when.muted.num', { text: shortDateTime(at(m.day, m.time)) })),
      h('div.past__teams',
        teamLine(m.home), h('b.past__score.num', { text: score(m.score) }), teamLine(m.away, { end: true })),
      h('div.past__foot',
        h('div.past__cell', h('small', { text: t('past.myPick') }), h('b.num', { text: m.pick ? score(m.pick) : '–' })),
        h('div.past__cell', h('small', { text: t('past.points') }), pointsChip(base, res.kind), h('small.muted', { text: t('kind.' + res.kind) }))),
      m.advances ? h('div.past__adv',
        h('small', { text: t('past.advances') }),
        teamLine(m.pickAdvances, { size: 20 }),
        pointsChip(res.advances ? SCORING.advances : 0, res.advances ? 'exact' : 'wrong')) : null);
  }

  /* ---------- Tournament bets ---------- */

  function tournament() {
    return h('div',
      h('h2.h-md', icon('trophy', 22, 'ic--brand'), h('span', { text: t('tour.title') })),
      h('p.sub', { text: t('tour.sub') }),
      h('button.btn-green', { type: 'button', 'data-tour-surprise': '', onclick: surpriseTournament }, icon('dice', 18), h('span', { text: t('tour.surprise') })),
      TOURNAMENT.map(tourCard));
  }

  function tourCard(q) {
    var pickId = app.tour[q.id];
    var closes = at(q.closes.day, q.closes.time);
    var bank = myRow(standings('bank', app.extra())).value;
    var choice = q.kind === 'team'
      ? h('div.answer.is-locked', flag(pickId, 26), h('span.answer__txt', h('b', { text: team(pickId) })), icon('lock', 16))
      : answerPill(q, playerById(pickId));
    var payout = q.kind === 'team' ? q.payout : pickId ? playerById(pickId).payout : 0;
    var sc = pickId ? scenarios(bank, payout) : null;
    return h('div.card.tour' + (q.locked ? '.is-locked' : ''), { 'data-question': q.id },
      h('b.tour__q', { text: t('q.' + q.id) }),
      h('div.tour__meta',
        q.locked ? pill(t('tour.closed'), 'grey') : null,
        h('small.muted', icon('lock', 13), h('span', { text: ' ' + t('tour.closes', { date: shortDateTime(closes) }) })),
        q.locked ? h('small.tour__locked', icon('lock', 13), h('span', { text: ' ' + t('tour.locked') })) : null),
      q.id === 'ball' ? h('p.info', icon('info', 15), h('span', { text: t('q.ballInfo') })) : null,
      choice,
      sc && !q.locked ? h('div.scen',
        h('div.scen__head', h('b', { text: t('tour.scenarios') }), h('span.muted.num', { text: t('tour.now') + ' ' + num(sc.now) })),
        h('div.scen__row.scen__row--right', icon('check', 15), h('span', { text: t('tour.ifRight') }), h('b.num', { text: '+' + sc.payout }), h('span.num', { text: towards(num(sc.ifRight)) })),
        h('div.scen__row', icon('undo', 15), h('span', { text: t('tour.ifWrong') }), h('b.num', { text: '0' }), h('span.num', { text: towards(num(sc.ifWrong)) }))) : null,
      !q.locked ? h('div.tour__foot', h('small.muted', { text: t('tour.free') }),
        pickId ? h('span.saved-chip', { 'data-tour-saved': '' }, icon('check', 14), h('span', { text: t('tour.saved') })) : h('small.muted', { text: t('tour.notPicked') })) : null);
  }

  function answerPill(q, player) {
    if (!player) {
      return h('button.answer.answer--empty', { type: 'button', 'data-answer': q.id, onclick: function () { openPicker(q); } },
        icon('user', 18), h('span.answer__txt', h('b', { text: t('tour.choosePlayer') })), icon('down', 18));
    }
    var inner = [h('span.code-chip', { text: player.team }), h('span.answer__txt', h('b', { text: player.name }), h('small', { text: team(player.team) + ' · ' + t('pos.' + player.pos) }))];
    return q.locked
      ? h('div.answer.is-locked', inner, icon('lock', 16))
      : h('button.answer', { type: 'button', 'data-answer': q.id, onclick: function () { openPicker(q); } }, inner, icon('down', 18));
  }

  function openPicker(q) {
    var list = h('div.picker__list', { role: 'listbox', 'aria-label': t('picker.title') });
    var input = h('input.picker__search', { type: 'search', placeholder: t('picker.search'), 'aria-label': t('picker.search'), autocomplete: 'off', oninput: function () { paint(); } });
    function paint() {
      var found = searchPlayers(input.value);
      list.replaceChildren.apply(list, found.length ? found.map(function (p) {
        var on = app.tour[q.id] === p.id;
        return h('button.picker__item' + (on ? '.is-on' : ''), { type: 'button', role: 'option', 'aria-selected': String(on), 'data-player': p.id, onclick: function () { choose(q, p); } },
          flag(p.team, 26),
          h('span.picker__txt', h('b', { text: p.name }), h('small', { text: team(p.team) + ' · ' + t('pos.' + p.pos) })),
          h('span.picker__pay.num', { text: t('picker.payout', { n: p.payout }) }));
      }) : [h('p.picker__empty', { text: t('picker.empty', { q: input.value.trim() }) })]);
    }
    sheet(h('div.picker',
      h('div.picker__head', h('h2.sheet__title', { text: t('picker.title') }), h('button.icon-btn', { type: 'button', 'aria-label': t('picker.close'), onclick: closeSheet }, icon('x', 18))),
      h('label.picker__field', icon('search', 16), input),
      list), { label: t('picker.title') });
    paint();
    input.focus();
  }

  function choose(q, p) {
    app.tour[q.id] = p.id;
    closeSheet();
    log('bets', 'tournament pick', { question: q.id, player: p.id, payout: p.payout });
    render();
    var card = el.querySelector('[data-question="' + q.id + '"]');
    if (card) card.classList.add('is-flash');
  }

  function surpriseTournament() {
    var open = TOURNAMENT.filter(function (q) { return !q.locked && !app.tour[q.id]; });
    if (!open.length) { toast(t('tour.allPicked')); return; }
    open.forEach(function (q) {
      var p = PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
      app.tour[q.id] = p.id;
      toast(t('tour.surpriseDone', { name: p.name }));
    });
    render();
  }

  /* ---------- Not in this demo ---------- */

  function notHere(cat) {
    return h('div.card.not-here',
      icon('sparkle', 26, 'ic--gold'),
      h('b', { text: t('notHere.title', { name: t(NOT_HERE[cat]) }) }),
      h('p', { text: t('notHere.body') }),
      h('button.btn-red', { type: 'button', onclick: function () { view.cat = 'matches'; view.time = 'upcoming'; render(); }, text: t('notHere.cta') }));
  }

  function tick() {
    var now = app.now();
    paintCountdowns(el, now);
    if (view.cat === 'matches' && view.time === 'upcoming') {
      var closed = UPCOMING.some(function (m) { return !isOpen(m, now) && el.querySelector('[data-match="' + m.id + '"]'); });
      if (closed) render();
    }
  }

  return { el: el, show: show, tick: tick };
}
