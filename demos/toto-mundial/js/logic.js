/* Toto Mundial demo: the rules behind the replica. Pure functions, no DOM, so Node can test them.
   Every derived figure (points per pick, standings, the pot split, the live score) is computed here. */

import { START, LOCK_MINUTES, SCORING, PEOPLE, ME, ENTRY_FEE, API_COST, SPLIT, MONKEY, LIVE, PLAYERS } from './data.js';

/* ---------- Time ---------- */

/* A Date on the demo calendar: day is days from the start date, time is "HH:MM". */
export function at(day, time) {
  var hm = String(time).split(':');
  return new Date(START.year, START.month, START.day + day, Number(hm[0]), Number(hm[1]), 0);
}
export function startDate() { return new Date(START.year, START.month, START.day, START.hour, START.minute, 0); }

/* The demo clock: the start moment plus however long the page has been open. */
export function demoNow(openedAt, realNow) { return new Date(startDate().getTime() + (realNow - openedAt)); }

export function lockAt(match) { return new Date(at(match.day, match.time).getTime() - LOCK_MINUTES * 60000); }
export function isOpen(match, now) { return now < lockAt(match); }

/* Whole hours, minutes and seconds left until a moment; zero once it has passed. */
export function countdown(target, now) {
  var ms = Math.max(0, target - now);
  var s = Math.floor(ms / 1000);
  return { h: Math.floor(s / 3600), m: Math.floor(s % 3600 / 60), s: s % 60, done: ms === 0 };
}

export function dayIndex(date) {
  var a = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  var b = new Date(START.year, START.month, START.day);
  return Math.round((a - b) / 86400000);
}

/* ---------- Scoring ---------- */

/* 1 (home win), X (draw) or 2 (away win). */
export function sign(score) { return score[0] > score[1] ? '1' : score[0] < score[1] ? '2' : 'X'; }

/* Points for a pick: +10 for the exact score, +5 for the right direction, 0 otherwise. A knockout
   match adds +10 when the team picked to advance does. */
export function matchPoints(pick, result, extra) {
  if (!pick || !result) return { points: 0, kind: 'none' };
  var kind = pick[0] === result[0] && pick[1] === result[1] ? 'exact' : sign(pick) === sign(result) ? 'direction' : 'wrong';
  var points = SCORING[kind];
  var advances = !!(extra && extra.advances && extra.advances === extra.pickAdvances);
  if (advances) points += SCORING.advances;
  return { points: points, kind: kind, advances: advances };
}

/* ---------- The live match ---------- */

export function liveScore(match, minute) {
  var s = match.score.slice();
  match.goals.forEach(function (g) { if (minute >= g.minute) s[g.side]++; });
  return s;
}
export function liveMinute(match, startedAt, now, msPerMinute) {
  if (!startedAt) return match.from;
  return Math.min(match.to, match.from + Math.floor((now - startedAt) / msPerMinute));
}
export function isFinished(match, minute) { return minute >= match.to; }

/* What the visitor's pick would earn if the match ended now. */
export function projected(match, minute) { return matchPoints(match.pick, liveScore(match, minute)); }

/* The minute shown on the card: 45+ and 90+ for stoppage time. */
export function minuteLabel(minute) { return minute > 90 ? '90+' + (minute - 90) : String(minute); }

/* ---------- The pool ---------- */

/* Everyone ranked by a category (bank, matches, live or duels), best first, ties by name.
   extra is the points the visitor earned in this visit (the live match), added to bank and live. */
export function standings(category, extra) {
  var key = category || 'bank';
  var add = extra || 0;
  var rows = PEOPLE.map(function (p) {
    var value = p[key];
    if (p.id === ME && (key === 'bank' || key === 'live')) value += add;
    return { id: p.id, person: p, value: value };
  });
  rows.sort(function (a, b) { return b.value - a.value || a.person.en.localeCompare(b.person.en); });
  rows.forEach(function (r, i) { r.rank = i + 1; });
  return rows;
}

export function myRow(rows) { return rows.filter(function (r) { return r.id === ME; })[0]; }

export function behindLeader(rows) { var me = myRow(rows); return Math.max(0, rows[0].value - me.value); }

/* How many players are ahead of the Monkey's random picks. */
export function aheadOfMonkey(rows) { return rows.filter(function (r) { return r.value > MONKEY.bank; }).length; }

/* The pot: every entry fee, minus the data API, split by the published shares. */
export function potSplit(players) {
  var pot = players * ENTRY_FEE;
  var toSplit = pot - API_COST;
  return {
    pot: pot,
    cost: API_COST,
    toSplit: toSplit,
    shares: SPLIT.map(function (s) { return { key: s.key, pct: s.pct, tone: s.tone, amount: Math.round(toSplit * s.pct / 100) }; })
  };
}

/* The prize a rank in the overall table wins now, or 0. */
export function prizeFor(rank, split) {
  var key = ['king', 'second', 'third'][rank - 1];
  var share = key && split.shares.filter(function (s) { return s.key === key; })[0];
  return share ? share.amount : 0;
}

/* The last change to someone's bank: the visit's live result replaces the visitor's stored one. */
export function lastChange(person, extra) {
  if (person.id === ME && extra) return { before: person.bank, change: extra, now: person.bank + extra, last: { match: LIVE.id, change: extra } };
  return { before: person.before, change: person.bank - person.before, now: person.bank, last: person.last };
}

/* ---------- Tournament bets ---------- */

export function playerById(id) { return PLAYERS.filter(function (p) { return p.id === id; })[0] || null; }

/* What happens to the bank if a pick is right or wrong. */
export function scenarios(bank, payout) { return { now: bank, ifRight: bank + payout, ifWrong: bank, payout: payout }; }

export function searchPlayers(q) {
  var s = String(q || '').trim().toLowerCase();
  if (!s) return PLAYERS.slice();
  return PLAYERS.filter(function (p) { return p.name.toLowerCase().indexOf(s) !== -1 || p.team.toLowerCase().indexOf(s) !== -1; });
}

/* ---------- Picks ---------- */

/* A plausible random score for "Surprise me": mostly 0-3 goals a side. rand returns 0..1. */
export function randomScore(rand) {
  var weights = [0.28, 0.36, 0.24, 0.12];
  function goals() {
    var r = rand();
    for (var i = 0; i < weights.length; i++) { if (r < weights[i]) return i; r -= weights[i]; }
    return 3;
  }
  return [goals(), goals()];
}

export function clampGoal(n) { return Math.max(0, Math.min(9, n)); }

/* ---------- The points chart ---------- */

/* Points for an SVG polyline across w x h, with a little padding so the dots aren't clipped. */
export function chartPoints(values, w, h, pad) {
  var p = pad || 6;
  var max = Math.max.apply(null, values);
  var min = Math.min.apply(null, values);
  var span = max - min || 1;
  return values.map(function (v, i) {
    return { x: p + (w - p * 2) * (values.length > 1 ? i / (values.length - 1) : 0), y: p + (h - p * 2) * (1 - (v - min) / span), v: v };
  });
}
