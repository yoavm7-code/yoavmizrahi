// The admin's replica settings: a demo's logo and its wording, per language. Against the fake login
// server and GitHub, so nothing reaches the real repo.
import { test, expect } from './fixtures.mjs';
import { fakeBackend } from './admin-fakes.mjs';

test.use({ allowedConsole: [/status of 404/] });
test.skip(({ viewport }) => viewport.width !== 1180, 'admin editing runs at laptop width only');

async function signIn(page) {
  await fakeBackend(page, { deploy: null, goLive: false });
  await page.goto('/admin/');
  await page.locator('#username').fill('yoav');
  await page.locator('#password').fill('a long test password');
  await page.getByRole('button', { name: 'Sign in' }).click();
}

function draftOf(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('ym-admin-draft-v1')).draft);
}

test('Memesh: a logo slot and every line of wording, editable in Hebrew and English', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin/#/works/memesh');
  await expect(page.getByRole('heading', { name: 'Demo logo and wording' })).toBeVisible();
  /* The live content has the real logo, so the slot offers to replace it. */
  await expect(page.getByRole('button', { name: 'Replace' })).toBeVisible();

  const search = page.getByRole('searchbox', { name: 'Search the wording' });
  await search.fill('legend.closed');
  const line = page.locator('textarea[data-key="legend.closed"]');
  await expect(line).toHaveValue('סגור');
  await expect(line).toHaveAttribute('dir', 'rtl');
  await line.fill('סגור היום');
  await line.blur();
  await expect(page.locator('.wording__row.is-changed')).toHaveCount(1);
  await expect(page.locator('.wording').getByText('1 changed')).toBeVisible();
  expect((await draftOf(page)).works.find((w) => w.id === 'memesh').replica.strings.he['legend.closed']).toBe('סגור היום');

  /* A placeholder left out gets a warning. */
  await search.fill('p.spots');
  const spots = page.locator('textarea[data-key="p.spots"]');
  await spots.fill('מקומות פנויים');
  await expect(page.locator('.wording__row', { has: spots }).locator('.wording__warn')).toContainText('{n}');

  /* Reset brings the original back; English is its own list. */
  await search.fill('legend.closed');
  await page.locator('.wording__row.is-changed').getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('textarea[data-key="legend.closed"]')).toHaveValue('סגור');
  await page.locator('.wording').getByRole('button', { name: 'English' }).click();
  await expect(page.locator('textarea[data-key="legend.closed"]')).toHaveValue('Closed');
});

test('Toto Mundial: wording only, no logo slot; Launch Desk: neither', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin/#/works/toto');
  await expect(page.getByRole('heading', { name: 'Demo wording' })).toBeVisible();
  await expect(page.getByText('Choose the logo')).toHaveCount(0);
  await page.goto('/admin/#/works/uploader');
  await expect(page.getByText('Launch Desk')).toBeVisible();
  await expect(page.locator('.wording')).toHaveCount(0);
});

test('a replica uses the logo and wording published for it', async ({ page }) => {
  const site = await (await page.request.get('/content/site.json')).json();
  const work = site.works.find((w) => w.demo === 'memesh');
  work.replica = { logo: { src: 'media/test-logo.png' }, strings: { he: { 'p.bookings': 'ההזמנות שלי' }, en: {} } };
  await page.route('**/content/site.json*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(site) }));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  await page.route('**/media/test-logo.png', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: png }));
  await page.goto('/demos/memesh/');
  await expect(page.locator('img.logo__img')).toHaveAttribute('src', '../../media/test-logo.png');
  await expect(page.locator('[data-ptab="bookings"]')).toHaveText('ההזמנות שלי');
  await expect(page.locator('[data-ptab="cards"]')).toContainText('כרטיסיות');
});
