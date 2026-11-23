/* Toto Mundial demo: Home. A personal "what's going on" hub: your rank and points, what to do next,
   your next matches, how the pool picked, your last bet, your points trend, the leaders, news and the
   pot split. */

import { PEOPLE, UPCOMING, PAST, COMMUNITY, NEWS, HISTORY, LIVE, STAGE } from './data.js';
import { standings, myRow, behindLeader, potSplit, at, lockAt, isOpen, countdown, matchPoints, chartPoints } from './logic.js';
import { t, num, money, team, score, personName, relativeDay, clock, duration } from './i18n.js';
import { h, icon, toast } from './dom.js';
import { flag } from './flags.js';
import { sectionHead, avatar, teamLine, potCard, countdownEl, paintCountdowns, pointsLabel } from './parts.js';

export function createHome(app) {
  var el = h('section.screen.home', { 'aria-label': t('nav.home') });
  var showWhatsapp = true;

  function render() {
    var now = app.now();
    var rows = standings('bank', app.extra());
    var me = myRow(rows);
    var split = potSplit(PEOPLE.length);
    var open = UPCOMING.filter(function (m) { return isOpen(m, now); });
    var todo = open.filter(function (m) { return !app.picks[m.id]; })[0];

    el.setAttribute('aria-label', t('nav.home'));
    el.replaceChildren(
      hero(),
      h('div.brand-card',
        h('div.brand-card__logo', h('b', { text: t('app.name') }), h('small', { text: '2026' })),
        h('div.brand-card__stats',
          stat('calendar', t('stage.' + STAGE), t('stage.label')),
          stat('coins', money(split.pot), t('pot.label')),
          stat('users', num(PEOPLE.length), t('players.label')))),

      h('div.page',
        h('h2.h-lg', { text: t('home.status') }),
        h('div.status',
          statusCard(t('home.rank'), num(me.rank), t('home.of', { n: rows.length })),
          statusCard(t('home.behind'), num(behindLeader(rows)), t('pts')),
          statusCard(t('home.total'), num(me.value), t('pts'))),

        sectionHead(t('home.upnext'), { icon: 'sparkle', underline: true }),
        todo
          ? h('button.card.upnext', { type: 'button', 'data-upnext': todo.id, onclick: function () { app.go('bets', { cat: 'matches', time: 'upcoming', focus: todo.id }); } },
              h('span.upnext__flags', flag(todo.home, 28), flag(todo.away, 28)),
              h('span.upnext__txt', h('span', { 'data-upnext-line': '' }), h('b.upnext__cta', h('span', { text: t('home.upnext.cta') }), icon('next', 16)))
            )
          : h('div.card.upnext.is-done', icon('checkCircle', 20, 'ic--green'), h('span', { text: t('home.upnext.done') })),

        sectionHead(t('home.next'), { underline: true, link: { label: t('home.viewAll'), run: function () { app.go('bets', { cat: 'matches', time: 'upcoming' }); } } }),
        h('div.stack', open.slice(0, 2).map(nextMatch)),

        sectionHead(t('home.community'), { icon: 'eye', link: { label: t('home.seeAll'), run: function () { app.shell.notInDemo('page.transparency'); } } }),
        h('div.card.community', COMMUNITY.map(communityRow)),

        h('div.two',
          lastBet(PAST[0]),
          h('section.card.chart-card',
            h('h3.card-title', { text: t('home.chart') }),
            chart(HISTORY.concat(app.extra() ? [HISTORY[HISTORY.length - 1] + app.extra()] : [])),
            h('small.muted', { text: t('home.chartNote', { n: HISTORY.length - 1 }) }))),

        h('div.two',
          h('section.card.mini-lb',
            h('div.card-title.card-title--split', h('span', { text: t('home.leaders') }),
              h('button.link-btn', { type: 'button', onclick: function () { app.go('leaders'); } }, h('span', { text: t('home.fullTable') }), icon('out', 14))),
            rows.slice(0, 5).map(function (r) {
              var isMe = r.id === me.id;
              return h('div.mini-lb__row' + (isMe ? '.is-me' : ''),
                h('b.mini-lb__rank.num', { text: String(r.rank) }),
                avatar(r.person, { gold: r.rank <= 3, small: true }),
                h('span.mini-lb__name', { text: isMe ? t('you') : personName(r.person) }),
                pointsLabel(r.value));
            })),
          h('div.shortcuts',
            h('button.card.shortcut', { type: 'button', onclick: function () { app.go('bets'); } },
              h('span.shortcut__ic.shortcut__ic--amber', icon('bets', 20)),
              h('span.shortcut__txt', h('b', { text: t('home.allBets') }), h('small', { text: t('home.allBetsSub') })),
              icon('out', 16)),
            showWhatsapp ? h('div.card.shortcut',
              h('button.shortcut__main', { type: 'button', onclick: function () { toast(t('toast.whatsapp')); } },
                h('span.shortcut__ic.shortcut__ic--green', icon('chat', 20)),
                h('span.shortcut__txt', h('b', { text: t('home.whatsapp') }), h('small', { text: t('home.whatsappSub') })),
                icon('out', 16)),
              h('button.icon-btn', { type: 'button', 'aria-label': t('home.dismiss'), onclick: function () { showWhatsapp = false; render(); } }, icon('x', 16))) : null)),

        sectionHead(t('home.news'), { link: { label: t('home.viewAll'), run: function () { toast(t('toast.news')); } } }),
        h('div.card.news', NEWS.map(function (n, i) {
          var d = at(n.day, n.time);
          return h('button.news__row', { type: 'button', onclick: function () { toast(t('toast.news')); } },
            h('span.news__thumb.news__thumb--' + (i % 3), { 'aria-hidden': 'true' }, icon('zone', 28)),
            h('span.news__txt', h('b', { text: n[app.lang] }), h('small', { text: n.source + ' · ' + relativeDay(n.day, d) + ', ' + clock(d) })),
            icon('out', 14));
        })),

        potCard()));
    tick();
  }

  function stat(iconName, value, label) {
    return h('div.brand-stat', icon(iconName, 20, 'ic--brand'), h('span', h('b', { text: value }), h('small', { text: label })));
  }
  function statusCard(label, value, unit) {
    return h('div.card.status__card', h('small', { text: label }), h('span', h('b.status__num.num', { text: value }), h('span.status__unit', { text: ' ' + unit })));
  }

  function nextMatch(m) {
    var pick = app.picks[m.id];
    return h('button.card.next-match', { type: 'button', onclick: function () { app.go('bets', { cat: 'matches', time: 'upcoming', focus: m.id }); } },
      h('span.next-match__teams', teamLine(m.home, { size: 22 }), h('span.muted', { text: t('vs') }), teamLine(m.away, { size: 22, end: true })),
      h('span.next-match__meta',
        h('span', { text: relativeDay(m.day, at(m.day, m.time)) + ' · ' + m.time }),
        countdownEl(lockAt(m), 'locksIn')),
      h('span.next-match__pick' + (pick ? '.is-picked' : ''), { text: pick ? t('home.yourPick', { score: score(pick) }) : t('home.noPick') }));
  }

  function communityRow(c) {
    var m = c.match === LIVE.id ? LIVE : PAST.filter(function (p) { return p.id === c.match; })[0];
    var total = c.home + c.draw + c.away;
    var top = c.home >= c.away && c.home >= c.draw ? 'home' : c.away >= c.draw ? 'away' : 'draw';
    var line = top === 'draw' ? t('home.pickedDraw', { n: c.draw, total: total }) : t('home.picked', { n: c[top], total: total, team: team(m[top]) });
    return h('div.community__row',
      h('div.community__teams', teamLine(m.home, { size: 20 }), h('span.muted', { text: t('vs') }), teamLine(m.away, { size: 20, end: true })),
      h('div.split-bar', { role: 'img', 'aria-label': line },
        h('span.split-bar__home', { style: { flexGrow: c.home } }), h('span.split-bar__draw', { style: { flexGrow: c.draw } }), h('span.split-bar__away', { style: { flexGrow: c.away } })),
      h('small.muted', { text: line }));
  }

  function lastBet(m) {
    var res = matchPoints(m.pick, m.score, m);
    return h('section.card.last-bet',
      h('h3.card-title', { text: t('home.lastBet') }),
      h('small.last-bet__label', { text: t('past.final') }),
      h('div.last-bet__teams',
        h('span', { text: team(m.home) }),
        h('span.tiles', h('b.tile.num', { text: String(m.score[0]) }), h('b.tile-sep', { text: ':' }), h('b.tile.num', { text: String(m.score[1]) })),
        h('span', { text: team(m.away) })),
      h('span.last-bet__rule'),
      h('div.last-bet__foot',
        h('span', h('small', { text: t('home.yourBet') }), h('b.num', { text: score(m.pick) })),
        h('span', h('small', { text: t('home.earned') }), h('span.pts-chip.pts-chip--green', { text: '+' + res.points + ' ' + t('pts') }))));
  }

  function chart(values) {
    var W = 300, H = 120;
    var pts = chartPoints(values, W, H, 8);
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'chart');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', t('home.chart') + ': ' + num(values[0]) + ' → ' + num(values[values.length - 1]) + ' ' + t('pts'));
    [0.25, 0.5, 0.75].forEach(function (f) {
      var l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', 0); l.setAttribute('x2', W); l.setAttribute('y1', H * f); l.setAttribute('y2', H * f);
      l.setAttribute('class', 'chart__grid');
      svg.appendChild(l);
    });
    var line = document.createElementNS(ns, 'polyline');
    line.setAttribute('points', pts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' '));
    line.setAttribute('class', 'chart__line');
    svg.appendChild(line);
    pts.forEach(function (p, i) {
      var c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', p.x.toFixed(1)); c.setAttribute('cy', p.y.toFixed(1)); c.setAttribute('r', i === pts.length - 1 ? 4 : 2.4);
      c.setAttribute('class', i === pts.length - 1 ? 'chart__last' : 'chart__dot');
      svg.appendChild(c);
    });
    return svg;
  }

  function tick() {
    var now = app.now();
    paintCountdowns(el, now);
    var line = el.querySelector('[data-upnext-line]');
    if (line) {
      var m = UPCOMING.filter(function (x) { return x.id === el.querySelector('[data-upnext]').getAttribute('data-upnext'); })[0];
      if (!isOpen(m, now)) { render(); return; }
      line.textContent = t('home.upnext.pick', { match: team(m.home) + ' ' + t('vs') + ' ' + team(m.away), time: duration(countdown(lockAt(m), now)) });
    }
  }

  return { el: el, show: function () { render(); }, tick: tick };
}


/* ---------- The hero ---------- */
/* An original poster-style scene in the app's palette: a low sun, a cup, a stadium and hills.
   No real players and nothing copied from the real app's art. */
function hero() {
  var wrap = h('div.hero', { 'aria-hidden': 'true' });
  wrap.innerHTML =
    '<svg viewBox="0 0 390 230" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">' +
    '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6d3b8"/><stop offset=".75" stop-color="#fff1ea"/></linearGradient></defs>' +
    '<rect width="390" height="230" fill="url(#sky)"/>' +
    '<circle cx="195" cy="128" r="88" fill="#fbbb59"/>' +
    '<g stroke="#f0a43d" stroke-width="3" opacity=".55">' + rays() + '</g>' +
    '<path d="M0 150 70 112l58 30 52-40 60 44 54-36 96 44v76H0z" fill="#c99a6b" opacity=".55"/>' +
    '<path d="M0 168c60-22 120-24 195-10s140 10 195-12v84H0z" fill="#3b6846"/>' +
    '<path d="M0 186c70-14 140-12 195-4 70 10 130 4 195-10v58H0z" fill="#2f5839"/>' +
    '<g transform="translate(195 132)">' +
    '<ellipse cx="0" cy="40" rx="122" ry="26" fill="#a13217"/>' +
    '<ellipse cx="0" cy="36" rx="104" ry="18" fill="#c24a2d"/>' +
    '<ellipse cx="0" cy="36" rx="80" ry="11" fill="#7fb07a"/>' +
    '<path d="M-60 36h120M0 25v22" stroke="#e8f2e0" stroke-width="1.2" opacity=".8"/>' +
    '<g fill="#fff1ea" opacity=".7">' + crowd() + '</g>' +
    '</g>' +
    '<g transform="translate(195 46)">' +
    '<path d="M-17 0h34c0 22-4 36-11 45-3 4-4 8-4 13v10h-4V58c0-5-1-9-4-13C-13 36-17 22-17 0z" fill="#d79a2b" stroke="#7a5000" stroke-width="1.2"/>' +
    '<path d="M-17 6h-10c0 14 6 22 15 25M17 6h10c0 14-6 22-15 25" fill="none" stroke="#d79a2b" stroke-width="4"/>' +
    '<rect x="-13" y="68" width="26" height="7" rx="2" fill="#b97f1f"/><rect x="-18" y="75" width="36" height="9" rx="2.5" fill="#d79a2b"/>' +
    '</g>' +
    '<g fill="#a13217"><path d="M40 60l18 6-18 6z"/><rect x="39" y="58" width="1.6" height="34"/><path d="M350 52l-18 6 18 6z"/><rect x="349.4" y="50" width="1.6" height="34"/></g>' +
    '</svg>';
  return wrap;
}
function rays() {
  var s = '';
  for (var i = 0; i < 18; i++) {
    var a = Math.PI + i * Math.PI / 17;
    s += '<line x1="' + (195 + Math.cos(a) * 100).toFixed(1) + '" y1="' + (128 + Math.sin(a) * 100).toFixed(1) + '" x2="' + (195 + Math.cos(a) * 150).toFixed(1) + '" y2="' + (128 + Math.sin(a) * 150).toFixed(1) + '"/>';
  }
  return s;
}
function crowd() {
  var s = '';
  for (var i = 0; i < 46; i++) {
    var a = Math.PI * 2 * i / 46;
    s += '<circle cx="' + (Math.cos(a) * 112).toFixed(1) + '" cy="' + (40 + Math.sin(a) * 22).toFixed(1) + '" r="1.6"/>';
  }
  return s;
}
