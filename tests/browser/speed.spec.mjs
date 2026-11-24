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

test('the standby stills load after the page, one at a time, and stop when the desk is left', async ({ page }) => {
  const urls = [];
  let loadedAt = -1;
  page.on('load', () => { loadedAt = urls.length; });
  page.on('request', (r) => urls.push(new URL(r.url()).pathname.slice(1)));
  await page.goto('/#/');
  await expect(page.locator('[data-monitor]')).toHaveClass(/has-standby/);
  const stills = await page.locator('[data-standby]').evaluate((el) => el.getAttribute('data-stills').split(' '));
  const first = urls.indexOf(stills[0]);
  expect(first, 'the first still is fetched after the page has loaded').toBeGreaterThanOrEqual(loadedAt);
  expect(urls.filter((u) => stills.slice(1).includes(u)), 'only the still on screen').toEqual([]);

  await page.goto('/#/about');
  const before = urls.length;
  await page.waitForTimeout(5600);
  expect(urls.slice(before).filter((u) => stills.includes(u)), 'nothing more off the desk').toEqual([]);
});

test('a page opened first never fetches the standby stills', async ({ page }) => {
  const urls = track(page);
  await page.goto('/#/about');
  await page.waitForLoadState('networkidle');
  const stills = await page.locator('[data-standby]').evaluate((el) => el.getAttribute('data-stills').split(' ').map((u) => '/' + u));
  expect(urls.filter((u) => stills.includes(u))).toEqual([]);
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

/* ---------- A picture that fails once ---------- */

/* Answers the first request for a matching picture with a 503, as GitHub Pages sometimes does; every
   later request goes through. Returns the paths that failed. */
async function failOnce(page, pattern) {
  const failed = new Set();
  await page.route(pattern, (route) => {
    if (failed.size) return route.continue();
    failed.add(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 503, body: '' });
  });
  return failed;
}

test.describe('a picture the server fails once', () => {
  test.use({ allowedConsole: [/status of 503/] });

  test('on the desk is asked for again and shows', async ({ page }) => {
    const failed = await failOnce(page, '**/demos/memesh/poster*');
    await page.goto('/#/');
    const img = page.locator('[data-obj="work:memesh"] img');
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((i) => i.complete && i.naturalWidth > 0), { timeout: 5000 }).toBe(true);
    expect(failed.size, 'the first request failed').toBe(1);
  });

  test('in a replica is asked for again and shows', async ({ page }) => {
    test.skip(page.viewportSize().width <= 900, 'the LoreWire home page is checked at laptop width');
    const failed = await failOnce(page, '**/demos/lorewire/media/**/wide.webp');
    await page.goto('/demos/lorewire/');
    const hero = page.locator('img.hero__art.is-on');
    await expect.poll(() => hero.evaluate((i) => i.complete && i.naturalWidth > 0), { timeout: 5000 }).toBe(true);
    expect(failed.size, 'the first request failed').toBe(1);
  });
});
