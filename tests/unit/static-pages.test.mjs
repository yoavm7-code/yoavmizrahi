// The hand-written files next to the generated ones: the 404 page, robots.txt, sitemap.xml and the
// link preview pictures. They aren't rendered from site.json, so these checks keep them in step.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SITE_CSP, REPLICA_CSP } from '../../js/render.js';
import { DEMOS, posterSizes } from '../../js/schema.js';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const site = JSON.parse(await read('content/site.json'));

/* Width and height from a JPEG's start-of-frame marker. */
function jpegSize(buf) {
  for (let i = 2; i < buf.length;) {
    const marker = buf[i + 1];
    const length = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
    i += 2 + length;
  }
  return null;
}

test('the 404 page has the site policy, stays out of search, and leads back to the desk', async () => {
  const page = await read('404.html');
  assert.ok(page.includes('<meta http-equiv="Content-Security-Policy" content="' + SITE_CSP + '">'), '404.html must use SITE_CSP from js/render.js');
  assert.ok(page.includes('<meta name="robots" content="noindex">'));
  assert.ok(page.includes('href="/"'));
  assert.ok(!/\bsrc="(?!\/)|href="(?!\/|https:)/.test(page), 'every path starts with /, since it is served at any address');
  assert.equal((page.match(/<h1/g) || []).length, 1);
  assert.ok(!/<script/i.test(page), 'no scripts needed');
});

test('every replica page carries the replica policy, before anything it governs', async () => {
  const pages = Object.values(DEMOS).map((d) => d.replica && d.replica.src).filter(Boolean);
  assert.equal(pages.length, 6);
  for (const src of pages) {
    const page = await read(src + 'index.html');
    const meta = '<meta http-equiv="Content-Security-Policy" content="' + REPLICA_CSP + '">';
    assert.ok(page.includes(meta), src + ' must use REPLICA_CSP from js/render.js');
    assert.ok(page.indexOf(meta) < page.indexOf('<link') && page.indexOf(meta) < page.indexOf('<script'), src);
  }
  assert.ok(!/unsafe-inline|unsafe-eval/.test(REPLICA_CSP));
});

test('robots.txt lets everything be crawled and points at the sitemap', async () => {
  const robots = await read('robots.txt');
  assert.ok(robots.includes('User-agent: *'));
  assert.ok(!/Disallow:\s*\//.test(robots));
  assert.ok(robots.includes('Sitemap: ' + site.site.url + '/sitemap.xml'));
});

test('the sitemap lists the site address', async () => {
  const map = await read('sitemap.xml');
  assert.ok(map.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(map.includes('<loc>' + site.site.url + '/</loc>'));
});

test('every desktop replica has its smaller poster copies, as WebP at the listed widths', async () => {
  const sizes = Object.values(DEMOS).flatMap((d) => posterSizes(d.replica));
  assert.ok(sizes.length >= 3 * 5);
  for (const s of sizes) {
    const buf = await readFile(new URL(s.src, root));
    assert.equal(buf.toString('ascii', 0, 4) + buf.toString('ascii', 8, 12), 'RIFFWEBP', s.src + ' is not a WebP');
    assert.ok(buf.length < 160 * 1024, s.src + ' is too heavy');
  }
});

test('the site serves its own fonts, with their licenses', async () => {
  const css = await read('css/style.css');
  const files = [...css.matchAll(/url\("\.\.\/(fonts\/[a-z-]+\.woff2)"\)/g)].map((m) => m[1]);
  assert.equal(files.length, 8);
  for (const f of files) assert.equal((await readFile(new URL(f, root))).toString('ascii', 0, 4), 'wOF2', f);
  const ofl = await read('fonts/OFL.txt');
  for (const name of ['Syne', 'Inter', 'Caveat', 'JetBrains Mono']) assert.ok(ofl.includes(name + ' Project Authors'), name);
  assert.ok(!(await read('index.html')).includes('fonts.googleapis.com'));
  assert.ok(!(await read('404.html')).includes('fonts.googleapis.com'));
});

test('the link preview pictures exist at 1200 x 630', async () => {
  const pictures = ['share.jpg'].concat(Object.values(DEMOS).map((d) => d.replica && d.replica.share).filter(Boolean));
  assert.ok(pictures.length > 1);
  for (const path of pictures) {
    assert.deepEqual(jpegSize(await readFile(new URL(path, root))), { width: 1200, height: 630 }, path);
  }
});
