// The admin's design fields: a work's design notes and the About page's web design section.
// Against the fake login server and GitHub, so nothing reaches the real repo.
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

test('a work\'s design notes are edited in the admin and show in the preview', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin/#/works/lorewire');
  const notes = page.getByLabel('Design notes (optional)');
  await expect(notes).toHaveValue(/^Dark by default/);
  await notes.fill('One idea.\n\nAnother idea.');
  await notes.blur();
  expect((await draftOf(page)).works.find((w) => w.id === 'lorewire').design).toBe('One idea.\n\nAnother idea.');
  const preview = page.frameLocator('.preview__frame-wrap.is-shown iframe');
  await expect(preview.locator('.page.is-active .proj-design p')).toHaveText(['One idea.', 'Another idea.']);
});

test('the About page\'s web design intro and points: edit, add, remove', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin/#/about');
  await expect(page.getByRole('heading', { name: 'Web design' })).toBeVisible();
  const intro = page.getByLabel('Intro', { exact: true });
  await intro.fill('I design in the browser.');
  await intro.blur();
  await page.getByLabel('Point 1', { exact: true }).fill('Product sites and web apps.');
  await page.getByLabel('Point 1', { exact: true }).blur();

  await page.getByRole('button', { name: 'Add a point' }).click();
  const added = page.getByLabel('Point 4', { exact: true });
  await expect(added).toBeFocused();
  await added.fill('A new point.');
  await added.blur();
  await page.getByRole('button', { name: 'Remove point 2' }).click();
  await expect(page.getByLabel('Point 4', { exact: true })).toHaveCount(0);

  const design = (await draftOf(page)).about.design;
  expect(design.lead).toBe('I design in the browser.');
  expect(design.points).toEqual(['Product sites and web apps.', 'LoreWire is one example. Open it from Work to click through it.', 'A new point.']);
});
