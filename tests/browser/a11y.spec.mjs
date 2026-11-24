// Accessibility, checked by axe (the open-source engine behind most accessibility audits) on every
// page at every screen size: contrast, names, roles, landmarks and the rest of WCAG 2.2 A and AA.
// The replicas are copies of other products with their own design, so their iframes are left out here.
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.mjs';

const ROUTES = ['/', '/work', '/work/uploader', '/work/toto', '/work/memesh', '/work/lorewire', '/work/ad-radar', '/work/im-eng', '/films', '/about'];

/* Reduced motion skips the wipe and the letter animations, so axe reads the page as it rests. */
async function audit(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('.replica__viewport')
    .options({ preload: false }) // axe would re-fetch the font stylesheet, which the site's policy rightly blocks
    .analyze();
  return results.violations.map((v) => v.id + ': ' + v.help + '\n    ' + v.nodes.slice(0, 5).map((n) => n.target.join(' ')).join('\n    '));
}

for (const route of ROUTES) {
  test('#' + route + ' passes the accessibility checks', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#' + route);
    await expect(page.locator('.page.is-active')).toHaveAttribute('data-route', route);
    expect(await audit(page)).toEqual([]);
  });
}

test('the open menu passes the accessibility checks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/');
  await page.locator('.site-header [data-menu-toggle]').click();
  await expect(page.locator('#menu')).toHaveAttribute('aria-hidden', 'false');
  expect(await audit(page)).toEqual([]);
});

/* ---------- Keyboard and focus ---------- */

test('the skip link is the first Tab stop and moves focus to the page heading', async ({ page }) => {
  await page.goto('/#/about');
  await page.keyboard.press('Tab');
  const skip = page.locator('[data-skip]');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('.page.is-active h1')).toBeFocused();
  await expect(page).toHaveURL(/#\/about$/);
});

test('the open menu keeps focus inside it and hands it back when it closes', async ({ page }) => {
  await page.goto('/#/');
  const toggle = page.locator('.site-header [data-menu-toggle]');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#menu .mlink').first()).toBeFocused();
  expect(await page.locator('main').evaluate((m) => m.inert), 'the page behind is inert').toBe(true);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    // Past the last link focus may go to the browser's own controls (the body here), never to the page.
    expect(await page.evaluate(() => document.activeElement === document.body || document.getElementById('menu').contains(document.activeElement)), 'Tab reached the page behind the menu').toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  expect(await page.locator('main').evaluate((m) => m.inert)).toBe(false);
  expect(await page.locator('#menu').evaluate((m) => m.inert), 'the closed menu is out of the Tab order').toBe(true);
});

test('opening a page moves focus to its heading', async ({ page }) => {
  await page.goto('/#/');
  await page.locator('.site-header [data-menu-toggle]').click();
  await page.locator('#menu a[href="#/work"]').click();
  await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'work');
  await expect(page.locator('.page.is-active h1')).toBeFocused();
  await expect(page.locator('.page.is-active h1')).toHaveAttribute('aria-label', 'Work');
});

test('the first page load leaves focus alone', async ({ page }) => {
  await page.goto('/#/work');
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test('the reel ruler moves with the arrow keys, Home and End', async ({ page }) => {
  await page.goto('/#/films');
  const ruler = page.locator('[data-scrub]');
  await ruler.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(ruler).toHaveAttribute('aria-valuenow', '10');
  await expect(page.locator('[data-timecode]')).toHaveText('00:00:10:00');
  await page.keyboard.press('ArrowLeft');
  await expect(ruler).toHaveAttribute('aria-valuenow', '5');
  await page.keyboard.press('End');
  const last = await page.locator('[data-clip]').last().getAttribute('data-label');
  await expect(ruler).toHaveAttribute('aria-valuetext', '149 seconds, ' + last);
  await expect(page.locator('[data-clip]').last()).toHaveClass(/is-active/);
  await page.keyboard.press('Home');
  await expect(ruler).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('[data-clip]').first()).toHaveClass(/is-active/);
});

/* ---------- Not found ---------- */

test.describe('a missing address', () => {
  /* The browser itself logs the 404 status of the page it was sent to. */
  test.use({ allowedConsole: [/status of 404/] });

  test('shows the 404 page, which leads back to the desk', async ({ page }) => {
    const res = await page.goto('/no/such/page');
    expect(res.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Nothing on this part of the desk.');
    expect(await audit(page)).toEqual([]);
    await page.getByRole('link', { name: 'Back to the desk' }).click();
    await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'home');
  });
});
