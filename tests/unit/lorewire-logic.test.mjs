// The LoreWire replica's rules (demos/lorewire/js/logic.js) and its stories.
// The DOM-free modules only, so this runs in Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import * as D from '../../demos/lorewire/js/data.js';
import * as L from '../../demos/lorewire/js/logic.js';

const MEDIA = new URL('../../demos/lorewire/media/', import.meta.url);
const story = (id, category, video) => ({ id, category, video: !!video, title: id.toUpperCase(), summary: 'A ' + category + ' story.' });
const SET = [story('a', 'Creepy', true), story('b', 'Breakups'), story('c', 'Creepy', true), story('d', 'Wedding Drama', true)];

/* ---------- Rows ---------- */

test('rows: unvoted, the Top 10, a category, newest first', () => {
  assert.deepEqual(L.unvoted(SET, { a: 'a', c: 'b' }).map((s) => s.id), ['b', 'd']);
  assert.equal(L.topTen(D.STORIES).length, Math.min(10, D.STORIES.length));
  assert.deepEqual(L.inCategory(SET, 'Creepy').map((s) => s.id), ['a', 'c']);
  assert.deepEqual(L.newest(SET).map((s) => s.id), ['d', 'c', 'b', 'a']);
  assert.deepEqual(SET.map((s) => s.id), ['a', 'b', 'c', 'd'], 'newest leaves the list as it was');
});

test('"more like this" puts the same category first and never the story itself', () => {
  assert.deepEqual(L.moreLike(SET, SET[0]).map((s) => s.id), ['c', 'b', 'd']);
  assert.deepEqual(L.moreLike(SET, SET[0], 1).map((s) => s.id), ['c']);
});

test('search looks at titles, categories and loglines, ignoring case and spaces', () => {
  assert.deepEqual(L.search(SET, '  wedding ').map((s) => s.id), ['d']);
  assert.deepEqual(L.search(SET, 'B').map((s) => s.id), ['b'], 'title "B" and category "Breakups"');
  assert.equal(L.search(SET, '').length, SET.length, 'an empty search shows everything');
  assert.equal(L.search(SET, 'nothing like this').length, 0);
  assert.ok(L.search(D.STORIES, 'mara').some((s) => s.id === 'lw-03d99aff6fb5'), 'finds a real logline');
});

test('the Wires feed: videos only, unvoted or all, within the picked categories', () => {
  assert.deepEqual(L.wires(SET, {}, 'all', []).map((s) => s.id), ['a', 'c', 'd']);
  assert.deepEqual(L.wires(SET, { a: 'b' }, 'unvoted', []).map((s) => s.id), ['c', 'd']);
  assert.deepEqual(L.wires(SET, { a: 'b' }, 'all', ['Creepy']).map((s) => s.id), ['a', 'c']);
  assert.deepEqual(L.wires(SET, {}, 'all', null).map((s) => s.id), ['a', 'c', 'd'], 'no filter picked means every category');
});

/* ---------- Polls ---------- */

test('poll results add the visitor\'s vote, and the first voter gets 100%', () => {
  assert.deepEqual(L.pollResult(null, 'a'), { a: 1, b: 0, total: 1, pctA: 100, pctB: 0, side: 'a' });
  assert.deepEqual(L.pollResult({ a: 2, b: 1 }, 'b'), { a: 2, b: 2, total: 4, pctA: 50, pctB: 50, side: 'b' });
  assert.deepEqual(L.pollResult(null, null), { a: 0, b: 0, total: 0, pctA: 0, pctB: 0, side: null });
  const r = L.pollResult({ a: 1, b: 1 }, 'a');
  assert.equal(r.pctA + r.pctB, 100, 'rounded shares still add up');
});

/* ---------- Read-along ---------- */

test('read-along walks word by word and keeps paragraph breaks', () => {
  const w = L.words(['One two', '  three ', '']);
  assert.deepEqual(w, [{ text: 'One', para: 0 }, { text: 'two', para: 0 }, { text: 'three', para: 1 }]);
  assert.equal(L.wordAt(0, 3), 0);
  assert.equal(L.wordAt(1 / L.WORDS_PER_SECOND, 3), 1);
  assert.equal(L.wordAt(999, 3), 2, 'stops on the last word');
  assert.equal(L.wordAt(-5, 3), 0);
  assert.equal(L.readSeconds(26), Math.ceil(26 / L.WORDS_PER_SECOND));
});

test('times: clock, reading minutes, durations', () => {
  assert.equal(L.clock(0), '0:00');
  assert.equal(L.clock(65.4), '1:05');
  assert.equal(L.clock(-3), '0:00');
  assert.equal(L.readMinutes(['short']), 1, 'never less than a minute');
  assert.equal(L.readMinutes([Array(461).fill('w').join(' ')]), 2);
  assert.equal(L.seconds('0:53'), 53);
  assert.equal(L.seconds('2:05'), 125);
});

/* ---------- The stories ---------- */

test('every story is complete, in a known category, with a two-sided poll', () => {
  const ids = new Set();
  const names = D.CATEGORIES.map((c) => c.name);
  for (const s of D.STORIES) {
    assert.ok(!ids.has(s.id), 'unique id ' + s.id); ids.add(s.id);
    assert.match(s.id, /^lw-[0-9a-f]{12}$/);
    assert.ok(names.includes(s.category), s.id + ' category ' + s.category);
    assert.match(s.duration, /^\d+:\d\d$/);
    assert.ok(s.title && s.summary, s.id);
    assert.ok(s.poll.question && s.poll.a && s.poll.b && s.poll.a !== s.poll.b, s.id + ' poll');
    assert.ok(s.article.length >= 3 && s.article.length <= 10, s.id + ' article length');
    assert.equal(L.storyById(s.id), s);
  }
  assert.equal(L.storyById('lw-000000000000'), null);
  assert.ok(D.STORIES.filter((s) => s.video).length >= 2, 'the Wires feed has something to scroll');
  assert.equal(new Set(D.CATEGORIES.map((c) => c.mark)).size, D.CATEGORIES.length, 'each category has its own mark');
});

test('the text is clean: no leftover escapes, Markdown or HTML entities', () => {
  for (const s of D.STORIES) {
    for (const t of [s.title, s.summary, s.poll.question, s.poll.a, s.poll.b, ...s.article]) {
      assert.doesNotMatch(t, /\\|\*\*|&[a-z]+;|&#\d+;|<\/?[a-z]/i, s.id + ': ' + t.slice(0, 60));
    }
  }
});

test('stories are labelled as fiction, never as true', () => {
  assert.equal(D.LABEL, 'Fictionalized story, inspired by real-life situations');
  assert.doesNotMatch(D.LABEL + ' ' + D.TAGLINE, /\btrue\b/i);
});

test('every story has its art, and every video story its video', async () => {
  for (const s of D.STORIES) {
    for (const f of ['poster.webp', 'wide.webp']) await access(new URL(s.id + '/' + f, MEDIA));
    if (s.video) await access(new URL(s.id + '/video.mp4', MEDIA));
  }
});
