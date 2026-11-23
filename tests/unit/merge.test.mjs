// Catching a draft up with the live site (admin/merge.js): newer live work is never lost.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mergeDraft } from '../../admin/merge.js';
import { normalize } from '../../js/schema.js';

const site = JSON.parse(await readFile(new URL('../../content/site.json', import.meta.url), 'utf8'));
const copy = (o) => JSON.parse(JSON.stringify(o));
const ids = (list) => list.map((x) => x.id);

/* ---------- The case that removed three works ---------- */

test('a draft started before new works were published keeps them, and keeps its own edits', () => {
  const live = normalize(copy(site));
  const base = copy(live);
  base.works = base.works.slice(0, 2);
  base.desk.mobileOrder = base.desk.mobileOrder.filter((k) => !k.startsWith('work:') || base.works.some((w) => 'work:' + w.id === k));
  const draft = copy(base);
  draft.desk.note.hi = 'Hello there.';
  draft.works[0].description = 'A new line.';

  const out = mergeDraft(base, draft, live);
  assert.deepEqual(ids(out.works), ids(live.works));
  assert.equal(out.desk.note.hi, 'Hello there.');
  assert.equal(out.works[0].description, 'A new line.');
  assert.deepEqual(out.works.slice(2), live.works.slice(2));
  assert.deepEqual(out.desk.mobileOrder, live.desk.mobileOrder);
});

test('a leftover copy of an earlier publish (no edits of its own) becomes the live content', () => {
  const live = normalize(copy(site));
  const base = copy(live);
  base.works.pop();
  assert.deepEqual(mergeDraft(base, copy(base), live), live);
});

/* ---------- Field by field ---------- */

test('each side keeps the fields only it changed; a field changed on both sides takes the draft', () => {
  const base = { a: 1, b: 1, c: 1 };
  assert.deepEqual(mergeDraft(base, { a: 2, b: 1, c: 2 }, { a: 1, b: 3, c: 3 }), { a: 2, b: 3, c: 2 });
});

test('fields added or removed on either side', () => {
  const base = { keep: 1, dropMine: 1, dropTheirs: 1 };
  const mine = { keep: 1, dropTheirs: 1, newMine: 1 };
  const theirs = { keep: 1, dropMine: 1, newTheirs: 1 };
  assert.deepEqual(mergeDraft(base, mine, theirs), { keep: 1, newMine: 1, newTheirs: 1 });
});

/* ---------- Lists of things with an id ---------- */

test('works removed in the draft stay removed; works added on either side are kept, in place', () => {
  const base = { works: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
  const mine = { works: [{ id: 'a' }, { id: 'c' }, { id: 'mine' }] };
  const theirs = { works: [{ id: 'a' }, { id: 'new' }, { id: 'b' }, { id: 'c' }] };
  assert.deepEqual(ids(mergeDraft(base, mine, theirs).works), ['a', 'new', 'c', 'mine']);
});

test('a work removed on the live site stays removed, unless the draft edited it', () => {
  const base = { works: [{ id: 'a', t: 1 }, { id: 'b', t: 1 }] };
  const theirs = { works: [{ id: 'a', t: 1 }, { id: 'x', t: 1 }] };
  assert.deepEqual(ids(mergeDraft(base, { works: [{ id: 'a', t: 2 }, { id: 'b', t: 1 }] }, theirs).works), ['a', 'x']);
  assert.deepEqual(ids(mergeDraft(base, { works: [{ id: 'a', t: 1 }, { id: 'b', t: 2 }] }, theirs).works), ['a', 'x', 'b']);
});

test('the same work edited on both sides merges field by field', () => {
  const base = { works: [{ id: 'a', title: 'A', year: '2025' }] };
  const mine = { works: [{ id: 'a', title: 'Mine', year: '2025' }] };
  const theirs = { works: [{ id: 'a', title: 'A', year: '2026' }] };
  assert.deepEqual(mergeDraft(base, mine, theirs).works, [{ id: 'a', title: 'Mine', year: '2026' }]);
});

test('a draft that removed every film still keeps a film added on the live site', () => {
  const base = { films: [{ id: 'old' }] };
  assert.deepEqual(ids(mergeDraft(base, { films: [] }, { films: [{ id: 'old' }, { id: 'new' }] }).films), ['new']);
});

/* ---------- Lists of plain values ---------- */

test('the desk order keeps the draft\'s order and adds keys that are new on the live site', () => {
  const base = { order: ['note', 'a', 'b'] };
  const mine = { order: ['b', 'note', 'a'] };
  const theirs = { order: ['note', 'a', 'new', 'b'] };
  assert.deepEqual(mergeDraft(base, mine, theirs).order, ['b', 'note', 'a', 'new']);
});

test('nothing passed in is changed', () => {
  const base = { works: [{ id: 'a' }] }, mine = { works: [{ id: 'a', t: 1 }] }, theirs = { works: [{ id: 'a' }, { id: 'b' }] };
  const before = JSON.stringify([base, mine, theirs]);
  const out = mergeDraft(base, mine, theirs);
  out.works[0].t = 9;
  assert.equal(JSON.stringify([base, mine, theirs]), before);
});
