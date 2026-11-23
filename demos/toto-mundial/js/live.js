/* Toto Mundial demo: Live scores. The match on now runs on a fast clock from the moment this page first
   opens: the minute ticks, goals go in, and "Right now" shows what your pick would earn if it ended
   there. Below it, today's kickoffs count down and today's finished match shows what you earned. */

import { UPCOMING, PAST, LIVE } from './data.js';
import { at, dayIndex, liveScore, isFinished, projected, minuteLabel, matchPoints, isOpen } from './logic.js';
import { t, team, score } from './i18n.js';
import { h, icon, toast, log } from './dom.js';
import { teamLine, pill, countdownEl, paintCountdowns } from './parts.js';

export function createLive(app) {
  var el = h('section.screen.live');
  var shown = { minute: -1, goals: -1, finished: false };

  function render() {
    var now = app.now();
    var today = dayIndex(now);
    var later = UPCOMING.filter(function (m) { return m.day === today; });
    var done = PAST.filter(function (m) { return m.day === today; });
    el.setAttribute('aria-label', t('live.title'));
    el.replaceChildren(h('div.page',
      h('h1.h-hero', icon('live', 30), h('span', { text: t('live.title') })),
      h('p.sub', { text: t('live.sub') }),
      h('small.auto-note', icon('sparkle', 13, 'ic--gold'), h('span', { text: ' ' + t('live.auto') })),
      h('div.stack', { 'data-live-slot': '' }, liveCard()),
      later.map(upcomingCard),
      done.map(doneCard)));
    paintCountdowns(el, now);
  }

  function liveCard() {
    var minute = app.liveMinute();
    var s = liveScore(LIVE, minute);
    var over = isFinished(LIVE, minute);
    var p = projected(LIVE, minute);
    return h('div.card.match-live' + (over ? '.is-over' : ''), { 'data-live': LIVE.id },
      h('div.match-live__top',
        over ? pill(t('live.fullTime'), 'grey') : h('span.live-badge', h('span.live-badge__dot', { 'aria-hidden': 'true' }), h('span', { text: t('live.badge') })),
        pill(t('stage.' + LIVE.stage), 'green'),
        h('b.match-live__min.num', { 'data-minute': '', text: over ? '' : minuteLabel(minute) + '′' })),
      h('div.past__teams', teamLine(LIVE.home), h('b.past__score.num', { 'data-live-score': '', text: score(s) }), teamLine(LIVE.away, { end: true })),
      h('div.past__foot',
        h('div.past__cell', h('small', { text: t('live.yourPick') }), h('b.num', { text: score(LIVE.pick) })),
        h('div.past__cell', h('small', { text: over ? t('live.earned') : t('live.rightNow') }),
          h('span.pts-chip.pts-chip--' + (p.kind === 'exact' ? 'green' : p.kind === 'direction' ? 'green-soft' : 'grey'), { 'data-projected': '', text: p.points > 0 ? '+' + p.points : '0' }),
          h('small.muted', { text: t('kind.' + p.kind) }))),
      over ? null : h('small.match-live__hint.muted', { text: t('live.projected') }));
  }

  function upcomingCard(m) {
    var pick = app.picks[m.id];
    var open = isOpen(m, app.now());
    return h('div.card.match-next',
      h('div.match-live__top', pill(t('live.waiting'), 'grey'), h('small.muted.num', { text: m.time })),
      h('div.past__teams', teamLine(m.home), h('b.past__score.num.muted', { text: '–' }), teamLine(m.away, { end: true })),
      h('div.match-next__foot',
        countdownEl(at(m.day, m.time), 'live.kickoffIn'),
        pick ? h('span.match-next__pick', h('small', { text: t('live.yourPick') }), h('b.num', { text: ' ' + score(pick) }))
          : open ? h('button.btn-red.btn-red--sm', { type: 'button', onclick: function () { app.go('bets', { cat: 'matches', time: 'upcoming', focus: m.id }); } }, h('span', { text: t('live.pickNow') }), icon('next', 14))
            : h('small.muted', { text: t('live.noPick') })));
  }

  function doneCard(m) {
    var res = matchPoints(m.pick, m.score, m);
    return h('div.card.match-done',
      h('div.match-live__top', pill(t('live.fullTime'), 'grey'), pill(t('stage.' + m.stage), 'green'), h('small.muted.num', { text: m.time })),
      h('div.past__teams', teamLine(m.home), h('b.past__score.num', { text: score(m.score) }), teamLine(m.away, { end: true })),
      h('div.past__foot',
        h('div.past__cell', h('small', { text: t('live.yourPick') }), h('b.num', { text: score(m.pick) })),
        h('div.past__cell', h('small', { text: t('live.earned') }), h('span.pts-chip.pts-chip--green', { text: '+' + res.points }), h('small.muted', { text: t('kind.' + res.kind) }))));
  }

  /* Once a second: move the minute, announce goals and the final whistle, keep countdowns honest. */
  function tick() {
    var minute = app.liveMinute();
    var goals = LIVE.goals.filter(function (g) { return minute >= g.minute; }).length;
    var over = isFinished(LIVE, minute);
    if (minute !== shown.minute) {
      var slot = el.querySelector('[data-live-slot]');
      if (slot) slot.replaceChildren(liveCard());
      if (shown.goals !== -1 && goals > shown.goals) {
        var g = LIVE.goals[goals - 1];
        toast(t('live.goal', { team: team(g.side ? LIVE.away : LIVE.home), score: team(LIVE.home) + ' ' + score(liveScore(LIVE, minute)) + ' ' + team(LIVE.away) }));
        log('live', 'goal', { minute: g.minute, score: score(liveScore(LIVE, minute)), projected: projected(LIVE, minute).points });
      }
      if (over && !shown.finished && shown.minute !== -1) {
        toast(t('live.ended', { score: score(liveScore(LIVE, minute)), n: projected(LIVE, minute).points }));
        log('live', 'full time', { earned: app.extra() });
        app.refresh();
      }
      shown.minute = minute;
      shown.goals = goals;
      shown.finished = over;
    }
    paintCountdowns(el, app.now());
  }

  function show() {
    app.startLive();
    shown.minute = app.liveMinute();
    shown.goals = LIVE.goals.filter(function (g) { return shown.minute >= g.minute; }).length;
    shown.finished = isFinished(LIVE, shown.minute);
    render();
  }

  return { el: el, show: show, tick: tick };
}
