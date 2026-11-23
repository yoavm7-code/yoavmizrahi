// The Toto Mundial replica's rules (demos/toto-mundial/js/logic.js), its made-up data and its two
// languages. The DOM-free modules only, so this runs in Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import * as D from '../../demos/toto-mundial/js/data.js';
import * as L from '../../demos/toto-mundial/js/logic.js';
import { STRINGS } from '../../demos/toto-mundial/js/i18n.js';

const JS = new URL('../../demos/toto-mundial/js/', import.meta.url);

/* ---------- Scoring ---------- */

test('match points: exact +10, direction +5, wrong 0, nothing without a pick', () => {
  assert.deepEqual(L.matchPoints([2, 1], [2, 1]), { points: 10, kind: 'exact', advances: false });
  assert.deepEqual(L.matchPoints([3, 0], [1, 0]), { points: 5, kind: 'direction', advances: false });
  assert.deepEqual(L.matchPoints([1, 1], [0, 0]), { points: 5, kind: 'direction', advances: false }, 'a draw is a direction');
  assert.deepEqual(L.matchPoints([2, 1], [1, 1]), { points: 0, kind: 'wrong', advances: false });
  assert.deepEqual(L.matchPoints(null, [1, 0]), { points: 0, kind: 'none' });
  assert.equal(L.sign([0, 2]), '2');
});

test('a knockout pick adds +10 when the team picked to advance does', () => {
  assert.equal(L.matchPoints([1, 0], [2, 0], { advances: 'GER', pickAdvances: 'GER' }).points, 15);
  assert.equal(L.matchPoints([1, 1], [2, 0], { advances: 'GER', pickAdvances: 'GER' }).points, 10, 'wrong score, right team');
  assert.equal(L.matchPoints([0, 1], [2, 0], { advances: 'GER', pickAdvances: 'CAN' }).points, 0);
});

/* ---------- The live match ---------- */

test('the live match: goals land on their minute and the projection follows', () => {
  const m = D.LIVE;
  assert.deepEqual(L.liveScore(m, m.from), [1, 0]);
  assert.equal(L.projected(m, m.from).kind, 'direction');
  assert.deepEqual(L.liveScore(m, 63), [2, 0]);
  assert.equal(L.projected(m, 70).points, 5);
  assert.deepEqual(L.liveScore(m, 71), [2, 1]);
  assert.deepEqual(L.projected(m, 71), { points: 10, kind: 'exact', advances: false });
  assert.equal(L.isFinished(m, 92), false);
  assert.equal(L.isFinished(m, m.to), true);
  assert.equal(L.minuteLabel(58), '58');
  assert.equal(L.minuteLabel(93), '90+3');
});

test('the live clock starts at its first minute and stops at the whistle', () => {
  const m = D.LIVE;
  assert.equal(L.liveMinute(m, 0, 99999, 1200), m.from, 'not started yet');
  assert.equal(L.liveMinute(m, 1000, 1000 + 1200 * 5, 1200), m.from + 5);
  assert.equal(L.liveMinute(m, 1000, 1000 + 1200 * 500, 1200), m.to);
});

/* ---------- The pool ---------- */

test('standings: best first, ranks 1..n, and the live result moves the visitor up', () => {
  const before = L.standings('bank', 0);
  assert.equal(before.length, D.PEOPLE.length);
  assert.ok(before.every((r, i) => r.rank === i + 1 && (i === 0 || before[i - 1].value >= r.value)));
  assert.equal(L.myRow(before).rank, 5);
  const after = L.standings('bank', 10);
  assert.equal(L.myRow(after).rank, 4, '+10 from the live match passes the player 5 points ahead');
  assert.equal(L.myRow(after).value, L.myRow(before).value + 10);
  assert.equal(L.myRow(L.standings('matches', 10)).value, L.myRow(L.standings('matches', 0)).value, 'live points do not count as match picks');
  assert.equal(L.behindLeader(before), before[0].value - L.myRow(before).value);
});

test('the pot: entry fees minus the API, split 40 / 20 / 10 / 15 / 15', () => {
  const s = L.potSplit(D.PEOPLE.length);
  assert.equal(s.pot, D.PEOPLE.length * D.ENTRY_FEE);
  assert.equal(s.toSplit, s.pot - D.API_COST);
  assert.equal(D.SPLIT.reduce((a, x) => a + x.pct, 0), 100);
  assert.equal(s.shares.reduce((a, x) => a + x.amount, 0), s.toSplit);
  assert.equal(L.prizeFor(1, s), s.shares[0].amount);
  assert.equal(L.prizeFor(4, s), 0);
});

test('the Monkey and the last change', () => {
  const rows = L.standings('bank', 0);
  assert.equal(L.aheadOfMonkey(rows), rows.filter((r) => r.value > D.MONKEY.bank).length);
  const me = D.PEOPLE.find((p) => p.id === D.ME);
  assert.deepEqual(L.lastChange(me, 0), { before: me.before, change: me.bank - me.before, now: me.bank, last: me.last });
  const live = L.lastChange(me, 10);
  assert.equal(live.change, 10);
  assert.equal(live.now, me.bank + 10);
  assert.equal(live.last.match, D.LIVE.id);
});

/* ---------- The data is consistent ---------- */

test('every person\'s bank is before + last change, and the change follows the scoring rules', () => {
  const allowed = new Set([0, 5, 10, 15, 20]);
  for (const p of D.PEOPLE) {
    assert.equal(p.before + p.last.change, p.bank, p.id);
    assert.ok(allowed.has(p.last.change), p.id + ' change ' + p.last.change);
    assert.ok(D.PAST.some((m) => m.id === p.last.match), p.id);
  }
  assert.equal(new Set(D.PEOPLE.map((p) => p.id)).size, D.PEOPLE.length);
  assert.equal(D.PEOPLE.filter((p) => p.id === D.ME).length, 1);
});

test('the visitor\'s history ends at their bank, and their last change is today\'s match', () => {
  const me = D.PEOPLE.find((p) => p.id === D.ME);
  assert.equal(D.HISTORY.at(-1), me.bank);
  assert.equal(D.HISTORY.at(-2), me.before);
  const p8 = D.PAST.find((m) => m.id === me.last.match);
  assert.equal(L.matchPoints(p8.pick, p8.score, p8).points, me.last.change);
});

test('every team and player the data names exists, with a flag', async () => {
  const { hasFlag } = await import('../../demos/toto-mundial/js/flags.js');
  const codes = [D.LIVE, ...D.UPCOMING, ...D.PAST].flatMap((m) => [m.home, m.away]).concat(D.PLAYERS.map((p) => p.team));
  for (const c of codes) { assert.ok(D.TEAMS[c], c); assert.ok(hasFlag(c), 'flag for ' + c); }
  assert.equal(new Set(D.PLAYERS.map((p) => p.id)).size, D.PLAYERS.length);
  for (const q of D.TOURNAMENT) if (q.pick) assert.ok(q.kind === 'team' ? D.TEAMS[q.pick] : L.playerById(q.pick), q.id);
});

test('upcoming matches are still open at the start, and close 5 minutes before kickoff', () => {
  const start = L.startDate();
  for (const m of D.UPCOMING) assert.ok(L.isOpen(m, start), m.id);
  const m = D.UPCOMING[0];
  const kickoff = L.at(m.day, m.time);
  assert.equal(L.isOpen(m, new Date(kickoff - 5 * 60000 - 1)), true);
  assert.equal(L.isOpen(m, new Date(kickoff - 5 * 60000)), false);
  assert.deepEqual(L.countdown(new Date(start.getTime() + 3723000), start), { h: 1, m: 2, s: 3, done: false });
  assert.equal(L.countdown(start, new Date(start.getTime() + 1)).done, true);
});

/* ---------- Picks and the chart ---------- */

test('random scores stay within 0-3 a side, and steppers stay within 0-9', () => {
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 500; i++) {
    const s = L.randomScore(rand);
    assert.ok(s.every((g) => Number.isInteger(g) && g >= 0 && g <= 3), String(s));
  }
  assert.equal(L.clampGoal(-1), 0);
  assert.equal(L.clampGoal(12), 9);
});

test('player search matches names and team codes, case-insensitively', () => {
  assert.deepEqual(L.searchPlayers('yamal').map((p) => p.id), ['yamal']);
  assert.ok(L.searchPlayers('ENG').every((p) => p.team === 'ENG'));
  assert.equal(L.searchPlayers('').length, D.PLAYERS.length);
  assert.deepEqual(L.searchPlayers('zzz'), []);
  assert.deepEqual(L.scenarios(1000, 24), { now: 1000, ifRight: 1024, ifWrong: 1000, payout: 24 });
});

test('chart points span the box and put the highest value on top', () => {
  const pts = L.chartPoints([0, 50, 100], 300, 120, 8);
  assert.equal(pts[0].x, 8);
  assert.equal(pts[2].x, 292);
  assert.equal(pts[2].y, 8);
  assert.equal(pts[0].y, 112);
  assert.equal(L.chartPoints([5], 300, 120, 8)[0].x, 8, 'one value does not divide by zero');
});

/* ---------- Both languages ---------- */

test('English and Hebrew have the same keys, and no string is empty', () => {
  assert.deepEqual(Object.keys(STRINGS.he).sort(), Object.keys(STRINGS.en).sort());
  for (const lang of ['en', 'he']) for (const [k, v] of Object.entries(STRINGS[lang])) assert.ok(String(v).trim(), lang + ' ' + k);
  for (const [k, v] of Object.entries(STRINGS.en)) {
    const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    assert.equal(vars(STRINGS.he[k]), vars(v), 'placeholders match for ' + k);
  }
});

test('every key the screens ask for exists, and every key is used', async () => {
  const keys = Object.keys(STRINGS.en);
  const asked = new Set();
  const quoted = new Set();
  for (const f of await readdir(JS)) {
    const src = await readFile(new URL(f, JS), 'utf8');
    for (const m of src.matchAll(/\bt\('([\w.]*\w)'/g)) asked.add(m[1]);
    /* Quoted keys count as used, except where i18n.js defines them. */
    const body = f === 'i18n.js' ? src.replace(/export const STRINGS = \{[\s\S]*?\n\};/, '') : src;
    for (const m of body.matchAll(/'([\w.]*\w)'/g)) quoted.add(m[1]);
  }
  /* Keys built at runtime, like 'stage.' + m.stage, count as used through their prefix. */
  const dynamic = /^(stage|share|cat|kind|pos|q|lb\.sub|time)\./;
  for (const k of asked) assert.ok(STRINGS.en[k] !== undefined, 'missing string ' + k);
  for (const k of keys) assert.ok(asked.has(k) || quoted.has(k) || dynamic.test(k), 'unused string ' + k);
});
