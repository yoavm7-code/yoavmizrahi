/* Memesh demo: the one shared state behind all three apps. A booking the parent makes, a punch at the
   desk and a participant the manager adds all land here, so every screen tells the same story.
   Screens subscribe and redraw on change. Nothing is stored: a refresh starts again. */

import { CUSTOMERS, CARDS, BOOKINGS, ENTRIES, STAFF, ACTIVITY, ARRIVED_TODAY, TODAY_BASE, PARENT_ID, HORIZON, TODAY } from './data.js';
import { dayPlan, entriesLeft, bookingError, punchError, summary, canCancel, now, hash } from './logic.js';

var listeners = [];

export var state = {
  at: now(),
  customers: CUSTOMERS.map(function (c) { return Object.assign({}, c, { children: c.children.slice() }); }),
  cards: CARDS.map(function (c) { return Object.assign({ status: 'active' }, c); }),
  bookings: BOOKINGS.map(function (b) { return Object.assign({ customer: PARENT_ID }, b); }),
  entries: JSON.parse(JSON.stringify(ENTRIES)),
  plans: {},
  participants: {},
  activity: ACTIVITY.slice(),
  today: { entries: 0, cards: 0, companions: 0, bookings: 0 },
  serial: 5600
};

for (var d = -40; d <= HORIZON; d++) state.plans[d] = dayPlan(d);
buildParticipants();

/* Today's round lists, built once from the booked counts: customers (never the signed-in parent, who
   has no booking today until she makes one) and every third row a walk-in. */
function buildParticipants() {
  var others = CUSTOMERS.filter(function (c) { return c.id !== PARENT_ID; });
  var k = 0;
  state.plans[0].rounds.forEach(function (r) {
    var rows = [];
    for (var i = 0; i < r.booked; i++) {
      var c = i % 3 === 2 ? null : others[k++ % others.length];
      var seed = hash(r.id + i);
      rows.push({
        id: r.id + '-' + i,
        customer: c ? c.id : null,
        type: seed % 5 === 0 ? 'baby' : 'child',
        companion: seed % 7 === 0,
        ticket: 'R-' + ymd(0) + '-' + (4100 + (seed % 800)),
        source: c ? (seed % 2 ? 'card' : 'site') : 'manual',
        arrived: i < ARRIVED_TODAY[r.id]
      });
    }
    state.participants[r.id] = rows;
  });
}

function ymd(offset) {
  var d = new Date(TODAY.year, TODAY.month, TODAY.day + offset);
  return String(d.getFullYear()) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}
function clock() { var t = state.at; return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); }
function log(who, action, detail) { state.activity.unshift({ time: clock(), who: who, action: action, detail: detail, fresh: true }); }

export function subscribe(fn) { listeners.push(fn); }
function changed(what) { listeners.forEach(function (fn) { fn(what); }); }

/* ---------- Lookups ---------- */

export function customer(id) { return state.customers.filter(function (c) { return c.id === id; })[0] || null; }
export function card(serial) { return state.cards.filter(function (c) { return c.serial === serial; })[0] || null; }
export function cardsOf(id) { return state.cards.filter(function (c) { return c.customer === id; }); }
export function booking(serial) { return state.bookings.filter(function (b) { return b.serial === serial; })[0] || null; }
export function round(offset, id) { var p = state.plans[offset]; return p && p.rounds.filter(function (r) { return r.id === id; })[0]; }
export function staffMe() { return STAFF.filter(function (s) { return s.me; })[0]; }
export function parent() { return customer(PARENT_ID); }

/* ---------- The parent ---------- */

/* Books children into a round from a punch card. Returns { booking } or { error }. */
export function book(cardSerial, offset, roundId, count, companion) {
  var k = card(cardSerial);
  var r = round(offset, roundId);
  var err = bookingError(k, r, count, offset, state.at);
  if (err) return { error: err };
  k.used += count;
  r.booked += count;
  var b = { serial: 'R-' + ymd(offset) + '-' + (++state.serial), card: cardSerial, customer: k.customer, day: offset, round: roundId, count: count, companion: !!companion, status: 'booked', fresh: true };
  state.bookings.unshift(b);
  state.today.bookings++;
  if (companion) state.today.companions++;
  if (offset === 0) addRows(roundId, k.customer, count, companion, b.serial, 'card');
  log(k.customer, 'book', roundId + (offset ? '@' + offset : ''));
  changed('book');
  return { booking: b, summary: summary(count, companion) };
}

/* Cancels a booking at least a day ahead; its entries go back to the card. */
export function cancel(serial) {
  var b = booking(serial);
  if (!canCancel(b, state.at)) return { error: 'late' };
  b.status = 'cancelled';
  var k = card(b.card);
  if (k) k.used -= b.count;
  var r = round(b.day, b.round);
  if (r) r.booked -= b.count;
  log(b.customer, 'cancel', b.round + (b.day ? '@' + b.day : ''));
  changed('cancel');
  return { booking: b };
}

export function saveProfile(id, fields) {
  Object.assign(customer(id), fields);
  changed('profile');
}

/* ---------- The desk ---------- */

/* Punches entries off a card at the desk. Returns { left } or { error }. */
export function punch(serial, count) {
  var k = card(serial);
  var err = punchError(k, count);
  if (err) return { error: err };
  k.used += count;
  state.today.entries += count;
  (state.entries[serial] = state.entries[serial] || []).unshift({ day: 0, time: clock(), count: count, fresh: true });
  log('dana', 'punch', k.customer + ' · ' + count);
  changed('punch');
  return { left: entriesLeft(k) };
}

/* Marks a round ticket as arrived. Only on the round's own day. */
export function checkIn(serial) {
  var b = booking(serial);
  if (!b || b.status === 'cancelled') return { error: 'cancelled' };
  if (b.day !== 0) return { error: 'day' };
  var row = (state.participants[b.round] || []).filter(function (p) { return p.ticket === serial; });
  if (!row.length) return { error: 'day' };
  if (row[0].arrived) return { error: 'already' };
  row.forEach(function (p) { p.arrived = true; });
  b.status = 'used';
  log('dana', 'checkin', b.customer + ' · ' + b.round);
  changed('checkin');
  return { booking: b };
}

/* Marks one row of today's round as arrived, from the desk's arrivals list. */
export function arrive(roundId, rowId) {
  var row = (state.participants[roundId] || []).filter(function (p) { return p.id === rowId; })[0];
  if (!row || row.arrived) return;
  row.arrived = true;
  log('dana', 'arrive', roundId);
  changed('arrive');
}

/* ---------- The manager ---------- */

/* Adds one child to today's round by hand: a known customer, or a walk-in when id is null. */
export function addParticipant(roundId, id) {
  var r = round(0, roundId);
  if (r.booked >= r.capacity) return { error: 'full' };
  r.booked++;
  addRows(roundId, id, 1, false, 'R-' + ymd(0) + '-' + (++state.serial), 'manual', true);
  state.today.bookings++;
  log('dana', 'manual', roundId + (id ? ' · ' + id : ''));
  changed('participants');
  return { ok: true };
}

export function removeParticipant(roundId, rowId) {
  var rows = state.participants[roundId];
  var i = rows.findIndex(function (p) { return p.id === rowId; });
  if (i === -1) return;
  rows.splice(i, 1);
  round(0, roundId).booked--;
  log('dana', 'remove', roundId);
  changed('participants');
}

function addRows(roundId, id, count, companion, ticket, source, arrived) {
  var rows = state.participants[roundId];
  for (var i = 0; i < count; i++) {
    rows.unshift({ id: ticket + '-' + i, customer: id, type: 'child', companion: !!companion && i === 0, ticket: ticket, source: source, arrived: !!arrived, fresh: true });
  }
}

/* ---------- Numbers for the dashboard ---------- */

export function todayNumbers() {
  return {
    cards: TODAY_BASE.cards + state.today.cards,
    companions: TODAY_BASE.companions + state.today.companions,
    holds: TODAY_BASE.holds,
    bookings: state.plans[0].rounds.reduce(function (a, r) { return a + r.booked; }, 0),
    /* Everyone checked in to today's rounds, plus entries punched straight off a card at the desk. */
    entries: Object.keys(state.participants).reduce(function (a, k) { return a + state.participants[k].filter(function (p) { return p.arrived; }).length; }, 0) + state.today.entries
  };
}
