// A draft older than the live site, end to end against a fake GitHub: publishing it keeps the newer
// live work (the bug that once removed three works), and removals are spelled out before publishing.
import { test, expect } from './fixtures.mjs';
import { MAIN, SITE_JSON, fakeBackend } from './admin-fakes.mjs';

test.use({ allowedConsole: [/status of 404/] });
test.skip(({ viewport }) => viewport.width !== 1180, 'publish flow runs at laptop width only');

const OLD = '3'.repeat(40);
const MOVED = '4'.repeat(40);
const LIVE = JSON.parse(SITE_JSON);
const LIVE_IDS = LIVE.works.map((w) => w.id);

/* The live content as it was before its last work was added. */
function older() {
  const c = JSON.parse(SITE_JSON);
  const gone = c.works.pop();
  c.desk.mobileOrder = c.desk.mobileOrder.filter((k) => k !== 'work:' + gone.id);
  return c;
}

async function signIn(page, local) {
  if (local) {
    await page.addInitScript((value) => { localStorage.setItem('ym-admin-draft-v1', value); }, JSON.stringify(local));
  }
  await page.clock.install();
  await page.goto('/admin/');
  await page.locator('#username').fill('yoav');
  await page.locator('#password').fill('a long test password');
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/* Closed dialogs fade out on a timer, and the test clock is paused, so only the open one counts. */
async function publishNow(page) {
  await page.locator('.dialog.is-open').getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByText(/Saved\. GitHub is putting it live/)).toBeVisible();
}

test('an older draft keeps the work published since, and its own edits', async ({ page }) => {
  const draft = older();
  draft.desk.note.hi = 'Hello from an old draft';
  const saved = await fakeBackend(page, { deploy: null, goLive: false, versions: { [OLD]: JSON.stringify(older()) } });
  await signIn(page, { draft, media: {}, baseCommit: OLD, updatedAt: Date.now() + 60000 });
  await expect(page.locator('.toast')).toContainText('Your edits are kept, and so is everything published since');

  await page.locator('button.publish').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Edited the sticky note')).toBeVisible();
  await expect(dialog.getByText(/^Removed /)).toHaveCount(0);
  await publishNow(page);
  expect(saved.content.works.map((w) => w.id)).toEqual(LIVE_IDS);
  expect(saved.content.desk.note.hi).toBe('Hello from an old draft');
});

test('a leftover copy of an earlier publish is not treated as a draft', async ({ page }) => {
  await fakeBackend(page, { deploy: null, goLive: false, versions: { [OLD]: JSON.stringify(older()) } });
  await signIn(page, { draft: older(), media: {}, baseCommit: OLD, updatedAt: Date.now() + 60000 });
  await expect(page.getByRole('heading', { name: 'Everything is published' })).toBeVisible();
  await expect(page.locator('.dialog')).toHaveCount(0);
  await expect(page.locator('button.publish')).toBeDisabled();
});

test('when the site changes while editing, publishing catches up instead of overwriting', async ({ page }) => {
  const moved = JSON.parse(SITE_JSON);
  moved.about.lead = 'Published from another device.';
  const saved = await fakeBackend(page, { deploy: null, goLive: false, heads: [MAIN, MOVED], versions: { [MOVED]: JSON.stringify(moved) } });
  const draft = JSON.parse(SITE_JSON);
  draft.desk.note.hi = 'Hello from this device';
  await signIn(page, { draft, media: {}, baseCommit: MAIN, updatedAt: Date.now() + 60000 });

  await page.locator('button.publish').click();
  await page.locator('.dialog').getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('Your edits now sit on top of the newest version');
  const dialog = page.locator('.dialog.is-open').last();
  await expect(dialog.getByText('Edited the sticky note')).toBeVisible();
  await expect(dialog.getByText('Edited the About page')).toHaveCount(0);
  await publishNow(page);
  expect(saved.content.desk.note.hi).toBe('Hello from this device');
  expect(saved.content.about.lead).toBe('Published from another device.');
});

test('removing a work is called out before publishing', async ({ page }) => {
  await fakeBackend(page, { deploy: null, goLive: false });
  const draft = JSON.parse(SITE_JSON);
  const gone = draft.works.pop();
  await signIn(page, { draft, media: {}, baseCommit: MAIN, updatedAt: Date.now() + 60000 });
  await page.locator('button.publish').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.callout--danger')).toHaveText('This takes 1 thing off the live site. If that is not what you meant, choose Not yet.');
  await expect(dialog.locator('.changes li').first()).toHaveText('Removed work "' + gone.title + '"');
  await expect(dialog.locator('.changes li').first()).toHaveClass(/is-removal/);
});
