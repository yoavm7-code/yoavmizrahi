// The Memesh replica's rules (demos/memesh/js/logic.js), its made-up data and its two languages.
// The DOM-free modules only, so this runs in Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import * as D from '../../demos/memesh/js/data.js';
import * as L from '../../demos/memesh/js/logic.js';
import { STRINGS } from '../../demos/memesh/js/i18n.js';

const JS = new URL('../../demos/memesh/js/', import.meta.url);
const card = (used, status) => ({ serial: 'M-X', used, status: status || 'active' });

/* ---------- The schedule ---------- */

test('a day is open with its rounds, closed, or free entry', () => {
  const today = L.dayPlan(0);
  assert.equal(today.mode, 'open');
  assert.deepEqual(today.rounds.map((r) => r.id), ['morning', 'noon', 'evening']);
  assert.equal(L.dayPlan(4).rounds.length, 2, 'Friday has no evening round');
  assert.deepEqual(L.dayPlan(5), { offset: 5, mode: 'closed', rounds: [] });
  assert.equal(L.dayPlan(9).mode, 'free');
  assert.deepEqual(L.dayPlan(2).rounds.map((r) => r.booked), [7, 2, 16]);
  assert.deepEqual(L.dayPlan(7).rounds.map((r) => r.booked), [D.DEFAULT_BOOKED.morning, D.DEFAULT_BOOKED.noon, D.DEFAULT_BOOKED.evening]);
});

test('availability: plenty, few, full, and a day\'s dot from the rounds still ahead', () => {
  assert.equal(L.level({ booked: 10, capacity: 40 }), 'plenty');
  assert.equal(L.level({ booked: 34, capacity: 40 }), 'few');
  assert.equal(L.level({ booked: 40, capacity: 40 }), 'full');
  assert.equal(L.free({ booked: 45, capacity: 40 }), 0);
  const at = L.now();
  assert.equal(L.isOver(0, 'morning', at), true, 'the morning round ended at 12:30');
  assert.equal(L.isOver(0, 'noon', at), false, 'the noon round is still on');
  assert.equal(L.dayLevel(L.dayPlan(5), at), 'closed');
  assert.equal(L.dayLevel(L.dayPlan(9), at), 'free');
  assert.equal(L.dayLevel(L.dayPlan(0), at), 'plenty');
});

/* ---------- Booking ---------- */

test('booking needs entries on the card, room in the round and a round that hasn\'t ended', () => {
  const at = L.now();
  const evening = { id: 'evening', booked: 24, capacity: 40 };
  assert.equal(L.bookingError(card(2), evening, 2, 0, at), null);
  assert.equal(L.bookingError(card(11), evening, 2, 0, at), 'entries');
  assert.equal(L.bookingError(card(0), { id: 'evening', booked: 39, capacity: 40 }, 2, 0, at), 'spots');
  assert.equal(L.bookingError(card(0), { id: 'morning', booked: 1, capacity: 40 }, 1, 0, at), 'over');
  assert.equal(L.bookingError(card(0, 'expired'), evening, 1, 0, at), 'expired');
  assert.equal(L.maxCount(card(10), evening), 2, 'two entries left');
  assert.equal(L.maxCount(card(0), { booked: 38, capacity: 40 }), 2, 'two spots left');
  assert.equal(L.maxCount(card(0), { booked: 0, capacity: 40 }), 6, 'capped at six children');
});

test('the summary: each child brings one companion, plus the paid extra', () => {
  assert.deepEqual(L.summary(2, false), { children: 2, companions: 2, extra: 0, total: 4, price: 0 });
  assert.deepEqual(L.summary(1, true), { children: 1, companions: 1, extra: 1, total: 3, price: D.PRICES.companion });
});

test('cancelling is allowed up to 24 hours before the round', () => {
  const at = L.now();
  assert.equal(L.canCancel({ status: 'booked', day: 0, round: 'evening' }, at), false, 'today is too late');
  assert.equal(L.canCancel({ status: 'booked', day: 1, round: 'morning' }, at), false, 'tomorrow 9:00 is under 24 hours away');
  assert.equal(L.canCancel({ status: 'booked', day: 1, round: 'noon' }, at), false, 'tomorrow 12:30 is 23h20m away');
  assert.equal(L.canCancel({ status: 'booked', day: 1, round: 'evening' }, at), true, 'tomorrow 15:30 is over 24 hours away');
  assert.equal(L.canCancel({ status: 'used', day: 3, round: 'noon' }, at), false);
});

test('booking tabs: upcoming soonest first, past within a range, cancelled, all', () => {
  const at = L.now();
  const list = D.BOOKINGS.concat([{ serial: 'R-N1', day: 3, round: 'noon', status: 'booked' }, { serial: 'R-N2', day: 1, round: 'evening', status: 'booked' }]);
  assert.deepEqual(L.bookingsFor(list, 'upcoming', 0, at).map((b) => b.serial), ['R-N2', 'R-N1']);
  assert.ok(L.bookingsFor(list, 'past', 31, at).every((b) => -b.day <= 31 && b.status !== 'cancelled'));
  assert.equal(L.bookingsFor(list, 'past', 0, at).length, D.BOOKINGS.filter((b) => b.status !== 'cancelled').length);
  assert.deepEqual(L.bookingsFor(list, 'cancelled', 0, at).map((b) => b.status), ['cancelled']);
  assert.equal(L.bookingsFor(list, 'all', 0, at).length, list.length);
});

/* ---------- Punching and the back office ---------- */

test('punching: up to what is left, never from a used, expired or cancelled card', () => {
  assert.equal(L.punchError(card(2), 3), null);
  assert.equal(L.punchError(card(11), 2), 'count');
  assert.equal(L.punchError(card(12), 1), 'used');
  assert.equal(L.punchError(card(0, 'expired'), 1), 'expired');
  assert.equal(L.punchError(card(0), 0), 'count');
  assert.equal(L.entriesLeft(card(2)), 10);
});

test('dashboard numbers: deltas, revenue, the week grid and the greeting', () => {
  assert.equal(L.delta(42, 36), 17);
  assert.equal(L.delta(5, 0), null);
  assert.equal(L.revenue(1000, 1, 2), 1000 + D.PRICES.card + 2 * D.PRICES.companion);
  const week = [0, 1, 2, 3, 4, 5, 6].map(L.dayPlan);
  const grid = L.weekGrid(week);
  assert.deepEqual(grid.map((r) => r.round), ['morning', 'noon', 'evening']);
  assert.equal(grid[2].cells[4], null, 'no evening round on Friday');
  assert.equal(grid[0].cells[5], null, 'closed on Saturday');
  assert.equal(grid[2].cells[6], 100, 'Sunday evening is full');
  assert.equal(L.greeting(9), 'morning');
  assert.equal(L.greeting(13), 'afternoon');
  assert.equal(L.greeting(19), 'evening');
  assert.equal(L.greeting(23), 'night');
  assert.equal(L.initials('Adi Alon'), 'AA');
  assert.equal(L.initials('טל בן-לוי'), 'טב');
});

test('customer search: name in either language, phone, number; sorts and filters', () => {
  const all = L.searchCustomers(D.CUSTOMERS, '', 'az', 'all', D.CARDS);
  assert.equal(all.length, D.CUSTOMERS.length);
  assert.deepEqual(L.searchCustomers(D.CUSTOMERS, 'עדי', 'az', 'all', D.CARDS).map((c) => c.id), ['L-2041']);
  assert.deepEqual(L.searchCustomers(D.CUSTOMERS, 'adi alon', 'az', 'all', D.CARDS).map((c) => c.id), ['L-2041']);
  assert.deepEqual(L.searchCustomers(D.CUSTOMERS, '0505550137', 'az', 'all', D.CARDS).map((c) => c.id), ['L-2037']);
  assert.ok(L.searchCustomers(D.CUSTOMERS, '', 'az', 'vip', D.CARDS).every((c) => c.vip));
  assert.equal(L.searchCustomers(D.CUSTOMERS, '', 'newest', 'all', D.CARDS)[0].id, 'L-2040');
  const active = L.searchCustomers(D.CUSTOMERS, '', 'az', 'active', D.CARDS).map((c) => c.id);
  assert.ok(active.includes('L-2041') && !active.includes('L-2034'), 'a used-up card does not count as active');
});

test('the QR picture is the same for a serial, different between serials, with three finder squares', () => {
  const a = L.qrModules('M-20261002-0412');
  assert.equal(a.length, 25);
  assert.deepEqual(a, L.qrModules('M-20261002-0412'));
  assert.notDeepEqual(a, L.qrModules('M-20261115-0488'));
  for (const [x, y] of [[0, 0], [18, 0], [0, 18]]) {
    assert.equal(a[y][x], true, 'finder corner');
    assert.equal(a[y + 2][x + 2], true, 'finder center');
    assert.equal(a[y + 1][x + 1], false, 'finder ring');
  }
});

/* ---------- The data ---------- */

test('the data is consistent: ids unique, every card and booking belongs to a customer', () => {
  assert.equal(new Set(D.CUSTOMERS.map((c) => c.id)).size, D.CUSTOMERS.length);
  assert.equal(new Set(D.CARDS.map((c) => c.serial)).size, D.CARDS.length);
  for (const k of D.CARDS) assert.ok(D.CUSTOMERS.some((c) => c.id === k.customer), k.serial);
  for (const b of D.BOOKINGS) assert.ok(!b.card || D.CARDS.some((k) => k.serial === b.card), b.serial);
  assert.ok(D.CUSTOMERS.some((c) => c.id === D.PARENT_ID));
  assert.equal(D.STAFF.filter((s) => s.me).length, 1);
  for (const c of D.CUSTOMERS) assert.match(c.phone, /^050555\d{4}$/, 'phones stay in the fake 555 range');
  for (const c of D.CUSTOMERS) assert.match(c.email, /@example\.com$/);
});

/* ---------- Both languages ---------- */

test('Hebrew and English have the same keys and placeholders, and no string is empty', () => {
  assert.deepEqual(Object.keys(STRINGS.en).sort(), Object.keys(STRINGS.he).sort());
  for (const lang of ['he', 'en']) for (const [k, v] of Object.entries(STRINGS[lang])) assert.ok(String(v).trim(), lang + ' ' + k);
  const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  for (const [k, v] of Object.entries(STRINGS.he)) assert.equal(vars(STRINGS.en[k]), vars(v), 'placeholders match for ' + k);
});

test('every key the screens ask for exists, and every key is used', async () => {
  const keys = Object.keys(STRINGS.he);
  const asked = new Set();
  const quoted = new Set();
  for (const f of await readdir(JS)) {
    const src = await readFile(new URL(f, JS), 'utf8');
    for (const m of src.matchAll(/\bt\('([\w.]*\w)'/g)) asked.add(m[1]);
    const body = f === 'i18n.js' ? src.replace(/export const STRINGS = \{[\s\S]*?\n\};/, '') : src;
    for (const m of body.matchAll(/'([\w.]*\w)'/g)) quoted.add(m[1]);
  }
  /* Keys built at runtime, like 'legend.' + level, count as used through their prefix. */
  const dynamic = /^(channel|d\.err|d\.greet|d\.sort|d\.filter|demo\.role|demo\.roleSub|heard|legend|m\.cardCol|m\.cards|m\.page|m\.roleNote|m\.staff|m\.status|p\.empty|p\.err|p\.range|p\.scope|p\.status|p\.booked|perm|role|rule|type|act|round)\./;
  for (const k of asked) assert.ok(STRINGS.he[k] !== undefined, 'missing string ' + k);
  for (const k of keys) assert.ok(asked.has(k) || quoted.has(k) || dynamic.test(k), 'unused string ' + k);
});
