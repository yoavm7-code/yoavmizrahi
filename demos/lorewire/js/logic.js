/* LoreWire demo: the rules behind the replica. Pure functions, no DOM, so Node can test them.
   Home's rows, filters and search, poll results, and the read-along pace. */

import { STORIES } from './data.js';

export function storyById(id) { return STORIES.filter(function (s) { return s.id === id; })[0] || null; }

/* ---------- Rows ---------- */

export function unvoted(stories, votes) { return stories.filter(function (s) { return !votes[s.id]; }); }
export function topTen(stories) { return stories.slice(0, 10); }
export function inCategory(stories, name) { return stories.filter(function (s) { return s.category === name; }); }
export function newest(stories) { return stories.slice().reverse(); }

/* "More like this": same category first, then the rest, never the story itself. */
export function moreLike(stories, story, n) {
  var same = stories.filter(function (s) { return s.id !== story.id && s.category === story.category; });
  var other = stories.filter(function (s) { return s.id !== story.id && s.category !== story.category; });
  return same.concat(other).slice(0, n || 6);
}

/* Search across titles, categories and loglines, case-insensitively. */
export function search(stories, q) {
  var s = String(q || '').trim().toLowerCase();
  if (!s) return stories.slice();
  return stories.filter(function (x) { return (x.title + ' ' + x.category + ' ' + x.summary).toLowerCase().indexOf(s) !== -1; });
}

/* The Wires feed: stories with a video, unvoted only or all, within the picked categories. */
export function wires(stories, votes, mode, picked) {
  return stories.filter(function (s) {
    if (!s.video) return false;
    if (mode === 'unvoted' && votes[s.id]) return false;
    if (picked && picked.length && picked.indexOf(s.category) === -1) return false;
    return true;
  });
}

/* ---------- Polls ---------- */

/* Votes so far plus the visitor's. The real polls are new, so the visitor is often the first. */
export function pollResult(base, side) {
  var a = (base && base.a || 0) + (side === 'a' ? 1 : 0);
  var b = (base && base.b || 0) + (side === 'b' ? 1 : 0);
  var total = a + b;
  return { a: a, b: b, total: total, pctA: total ? Math.round(a / total * 100) : 0, pctB: total ? 100 - Math.round(a / total * 100) : 0, side: side || null };
}

/* ---------- Read-along ---------- */

export var WORDS_PER_SECOND = 2.6;

/* The article as words, keeping paragraph breaks, so the highlight can walk through it. */
export function words(paragraphs) {
  var out = [];
  paragraphs.forEach(function (p, pi) {
    String(p).split(/\s+/).filter(Boolean).forEach(function (w) { out.push({ text: w, para: pi }); });
  });
  return out;
}

/* Which word is being read after t seconds, and the length of the whole read. */
export function wordAt(t, count) { return Math.max(0, Math.min(count - 1, Math.floor(t * WORDS_PER_SECOND))); }
export function readSeconds(count) { return Math.ceil(count / WORDS_PER_SECOND); }
export function clock(seconds) { var s = Math.max(0, Math.round(seconds)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

/* Minutes to read an article at an ordinary pace, at least one. */
export function readMinutes(paragraphs) { return Math.max(1, Math.round(words(paragraphs).length / 230)); }

/* Seconds from "0:53". */
export function seconds(duration) { var p = String(duration).split(':'); return Number(p[0]) * 60 + Number(p[1] || 0); }
