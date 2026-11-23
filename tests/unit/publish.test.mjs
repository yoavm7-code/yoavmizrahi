// admin/publish.js: the change summary, the commit message, and watching a publish go live.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

/* admin/config.js reads the page address when it loads. */
globalThis.location = new URL('https://yoavmizrahi.com/admin/');
globalThis.localStorage = { getItem: () => null };
const { describeChanges, commitMessage, usedMedia, deployStatus, waitForLive, WATCH } = await import('../../admin/publish.js');
const { normalize } = await import('../../js/schema.js');

const SHA = 'a'.repeat(40);

function base() {
  return {
    site: { name: 'Yoav', title: 'Yoav' },
    desk: { note: { hi: 'Hi', x: 10, y: 10 }, monitor: { x: 400, y: 10 } },
    works: [{ id: 'one', title: 'One', desk: { x: 10, y: 400 } }, { id: 'two', title: 'Two' }],
    films: [{ id: 'film', title: 'Film', label: 'FILM', tape: { show: true, label: 'FILM', x: 900, y: 500 } }],
    about: { lead: 'About' }
  };
}
function edit(fn) { const raw = base(); fn(raw); return describeChanges(base(), raw); }

/* ---------- What changed ---------- */

test('no changes, empty summary', () => {
  assert.deepEqual(describeChanges(base(), base()), []);
});

test('each kind of change is named in plain words', () => {
  assert.deepEqual(edit((r) => { r.site.name = 'New'; }), ['Edited the site settings']);
  assert.deepEqual(edit((r) => { r.desk.note.hi = 'Hello'; }), ['Edited the sticky note']);
  assert.deepEqual(edit((r) => { r.desk.hint = 'drag'; }), ['Edited the desk hint']);
  assert.deepEqual(edit((r) => { r.works[0].title = 'Uno'; }), ['Edited work "Uno"']);
  assert.deepEqual(edit((r) => { r.works.push({ id: 'three', title: 'Three' }); }), ['Changed the phone order of the desk', 'Added work "Three"']);
  assert.deepEqual(edit((r) => { r.films = []; }), ['Changed the phone order of the desk', 'Removed film "FILM"']);
  assert.deepEqual(edit((r) => { r.works.reverse(); }), ['Changed the phone order of the desk', 'Changed the order of the works']);
  assert.deepEqual(edit((r) => { r.about.lead = 'More'; }), ['Edited the About page']);
});

test('moving things on the desk is counted, not listed as edits', () => {
  assert.deepEqual(edit((r) => { r.desk.note.x = 99; }), ['Moved 1 thing on the desk']);
  assert.deepEqual(edit((r) => { r.desk.note.x = 99; r.works[0].desk.y = 1; r.films[0].tape.r = 5; }), ['Moved 3 things on the desk']);
});

test('putting a work on or off the desk is named', () => {
  const out = edit((r) => { r.works[1].desk = { show: false }; });
  assert.ok(out.includes('Took "Two" off the desk'));
});

test('commit message: plain default, joined changes, long lists shortened', () => {
  assert.equal(commitMessage([]), 'Published from the admin');
  assert.equal(commitMessage(['A', 'B']), 'A; B');
  assert.equal(commitMessage(['1', '2', '3', '4', '5', '6', '7', '8']), '1; 2; 3; 4; 5; 6; and 2 more');
});

test('usedMedia lists the media files the content points at', () => {
  const c = normalize({ works: [{ id: 'a', media: { src: 'media/a.webp' } }, { id: 'b' }] });
  assert.deepEqual(usedMedia(c), ['media/a.webp']);
});

test('usedMedia includes a demo\'s logo, so publishing commits it too', () => {
  const c = normalize({ works: [
    { id: 'a', media: { src: 'media/a.webp' } },
    { id: 'm', demo: 'memesh', replica: { logo: { src: 'media/logo.webp' } } },
    { id: 't', demo: 'toto', replica: { logo: { src: 'media/no-logo-slot.webp' } } }
  ] });
  assert.deepEqual(usedMedia(c), ['media/a.webp', 'media/logo.webp'], 'only demos with a logo slot keep a logo');
});

test('every media file the live content points at is in the repo', () => {
  const live = normalize(JSON.parse(readFileSync(new URL('../../content/site.json', import.meta.url), 'utf8')));
  for (const path of usedMedia(live)) assert.ok(existsSync(new URL('../../' + path, import.meta.url)), path + ' is missing');
});

/* ---------- Watching a publish ---------- */

const realFetch = globalThis.fetch;
const realInfo = console.info;
const savedWatch = { ...WATCH };
let calls;

/* Fakes the live site and the GitHub runs API. live: build id the site serves.
   runs: what the runs API answers, or a number for an error status. */
function fake(state) {
  calls = [];
  globalThis.fetch = async (url) => {
    url = String(url);
    calls.push(url);
    if (url.startsWith('https://yoavmizrahi.com/index.html')) {
      return new Response('<meta name="build" content="' + state.live + '">', { status: 200 });
    }
    if (url.startsWith('https://api.github.com/repos/yoavm7-code/yoavmizrahi/actions/runs?')) {
      if (state.throws) throw new TypeError('Failed to fetch');
      if (typeof state.runs === 'number') return new Response('{}', { status: state.runs });
      return new Response(JSON.stringify({ workflow_runs: state.runs }), { status: 200 });
    }
    throw new Error('unexpected fetch ' + url);
  };
}
function run(conclusion, status) {
  return { path: '.github/workflows/deploy.yml', status: status || 'completed', conclusion, html_url: 'https://github.com/yoavm7-code/yoavmizrahi/actions/runs/1' };
}

beforeEach(() => {
  console.info = () => {};
  Object.assign(WATCH, { first: 1, fast: 1, slow: 1, fastFor: 1000, statusEvery: 0, limit: 200 });
});
afterEach(() => {
  globalThis.fetch = realFetch;
  console.info = realInfo;
  Object.assign(WATCH, savedWatch);
});

test('deployStatus asks only about this commit and only push runs', async () => {
  fake({ runs: [] });
  await deployStatus(SHA);
  assert.equal(calls[0], 'https://api.github.com/repos/yoavm7-code/yoavmizrahi/actions/runs?head_sha=' + SHA + '&event=push&per_page=20');
});

test('deployStatus reads the Deploy run and ignores other workflows', async () => {
  const other = { ...run('failure'), path: '.github/workflows/checks.yml' };
  const cases = [
    [[], 'pending'],
    [[other], 'pending'],
    [[other, run(null, 'queued')], 'pending'],
    [[run(null, 'in_progress')], 'pending'],
    [[other, run('success')], 'passed'],
    [[run('failure')], 'failed'],
    [[run('timed_out')], 'failed'],
    [[run('startup_failure')], 'failed'],
    [[run('cancelled')], 'cancelled'],
    [[{ ...run('success'), path: '.github/workflows/deploy.yml@refs/heads/main' }], 'passed']
  ];
  for (const [runs, state] of cases) {
    fake({ runs });
    assert.equal((await deployStatus(SHA)).state, state, JSON.stringify(runs));
  }
});

test('deployStatus returns unknown when GitHub says no or cannot be reached', async () => {
  fake({ runs: 403 });
  assert.deepEqual(await deployStatus(SHA), { state: 'unknown', url: '' });
  fake({ throws: true });
  assert.deepEqual(await deployStatus(SHA), { state: 'unknown', url: '' });
});

test('waitForLive: live once the site serves the new build', async () => {
  fake({ live: 'b1', runs: [run(null, 'in_progress')] });
  assert.deepEqual(await waitForLive('b1', SHA), { result: 'live', url: '' });
});

test('waitForLive: blocked when the check fails, with a link to it', async () => {
  fake({ live: 'old', runs: [run('failure')] });
  assert.deepEqual(await waitForLive('b1', SHA), { result: 'blocked', url: 'https://github.com/yoavm7-code/yoavmizrahi/actions/runs/1' });
});

test('waitForLive: replaced when a newer publish took its place', async () => {
  fake({ live: 'old', runs: [run('cancelled')] });
  assert.equal((await waitForLive('b1', SHA)).result, 'replaced');
});

test('waitForLive: keeps waiting while the check passes but the site lags, then gives up', async () => {
  fake({ live: 'old', runs: [run('success')] });
  const ticks = [];
  assert.equal((await waitForLive('b1', SHA, (ms) => ticks.push(ms))).result, 'slow');
  assert.ok(ticks.length > 0);
});

test('waitForLive: rate limits never block the watch', async () => {
  fake({ live: 'old', runs: 403 });
  assert.equal((await waitForLive('b1', SHA)).result, 'slow');
});

test('waitForLive: without a commit it only watches the site', async () => {
  fake({ live: 'old', runs: [run('failure')] });
  assert.equal((await waitForLive('b1', null)).result, 'slow');
  assert.ok(calls.every((u) => u.startsWith('https://yoavmizrahi.com/')));
});
