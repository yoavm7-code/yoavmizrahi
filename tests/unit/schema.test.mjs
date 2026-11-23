// Content rules in js/schema.js: helpers, normalize() and validate().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  slugify, uniqueId, youtubeId, isSafeUrl, isMediaPath, hasPlaceholder, runtimeSeconds,
  deskKeys, normalize, validate, DESK, LIMITS
} from '../../js/schema.js';

const site = JSON.parse(await readFile(new URL('../../content/site.json', import.meta.url), 'utf8'));

/* A small valid site to change one thing at a time. */
function base() {
  return {
    site: { name: 'Yoav Mizrahi', title: 'Yoav Mizrahi', url: 'https://yoavmizrahi.com', email: 'hi@example.com', links: [] },
    desk: { note: { hi: 'Hi' } },
    works: [{ id: 'one', title: 'One', style: 'polaroid', media: { type: 'image', src: 'media/abc.webp', alt: 'A shot' } }],
    films: [{ id: 'film', title: 'Film', label: 'FILM', youtube: 'dQw4w9WgXcQ' }],
    about: { lead: 'About me.' }
  };
}
function errorsOf(raw) { return validate(normalize(raw)).errors.map((e) => e.path); }
function warningsOf(raw) { return validate(normalize(raw)).warnings.map((w) => w.path); }

/* ---------- Helpers ---------- */

test('slugify makes web-safe ids', () => {
  assert.equal(slugify('Mega Uploader'), 'mega-uploader');
  assert.equal(slugify('  Café Olé!! '), 'cafe-ole');
  assert.equal(slugify('---'), 'item');
  assert.equal(slugify(''), 'item');
  assert.equal(slugify(null), 'item');
  assert.equal(slugify('שלום'), 'item');
  assert.ok(slugify('a'.repeat(80)).length <= 40);
  assert.ok(!slugify('word '.repeat(20)).endsWith('-'));
});

test('uniqueId adds a number when the id is taken', () => {
  assert.equal(uniqueId('Toto', []), 'toto');
  assert.equal(uniqueId('Toto', ['toto']), 'toto-2');
  assert.equal(uniqueId('Toto', ['toto', 'toto-2']), 'toto-3');
});

test('youtubeId accepts ids and common links, and nothing else', () => {
  const id = 'dQw4w9WgXcQ';
  for (const input of [id, ' ' + id + ' ', 'https://youtu.be/' + id, 'https://www.youtube.com/watch?v=' + id,
    'https://www.youtube.com/watch?feature=share&v=' + id, 'https://www.youtube.com/embed/' + id,
    'https://www.youtube.com/shorts/' + id, 'https://www.youtube.com/live/' + id]) {
    assert.equal(youtubeId(input), id, input);
  }
  for (const input of ['', null, undefined, 'short', 'https://example.com/video', id + 'x"><script>']) {
    assert.equal(youtubeId(input), '', String(input));
  }
});

test('isSafeUrl allows https, http and mailto only', () => {
  assert.ok(isSafeUrl('https://example.com/a?b=c'));
  assert.ok(isSafeUrl('http://example.com'));
  assert.ok(isSafeUrl('mailto:hi@example.com'));
  for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,x', '//example.com',
    'https://exa mple.com', 'https://x.com/"onmouseover="x', '', null]) {
    assert.ok(!isSafeUrl(bad), String(bad));
  }
});

test('isMediaPath only accepts files in media/ with known types', () => {
  assert.ok(isMediaPath('media/3f9a-cover.webp'));
  assert.ok(isMediaPath('media/clip.mp4'));
  for (const bad of ['media/../index.html', 'media/x.svg', 'media/X.webp', 'css/style.css', 'media/a/b.png', '']) {
    assert.ok(!isMediaPath(bad), bad);
  }
});

test('hasPlaceholder spots [SQUARE BRACKETS]', () => {
  assert.ok(hasPlaceholder('[Year]'));
  assert.ok(hasPlaceholder('Made in [Year] with care'));
  assert.ok(!hasPlaceholder('2026'));
  assert.ok(!hasPlaceholder(''));
  assert.ok(!hasPlaceholder('[]'));
});

test('runtimeSeconds reads m:ss and h:mm:ss', () => {
  assert.equal(runtimeSeconds('12:40'), 760);
  assert.equal(runtimeSeconds('1:02:05'), 3725);
  assert.equal(runtimeSeconds(' 0:30 '), 30);
  for (const bad of ['', '12', '12:4', 'abc', '[RUNTIME]', null]) assert.equal(runtimeSeconds(bad), 0, String(bad));
});

/* ---------- Normalize ---------- */

test('normalize never throws, whatever it is given', () => {
  for (const input of [undefined, null, {}, [], 'text', 42, true, { site: null, desk: null, works: 'x', films: {}, about: 5 },
    { site: 'x', desk: { note: 3, monitor: [] } }, { works: [null, 7, 'x'], films: [null, []] }]) {
    const c = normalize(input);
    assert.equal(c.schemaVersion, 1);
    assert.ok(Array.isArray(c.works) && Array.isArray(c.films) && Array.isArray(c.desk.mobileOrder));
  }
});

test('normalize does not change its input', () => {
  const raw = base();
  const before = JSON.stringify(raw);
  normalize(raw);
  assert.equal(JSON.stringify(raw), before);
});

test('normalize is stable: running it twice changes nothing', () => {
  const once = normalize(site);
  assert.deepEqual(normalize(once), once);
});

test('normalize fills defaults and coerces types', () => {
  const c = normalize({ site: { name: '  Yoav  ', url: 'https://yoavmizrahi.com///', tagline: 'ai films' }, works: [{ id: 'a', title: 5 }] });
  assert.equal(c.site.name, 'Yoav');
  assert.equal(c.site.url, 'https://yoavmizrahi.com');
  assert.equal(c.site.tagline, 'AI FILMS');
  assert.equal(c.works[0].title, '5');
  assert.equal(c.works[0].style, 'polaroid');
  assert.equal(c.works[0].demo, null);
  assert.equal(c.works[0].desk.show, true);
  assert.equal(c.works[0].media, null);
});

test('normalize clamps desk positions and rotation', () => {
  const c = normalize({ desk: { note: { x: -50, y: 99999, r: 90 }, monitor: { x: 'abc', r: -90.6 } } });
  assert.deepEqual([c.desk.note.x, c.desk.note.y, c.desk.note.r], [0, DESK.maxY, DESK.maxR]);
  assert.deepEqual([c.desk.monitor.x, c.desk.monitor.y, c.desk.monitor.r], [60, 40, -DESK.maxR]);
  assert.equal(normalize({ desk: { note: { x: 12.6 } } }).desk.note.x, 13);
});

test('a demo forces the object style it was built for', () => {
  const c = normalize({ works: [{ id: 'u', demo: 'uploader', style: 'polaroid' }, { id: 't', demo: 'toto', style: 'screen' }, { id: 'x', demo: 'nope' }] });
  assert.deepEqual(c.works.map((w) => [w.demo, w.style]), [['uploader', 'device'], ['toto', 'phone'], [null, 'polaroid']]);
});

test('a film in production never shows a tape', () => {
  const c = normalize({ films: [{ id: 'a', soon: true, tape: { show: true } }, { id: 'b', tape: { show: true } }] });
  assert.deepEqual(c.films.map((f) => f.tape.show), [false, true]);
});

test('normalize keeps the saved phone order, drops stale keys and adds new ones', () => {
  const c = normalize({
    desk: { mobileOrder: ['work:b', 'gone', 'note', 'note', 'tapes'] },
    works: [{ id: 'a' }, { id: 'b' }, { id: 'c', desk: { show: false } }],
    films: [{ id: 'f', tape: { show: true } }]
  });
  assert.deepEqual(c.desk.mobileOrder, ['work:b', 'note', 'tapes', 'monitor', 'work:a']);
  assert.deepEqual(deskKeys(c).sort(), c.desk.mobileOrder.slice().sort());
});

test('normalize drops empty background lines on the About page', () => {
  assert.deepEqual(normalize({ about: { before: [' One ', '', '  ', null, 'Two'] } }).about.before, ['One', 'Two']);
});

test('normalize gives every site a web design section, empty until filled', () => {
  assert.deepEqual(normalize({}).about.design, { lead: '', points: [] });
  assert.deepEqual(normalize({ about: { design: { lead: ' Hi ', points: [' A ', '', 3, null] } } }).about.design, { lead: 'Hi', points: ['A', '3'] });
  assert.equal(normalize({ works: [{ id: 'a', design: '  Notes  ' }] }).works[0].design, 'Notes');
  assert.equal(normalize({ works: [{ id: 'a' }] }).works[0].design, '');
});

/* ---------- Validate ---------- */

test('the live content has no errors', () => {
  const { errors } = validate(normalize(site));
  assert.deepEqual(errors, []);
});

test('a minimal valid site has no errors or warnings', () => {
  const { errors, warnings } = validate(normalize(base()));
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('required fields are errors when empty', () => {
  const raw = base();
  raw.site.name = '';
  raw.site.title = ' ';
  raw.desk.note.hi = '';
  raw.about.lead = '';
  raw.works[0].title = '';
  raw.films[0].title = '';
  raw.films[0].label = '';
  assert.deepEqual(errorsOf(raw).sort(), ['about.lead', 'desk.note.hi', 'films.0.label', 'films.0.title', 'site.name', 'site.title', 'works.0.title'].sort());
});

test('texts over their limit are errors', () => {
  const raw = base();
  raw.site.name = 'x'.repeat(LIMITS.title + 1);
  raw.about.lead = 'x'.repeat(LIMITS.lead + 1);
  assert.deepEqual(errorsOf(raw).sort(), ['about.lead', 'site.name']);
  raw.site.name = 'x'.repeat(LIMITS.title);
  raw.about.lead = 'x'.repeat(LIMITS.lead);
  assert.deepEqual(errorsOf(raw), []);
});

test('design notes and the web design section have limits, and placeholders warn', () => {
  const raw = base();
  raw.works[0].design = 'x'.repeat(LIMITS.notes + 1);
  raw.about.design = { lead: 'x'.repeat(LIMITS.text + 1), points: ['x'.repeat(LIMITS.line + 1)] };
  assert.deepEqual(errorsOf(raw).sort(), ['about.design.lead', 'about.design.points.0', 'works.0.design']);
  raw.works[0].design = '[Design notes]';
  raw.about.design = { lead: '[How you design]', points: ['Fine', '[A point]'] };
  assert.deepEqual(errorsOf(raw), []);
  assert.deepEqual(warningsOf(raw).sort(), ['about.design.lead', 'about.design.points.1', 'works.0.design']);
});

test('bad ids and duplicate ids are errors', () => {
  const raw = base();
  raw.works.push({ id: 'one', title: 'Again', media: raw.works[0].media });
  raw.works.push({ id: 'Bad Id', title: 'Bad', media: raw.works[0].media });
  raw.films.push({ id: '-x-', title: 'F', label: 'F', youtube: 'dQw4w9WgXcQ' });
  assert.deepEqual(errorsOf(raw).sort(), ['films.1.id', 'works.1.id', 'works.2.id']);
});

test('unsafe addresses are errors', () => {
  const raw = base();
  raw.site.url = 'http://yoavmizrahi.com';
  raw.site.email = 'not an email';
  raw.site.links = [{ label: 'X', url: 'javascript:alert(1)' }, { label: '', url: 'https://example.com' }];
  raw.works[0].link = 'javascript:alert(1)';
  raw.works[0].media.src = '../secret.png';
  assert.deepEqual(errorsOf(raw).sort(), ['site.email', 'site.links.0.url', 'site.links.1.label', 'site.url', 'works.0.link', 'works.0.media'].sort());
});

test('missing things are warnings, not errors', () => {
  const raw = base();
  raw.site.email = '';
  raw.site.links = [{ label: 'LinkedIn', url: '' }];
  raw.works[0].year = '[Year]';
  raw.works[0].media.alt = '';
  raw.films[0].youtube = '';
  raw.films[0].genre = '[GENRE]';
  assert.deepEqual(errorsOf(raw), []);
  assert.deepEqual(warningsOf(raw).sort(), ['films.0.genre', 'films.0.youtube', 'site.email', 'site.links.0.url', 'works.0.media.alt', 'works.0.year'].sort());
});

test('an empty site warns about the empty pages', () => {
  const raw = base();
  raw.works = [];
  raw.films = [];
  assert.deepEqual(warningsOf(raw).sort(), ['films', 'works']);
});

test('a shown tape needs a label', () => {
  const raw = base();
  raw.films[0].tape = { show: true, label: '' };
  assert.deepEqual(errorsOf(raw), ['films.0.tape.label']);
  raw.films[0].tape.label = 'x'.repeat(25);
  assert.deepEqual(errorsOf(raw), ['films.0.tape.label']);
});

test('replica settings: a logo only where allowed, wording only as plain text under valid keys', () => {
  const c = normalize({ works: [
    { id: 'm', demo: 'memesh', replica: { logo: { src: 'media/abc-1.webp' }, strings: { he: { 'p.bookings': ' שלי ', 'bad key!': 'x', 'p.cards': '   ' }, en: { 'p.cards': 'Cards' }, fr: { a: 'b' } } } },
    { id: 't', demo: 'toto', replica: { logo: { src: 'media/abc-2.webp' }, strings: { en: { 'nav.home': 'Start' } } } },
    { id: 'u', demo: 'uploader', replica: { strings: { en: { a: 'b' } } } },
    { id: 'v', demo: 'memesh', replica: { logo: { src: '../secret.png' } } }
  ] });
  assert.deepEqual(c.works[0].replica, { logo: { src: 'media/abc-1.webp' }, strings: { he: { 'p.bookings': 'שלי' }, en: { 'p.cards': 'Cards' } } });
  assert.deepEqual(c.works[1].replica, { logo: null, strings: { en: { 'nav.home': 'Start' }, he: {} } }, 'Toto has no logo slot');
  assert.equal(c.works[2].replica, undefined, 'Mega Uploader has no editable settings');
  assert.equal(c.works[3].replica.logo, null, 'a logo must be an uploaded image');
});
