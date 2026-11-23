// Publishing from the admin, end to end, against a fake login server and a fake GitHub:
// sign in, publish a draft, then each way the deploy can end (live, stopped by the check, replaced).
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.mjs';

const REPO = '/repos/yoavm7-code/yoavmizrahi';
const MAIN = '1'.repeat(40);
const NEW_COMMIT = '2'.repeat(40);
const RUN_URL = 'https://github.com/yoavm7-code/yoavmizrahi/actions/runs/42';
const SITE_JSON = readFileSync(new URL('../../content/site.json', import.meta.url), 'utf8');

/* The admin asks for the drafts branch, which does not exist yet: GitHub answers 404, as in real life. */
test.use({ allowedConsole: [/status of 404/] });

/* Only one width: this tests the publish flow, not the layout. */
test.skip(({ viewport }) => viewport.width !== 1180, 'publish flow runs at laptop width only');

/* Fakes the login server and GitHub. deploy: what the Deploy run reports, or null for no run yet.
   goLive: serve the published index.html once it has been saved. */
async function fakeBackend(page, { deploy, goLive }) {
  const saved = { index: null };
  await page.route(/workers\.dev\//, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (body, status) => route.fulfill({ status: status || 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/health') return json({ ok: true, ready: true });
    if (url.pathname === '/login') return json({ token: 'session', username: 'yoav', trusted: 'device' });
    if (url.pathname === '/me') return json({ username: 'yoav', token: 'session' });
    if (!url.pathname.startsWith('/gh' + REPO)) return json({ error: 'refused' }, 403);
    const path = url.pathname.slice(('/gh' + REPO).length);
    const method = req.method();
    if (method === 'GET' && path === '') return json({ permissions: { push: true } });
    if (method === 'GET' && path === '/git/ref/heads/main') return json({ object: { sha: MAIN } });
    if (method === 'GET' && path === '/git/ref/heads/drafts') return json({ message: 'Not Found' }, 404);
    if (method === 'GET' && path === '/contents/content/site.json') return route.fulfill({ status: 200, contentType: 'text/plain', body: SITE_JSON });
    if (method === 'GET' && path.startsWith('/git/commits/')) return json({ sha: path.slice(13), tree: { sha: 'a'.repeat(40) } });
    if (method === 'GET' && path.startsWith('/git/trees/')) return json({ tree: [{ path: 'index.html', type: 'blob' }, { path: 'content/site.json', type: 'blob' }] });
    if (method === 'POST' && path === '/git/trees') {
      const entry = req.postDataJSON().tree.find((e) => e.path === 'index.html');
      if (entry) saved.index = entry.content;
      return json({ sha: 'b'.repeat(40) });
    }
    if (method === 'POST' && path === '/git/commits') return json({ sha: NEW_COMMIT });
    if (method === 'PATCH' || (method === 'POST' && path === '/git/refs')) return json({ object: { sha: NEW_COMMIT } });
    return json({ message: 'unexpected ' + method + ' ' + path }, 500);
  });
  await page.route(/api\.github\.com\/repos\/yoavm7-code\/yoavmizrahi\/actions\/runs/, (route) => {
    const runs = deploy ? [{ path: '.github/workflows/deploy.yml', html_url: RUN_URL, ...deploy }] : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workflow_runs: runs }) });
  });
  await page.route(/\/index\.html\?live=/, (route) => {
    if (goLive && saved.index) return route.fulfill({ status: 200, contentType: 'text/html', body: saved.index });
    return route.continue();
  });
}

/* Signs in with a draft already waiting on this device (the sticky note greeting changed). */
async function openWithDraft(page) {
  const draft = JSON.parse(SITE_JSON);
  draft.desk.note.hi = 'Hello from the test';
  await page.addInitScript((value) => {
    localStorage.setItem('ym-admin-draft-v1', value);
  }, JSON.stringify({ draft, media: {}, baseCommit: MAIN, updatedAt: Date.now() + 60000 }));
  await page.clock.install();
  await page.goto('/admin/');
  await page.locator('#username').fill('yoav');
  await page.locator('#password').fill('a long test password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.locator('button.publish').click();
  await expect(page.getByRole('dialog').getByText('Edited the sticky note')).toBeVisible();
  await page.locator('.dialog').getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByText(/Saved\. GitHub is putting it live/)).toBeVisible();
}

test('a publish that passes the check goes live', async ({ page }) => {
  await fakeBackend(page, { deploy: { status: 'in_progress', conclusion: null }, goLive: true });
  await openWithDraft(page);
  await page.clock.runFor(6000);
  await expect(page.locator('.dialog__title')).toHaveText('Your changes are live');
  await expect(page.getByRole('link', { name: 'Open the site' })).toBeVisible();
});

test('a publish stopped by the check says so and links to the failure', async ({ page }) => {
  await fakeBackend(page, { deploy: { status: 'completed', conclusion: 'failure' }, goLive: false });
  await openWithDraft(page);
  await page.clock.runFor(25000);
  await expect(page.locator('.dialog__title')).toHaveText('The site check stopped this publish');
  await expect(page.getByText(/the live site still shows the previous version/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'See what failed' })).toHaveAttribute('href', RUN_URL);
  await expect(page.locator('.progress li.is-error')).toHaveText('Going live');
  await expect(page.locator('.status')).toHaveText('Check failed');
  await expect(page.locator('.status')).toHaveClass(/is-error/);
  await expect(page.locator('.toast')).toHaveCount(0);
  await page.locator('.dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.dialog')).toHaveCount(0);
});

test('a stopped publish still tells you after you closed the dialog', async ({ page }) => {
  await fakeBackend(page, { deploy: { status: 'completed', conclusion: 'failure' }, goLive: false });
  await openWithDraft(page);
  await page.locator('.dialog').getByRole('button', { name: 'Keep working' }).click();
  await page.clock.runFor(25000);
  await expect(page.locator('.toast.toast--error')).toContainText('The site check stopped your last publish');
  await expect(page.locator('.status')).toHaveText('Check failed');
});

test('a publish replaced by a newer one says there is nothing to do', async ({ page }) => {
  await fakeBackend(page, { deploy: { status: 'completed', conclusion: 'cancelled' }, goLive: false });
  await openWithDraft(page);
  await page.clock.runFor(25000);
  await expect(page.locator('.dialog__title')).toHaveText('A newer publish went live instead');
});

test('while the check runs, the publish keeps waiting', async ({ page }) => {
  await fakeBackend(page, { deploy: { status: 'in_progress', conclusion: null }, goLive: false });
  await openWithDraft(page);
  await page.clock.runFor(40000);
  await expect(page.locator('.dialog__title')).toHaveText('Publishing');
  await expect(page.getByText(/Checking the site and going live/)).toBeVisible();
});
