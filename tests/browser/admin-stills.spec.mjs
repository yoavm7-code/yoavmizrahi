// A film's stills in the admin: the pictures that run along the Films card on the Work page. Against
// the fake login server and GitHub, so nothing reaches the real repo.
import { test, expect } from './fixtures.mjs';
import { fakeBackend } from './admin-fakes.mjs';

test.use({ allowedConsole: [/status of 404/] });
test.skip(({ viewport }) => viewport.width !== 1180, 'admin editing runs at laptop width only');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

async function signIn(page) {
  await fakeBackend(page, { deploy: null, goLive: false });
  await page.goto('/admin/');
  await page.locator('#username').fill('yoav');
  await page.locator('#password').fill('a long test password');
  await page.getByRole('button', { name: 'Sign in' }).click();
}

function stillsOf(page, id) {
  return page.evaluate((fid) => JSON.parse(localStorage.getItem('ym-admin-draft-v1')).draft.films.find((f) => f.id === fid).stills, id);
}

test('a film shows its stills, and one can be removed and a new one added in its place', async ({ page }) => {
  const site = await (await page.request.get('/content/site.json')).json();
  const film = site.films[0];
  expect(film.stills.length, 'the first film starts with four stills').toBe(4);

  await signIn(page);
  await page.goto('/admin/#/films/' + film.id);
  const section = page.locator('section.section', { has: page.getByRole('heading', { name: 'Stills', exact: true }) });
  await expect(section.locator('.media-pick__preview img')).toHaveCount(4);
  await expect(section.getByText('Add a still')).toHaveCount(0);

  /* Removing the second one keeps the others in order and opens a slot for a new one. */
  await section.getByRole('button', { name: 'Remove' }).nth(1).click();
  await expect(section.locator('.media-pick__preview img')).toHaveCount(3);
  expect(await stillsOf(page, film.id)).toEqual([film.stills[0], film.stills[2], film.stills[3]]);
  await expect(section.getByText('Add a still')).toBeVisible();

  /* A new picture goes at the end, cleaned and named by its content like every upload. */
  await section.locator('.media-pick input[type=file]').last().setInputFiles({ name: 'frame.png', mimeType: 'image/png', buffer: PNG });
  await expect(section.locator('.media-pick__preview img')).toHaveCount(4);
  const after = await stillsOf(page, film.id);
  expect(after.slice(0, 3)).toEqual([film.stills[0], film.stills[2], film.stills[3]]);
  expect(after[3]).toMatch(/^media\/[0-9a-f]{16}\.(webp|jpg)$/);
  await expect(section.getByText('Add a still')).toHaveCount(0);
});

test('a film without stills offers an empty slot', async ({ page }) => {
  const site = await (await page.request.get('/content/site.json')).json();
  const film = site.films.find((f) => !(f.stills && f.stills.length));
  await signIn(page);
  await page.goto('/admin/#/films/' + film.id);
  const section = page.locator('section.section', { has: page.getByRole('heading', { name: 'Stills', exact: true }) });
  await expect(section.locator('.media-pick__preview')).toHaveCount(0);
  await expect(section.getByText('Add a still')).toBeVisible();
});
