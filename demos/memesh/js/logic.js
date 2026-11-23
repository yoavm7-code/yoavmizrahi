/* Memesh demo: the rules behind the replica. Pure functions, no DOM, so Node can test them.
   Availability, booking and cancelling, punching, the dashboard's numbers and the week grid. */

import { TODAY, CAPACITY, ROUNDS, DEFAULT_BOOKED, DAYS, PRICES, CANCEL_HOURS } from './data.js';

/* ---------- Dates ---------- */

export function dateOf(offset) { return new Date(TODAY.year, TODAY.month, TODAY.day + offset); }
export function now() { return new Date(TODAY.year, TODAY.month, TODAY.day, TODAY.hour, TODAY.minute); }
export function offsetOf(date) {
  var a = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((a - dateOf(0)) / 86400000);
}
function hm(text) { var p = String(text).split(':'); return { h: Number(p[0]), m: Number(p[1]) }; }
export function roundStart(offset, roundId) {
  var t = hm(roundById(roundId).start);
  var d = dateOf(offset);
  d.setHours(t.h, t.m, 0, 0);
  return d;
}
export function roundEnd(offset, roundId) {
  var t = hm(roundById(roundId).end);
  var d = dateOf(offset);
  d.setHours(t.h, t.m, 0, 0);
  return d;
}
export function roundById(id) { return ROUNDS.filter(function (r) { return r.id === id; })[0]; }

/* ---------- The schedule ---------- */

/* A day: closed, free entry (no rounds), or open with its rounds and how many children are booked. */
export function dayPlan(offset) {
  var d = DAYS[offset] || {};
  if (d.mode === 'closed' || d.mode === 'free') return { offset: offset, mode: d.mode, rounds: [] };
  var ids = d.rounds || ROUNDS.map(function (r) { return r.id; });
  var booked = d.booked || DEFAULT_BOOKED;
  return {
    offset: offset,
    mode: 'open',
    rounds: ids.map(function (id) { return { id: id, booked: booked[id] || 0, capacity: CAPACITY }; })
  };
}

export function free(round) { return Math.max(0, round.capacity - round.booked); }
export function pct(round) { return Math.round(round.booked / round.capacity * 100); }

/* plenty (green), few (amber) or full (red), by the share of spots still free. */
export function level(round) {
  var f = free(round);
  if (f === 0) return 'full';
  return f / round.capacity > 0.25 ? 'plenty' : 'few';
}

/* The dot under a day: closed, free entry, or the best availability among its rounds still ahead. */
export function dayLevel(plan, at) {
  if (plan.mode !== 'open') return plan.mode;
  var ahead = plan.rounds.filter(function (r) { return !isOver(plan.offset, r.id, at); });
  if (!ahead.length) return 'closed';
  var levels = ahead.map(level);
  return levels.indexOf('plenty') !== -1 ? 'plenty' : levels.indexOf('few') !== -1 ? 'few' : 'full';
}

/* A round you can still book: it hasn't ended yet. Arriving late is allowed; the visit ends on time. */
export function isOver(offset, roundId, at) { return at >= roundEnd(offset, roundId); }

/* ---------- Booking ---------- */

export function entriesLeft(card) { return PRICES.cardEntries - card.used; }

/* Why a booking can't go ahead, or null. count is the number of children. */
export function bookingError(card, round, count, offset, at) {
  if (card.status && card.status !== 'active') return 'expired';
  if (isOver(offset, round.id, at)) return 'over';
  if (count > entriesLeft(card)) return 'entries';
  if (count > free(round)) return 'spots';
  return null;
}

/* The largest count the stepper allows: what the card and the round can both take. */
export function maxCount(card, round) { return Math.max(1, Math.min(entriesLeft(card), free(round), 6)); }

/* Everyone who comes in: each child brings one companion, plus the extra one if ticked. */
export function summary(count, companion) {
  return { children: count, companions: count, extra: companion ? 1 : 0, total: count * 2 + (companion ? 1 : 0), price: companion ? PRICES.companion : 0 };
}

/* Cancelling is allowed up to CANCEL_HOURS before the round starts. */
export function canCancel(booking, at) {
  return booking.status === 'booked' && roundStart(booking.day, booking.round) - at >= CANCEL_HOURS * 3600000;
}

/* Bookings for a tab: upcoming, past (within a range of days), cancelled, or all. Newest first,
   except upcoming, which runs soonest first. */
export function bookingsFor(list, tab, rangeDays, at) {
  var upcoming = function (b) { return b.status === 'booked' && !isOver(b.day, b.round, at); };
  var rows = list.filter(function (b) {
    if (tab === 'upcoming') return upcoming(b);
    if (tab === 'cancelled') return b.status === 'cancelled';
    if (tab === 'past') return b.status !== 'cancelled' && !upcoming(b) && (!rangeDays || -b.day <= rangeDays);
    return true;
  });
  return rows.sort(function (a, b) { return tab === 'upcoming' ? a.day - b.day : b.day - a.day; });
}

/* ---------- Punching ---------- */

export function punchError(card, count) {
  if (card.status && card.status !== 'active') return card.status === 'expired' ? 'expired' : 'used';
  if (entriesLeft(card) <= 0) return 'used';
  if (count < 1 || count > entriesLeft(card)) return 'count';
  return null;
}

/* ---------- The back office ---------- */

/* Change against yesterday, as a whole percentage (or null with nothing to compare). */
export function delta(today, yesterday) {
  if (!yesterday) return null;
  return Math.round((today - yesterday) / yesterday * 100);
}

/* Today's money: the base takings plus cards sold and extra companions added in this visit. */
export function revenue(base, extraCards, extraCompanions) {
  return base + extraCards * PRICES.card + extraCompanions * PRICES.companion;
}

/* Seven days from today by round: a % of spots booked, or null where there is no round. */
export function weekGrid(plans) {
  return ROUNDS.map(function (r) {
    return {
      round: r.id,
      cells: plans.map(function (p) {
        var x = p.rounds.filter(function (y) { return y.id === r.id; })[0];
        return x ? pct(x) : null;
      })
    };
  });
}

/* Good morning / afternoon / evening / night, by the hour. */
export function greeting(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/* Initials for an avatar: the first letter of the first two words. */
export function initials(name) {
  return String(name).split(/[\s-]+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase();
}

/* Customers for the till's search: matched on name (either language), phone, number or email. */
export function searchCustomers(list, q, sort, filter, cards) {
  var s = String(q || '').trim().toLowerCase();
  var rows = list.filter(function (c) {
    if (s && [c.he, c.en, c.phone, c.id, c.email].join(' ').toLowerCase().indexOf(s) === -1) return false;
    if (filter === 'vip' && !c.vip) return false;
    if (filter === 'frozen' && !c.frozen) return false;
    if (filter === 'active' && !cards.some(function (k) { return k.customer === c.id && (!k.status || k.status === 'active') && entriesLeft(k) > 0; })) return false;
    return true;
  });
  var joined = function (c) { return new Date(c.joined[0], c.joined[1], c.joined[2]).getTime(); };
  if (sort === 'newest') rows.sort(function (a, b) { return joined(b) - joined(a); });
  else if (sort === 'purchase') rows.sort(function (a, b) { return lastPurchase(b, cards) - lastPurchase(a, cards); });
  else rows.sort(function (a, b) { return a.en.localeCompare(b.en); });
  return rows;
}
function lastPurchase(c, cards) {
  var times = cards.filter(function (k) { return k.customer === c.id; }).map(function (k) { return new Date(k.issued[0], k.issued[1], k.issued[2]).getTime(); });
  return times.length ? Math.max.apply(null, times) : 0;
}

/* ---------- Codes ---------- */

export function hash(text) {
  var h = 0x811c9dc5;
  var s = String(text);
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/* A QR-looking grid for a serial: three finder squares and a pattern seeded by the serial. It is a
   picture, not a scannable code, so no real data can ever be read from it. */
export function qrModules(serial, n) {
  var size = n || 25;
  var grid = [];
  var seed = hash(serial);
  for (var y = 0; y < size; y++) {
    var row = [];
    for (var x = 0; x < size; x++) {
      seed = Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) >>> 0;
      row.push((seed & 7) < 4);
    }
    grid.push(row);
  }
  [[0, 0], [size - 7, 0], [0, size - 7]].forEach(function (o) {
    for (var y = -1; y <= 7; y++) {
      for (var x = -1; x <= 7; x++) {
        var gy = o[1] + y, gx = o[0] + x;
        if (gy < 0 || gx < 0 || gy >= size || gx >= size) continue;
        var ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
        grid[gy][gx] = y >= 0 && x >= 0 && y < 7 && x < 7 && ring !== 2;
      }
    }
  });
  return grid;
}
