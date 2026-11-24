// tools/build-site.mjs: the folder that goes live has every site file and no development files.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite, LEFT_OUT, leftOut } from '../../tools/build-site.mjs';

let out;
before(async () => { out = (await buildSite(join(await mkdtemp(join(tmpdir(), 'ym-site-')), '_site'))).out; });
after(async () => { await rm(join(out, '..'), { recursive: true, force: true }); });

test('everything the site and the admin load is included', () => {
  for (const path of ['index.html', 'favicon.svg', 'CNAME', '.nojekyll', 'css/style.css', 'js/main.js', 'js/render.js',
    'js/schema.js', 'admin/index.html', 'admin/app.js', 'admin/rescue.html', 'content/site.json', 'w', 'f',
    'demos/launch-desk/index.html', 'demos/launch-desk/js/app.js', 'demos/launch-desk/demo.mp4', 'demos/launch-desk/poster.jpg',
    'demos/toto-mundial/index.html', 'demos/toto-mundial/js/app.js', 'demos/toto-mundial/demo.mp4', 'demos/toto-mundial/poster.jpg',
    'demos/memesh/index.html', 'demos/memesh/js/app.js', 'demos/memesh/demo.mp4', 'demos/memesh/poster.jpg',
    'demos/lorewire/index.html', 'demos/lorewire/js/app.js', 'demos/lorewire/demo.mp4', 'demos/lorewire/poster.jpg',
    'demos/lorewire/media/lw-03d99aff6fb5/poster.webp', 'demos/lorewire/media/lw-03d99aff6fb5/video.mp4',
    'demos/ad-radar/index.html', 'demos/ad-radar/js/app.js', 'demos/ad-radar/demo.mp4', 'demos/ad-radar/poster.jpg',
    'demos/im-eng/index.html', 'demos/im-eng/js/app.js', 'demos/im-eng/demo.mp4', 'demos/im-eng/poster.jpg', 'demos/im-eng/media/hero.mp4', 'demos/im-eng/media/logo.webp',
    '404.html', 'robots.txt', 'sitemap.xml', 'share.jpg', 'demos/toto-mundial/share.jpg', 'demos/shared/dom.js']) {
    assert.ok(existsSync(join(out, path)), path + ' is missing from the deploy');
  }
});

test('development files are left out', () => {
  for (const name of LEFT_OUT) assert.ok(!existsSync(join(out, name)), name + ' should not be deployed');
  for (const name of ['CLAUDE.md', 'README.md', 'LICENSE', '_plans']) assert.ok(!existsSync(join(out, name)), name + ' is repo documentation, not part of the site');
  for (const name of ['memesh-replica-spec.md', 'toto-mundial-screenshots', 'memesh-admin-screenshots.zip', 'lorewire-replica-spec.md', 'lorewire-screenshots.zip', 'adradar-replica-spec.md', 'adradar-screenshots.zip', 'adradar-screenshots', 'im-eng-replica-spec.md', 'im-eng-screenshots.zip']) assert.ok(leftOut(name), name + ' is a real-data tour');
  for (const name of ['index.html', 'demos', 'screenshots.md']) assert.ok(!leftOut(name), name + ' is part of the site');
  assert.ok(!existsSync(join(out, 'worker', 'src', 'crypto.js')));
});

test('building again starts from a clean folder', async () => {
  const again = await buildSite(out);
  assert.equal(again.out, out);
  assert.ok(existsSync(join(out, 'index.html')));
});
