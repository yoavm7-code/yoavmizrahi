// The site in a real browser, the way CLAUDE.md asks it to be checked before calling anything done:
// every route, the menu, a tape into the monitor, both demos, the reel, share links and the admin,
// at phone, tablet and laptop width, with no console errors anywhere.
import { test, expect } from './fixtures.mjs';

const ROUTES = [
  ['/', 'home'],
  ['/work', 'work'],
  ['/work/uploader', 'work-uploader'],
  ['/work/toto', 'work-toto'],
  ['/work/memesh', 'work-memesh'],
  ['/films', 'films'],
  ['/about', 'about']
];

function isNarrow(page) { return page.viewportSize().width <= 900; }

/* ---------- Pages ---------- */

for (const [route, name] of ROUTES) {
  test('route #' + route + ' shows its page and fits the screen', async ({ page }) => {
    await page.goto('/#' + route);
    await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', name);
    await expect(page.locator('.page.is-active')).toHaveCount(1);
    await expect(page.locator('body')).toHaveAttribute('data-theme', name === 'films' ? 'dark' : 'light');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(1);
  });
}

test('an unknown route falls back to the desk', async ({ page }) => {
  await page.goto('/#/nowhere');
  await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'home');
});

test('the menu opens, navigates with the page wipe, and closes with Escape', async ({ page }) => {
  await page.goto('/#/');
  const toggle = page.locator('.site-header [data-menu-toggle]');
  await toggle.click();
  await expect(page.locator('#menu')).toHaveAttribute('aria-hidden', 'false');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).toHaveAttribute('aria-hidden', 'true');

  await toggle.click();
  await page.locator('#menu a[href="#/about"]').click();
  await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'about');
  await expect(page.locator('#menu')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-page-name]')).toHaveText('ABOUT');
  await expect(page).toHaveTitle(/^About — /);
});

test('every work card opens its project page', async ({ page }) => {
  await page.goto('/#/work');
  const hrefs = await page.locator('.page.is-active .card').evaluateAll((els) => els.map((a) => a.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(1);
  for (const href of hrefs) {
    await page.goto('/' + href);
    await expect(page.locator('.page.is-active')).toHaveAttribute('data-route', href.slice(1));
  }
});

/* ---------- The desk ---------- */

test('a tape goes into the monitor, plays, and ejects', async ({ page }) => {
  await page.goto('/#/');
  const screen = page.locator('[data-monitor]');
  const tape = page.locator('[data-tape]').first();
  await expect(screen).toHaveAttribute('data-state', 'empty');

  if (isNarrow(page)) {
    await tape.locator('[data-insert]').click();
  } else {
    /* Drag the tape by its body (not its button) and drop it on the monitor. */
    await page.waitForTimeout(600);
    const from = await tape.locator('.tape__reels').boundingBox();
    const to = await page.locator('[data-obj="monitor"]').boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await page.mouse.up();
  }
  await expect(screen).toHaveAttribute('data-state', 'idle');
  await expect(tape).toHaveClass(/is-inserted/);
  await expect(page.locator('[data-monitor-title]')).toHaveText(await tape.getAttribute('data-title'));

  await page.locator('[data-monitor-play]').click();
  await expect(screen).toHaveAttribute('data-state', 'playing');
  await expect(page.locator('[data-monitor-player] .placeholder-player, [data-monitor-player] iframe')).toHaveCount(1);

  await page.locator('[data-eject]').click();
  await expect(screen).toHaveAttribute('data-state', 'empty');
  await expect(tape).not.toHaveClass(/is-inserted/);
});

test('a second tape replaces the first', async ({ page }) => {
  await page.goto('/#/');
  const tapes = page.locator('[data-tape]');
  test.skip(await tapes.count() < 2, 'needs two tapes');
  await tapes.nth(0).locator('[data-insert]').click();
  await tapes.nth(1).locator('[data-insert]').click();
  await expect(tapes.nth(0)).not.toHaveClass(/is-inserted/);
  await expect(tapes.nth(1)).toHaveClass(/is-inserted/);
});

test('desk objects drag on wide screens and stay put on narrow ones', async ({ page }) => {
  await page.goto('/#/');
  await page.waitForTimeout(600);
  const note = page.locator('[data-obj="note"]');
  const before = await note.boundingBox();
  await page.mouse.move(before.x + 40, before.y + 60);
  await page.mouse.down();
  await page.mouse.move(before.x + 140, before.y + 120, { steps: 8 });
  await page.mouse.up();
  const after = await note.boundingBox();
  if (isNarrow(page)) expect(Math.abs(after.x - before.x)).toBeLessThan(2);
  else expect(after.x - before.x).toBeGreaterThan(50);
});

/* ---------- Demos ---------- */

test('the upload demo on the desk runs to 100% and resets', async ({ page }) => {
  await page.goto('/#/');
  const demo = page.locator('.page.is-active [data-widget="uploader"]');
  await demo.getByRole('button', { name: 'UPLOAD 3 SAMPLE FILES' }).click();
  await expect(demo.locator('.u-file')).toHaveCount(3);
  await expect(demo.getByRole('button', { name: 'DONE · RUN AGAIN' })).toBeVisible({ timeout: 10000 });
  await expect(demo.locator('.u-file__row span:last-child')).toHaveText(['100%', '100%', '100%']);
  await demo.getByRole('button', { name: 'DONE · RUN AGAIN' }).click();
  await expect(demo.getByRole('button', { name: 'UPLOAD 3 SAMPLE FILES' })).toBeVisible();
});

test('the score picker changes, locks, and unlocks', async ({ page }) => {
  await page.goto('/#/work/toto');
  const demo = page.locator('.page.is-active [data-widget="toto"]');
  const score = demo.locator('.toto__score');
  await expect(score).toHaveText('2–1');
  await demo.getByRole('button', { name: 'Brazil score up' }).click();
  await demo.getByRole('button', { name: 'Argentina score down' }).click();
  await demo.getByRole('button', { name: 'Argentina score down' }).click();
  await expect(score).toHaveText('3–0');
  await demo.getByRole('button', { name: 'Lock in prediction' }).click();
  await demo.getByRole('button', { name: 'Brazil score up' }).click();
  await expect(score).toHaveText('3–0');
  await expect(demo.locator('.toto__lock')).toHaveText('Locked ✓ 3–0 · change');
  await demo.locator('.toto__lock').click();
  await expect(demo.getByRole('button', { name: 'Lock in prediction' })).toBeVisible();
});

/* ---------- Films ---------- */

test('the reel steps through films, plays, and shows a player', async ({ page }) => {
  await page.goto('/#/films');
  const clips = page.locator('[data-clip]');
  const count = await clips.count();
  expect(count).toBeGreaterThan(1);
  await expect(clips.nth(0)).toHaveClass(/is-active/);
  await expect(page.locator('[data-timecode]')).toHaveText('00:00:00:00');

  await page.locator('[data-reel-next]').click();
  await expect(clips.nth(1)).toHaveClass(/is-active/);
  await expect(page.locator('[data-reel-label]')).toContainText(await clips.nth(1).getAttribute('data-label'));
  await expect(page.locator('[data-timecode]')).not.toHaveText('00:00:00:00');
  await page.locator('[data-reel-prev]').click();
  await expect(clips.nth(0)).toHaveClass(/is-active/);

  const toggle = page.locator('[data-reel-toggle]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-label', 'Pause reel');
  await expect(page.locator('[data-timecode]')).not.toHaveText('00:00:00:00');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-label', 'Play reel');

  await clips.nth(0).click();
  await page.locator('[data-reel-filmplay]').click();
  await expect(page.locator('[data-reel-player] .placeholder-player, [data-reel-player] iframe')).toHaveCount(1);
  await page.goto('/#/about');
  await page.goto('/#/films');
  await expect(page.locator('[data-reel-player] > *')).toHaveCount(0);
});

test('#/films/<id> opens the reel on that film', async ({ page }) => {
  await page.goto('/#/films');
  const last = page.locator('[data-clip]').last();
  const id = await last.getAttribute('data-id');
  await page.goto('/#/films/' + id);
  await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'films');
  await expect(page.locator('[data-clip][data-id="' + id + '"]')).toHaveClass(/is-active/);
});

/* ---------- Share links ---------- */

test('share links land on the right page', async ({ page }) => {
  await page.goto('/w/toto/');
  await expect(page).toHaveURL(/\/#\/work\/toto$/);
  await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'work-toto');
  await page.goto('/f/leviathan-1/');
  await expect(page).toHaveURL(/\/#\/films\/leviathan-1$/);
  await expect(page.locator('[data-clip][data-id="leviathan-1"]')).toHaveClass(/is-active/);
});

/* ---------- Admin ---------- */

test('the admin opens on its sign-in screen', async ({ page }) => {
  await page.goto('/admin/');
  await expect(page.locator('#username')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
});

test('the rescue page opens', async ({ page }) => {
  await page.goto('/admin/rescue.html');
  await expect(page.locator('body')).not.toBeEmpty();
  await expect(page).toHaveTitle(/Rescue/);
});
