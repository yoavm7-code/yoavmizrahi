/* Memesh demo: the parents' area. Bookings (with their QR codes), punch cards, booking a round from a
   card (day strip, month view, rounds with free spots, how many, an extra companion, a summary and
   the rules popup), and the profile. */

import { PRICES, HORIZON } from './data.js';
import { dateOf, offsetOf, roundById, free, level, dayLevel, isOver, entriesLeft, maxCount, summary, canCancel, bookingsFor } from './logic.js';
import { state, parent, cardsOf, round, book, cancel, saveProfile, subscribe } from './store.js';
import { t, roundName, dmy, weekdayShort, weekdayLong, monthYear, personName, childLine } from './i18n.js';
import { h, icon, qr, toast, modal, closeModal, log } from './dom.js';
import { punchGrid } from './parts.js';

var RANGES = [{ key: 'month', days: 31 }, { key: 'quarter', days: 92 }, { key: 'half', days: 183 }, { key: 'year', days: 366 }, { key: 'all', days: 0 }];
var RULES = ['ages', 'socks', 'entry', 'round', 'cancel', 'parking'];

export function createParent(app) {
  var el = h('div.parent');
  var view = { tab: 'cards', scope: 'upcoming', range: 'all', open: {}, openCard: null, flow: null, form: null };

  function show(opts) {
    if (opts && opts.tab) view.tab = opts.tab;
    render();
  }

  function render() {
    var me = parent();
    var cards = cardsOf(me.id).filter(function (c) { return c.status === 'active'; });
    if (view.openCard === null && cards.length) view.openCard = cards[0].serial;
    el.replaceChildren(h('div.two-col',
      h('aside.side-card',
        h('b.side-card__name', { text: personName(me) }),
        h('small.muted', { text: me.phone }),
        h('nav.side-nav', { 'aria-label': t('p.nav') },
          navItem('bookings', t('p.bookings')),
          navItem('cards', t('p.cards'), String(cards.length)),
          navItem('profile', t('p.profile'))),
        h('hr.side-card__rule'),
        h('button.side-nav__item', { type: 'button', onclick: function () { toast(t('toast.signout')); } }, t('p.signout'))),
      h('main.col-main', view.tab === 'bookings' ? bookings() : view.tab === 'profile' ? profile(me) : cardsView(cards))));
  }

  function navItem(tab, label, count) {
    var on = view.tab === tab;
    return h('button.side-nav__item' + (on ? '.is-on' : ''), { type: 'button', 'aria-current': on ? 'page' : null, 'data-ptab': tab, onclick: function () { view.tab = tab; view.flow = null; render(); log('parent', 'tab', { tab: tab }); } },
      h('span', { text: label }), count ? h('small.side-nav__count', { text: count }) : null);
  }

  /* ---------- Bookings ---------- */

  function bookings() {
    var range = RANGES.filter(function (r) { return r.key === view.range; })[0];
    var list = bookingsFor(state.bookings.filter(function (b) { return b.customer === parent().id; }), view.scope, view.scope === 'past' ? range.days : 0, state.at);
    return h('div.stack',
      h('div.seg', { role: 'tablist', 'aria-label': t('p.bookings') }, ['upcoming', 'past', 'cancelled', 'all'].map(function (s) {
        return h('button.seg__btn' + (view.scope === s ? '.is-on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(view.scope === s), 'data-scope': s, onclick: function () { view.scope = s; render(); }, text: t('p.scope.' + s) });
      })),
      view.scope === 'past' ? h('div.pills', RANGES.map(function (r) {
        return h('button.pill' + (view.range === r.key ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(view.range === r.key), onclick: function () { view.range = r.key; render(); }, text: t('p.range.' + r.key) });
      })) : null,
      list.length ? list.map(bookingCard) : h('p.empty-card', { text: t('p.empty.' + view.scope) }));
  }

  function bookingCard(b) {
    var open = !!view.open[b.serial];
    var r = roundById(b.round);
    var upcoming = b.status === 'booked' && !isOver(b.day, b.round, state.at);
    var chip = b.status === 'cancelled' ? h('span.chip.chip--red', { text: t('p.status.cancelled') }) : upcoming ? h('span.chip.chip--green', { text: t('p.status.booked') }) : h('span.chip', { text: t('p.status.used') });
    var wrap = h('div.card.booking' + (open ? '.is-open' : '') + (b.fresh ? '.is-fresh' : ''), { 'data-booking': b.serial },
      h('button.booking__head', { type: 'button', 'aria-expanded': String(open), onclick: function () { view.open[b.serial] = !open; render(); } },
        h('span.booking__title', h('b', { text: roundName(b.round) + ' ' + r.start + ' - ' + r.end }), h('small.muted', { text: dmy(dateOf(b.day)) })),
        h('span.booking__end', chip, icon(open ? 'up' : 'down', 16))));
    if (!open) return wrap;
    wrap.appendChild(h('div.booking__body',
      qr(b.serial, 150, t('p.barcode', { label: roundName(b.round) })),
      h('small.mono.muted', { text: b.serial }),
      h('p.booking__line', { text: (b.count > 1 ? t('p.children', { n: b.count }) : t('p.child')) + ' · ' + t(upcoming ? 'p.status.booked' : b.status === 'cancelled' ? 'p.status.cancelled' : 'p.status.used') }),
      b.companion ? h('p.booking__note', { text: t('p.extraIncluded') }) : null,
      upcoming ? h('div.btn-row',
        h('button.btn.btn--ghost', { type: 'button', onclick: function () { toast(t('toast.notInDemo', { what: t('p.reschedule') })); } }, t('p.reschedule')),
        h('button.btn.btn--ghost.btn--danger', { type: 'button', 'data-cancel': b.serial, onclick: function () { askCancel(b); } }, t('p.cancel'))) : null,
      upcoming ? h('small.muted.policy', { text: t('p.cancelPolicy') }) : null));
    return wrap;
  }

  function askCancel(b) {
    if (!canCancel(b, state.at)) { toast(t('p.err.late'), 'bad'); return; }
    modal(h('div.dialog',
      h('h2.dialog__title', { text: t('p.cancelTitle') }),
      h('p', { text: t('p.cancelRefund') }),
      h('div.btn-row',
        h('button.btn.btn--ghost', { type: 'button', onclick: closeModal }, t('common.back')),
        h('button.btn.btn--danger-solid', { type: 'button', 'data-confirm-cancel': '', onclick: function () {
          var res = cancel(b.serial);
          closeModal();
          if (res.error) { toast(t('p.err.late'), 'bad'); return; }
          toast(t('p.cancelled'));
          log('parent', 'cancelled', { booking: b.serial });
        } }, t('p.cancelYes')))), { label: t('p.cancelTitle') });
  }

  /* ---------- Cards ---------- */

  function cardsView(cards) {
    if (!cards.length) return h('p.empty-card', { text: t('p.noCards') });
    return h('div.stack', cards.map(function (k) {
      var open = view.openCard === k.serial;
      var left = entriesLeft(k);
      var panel = h('section.card.punch' + (open ? '.is-open' : ''), { 'data-card': k.serial },
        h('button.punch__head', { type: 'button', 'aria-expanded': String(open), onclick: function () { view.openCard = open ? '' : k.serial; view.flow = null; render(); } },
          h('span', h('b', { text: t('p.card') + ' ' }), h('small.mono.muted', { text: k.serial }), h('small.muted.punch__sub', { text: t('p.left', { n: left, total: PRICES.cardEntries }) + ' · ' + t('p.noExpiry') })),
          icon(open ? 'up' : 'down', 16)));
      if (!open) return panel;
      panel.appendChild(h('div.punch__body',
        h('div.punch__count', h('b.big-num', { 'data-left': '', text: String(left) }), h('span.muted', { text: ' ' + t('p.of', { n: PRICES.cardEntries }) })),
        h('small.muted', { text: t('p.entriesLeft') }),
        punchGrid(k),
        qr(k.serial, 150, t('p.qrOf', { serial: k.serial })),
        view.flow && view.flow.card === k.serial ? flow(k) : h('button.btn.btn--cta.btn--wide', { type: 'button', 'data-book': k.serial, onclick: function () { startFlow(k); } }, t('p.book')),
        h('small.muted.policy', { text: t('p.cardNote') })));
      return panel;
    }));
  }

  function startFlow(k) {
    var first = 0;
    while (first < HORIZON && dayLevel(state.plans[first], state.at) === 'closed') first++;
    view.flow = { card: k.serial, day: first, round: null, count: 1, companion: false, month: false };
    log('parent', 'book start', { card: k.serial });
    render();
    var node = el.querySelector('.flow');
    if (node) node.scrollIntoView({ block: 'start' });
  }

  /* ---------- Booking a round ---------- */

  function flow(k) {
    var f = view.flow;
    var plan = state.plans[f.day];
    var rounds = plan.rounds.filter(function (r) { return !isOver(f.day, r.id, state.at); });
    var r = f.round && round(f.day, f.round);
    return h('div.flow', { 'data-flow': '' },
      h('div.flow__head', h('b', { text: t('p.book') }), h('button.link', { type: 'button', onclick: function () { view.flow = null; render(); } }, t('common.close'))),
      h('p.muted.flow__intro', { text: t('p.flowIntro') }),
      dayStrip(f),
      f.month ? month(f) : null,
      h('b.flow__day', { text: weekdayLong(dateOf(f.day)) + ', ' + dmy(dateOf(f.day)) }),
      plan.mode === 'closed' ? h('p.flow__empty', { text: t('p.day.closed') })
        : plan.mode === 'free' ? h('p.flow__empty', { text: t('p.day.free') })
          : !rounds.length ? h('p.flow__empty', { text: t('p.day.closed') })
            : h('div.stack-sm',
                h('small.muted.center', { text: t('p.spotsNote') }),
                rounds.map(function (x) { return roundRow(x, f); }),
                rounds.every(function (x) { return free(x) === 0; }) ? h('p.flow__empty', { text: t('p.day.full') }) : null),
      legend(),
      r ? details(k, r, f) : null);
  }

  function dayStrip(f) {
    var tiles = [];
    for (var d = 0; d < 14; d++) tiles.push(dayTile(d, f));
    var strip = h('div.days__strip', { role: 'listbox', 'aria-label': t('p.pickDay') }, tiles);
    var scroll = function (dir) { strip.scrollBy({ left: (document.documentElement.dir === 'rtl' ? -dir : dir) * 180, behavior: 'smooth' }); };
    return h('div.days',
      h('button.day-tile.day-tile--cal' + (f.month ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(f.month), onclick: function () { f.month = !f.month; render(); } }, icon('calendar', 20), h('small', { text: t('p.calendar') })),
      strip,
      h('div.days__arrows',
        h('button.round-btn', { type: 'button', 'aria-label': t('common.prev'), onclick: function () { scroll(-1); } }, icon('back', 14)),
        h('button.round-btn', { type: 'button', 'aria-label': t('common.next'), onclick: function () { scroll(1); } }, icon('next', 14))));
  }

  function dayTile(d, f) {
    var date = dateOf(d);
    var on = f.day === d;
    var lv = dayLevel(state.plans[d], state.at);
    return h('button.day-tile' + (on ? '.is-on' : '') + (d === 0 ? '.is-today' : ''), { type: 'button', role: 'option', 'aria-selected': String(on), 'data-day': String(d), 'aria-label': weekdayLong(date) + ' ' + dmy(date) + ', ' + t('legend.' + lv), onclick: function () { pickDay(d); } },
      h('small', { text: d === 0 ? t('p.today') : weekdayShort(date) }),
      h('b', { text: String(date.getDate()) }),
      h('span.dot.dot--' + lv, { 'aria-hidden': 'true' }));
  }

  function month(f) {
    var sel = dateOf(f.day);
    var first = new Date(sel.getFullYear(), sel.getMonth(), 1);
    var cells = [];
    for (var i = 0; i < first.getDay(); i++) cells.push(h('span'));
    var days = new Date(sel.getFullYear(), sel.getMonth() + 1, 0).getDate();
    for (var n = 1; n <= days; n++) {
      var off = offsetOf(new Date(sel.getFullYear(), sel.getMonth(), n));
      var past = off < 0;
      var known = off >= 0 && off <= HORIZON;
      var lv = known ? dayLevel(state.plans[off], state.at) : 'closed';
      cells.push(h('button.cal__day' + (off === f.day ? '.is-on' : '') + (past ? '.is-past' : ''), { type: 'button', disabled: !known ? true : null, 'data-off': String(off), onclick: (function (o) { return function () { pickDay(o); }; })(off) },
        h('span', { text: String(n) }), known ? h('span.dot.dot--' + lv) : null));
    }
    var shift = function (m) {
      var target = new Date(sel.getFullYear(), sel.getMonth() + m, 1);
      var off = Math.max(0, Math.min(HORIZON, offsetOf(target)));
      if (m < 0 && sel.getMonth() === dateOf(0).getMonth()) return;
      pickDay(off);
    };
    return h('div.cal',
      h('div.cal__head',
        h('button.round-btn', { type: 'button', 'aria-label': t('common.prev'), onclick: function () { shift(-1); } }, icon('next', 14)),
        h('b', { text: monthYear(sel) }),
        h('button.round-btn', { type: 'button', 'aria-label': t('common.next'), onclick: function () { shift(1); } }, icon('back', 14))),
      h('div.cal__grid', [0, 1, 2, 3, 4, 5, 6].map(function (i) { return h('small.cal__wd', { text: weekdayShort(new Date(2026, 10, 22 + i)) }); }), cells));
  }

  function pickDay(d) {
    view.flow.day = d;
    view.flow.round = null;
    view.flow.count = 1;
    log('parent', 'day', { day: d });
    render();
  }

  function roundRow(x, f) {
    var on = f.round === x.id;
    var lv = level(x);
    var meta = roundById(x.id);
    var full = lv === 'full';
    return h('button.round-row' + (on ? '.is-on' : '') + (full ? '.is-full' : ''), { type: 'button', 'aria-pressed': String(on), 'data-round': x.id, onclick: function () {
      if (full) { toast(t('p.waitlistJoined', { time: meta.start })); return; }
      f.round = x.id; f.count = 1; render();
    } },
      h('b', { text: roundName(x.id) + ' ' + meta.start + ' - ' + meta.end }),
      h('span.round-row__end',
        h('span.chip.chip--' + lv, { text: full ? t('p.roundFull') : t('p.spots', { n: free(x) }) }),
        h('span.bar', h('span.bar__fill.bar__fill--' + lv, { style: { width: Math.max(4, 100 - free(x) / x.capacity * 100) + '%' } }))));
  }

  function legend() {
    return h('div.legend', ['plenty', 'few', 'full', 'free', 'closed'].map(function (k) { return h('span', h('span.dot.dot--' + k), t('legend.' + k)); }));
  }

  function details(k, r, f) {
    var meta = roundById(r.id);
    var max = maxCount(k, r);
    var s = summary(f.count, f.companion);
    var step = function (dlt) { f.count = Math.max(1, Math.min(max, f.count + dlt)); render(); };
    return h('div.flow__details',
      h('div.stepper-row',
        h('span', { text: t('p.howMany') }),
        h('button.step', { type: 'button', 'aria-label': t('common.less'), disabled: f.count <= 1 ? true : null, onclick: function () { step(-1); } }, icon('minus', 16)),
        h('b.step__num', { 'data-count': '', text: String(f.count) }),
        h('button.step', { type: 'button', 'aria-label': t('common.more'), disabled: f.count >= max ? true : null, onclick: function () { step(1); } }, icon('plus', 16))),
      h('p.center', { text: t('p.punchLine', { time: meta.start + '–' + meta.end, n: f.count, left: entriesLeft(k) }) }),
      h('small.muted.policy', { text: t('p.companionPolicy') }),
      h('label.companion',
        h('input', { type: 'checkbox', checked: f.companion, onchange: function (e) { f.companion = e.target.checked; render(); } }),
        h('span', h('b', { text: t('p.extraCompanion') }), h('small.muted', { text: t('p.extraNote') })),
        h('b.companion__price', { text: '+₪' + PRICES.companion })),
      h('div.summary',
        h('b', { text: t('p.summary') }),
        line(t('p.sum.date'), dmy(dateOf(f.day))),
        line(t('p.sum.round'), meta.start + '–' + meta.end),
        line(t('p.sum.children'), String(s.children)),
        line(t('p.sum.companions'), String(s.companions + s.extra)),
        h('b.summary__total', { text: t('p.sum.total') + ': ' + s.total })),
      h('div.btn-row',
        h('button.btn.btn--cta', { type: 'button', 'data-confirm': '', onclick: function () { rules(k, r, f); } }, s.price ? t('p.confirmPay', { price: '₪' + s.price }) : t('p.confirm')),
        h('button.btn.btn--ghost', { type: 'button', onclick: function () { f.round = null; render(); } }, t('common.back'))));
  }

  function line(label, value) { return h('span.summary__line', h('span.muted', { text: label + ': ' }), h('span', { text: value })); }

  /* The rules popup. It explains, it doesn't book: "I've read it" books. Each row shows its title and
     the one-line summary the real product shows; the real rows open to full policy text, which this
     demo doesn't reproduce, so nothing here is made up about the real business. */
  function rules(k, r, f) {
    var list = h('div.rules__list', RULES.map(function (key) {
      return h('div.rule',
        h('span.rule__head',
          h('span.rule__dot', { 'aria-hidden': 'true' }),
          h('span.rule__txt', h('b', { text: t('rule.' + key) }), h('small.muted', { text: t('rule.' + key + '.short') }))));
    }));
    modal(h('div.rules',
      h('div.rules__head', h('b', { text: t('rules.title') }), h('button.icon-btn.icon-btn--light', { type: 'button', 'aria-label': t('common.close'), onclick: closeModal }, icon('x', 16))),
      list,
      h('div.rules__foot',
        h('button.btn.btn--sage.btn--wide', { type: 'button', 'data-rules-ok': '', autofocus: true, onclick: function () { confirm(k, r, f); } }, t('rules.ok')),
        h('small.muted', { text: t('rules.terms') }))), { label: t('rules.title'), cls: 'modal__panel--rules' });
  }

  function confirm(k, r, f) {
    var res = book(k.serial, f.day, r.id, f.count, f.companion);
    closeModal();
    if (res.error) { toast(t('p.err.' + res.error), 'bad'); return; }
    view.flow = null;
    view.tab = 'bookings';
    view.scope = 'upcoming';
    view.open = {};
    view.open[res.booking.serial] = true;
    log('parent', 'booked', { booking: res.booking.serial, day: f.day, round: r.id, count: f.count });
    render();
    toast(t(f.count > 1 ? 'p.booked.many' : 'p.booked.one'), 'good');
  }

  /* ---------- Profile ---------- */

  function profile(me) {
    var f = view.form || (view.form = { first: me[app.lang].split(' ')[0], last: me[app.lang].split(' ').slice(1).join(' '), email: me.email, channel: me.channel });
    var field = function (key, label, opts) {
      var o = opts || {};
      return h('label.field',
        h('small.muted', { text: label }),
        h('input.input' + (o.locked ? '.is-locked' : ''), { type: o.type || 'text', value: o.value !== undefined ? o.value : f[key], readonly: o.locked ? true : null, 'data-field': key, oninput: function (e) { f[key] = e.target.value; } }),
        o.hint ? h('small.muted', { text: o.hint }) : null);
    };
    return h('section.card.profile',
      h('h2.card__title', { text: t('p.editDetails') }),
      h('div.grid-2', field('first', t('p.first')), field('last', t('p.lastName'))),
      field('phone', t('p.phone'), { value: me.phone, locked: true, hint: t('p.phoneLocked') }),
      field('email', t('p.email'), { type: 'email' }),
      h('small.muted', { text: t('p.channel') }),
      h('div.seg.seg--wide', ['sms', 'whatsapp', 'email'].map(function (c) {
        return h('button.seg__btn' + (f.channel === c ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(f.channel === c), onclick: function () { f.channel = c; render(); }, text: t('channel.' + c) });
      })),
      h('small.muted', { text: t('p.children') }),
      h('div.kids', me.children.map(function (c) { return h('span.kid', { text: childLine(c) }); })),
      h('small.muted', { text: t('p.childrenHint') }),
      h('div.btn-row',
        h('button.btn.btn--peach', { type: 'button', 'data-save': '', onclick: function () {
          if (!f.first.trim() || !f.last.trim()) { toast(t('p.err.name'), 'bad'); return; }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { toast(t('p.err.email'), 'bad'); return; }
          var name = f.first.trim() + ' ' + f.last.trim();
          var patch = { email: f.email.trim(), channel: f.channel };
          patch[app.lang] = name;
          saveProfile(me.id, patch);
          view.form = null;
          toast(t('p.saved'), 'good');
        } }, t('p.save')),
        h('button.btn.btn--ghost', { type: 'button', onclick: function () { view.form = null; render(); } }, t('common.cancel'))));
  }

  subscribe(function () { if (app.role === 'parent') render(); });

  return { el: el, show: show, render: render };
}
