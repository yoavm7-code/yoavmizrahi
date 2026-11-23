// Page generator in js/render.js: escaping, routes, the reel and the share pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderSite, renderSharePages, routes, reelSpans } from '../../js/render.js';
import { normalize } from '../../js/schema.js';

const site = JSON.parse(await readFile(new URL('../../content/site.json', import.meta.url), 'utf8'));

function base() {
  return {
    site: { name: 'Yoav Mizrahi', title: 'Yoav Mizrahi', url: 'https://yoavmizrahi.com', email: 'hi@example.com', links: [] },
    desk: { note: { hi: 'Hi' } },
    works: [{ id: 'one', title: 'One', style: 'polaroid' }],
    films: [{ id: 'film', title: 'Film', label: 'FILM', tape: { show: true, label: 'FILM' } }],
    about: { lead: 'About me.' }
  };
}
function count(haystack, needle) { return haystack.split(needle).length - 1; }

/* ---------- Escaping ---------- */

test('content can never inject markup', () => {
  const evil = '<img src=x onerror=alert(1)>"\'&';
  const raw = base();
  raw.site.name = evil;
  raw.site.title = evil;
  raw.site.description = evil;
  raw.desk.note.hi = evil;
  raw.works[0].title = evil;
  raw.works[0].description = evil;
  raw.films[0].label = evil;
  raw.about.lead = evil;
  raw.about.before = [evil];
  const page = renderSite(raw);
  assert.ok(!page.includes('<img src=x'), 'raw tag leaked into the page');
  assert.ok(page.includes('&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;'));
  for (const share of renderSharePages(raw)) assert.ok(!share.html.includes('<img src=x'), share.path);
});

test('unsafe links are dropped, not rendered', () => {
  const raw = base();
  raw.works[0].link = 'javascript:alert(1)';
  raw.site.links = [{ label: 'Bad', url: 'javascript:alert(2)' }, { label: 'Good', url: 'https://example.com/me' }];
  const page = renderSite(raw);
  assert.ok(!/javascript:/i.test(page));
  assert.ok(!page.includes('VISIT THE LIVE PRODUCT'));
  assert.ok(page.includes('href="https://example.com/me"'));
  assert.ok(!page.includes('>Bad<'));
});

test('a media path outside media/ is never used', () => {
  const raw = base();
  raw.works[0].media = { type: 'image', src: '../../etc/passwd.png', alt: 'x' };
  const page = renderSite(raw);
  assert.ok(!page.includes('passwd'));
  assert.ok(page.includes('[ SCREENSHOT ]'));
});

/* ---------- The page ---------- */

test('every route has exactly one page section', () => {
  const page = renderSite(site);
  const list = routes(site);
  assert.deepEqual(list.map((r) => r.path), ['/', '/work', ...normalize(site).works.map((w) => '/work/' + w.id), '/films', '/about']);
  for (const r of list) assert.equal(count(page, 'data-route="' + r.path + '"'), 1, r.path);
  assert.equal(count(page, '<section class="page'), list.length);
});

test('the build id is written only when given', () => {
  assert.ok(renderSite(site, { build: 'abc123' }).includes('<meta name="build" content="abc123">'));
  assert.ok(!renderSite(site).includes('name="build"'));
});

test('the page is deterministic: same content, same page', () => {
  assert.equal(renderSite(site, { build: 'x' }), renderSite(site, { build: 'x' }));
});

test('root and mode options are applied', () => {
  const page = renderSite(site, { root: 'https://yoavmizrahi.com/', mode: 'arrange' });
  assert.ok(page.includes('<html lang="en" data-mode="arrange">'));
  assert.ok(page.includes('src="https://yoavmizrahi.com/js/main.js"'));
  assert.ok(page.includes('href="https://yoavmizrahi.com/css/style.css"'));
  assert.ok(renderSite(site, { mode: 'evil' }).includes('<html lang="en">'));
});

test('the desk has one object per shown work, the note, the monitor and the tapes', () => {
  const c = normalize(site);
  const page = renderSite(site);
  const shown = c.works.filter((w) => w.desk.show);
  assert.equal(count(page, 'data-obj="work:'), shown.length);
  assert.equal(count(page, 'data-obj="note"'), 1);
  assert.equal(count(page, 'data-obj="monitor"'), 1);
  assert.equal(count(page, 'data-tape\n'), c.films.filter((f) => f.tape.show).length);
});

test('a work taken off the desk keeps its project page', () => {
  const raw = base();
  raw.works[0].desk = { show: false };
  const page = renderSite(raw);
  assert.ok(!page.includes('data-obj="work:one"'));
  assert.ok(page.includes('data-route="/work/one"'));
});

test('no tapes means no tape group', () => {
  const raw = base();
  raw.films[0].tape.show = false;
  assert.ok(!renderSite(raw).includes('data-obj-group="tapes"'));
});

test('no lines are left holding only indentation', () => {
  const page = renderSite(base());
  assert.ok(!page.split('\n').some((l) => l.length && !l.trim()));
});

/* ---------- The reel ---------- */

test('reel: equal shares when any runtime is unknown', () => {
  const spans = reelSpans(normalize({ films: [{ id: 'a' }, { id: 'b', runtime: '10:00' }] }).films);
  assert.deepEqual(spans, { a: [0, 0.5], b: [0.5, 1] });
});

test('reel: shares follow runtimes when all are known', () => {
  const spans = reelSpans(normalize({ films: [{ id: 'a', runtime: '30:00' }, { id: 'b', runtime: '10:00' }] }).films);
  assert.deepEqual(spans, { a: [0, 0.75], b: [0.75, 1] });
});

test('reel: films in production take the last fifth', () => {
  const spans = reelSpans(normalize({ films: [{ id: 'a' }, { id: 'b' }, { id: 'c', soon: true }] }).films);
  assert.deepEqual(spans, { a: [0, 0.4], b: [0.4, 0.8], c: [0.8, 1] });
});

test('reel: only films in production fill the whole track', () => {
  assert.deepEqual(reelSpans(normalize({ films: [{ id: 'a', soon: true }] }).films), { a: [0, 1] });
});

test('reel: no films, no spans', () => {
  assert.deepEqual(reelSpans([]), {});
});

test('reel: the live films always end at 1 with no gaps', () => {
  const films = normalize(site).films;
  const spans = reelSpans(films);
  let pos = 0;
  for (const f of films) {
    assert.ok(Math.abs(spans[f.id][0] - pos) < 0.0002, f.id);
    pos = spans[f.id][1];
  }
  assert.equal(pos, 1);
});

/* ---------- Share pages ---------- */

test('one share page per work and film, at w/<id>/ and f/<id>/', () => {
  const c = normalize(site);
  const paths = renderSharePages(site).map((p) => p.path);
  assert.deepEqual(paths, [...c.works.map((w) => 'w/' + w.id + '/index.html'), ...c.films.map((f) => 'f/' + f.id + '/index.html')]);
});

test('share pages send people into the right place in the site', () => {
  const pages = renderSharePages(base());
  const work = pages.find((p) => p.path === 'w/one/index.html').html;
  const film = pages.find((p) => p.path === 'f/film/index.html').html;
  assert.ok(work.includes('<meta http-equiv="refresh" content="0; url=../../#/work/one">'));
  assert.ok(work.includes('<link rel="canonical" href="https://yoavmizrahi.com/#/work/one">'));
  assert.ok(film.includes('url=../../#/films/film'));
});

test('share pages get a large preview only when there is an image', () => {
  const raw = base();
  raw.films[0].youtube = 'dQw4w9WgXcQ';
  raw.works[0].media = { type: 'image', src: 'media/shot.webp', alt: 'Shot' };
  const pages = renderSharePages(raw);
  assert.ok(pages[0].html.includes('content="https://yoavmizrahi.com/media/shot.webp"'));
  assert.ok(pages[1].html.includes('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'));
  assert.ok(pages.every((p) => p.html.includes('summary_large_image')));
  assert.ok(renderSharePages(base()).every((p) => p.html.includes('content="summary"')));
});

test('share pages leave out the address when the site has none', () => {
  const raw = base();
  raw.site.url = '';
  const html = renderSharePages(raw)[0].html;
  assert.ok(!html.includes('canonical'));
  assert.ok(!html.includes('og:url'));
});
