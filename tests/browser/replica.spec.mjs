// The Mega Uploader replica: on its work page (the device, the video, phone fallback, the Back button)
// and on its own (the whole golden path a visitor takes, plus the side tools). Nothing may leave the
// machine except the font request, which the fixtures answer locally.
import { test, expect } from './fixtures.mjs';

function isNarrow(page) { return page.viewportSize().width <= 900; }

/* Fails the test if the page asks any host other than this server or Google Fonts for anything. */
function watchRequests(page) {
  const outside = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).hostname;
    if (!['127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(host) && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) outside.push(r.url());
  });
  return outside;
}

/* ---------- On the work page ---------- */

test('the work page shows the clickable replica on wide screens and the video on narrow ones', async ({ page }) => {
  await page.goto('/#/work/uploader');
  const box = page.locator('.page.is-active [data-replica]');
  const video = box.locator('[data-replica-video]');
  if (isNarrow(page)) {
    await expect(box).toHaveAttribute('data-mode', 'watch');
    await expect(video).toBeVisible();
    await expect(box.locator('.replica__modes')).toBeHidden();
    await expect(box.locator('.replica__frame')).toHaveCount(0);
    await expect(box.locator('.replica__note a')).toHaveAttribute('href', 'demos/mega-uploader/');
    return;
  }
  await expect(box).toHaveAttribute('data-mode', 'try');
  const frame = page.frameLocator('.replica__frame');
  await expect(frame.locator('.ws-head')).toContainText('Spring launch');
  await expect(frame.locator('.backlink')).toHaveCount(0);
  const scale = await box.locator('.replica__frame').evaluate((f) => new DOMMatrix(getComputedStyle(f).transform).a);
  const width = await box.locator('[data-replica-viewport]').evaluate((v) => v.clientWidth);
  expect(Math.abs(scale - width / 1440)).toBeLessThan(0.01);

  await box.getByRole('button', { name: 'WATCH IT' }).click();
  await expect(video).toBeVisible();
  await expect(box.locator('[data-replica-viewport]')).toBeHidden();
  await box.getByRole('button', { name: 'TRY IT' }).click();
  await expect(box.locator('[data-replica-viewport]')).toBeVisible();
  await expect(box.getByRole('button', { name: 'TRY IT' })).toHaveAttribute('aria-pressed', 'true');
});

test('START OVER puts the replica back to its first state', async ({ page }) => {
  test.skip(isNarrow(page), 'the replica is not embedded on narrow screens');
  await page.goto('/#/work/uploader');
  const frame = page.frameLocator('.replica__frame');
  await frame.locator('.nav__item', { hasText: 'Dashboard' }).first().click();
  await expect(frame.locator('.dash h1')).toHaveText('Dashboard');
  await page.locator('[data-replica-reset]').click();
  await expect(frame.locator('.ws-head')).toContainText('Spring launch');
});

test('clicking around the replica never traps the Back button', async ({ page }) => {
  test.skip(isNarrow(page), 'the replica is not embedded on narrow screens');
  await page.goto('/#/about');
  await page.goto('/#/work/uploader');
  const frame = page.frameLocator('.replica__frame');
  await frame.locator('.nav__item', { hasText: 'Run history' }).first().click();
  await frame.locator('.nav__item', { hasText: 'Dashboard' }).first().click();
  await expect(frame.locator('.dash h1')).toHaveText('Dashboard');
  await page.goBack();
  await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'about');
});

test('leaving the work page pauses the video', async ({ page }) => {
  await page.goto('/#/work/uploader');
  const video = page.locator('[data-replica-video]');
  if (!isNarrow(page)) await page.getByRole('button', { name: 'WATCH IT' }).click();
  await expect.poll(() => video.evaluate((v) => !v.paused || v.readyState === 0)).toBe(true);
  await page.goto('/#/about');
  await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
});

/* ---------- The replica on its own ---------- */

test.describe('the replica', () => {
  test.beforeEach(async ({ page }) => { test.skip(isNarrow(page), 'a desktop tool: the full path runs at laptop width'); });

  test('the golden path: fill, auto-fill, run live, then read the run in history', async ({ page }) => {
    test.setTimeout(90000);
    const outside = watchRequests(page);
    await page.goto('/demos/mega-uploader/');
    await expect(page.locator('.ws-head__ready')).toHaveText('1 campaign ready');
    await expect(page.locator('.cell.is-missing').first()).toBeVisible();

    await page.locator('[data-guide-step="1"]').click();
    await expect(page.locator('[data-guide-step="2"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-tool="resolve"]')).toContainText('Create tracking links · 19');

    await page.locator('[data-guide-step="2"]').click();
    await expect(page.locator('.ws-head__ready')).toHaveText('20 campaigns ready', { timeout: 15000 });
    await expect(page.locator('.cell.is-missing')).toHaveCount(0);

    await page.locator('[data-guide-step="3"]').click();
    const dialog = page.getByRole('dialog', { name: 'Confirm run live' });
    await expect(dialog).toContainText('Go live with 20 campaigns?');
    await dialog.getByRole('button', { name: 'Run live · 20' }).click();
    await expect(page.locator('.runpanel__sum')).toContainText('Uploading', { timeout: 5000 });
    await expect(page.locator('.runpanel__sum')).toContainText('Upload finished', { timeout: 30000 });
    await expect(page.locator('.runpanel__sum')).toContainText('19 Uploaded');
    await expect(page.locator('.runpanel__sum')).toContainText('1 Failed');
    await expect(page.locator('tr[data-status="live"]')).toHaveCount(19);
    await expect(page.locator('tr[data-status="failed"]')).toHaveCount(1);

    await page.locator('[data-tool="open-run"]').click();
    const card = page.locator('.runcard.is-active');
    await expect(card).toContainText('#1181');
    await expect(card).toContainText('Partial');
    await expect(page.locator('.detail__title')).toContainText('Run #1181');
    await page.locator('.tile', { hasText: 'FAILED' }).click();
    await expect(page.locator('.crow')).toHaveCount(1);
    await page.locator('.crow__main').click();
    await expect(page.locator('.crow__more')).toContainText('financial claims');
    await expect(page.locator('.crow__more')).toContainText('UPLOAD TRACE');

    /* Back in the grid: the failed row is offered again, fixing its headline lets it go live. */
    await page.locator('.nav__item', { hasText: 'Workspace' }).first().click();
    await expect(page.locator('.guide li.is-done')).toHaveCount(4);
    await page.locator('[data-tool="run"]').click();
    await expect(dialog).toContainText('Go live with 1 campaign?');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    const headline = page.locator('tr[data-status="failed"] td[data-key="headline"]');
    await headline.dblclick();
    await page.keyboard.type('Cards with cashback on every purchase');
    await page.keyboard.press('Enter');
    await expect(page.locator('tr[data-status="failed"]')).toHaveCount(0);
    await page.locator('[data-tool="run"]').click();
    await dialog.getByRole('button', { name: 'Run live · 1' }).click();
    await expect(page.locator('tr[data-status="live"]')).toHaveCount(20, { timeout: 10000 });
    await expect(page.locator('.runpanel__sum')).toContainText('Upload finished');
    await page.locator('[data-tool="run"]').click();
    await expect(page.locator('.toast')).toContainText('already live');
    expect(outside, 'the replica asked an outside host for something').toEqual([]);
  });

  test('cells edit by typing, and undo and redo bring changes back', async ({ page }) => {
    await page.goto('/demos/mega-uploader/');
    const cell = page.locator('tbody tr').nth(1).locator('td[data-key="notes"]');
    await cell.dblclick();
    await page.keyboard.type('zz');
    await page.keyboard.press('Enter');
    await expect(cell).toHaveText('zz');
    await expect(page.locator('.saved')).toHaveText('All changes saved');
    await page.keyboard.press('Control+z');
    await expect(cell).toHaveText('—');
    await page.keyboard.press('Control+Shift+z');
    await expect(cell).toHaveText('zz');

    const geo = page.locator('tbody tr').nth(1).locator('td[data-key="geo"] select');
    await geo.selectOption('DE');
    await expect(page.locator('tbody tr').nth(1).locator('td[data-key="lang"] select')).toHaveValue('de');
    await expect(page.locator('tbody tr').nth(1).locator('td[data-key="name"]')).toContainText('DE · General · ');
  });

  test('Export CSV downloads the filled rows', async ({ page }) => {
    await page.goto('/demos/mega-uploader/');
    await page.locator('[data-tool="data"]').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Export CSV' }).click()]);
    expect(download.suggestedFilename()).toBe('workspace-41.csv');
    const text = await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'));
    expect(text.split('\r\n')[0]).toContain('Campaign name (auto),Geo,Vertical');
    expect(text.trim().split('\r\n')).toHaveLength(2);
  });

  test('the shell: command palette, pages outside the demo, platform switch, Ask, dark mode', async ({ page }) => {
    await page.goto('/demos/mega-uploader/');
    await page.keyboard.press('Control+Shift+P');
    await page.keyboard.type('run hist');
    await page.keyboard.press('Enter');
    await expect(page.locator('.hist h1')).toHaveText('Run history');

    await page.locator('.nav__item', { hasText: 'Accounts' }).first().click();
    await expect(page.locator('.toast')).toContainText('Accounts is not part of this demo');

    await page.locator('.plat-card').click();
    await page.getByRole('menuitemradio', { name: /TikTok/ }).click();
    await expect(page.locator('.plat-card')).toContainText('TikTok');
    await expect(page.locator('.hist .note')).toContainText('TikTok campaign statuses');

    await page.locator('.ask-btn').click();
    await page.getByRole('button', { name: 'What do tracking links do?' }).click();
    await expect(page.locator('.msg--bot p')).toContainText('Create links & upload goes live', { timeout: 10000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('.ask')).toHaveAttribute('aria-hidden', 'true');

    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('the full-screen page has a way back to the portfolio', async ({ page }) => {
    await page.goto('/demos/mega-uploader/');
    await page.locator('.backlink').click();
    await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'work-uploader');
  });
});
