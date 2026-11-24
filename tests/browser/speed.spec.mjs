// What a first visit costs: the fonts come from the site, the desk fetches only the pictures it shows,
// in a size that fits, and nothing keeps running while the visitor does nothing.
import { test, expect } from './fixtures.mjs';

function track(page) {
  const urls = [];
  page.on('request', (r) => urls.push(new URL(r.url()).pathname));
  return urls;
}

test('the fonts load from the site itself', async ({ page }) => {
  const urls = track(page);
  await page.goto('/#/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => ['800 20px Syne', '400 16px Inter', '700 20px Caveat', '400 12px "JetBrains Mono"'].map((f) => document.fonts.check(f)))).toEqual([true, true, true, true]);
  expect(urls.filter((u) => u.startsWith('/fonts/')).sort()).toEqual(['/fonts/caveat-latin.woff2', '/fonts/inter-latin.woff2', '/fonts/jetbrains-mono-latin.woff2', '/fonts/syne-latin.woff2']);
});

test('the desk fetches only the posters it shows, as the small copies', async ({ page }) => {
  const urls = track(page);
  await page.goto('/#/');
  await page.waitForLoadState('networkidle');
  const posters = urls.filter((u) => /\/poster/.test(u));
  expect(posters.length, 'the desk shows some posters').toBeGreaterThan(0);
  expect(posters.filter((u) => u.endsWith('.jpg')), 'no full-size poster on the desk').toEqual([]);
  expect(posters.filter((u) => /launch-desk|toto-mundial/.test(u)), 'nothing from pages not yet opened').toEqual([]);
});

test('a project page gives its video the poster when it opens', async ({ page }) => {
  await page.goto('/#/');
  const video = page.locator('section[data-page="work-memesh"] [data-replica-video]');
  expect(await video.evaluate((v) => v.getAttribute('poster'))).toBeNull();
  await page.goto('/#/work/memesh');
  await expect(video).toHaveAttribute('poster', 'demos/memesh/poster.jpg');
});

test('the custom cursor stops animating once it has caught up with a still pointer', async ({ page }) => {
  test.skip(page.viewportSize().width <= 900, 'the custom cursor is for fine pointers');
  await page.addInitScript(() => {
    window.__frames = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => { window.__frames++; return raf(cb); };
  });
  await page.goto('/#/about');
  await page.mouse.move(300, 300);
  await page.mouse.move(600, 400, { steps: 5 });
  await expect(page.locator('[data-cursor-el]')).toHaveAttribute('style', /translate\(600px, ?400px\)/);
  const before = await page.evaluate(() => window.__frames);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__frames) - before, 'animation frames while the pointer is still').toBe(0);
});
