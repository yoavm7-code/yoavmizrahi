/* Memesh demo: the back office, as a shift manager sees it. The live dashboard (today's rounds with
   their participants, today in numbers, the next seven days, the activity feed that all three apps
   feed), customers, punch cards, and the staff list with its permissions matrix. */

import { STAFF, PERMISSIONS, YESTERDAY, TODAY_BASE, STATS, PRICES, CUSTOMER_TOTAL, CARD_TOTAL } from './data.js';
import { roundById, free, pct, level, delta, revenue, weekGrid, entriesLeft, dateOf } from './logic.js';
import { state, customer, cardsOf, addParticipant, removeParticipant, todayNumbers, subscribe } from './store.js';
import { t, roundName, dmy, weekdayShort, personName, money, activityLine, ymdArr } from './i18n.js';
import { h, icon, toast, modal, closeModal, log } from './dom.js';
import { avatar, capacityBar } from './parts.js';

var NAV = ['dashboard', 'customers', 'cards', 'tickets', 'staff', 'reports'];
var IN_DEMO = { dashboard: true, customers: true, cards: true, staff: true };

export function createManager(app) {
  var el = h('div.manager');
  var view = { page: 'dashboard', open: null, adding: false, addQ: '', cq: '', cardStatus: 'active', cardQ: '', staffTab: 'team' };

  function show(opts) {
    if (opts && opts.page) view.page = opts.page;
    render();
  }

  function render() {
    el.replaceChildren(h('div.two-col.two-col--wide',
      h('aside.side-card.side-card--nav',
        h('nav.side-nav', { 'aria-label': t('m.nav') }, NAV.map(function (p) {
          var on = view.page === p;
          return h('button.side-nav__item.side-nav__item--dot' + (on ? '.is-on' : ''), { type: 'button', 'aria-current': on ? 'page' : null, 'data-mpage': p, onclick: function () {
            if (!IN_DEMO[p]) { toast(t('toast.notInDemo', { what: t('m.page.' + p) })); return; }
            view.page = p; render(); log('manager', 'page', { page: p });
          } }, h('span.nav-dot', { 'aria-hidden': 'true' }), h('span', { text: t('m.page.' + p) }));
        }))),
      h('main.col-main', view.page === 'customers' ? customers() : view.page === 'cards' ? cards() : view.page === 'staff' ? staff() : dashboard())));
  }

  /* ---------- Dashboard ---------- */

  function dashboard() {
    var plan = state.plans[0];
    var n = todayNumbers();
    var takings = revenue(TODAY_BASE.revenue, state.today.cards, state.today.companions);
    var week = [];
    for (var d = 0; d < 7; d++) week.push(state.plans[d]);
    return h('div.stack',
      h('small.live-note', h('span.pulse', { 'aria-hidden': 'true' }), t('m.refresh')),
      h('div.row-between', h('h2.sec-title', { text: t('m.todayRounds') }), h('span.date-chip', icon('calendar', 15), dmy(state.at))),
      h('div.grid-3', plan.rounds.map(roundCard)),
      view.open ? participants(view.open) : null,
      h('h2.sec-title', { text: t('m.inNumbers') }),
      h('div.grid-5',
        kpi(t('m.kpi.revenue'), money(takings), delta(takings, YESTERDAY.revenue), 'revenue'),
        kpi(t('m.kpi.bookings'), String(n.bookings), delta(n.bookings, YESTERDAY.bookings), 'bookings'),
        kpi(t('m.kpi.holds'), String(n.holds), null, 'holds'),
        kpi(t('m.kpi.cards'), String(n.cards), delta(n.cards, YESTERDAY.cards), 'cards'),
        kpi(t('m.kpi.companions'), String(n.companions), delta(n.companions, YESTERDAY.companions), 'companions')),
      weekCard(week),
      h('div.grid-3',
        tileStat(t('m.stat.24h'), n.entries, true),
        tileStat(t('m.stat.7d'), STATS.entries7 + n.entries),
        tileStat(t('m.stat.30d'), STATS.entries30 + n.entries),
        tileStat(t('m.stat.cards30'), STATS.cardsSold30 + state.today.cards),
        tileStat(t('m.stat.expiring'), STATS.expiring30),
        tileStat(t('m.stat.new7'), STATS.newCustomers7)),
      h('section.card.stack-sm',
        h('b', { text: t('m.activity') }),
        h('div.feed', state.activity.slice(0, 8).map(function (a) {
          return h('div.feed__row' + (a.fresh ? '.is-fresh' : ''), h('span.nav-dot.is-on', { 'aria-hidden': 'true' }), h('span', { text: activityLine(a) }), h('small.muted', { text: a.time }));
        }))));
  }

  function roundCard(r) {
    var meta = roundById(r.id);
    var on = view.open === r.id;
    return h('section.card.round-card' + (on ? '.is-on' : ''), { 'data-mround': r.id },
      h('div.row-between', h('b', { text: roundName(r.id) + ' ' + meta.start + ' - ' + meta.end }), h('span.chip.chip--' + level(r), { 'data-pct': r.id, text: pct(r) + '%' })),
      capacityBar(r),
      h('div.row-between', h('span', { 'data-kids': r.id, text: t('d.kids', { n: r.booked, cap: r.capacity }) }), h('small.muted', { text: t('d.free', { n: free(r) }) })),
      h('button.link', { type: 'button', 'data-manage': r.id, 'aria-expanded': String(on), onclick: function () { view.open = on ? null : r.id; view.adding = false; render(); } }, t(on ? 'm.closeManage' : 'm.manage')));
  }

  function participants(id) {
    var r = state.plans[0].rounds.filter(function (x) { return x.id === id; })[0];
    var meta = roundById(id);
    var rows = state.participants[id];
    return h('section.card.stack-sm.parts', { 'data-participants': id },
      h('div.row-between',
        h('b', { text: t('m.participants', { round: roundName(id) + ' ' + meta.start + ' - ' + meta.end }) + ' · ' + r.booked + '/' + r.capacity }),
        h('span.btn-row',
          h('button.btn.btn--peach.btn--sm', { type: 'button', 'data-add': id, onclick: function () { view.adding = true; view.addQ = ''; render(); var i = el.querySelector('[data-add-search]'); if (i) i.focus(); } }, '+ ' + t('m.add')),
          h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: function () { view.open = null; render(); } }, t('common.close')))),
      view.adding ? addBox(id) : null,
      rows.slice(0, 10).map(function (p) {
        var c = p.customer && customer(p.customer);
        return h('div.part-row' + (p.fresh ? '.is-fresh' : ''),
          h('span.stack-xs',
            h('span', h('b', { text: c ? personName(c) : t('d.walkin') }), p.arrived ? h('small.ok', { text: ' · ' + t('m.arrived') }) : null),
            h('small.muted', { text: [c ? c.phone : t('d.noDetails'), t('type.' + p.type), p.companion ? t('d.plusCompanion') : '', p.ticket].filter(Boolean).join(' · ') })),
          h('span.btn-row',
            h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: function () { toast(t('toast.notInDemo', { what: t('m.move') })); } }, t('m.move')),
            h('button.btn.btn--ghost.btn--sm.btn--danger', { type: 'button', 'data-remove': p.id, onclick: function () { removeParticipant(id, p.id); toast(t('m.removed')); } }, t('m.remove'))));
      }),
      rows.length > 10 ? h('small.muted', { text: t('d.more', { n: rows.length - 10 }) }) : null);
  }

  function addBox(id) {
    var input = h('input.input.input--focus', { type: 'search', placeholder: t('m.addPh'), value: view.addQ, 'aria-label': t('m.addTitle'), 'data-add-search': '', oninput: function () { view.addQ = input.value; paint(); } });
    var list = h('div.stack-xs');
    function paint() {
      var q = view.addQ.trim().toLowerCase();
      var found = q ? state.customers.filter(function (c) { return [c.he, c.en, c.phone, c.id].join(' ').toLowerCase().indexOf(q) !== -1; }).slice(0, 5) : [];
      list.replaceChildren.apply(list, found.map(function (c) {
        return h('button.pick-row', { type: 'button', 'data-pick': c.id, onclick: function () { add(id, c.id, personName(c)); } }, avatar(personName(c), 'peach'), h('span', h('b', { text: personName(c) }), h('small.muted', { text: c.id + ' · ' + c.phone })));
      }));
    }
    paint();
    return h('div.add-box.stack-sm',
      h('b', { text: t('m.addTitle') }),
      input, list,
      h('span.btn-row',
        h('button.btn.btn--ghost.btn--sm', { type: 'button', 'data-walkin': '', onclick: function () { add(id, null, t('d.walkin')); } }, t('m.walkin')),
        h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: function () { view.adding = false; render(); } }, t('common.cancel'))));
  }

  function add(id, customerId, name) {
    var res = addParticipant(id, customerId);
    if (res.error) { toast(t('m.full'), 'bad'); return; }
    view.adding = false;
    toast(t('m.added', { name: name }), 'good');
    log('manager', 'participant added', { round: id, customer: customerId });
  }

  function kpi(label, value, d, key) {
    return h('div.card.kpi', h('small.muted', { text: label }), h('b.kpi__num', { 'data-kpi': key, text: value }),
      d === null ? h('small.muted', { text: ' ' }) : h('small.' + (d >= 0 ? 'up' : 'down'), { text: (d >= 0 ? '▲ +' : '▼ ') + d + '% ' + t('m.vsYesterday') }));
  }
  function tileStat(label, value, hot) {
    return h('div.card.stat-tile', h('b.big-num' + (hot ? '' : '.big-num--ink'), { text: Number(value).toLocaleString('en-US') }), h('small.muted', { text: label }));
  }

  function weekCard(week) {
    var grid = weekGrid(week);
    return h('section.card.stack-sm',
      h('b', { text: t('m.week') }),
      h('div.week', { role: 'table', 'aria-label': t('m.week') },
        h('div.week__row', { role: 'row' }, h('span'), week.map(function (p) {
          var d = dateOf(p.offset);
          return h('small.week__head', { role: 'columnheader' }, h('span', { text: weekdayShort(d) }), h('span.muted', { text: String(d.getDate()) }));
        })),
        grid.map(function (row) {
          return h('div.week__row', { role: 'row' }, h('small.week__label', { text: roundById(row.round).start }), row.cells.map(function (c) {
            return h('span.week__cell' + (c === null ? '.is-none' : c >= 75 ? '.is-hot' : c >= 40 ? '.is-warm' : ''), { role: 'cell', text: c === null ? '–' : c + '%' });
          }));
        })));
  }

  /* ---------- Customers ---------- */

  function customers() {
    var q = view.cq.trim().toLowerCase();
    var rows = state.customers.filter(function (c) { return !q || [c.he, c.en, c.phone, c.id].join(' ').toLowerCase().indexOf(q) !== -1; });
    var input = h('input.input', { type: 'search', placeholder: t('m.custSearch'), value: view.cq, 'aria-label': t('m.custSearch'), oninput: function () { view.cq = input.value; render(); var i = el.querySelector('[data-cust-search]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 'data-cust-search': '' });
    return h('section.card.stack',
      h('div.row-between', h('h2.sec-title', { text: t('m.page.customers') }), h('small.muted', { text: t('m.custCount', { n: CUSTOMER_TOTAL.toLocaleString('en-US') }) })),
      h('div.row-between', input, h('button.btn.btn--peach', { type: 'button', onclick: function () { toast(t('toast.notInDemo', { what: t('m.addCustomer') })); } }, '+ ' + t('m.addCustomer'))),
      h('table.table',
        h('thead', h('tr', [t('m.col.name'), t('m.col.id'), t('m.col.phone'), t('m.col.email')].map(function (x) { return h('th', { text: x }); }))),
        h('tbody', rows.map(function (c) {
          return h('tr.table__row', { tabindex: '0', 'data-crow': c.id, onclick: function () { details(c); }, onkeydown: function (e) { if (e.key === 'Enter') details(c); } },
            h('td', h('b', { text: personName(c) })), h('td.mono', { text: c.id }), h('td.mono', { text: c.phone }), h('td', { text: c.email }));
        }))));
  }

  function details(c) {
    var cards = cardsOf(c.id);
    modal(h('div.dialog.stack-sm',
      h('div.row-between', h('h2.dialog__title', { text: t('m.custDetails') }), h('span.btn-row',
        h('button.btn.btn--ghost.btn--danger.btn--sm', { type: 'button', onclick: function () { toast(t('toast.notInDemo', { what: t('m.delete') })); } }, t('m.delete')),
        h('button.icon-btn', { type: 'button', 'aria-label': t('common.close'), onclick: closeModal }, icon('x', 16)))),
      h('div.cust-head', avatar(personName(c), 'peach'), h('span', h('b', { text: personName(c) }), h('small.muted', { text: c.id + ' · ' + c.phone + ' · ' + c.email }))),
      h('div.grid-3',
        fact(t('m.channel'), t('channel.' + c.channel)),
        fact(t('m.heard'), t('heard.' + c.heard)),
        fact(t('m.joined'), ymdArr(c.joined))),
      h('b', { text: t('m.custCards', { n: cards.length }) }),
      cards.length ? cards.map(function (k) {
        return h('div.part-row', h('span.mono', { text: k.serial }), h('span', { text: t('p.left', { n: entriesLeft(k), total: PRICES.cardEntries }) }), h('span.chip.chip--' + statusTone(k.status), { text: t('m.status.' + k.status) }));
      }) : h('small.muted', { text: t('m.noCards') })), { label: t('m.custDetails'), cls: 'modal__panel--wide' });
  }
  function fact(label, value) { return h('div.fact', h('small.muted', { text: label }), h('b', { text: value })); }

  /* ---------- Punch cards ---------- */

  function cards() {
    var q = view.cardQ.trim().toLowerCase();
    var rows = state.cards.filter(function (k) {
      var c = customer(k.customer);
      var group = k.status === 'active' || k.status === 'used' ? 'active' : k.status;
      return group === view.cardStatus && (!q || [k.serial, c.he, c.en, c.phone, c.id].join(' ').toLowerCase().indexOf(q) !== -1);
    });
    var input = h('input.input', { type: 'search', placeholder: t('m.cardSearch'), value: view.cardQ, 'aria-label': t('m.cardSearch'), oninput: function () { view.cardQ = input.value; render(); var i = el.querySelector('[data-card-search]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 'data-card-search': '' });
    return h('section.card.stack',
      h('div.row-between', h('h2.sec-title', { text: t('m.page.cards') }), h('small.muted', { text: t('m.cardCount', { n: CARD_TOTAL }) })),
      h('div.pills', ['active', 'expired', 'cancelled'].map(function (s) {
        return h('button.pill' + (view.cardStatus === s ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(view.cardStatus === s), onclick: function () { view.cardStatus = s; render(); }, text: t('m.cards.' + s) });
      })),
      input,
      h('table.table',
        h('thead', h('tr', ['serial', 'customer', 'usage', 'issued', 'validity', 'status'].map(function (x) { return h('th', { text: t('m.cardCol.' + x) }); }))),
        h('tbody', rows.length ? rows.map(function (k) {
          var c = customer(k.customer);
          return h('tr',
            h('td.mono', { text: k.serial }),
            h('td', h('b', { text: personName(c) }), h('small.muted.block', { text: c.id + ' · ' + c.phone }), k.soldBy ? h('small.muted.block', { text: t('m.soldBy', { who: personName(STAFF.filter(function (s) { return s.id === k.soldBy; })[0]) }) }) : null),
            h('td.mono', { text: k.used + ' / ' + PRICES.cardEntries }),
            h('td', { text: ymdArr(k.issued) }),
            h('td', { text: t('p.noExpiry') }),
            h('td', h('span.chip.chip--' + statusTone(k.status), { text: t('m.status.' + k.status) })));
        }) : h('tr', h('td', { colspan: '6', text: t('m.noCards') })))));
  }
  function statusTone(s) { return s === 'active' ? 'plenty' : s === 'cancelled' ? 'red' : ''; }

  /* ---------- Staff ---------- */

  function staff() {
    return h('div.stack',
      h('div.seg', { role: 'tablist', 'aria-label': t('m.page.staff') }, ['team', 'perms'].map(function (k) {
        return h('button.seg__btn' + (view.staffTab === k ? '.is-on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(view.staffTab === k), 'data-stab': k, onclick: function () { view.staffTab = k; render(); }, text: t('m.staff.' + k) });
      })),
      view.staffTab === 'team' ? team() : perms());
  }

  function team() {
    return h('section.card.stack-sm',
      h('div.row-between', h('h2.sec-title', { text: t('m.staff.team') }), h('button.btn.btn--peach', { type: 'button', onclick: function () { toast(t('toast.notInDemo', { what: t('m.addStaff') })); } }, t('m.addStaff'))),
      STAFF.map(function (s) {
        return h('div.staff-row',
          avatar(personName(s), s.role === 'manager' ? 'sage' : 'peach'),
          h('span.stack-xs', h('span', h('b', { text: personName(s) }), s.me ? h('small.muted', { text: ' (' + t('m.me') + ')' }) : null), h('small.muted', { text: s.email }), h('small.muted.mono', { text: s.phone })),
          h('span.chip.role--' + s.role, { text: t('role.' + s.role) }),
          h('span.btn-row',
            s.role === 'cashier' ? h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: function () { toast(t('toast.notInDemo', { what: t('m.pin') })); } }, t('m.pin')) : null,
            h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: function () { toast(t('toast.notInDemo', { what: t('m.edit') })); } }, t('m.edit')),
            h('button.btn.btn--ghost.btn--sm.btn--danger', { type: 'button', disabled: s.me ? true : null, onclick: function () { toast(t('toast.notInDemo', { what: t('m.delete') })); } }, t('m.delete'))));
      }));
  }

  function perms() {
    var cell = function (on) { return h('td', h('span.switch' + (on ? '.is-on' : ''), { role: 'switch', 'aria-checked': String(on), 'aria-disabled': 'true' })); };
    return h('section.card.stack-sm',
      h('h2.sec-title', { text: t('m.permsTitle') }),
      h('small.muted', { text: t('m.permsSub') }),
      h('p.info-bar', icon('lock', 14), h('span', { text: t('m.viewOnly') })),
      h('table.table.perms',
        h('thead', h('tr', h('th', { text: t('m.perm') }), ['admin', 'manager', 'cashier'].map(function (r) { return h('th', h('b', { text: t('role.' + r) }), h('small.muted.block', { text: t('m.roleNote.' + r) })); }))),
        h('tbody', PERMISSIONS.map(function (g) {
          return [h('tr.perms__group', h('td', { colspan: '4', text: t('perm.group.' + g.group) }))].concat(g.rows.map(function (p) {
            return h('tr', h('td', h('b', { text: t('perm.' + p.key) }), h('small.muted.mono.block', { text: p.key })), cell(true), cell(p.manager), cell(p.cashier));
          }));
        }))));
  }

  subscribe(function () { if (app.role === 'manager') render(); });

  return { el: el, show: show, render: render };
}
