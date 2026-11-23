/* Memesh demo: the front-desk till. A greeting and today's counters, three big tiles, the QR scanner
   (a pretend camera, with the codes on the counter to hold up to it), customer search and profile with
   punching, and today's rounds with who has arrived. */

import { PRICES } from './data.js';
import { dateOf, roundById, entriesLeft, greeting, searchCustomers, level, free, pct } from './logic.js';
import { state, customer, card, cardsOf, booking, punch, checkIn, arrive, parent, todayNumbers, staffMe, subscribe } from './store.js';
import { t, roundName, dmy, weekdayLong, longDate, personName, childLine, firstName } from './i18n.js';
import { h, icon, sun, qr, toast, modal, closeModal, log } from './dom.js';
import { punchGrid, avatar, capacityBar } from './parts.js';

export function createDesk(app) {
  var el = h('div.desk');
  var view = { tab: 'till', screen: 'home', q: '', sort: 'az', filter: 'all', customer: null, punched: null, openRound: {}, arrQ: {}, manual: false };

  function show(opts) {
    if (opts && opts.screen) view.screen = opts.screen;
    render();
  }

  function render() {
    el.replaceChildren(h('div.desk__col',
      h('div.seg.seg--tabs', { role: 'tablist', 'aria-label': t('d.tabs') },
        tab('till', t('d.till')), tab('rounds', t('d.rounds'))),
      view.tab === 'rounds' ? rounds()
        : view.screen === 'scan' ? scan()
          : view.screen === 'search' ? search()
            : view.screen === 'customer' ? profile(customer(view.customer))
              : home()));
  }

  function tab(key, label) {
    var on = view.tab === key;
    return h('button.seg__btn' + (on ? '.is-on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(on), 'data-dtab': key, onclick: function () { view.tab = key; view.screen = 'home'; render(); }, text: label });
  }
  function go(screen) { view.screen = screen; view.manual = false; render(); log('desk', 'screen', { screen: screen }); }
  function backLink(label, to) { return h('button.link.back-link', { type: 'button', onclick: function () { go(to); } }, icon('next', 14), h('span', { text: label })); }

  /* ---------- Till home ---------- */

  function home() {
    var n = todayNumbers();
    var me = staffMe();
    return h('div.stack',
      h('div',
        h('h1.greet', { text: t('d.greet.' + greeting(state.at.getHours()), { name: firstName(me) }) }),
        h('p.muted', { text: longDate(state.at) })),
      h('div.stats',
        stat(t('d.entriesToday'), n.entries, 'entries'),
        stat(t('d.cardsToday'), n.cards, 'cards')),
      h('div.tiles',
        tile('search', t('d.find'), t('d.findSub'), 'peach', function () { go('search'); }),
        tile('new', t('d.new'), t('d.newSub'), 'sage', function () { toast(t('toast.notInDemo', { what: t('d.new') })); }),
        tile('scan', t('d.scan'), t('d.scanSub'), 'solid', function () { go('scan'); })));
  }
  function stat(label, value, key) {
    return h('div.card.stat', h('b.big-num', { 'data-stat': key, text: String(value) }), h('small.muted', { text: label }));
  }
  function tile(key, title, sub, tone, run) {
    return h('button.tile.tile--' + tone, { type: 'button', 'data-tile': key, onclick: run },
      h('span.tile__chip', sun(30)), h('b.tile__title', { text: title }), h('small.tile__sub', { text: sub }));
  }

  /* ---------- Scan ---------- */

  function scan() {
    var me = parent();
    var held = [];
    cardsOf(me.id).filter(function (k) { return k.status === 'active'; }).slice(0, 1).forEach(function (k) { held.push({ serial: k.serial, kind: 'card', who: me }); });
    state.bookings.filter(function (b) { return b.status === 'booked' && b.day === 0; }).forEach(function (b) { held.push({ serial: b.serial, kind: 'ticket', who: customer(b.customer), round: b.round }); });
    var other = card('M-20261109-0461');
    held.push({ serial: other.serial, kind: 'card', who: customer(other.customer) });
    var frame = h('div.cam__frame', { 'aria-hidden': 'true' }, h('span.cam__line'));
    var input = h('input.input', { type: 'text', placeholder: 'M-… / R-…', 'aria-label': t('d.serial'), 'data-serial-input': '' });
    return h('div.stack',
      backLink(t('common.back'), 'home'),
      h('div.card.scan',
        h('div.cam', { role: 'img', 'aria-label': t('d.camera') }, h('span.cam__blur'), h('span.cam__blur.cam__blur--2'), frame),
        h('p.muted.center', { text: t('d.camHint') }),
        h('div.held',
          h('small.muted', { text: t('d.held') }),
          h('div.held__row', held.map(function (x) {
            return h('button.held__code', { type: 'button', 'data-hold': x.serial, onclick: function () { hold(x.serial, frame); } },
              qr(x.serial, 64, x.serial),
              h('span', h('b', { text: x.kind === 'card' ? t('d.heldCard') : t('d.heldTicket', { round: roundName(x.round) }) }), h('small.muted', { text: personName(x.who) })));
          }))),
        view.manual
          ? h('form.manual', { onsubmit: function (e) { e.preventDefault(); lookUp(input.value.trim()); } }, input, h('button.btn.btn--peach', { type: 'submit' }, t('d.find')))
          : h('button.btn.btn--ghost.btn--wide', { type: 'button', onclick: function () { view.manual = true; render(); var i = el.querySelector('[data-serial-input]'); if (i) i.focus(); } }, t('d.manual'))));
  }

  /* Holding a code to the camera: the frame flashes green, then the right dialog opens. */
  function hold(serial, frame) {
    frame.classList.add('is-read');
    log('desk', 'scan', { serial: serial });
    setTimeout(function () { frame.classList.remove('is-read'); lookUp(serial); }, 650);
  }

  function lookUp(serial) {
    if (!serial) { toast(t('d.err.empty'), 'bad'); return; }
    var k = card(serial.toUpperCase());
    if (k) { punchDialog(k); return; }
    var b = booking(serial.toUpperCase());
    if (b) { entryDialog(b); return; }
    toast(t('d.err.qr'), 'bad');
  }

  function punchDialog(k) {
    if (k.status !== 'active') { toast(t('d.err.' + (k.status === 'expired' ? 'expired' : 'used')), 'bad'); return; }
    var left = entriesLeft(k);
    if (left <= 0) { toast(t('d.err.used'), 'bad'); return; }
    var max = Math.min(left, 10);
    var n = 1;
    var num = h('b.big-num', { 'data-punch-n': '', text: '1' });
    var unit = h('small.muted', { text: t('d.oneEntry') });
    var less = h('button.step', { type: 'button', 'aria-label': t('common.less'), disabled: true, onclick: function () { set(n - 1); } }, icon('minus', 16));
    var more = h('button.step', { type: 'button', 'aria-label': t('common.more'), disabled: max <= 1 ? true : null, onclick: function () { set(n + 1); } }, icon('plus', 16));
    function set(v) {
      n = Math.max(1, Math.min(max, v));
      num.textContent = String(n);
      unit.textContent = n === 1 ? t('d.oneEntry') : t('d.entries', { n: n });
      less.disabled = n <= 1;
      more.disabled = n >= max;
    }
    var confirmBtn = h('button.btn.btn--peach', { type: 'button', 'data-punch-go': '', onclick: function () {
      confirmBtn.disabled = true;
      confirmBtn.textContent = t('d.punching');
      setTimeout(function () {
        var res = punch(k.serial, n);
        closeModal();
        if (res.error) { toast(t('d.err.' + res.error), 'bad'); return; }
        view.punched = { serial: k.serial, left: res.left };
        toast(t('d.punched', { n: res.left }), 'good');
        log('desk', 'punched', { card: k.serial, count: n, left: res.left });
        if (view.screen !== 'customer') { view.customer = k.customer; view.screen = 'customer'; }
        render();
      }, 600);
    } }, t('d.punch'));
    modal(h('div.dialog.center',
      h('h2.dialog__title', { text: t('d.howMany') }),
      h('small.muted', { text: personName(customer(k.customer)) + ' · ' + k.serial }),
      h('div.stepper-big', less, h('span.stack-xs', num, unit), more),
      h('small.muted', { text: t('d.max', { n: max }) }),
      h('div.btn-row', h('button.btn.btn--ghost', { type: 'button', onclick: closeModal }, t('common.cancel')), confirmBtn)), { label: t('d.howMany') });
  }

  function entryDialog(b) {
    var who = customer(b.customer);
    var r = roundById(b.round);
    modal(h('div.dialog.center',
      h('h2.dialog__title', { text: t('d.confirmEntry') }),
      h('b', { text: personName(who) }),
      h('p', { text: roundName(b.round) + ' ' + r.start + ' - ' + r.end + ' · ' + dmy(dateOf(b.day)) }),
      h('p.muted', { text: (b.count > 1 ? t('p.children', { n: b.count }) : t('p.child')) + (b.companion ? ' · ' + t('d.plusCompanion') : '') }),
      h('div.btn-row',
        h('button.btn.btn--ghost', { type: 'button', onclick: closeModal }, t('common.cancel')),
        h('button.btn.btn--peach', { type: 'button', 'data-checkin': '', onclick: function () {
          var res = checkIn(b.serial);
          closeModal();
          if (res.error) { toast(t('d.err.' + res.error), 'bad'); return; }
          toast(t('d.arrivedToast', { name: personName(who) }), 'good');
          render();
        } }, t('d.confirmEntry')))), { label: t('d.confirmEntry') });
  }

  /* ---------- Find customer ---------- */

  function search() {
    var rows = searchCustomers(state.customers, view.q, view.sort, view.filter, state.cards);
    var input = h('input.input.input--big', { type: 'search', placeholder: t('d.searchPh'), value: view.q, 'aria-label': t('d.find'), oninput: function () { view.q = input.value; paintList(); } });
    var list = h('div.stack-sm');
    var count = h('small.muted');
    function paintList() {
      var found = searchCustomers(state.customers, view.q, view.sort, view.filter, state.cards);
      count.textContent = view.q || view.filter !== 'all' ? t('d.found', { n: found.length }) : t('d.count', { n: (1870).toLocaleString('en-US') });
      list.replaceChildren.apply(list, found.length ? found.map(customerRow) : [h('p.empty-card', { text: t('d.noMatch') })]);
    }
    var pills = function (label, key, options) {
      return h('div.pills', h('small.muted', { text: label }), options.map(function (o) {
        return h('button.pill' + (view[key] === o ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(view[key] === o), onclick: function () { view[key] = o; render(); }, text: t('d.' + key + '.' + o) });
      }));
    };
    var node = h('div.stack',
      backLink(t('common.back'), 'home'),
      input,
      pills(t('d.sort'), 'sort', ['az', 'newest', 'purchase']),
      pills(t('d.filter'), 'filter', ['all', 'vip', 'frozen', 'active']),
      count, list);
    paintList();
    setTimeout(function () { input.focus(); }, 0);
    return node;
  }

  function customerRow(c) {
    return h('button.card.cust-row', { type: 'button', 'data-customer': c.id, onclick: function () { view.customer = c.id; view.punched = null; go('customer'); } },
      avatar(personName(c), c.id.charCodeAt(c.id.length - 1) % 2 ? 'peach' : 'sage'),
      h('span', h('b', { text: personName(c) }), h('small.muted', { text: c.id + ' · ' + c.phone })),
      c.vip ? h('span.chip.chip--gold', { text: 'VIP' }) : null,
      c.frozen ? h('span.chip', { text: t('d.filter.frozen') }) : null);
  }

  /* ---------- Customer profile ---------- */

  function profile(c) {
    var cards = cardsOf(c.id).filter(function (k) { return k.status === 'active'; });
    var k = cards.sort(function (a, b) { return entriesLeft(b) - entriesLeft(a); }).filter(function (x) { return !view.punched || x.serial === view.punched.serial; })[0] || cards[0];
    var history = k ? (state.entries[k.serial] || []) : [];
    return h('div.stack',
      backLink(t('d.backSearch'), 'search'),
      h('div.card.cust-head', avatar(personName(c), 'peach'), h('span', h('b', { text: personName(c) }), h('small.muted', { text: c.id + ' · ' + c.phone }))),
      k ? h('div.grid-2',
        h('div.card.center.stack-sm', { 'data-desk-card': k.serial },
          h('div', h('b.big-num', { 'data-left': '', text: String(entriesLeft(k)) }), h('span.muted', { text: ' ' + t('p.of', { n: PRICES.cardEntries }) })),
          h('small.muted', { text: t('p.entriesLeft') }),
          punchGrid(k),
          h('button.btn.btn--peach.btn--wide', { type: 'button', 'data-punch': k.serial, disabled: entriesLeft(k) <= 0 ? true : null, onclick: function () { punchDialog(k); } }, t('d.punchEntry')),
          view.punched && view.punched.serial === k.serial ? h('small.ok', { text: t('d.punched', { n: view.punched.left }) }) : null),
        h('div.card.center.stack-sm', qr(k.serial, 170, k.serial), h('small.mono.muted', { text: k.serial }), h('small.muted', { text: t('p.noExpiry') })))
        : h('p.empty-card', { text: t('p.noCards') }),
      h('div.card.stack-sm',
        h('b', { text: t('d.history') }),
        history.length ? history.map(function (e) {
          return h('div.hist-row' + (e.fresh ? '.is-fresh' : ''),
            h('span', { text: e.time + ' · ' + dmy(dateOf(e.day)) + ' · ' + (e.count === 1 ? t('d.oneEntry') : t('d.entries', { n: e.count })) }),
            h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: function () { toast(t('d.refundNote')); } }, t('d.refund')));
        }) : h('small.muted', { text: t('d.noHistory') })),
      h('div.card.stack-sm',
        h('b', { text: t('d.children') }),
        c.children.length ? h('div.kids', c.children.map(function (x) { return h('span.kid', { text: childLine(x) }); })) : h('small.muted', { text: t('d.noChildren') })),
      h('div.card.stack-sm', h('b', { text: t('d.note') }), h('small.muted', { text: t('d.noNotes') })));
  }

  /* ---------- Today's rounds ---------- */

  function rounds() {
    var plan = state.plans[0];
    return h('div.stack',
      h('div.row-between',
        h('h1.greet', { text: t('d.todayRounds') }),
        h('small.live-note', h('span.pulse', { 'aria-hidden': 'true' }), t('d.autoUpdate'))),
      h('p.muted', { text: weekdayLong(state.at) + ' · ' + dmy(state.at) }),
      plan.rounds.map(roundCard));
  }

  function roundCard(r) {
    var meta = roundById(r.id);
    var rows = state.participants[r.id];
    var arrived = rows.filter(function (p) { return p.arrived; }).length;
    var open = !!view.openRound[r.id];
    var f = free(r);
    return h('section.card.round-card', { 'data-today-round': r.id },
      h('div.row-between', h('b', { text: roundName(r.id) + ' ' + meta.start + ' - ' + meta.end }), h('span.chip.chip--' + level(r), { text: pct(r) + '%' })),
      capacityBar(r),
      h('div.row-between', h('span', { text: t('d.kids', { n: r.booked, cap: r.capacity }) }), h('b.free-num.free-num--' + level(r), { text: t('d.free', { n: f }) })),
      h('small.muted', { text: t('d.arrivedOf', { a: arrived, b: rows.length }) }),
      f > 0 ? h('small.ok', { text: t('d.room', { n: f }) }) : h('small.bad', { text: t('d.noRoom') }),
      h('button.link.toggle', { type: 'button', 'aria-expanded': String(open), 'data-arrivals': r.id, onclick: function () { view.openRound[r.id] = !open; render(); } }, t(open ? 'd.hideList' : 'd.showList'), icon(open ? 'up' : 'down', 14)),
      open ? arrivals(r.id, rows) : null);
  }

  function arrivals(id, rows) {
    var q = (view.arrQ[id] || '').toLowerCase();
    var shown = rows.filter(function (p) {
      var c = p.customer && customer(p.customer);
      return !q || (c ? [c.he, c.en, c.phone].join(' ') : t('d.walkin')).toLowerCase().indexOf(q) !== -1;
    });
    var input = h('input.input', { type: 'search', placeholder: t('d.arrSearch'), value: view.arrQ[id] || '', 'aria-label': t('d.arrSearch'), oninput: function () { view.arrQ[id] = input.value; render(); var i = el.querySelector('[data-arr-search="' + id + '"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 'data-arr-search': id });
    return h('div.stack-sm', input, shown.slice(0, 12).map(function (p) {
      var c = p.customer && customer(p.customer);
      return h('div.arr-row' + (p.arrived ? '.is-in' : '') + (p.fresh ? '.is-fresh' : ''),
        h('span.stack-xs',
          h('span', h('b', { text: c ? personName(c) : t('d.walkin') }), p.source === 'manual' ? h('span.chip.chip--gold', { text: t('d.manualTag') }) : null, h('span.chip', { text: t('type.' + p.type) }), p.companion ? h('span.chip', { text: t('d.plusCompanion') }) : null),
          h('small.muted.mono', { text: p.ticket + ' · ' + (c ? c.phone : t('d.noDetails')) })),
        p.arrived ? h('b.ok', { text: '✓ ' + t('d.arrived') }) : h('button.btn.btn--ghost.btn--sm', { type: 'button', 'data-arrive': p.id, onclick: function () { arrive(id, p.id); } }, t('d.markArrived')));
    }), shown.length > 12 ? h('small.muted', { text: t('d.more', { n: shown.length - 12 }) }) : null);
  }

  subscribe(function () { if (app.role === 'desk') render(); });

  return { el: el, show: show, render: render };
}
