// The committed pages must be exactly what js/render.js makes from content/site.json.
// Fails when render.js or site.json changed by hand without running: node tools/generate.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { renderSite, renderSharePages } from '../../js/render.js';

const root = new URL('../../', import.meta.url);
const site = JSON.parse(await readFile(new URL('content/site.json', root), 'utf8'));
const FIX = 'Run "node tools/generate.mjs" and commit the result.';

/* Git on Windows may check files out with CRLF line endings; the repo stores LF. */
async function readText(url) { return (await readFile(url, 'utf8')).replace(/\r\n/g, '\n'); }

test('index.html matches content/site.json', async () => {
  const committed = await readText(new URL('index.html', root));
  const m = committed.match(/<meta name="build" content="([^"]+)">/);
  assert.ok(m, 'index.html has no build id. ' + FIX);
  assert.equal(committed, renderSite(site, { build: m[1] }), 'index.html is out of date. ' + FIX);
});

test('every share page matches content/site.json', async () => {
  for (const page of renderSharePages(site)) {
    const file = new URL(page.path, root);
    assert.ok(existsSync(file), page.path + ' is missing. ' + FIX);
    assert.equal(await readText(file), page.html, page.path + ' is out of date. ' + FIX);
  }
});

test('no leftover share pages for removed works or films', async () => {
  const expected = renderSharePages(site).map((p) => p.path).sort();
  const found = [];
  for (const dir of ['w', 'f']) {
    if (!existsSync(new URL(dir + '/', root))) continue;
    for (const id of await readdir(new URL(dir + '/', root))) {
      for (const name of await readdir(new URL(dir + '/' + id + '/', root))) found.push(dir + '/' + id + '/' + name);
    }
  }
  assert.deepEqual(found.sort(), expected, 'Stale files in w/ or f/. ' + FIX);
});
