// The Launch Desk replica: on its work page (the device, the video, phone fallback, the Back button)
// and on its own (the whole golden path a visitor takes, plus the side tools). Nothing may leave the
// machine except the font request, which the fixtures answer locally.
import { test, expect, watchRequests } from './fixtures.mjs';

function isNarrow(page) { return page.viewportSize().width <= 900; }

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
    await expect(box.locator('.replica__note a')).toHaveAttribute('href', 'demos/launch-desk/');
    return;
  }
  await expect(box).toHaveAttribute('data-mode', 'try');
  const frame = page.frameLocator('.page.is-active .replica__frame');
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
  const frame = page.frameLocator('.page.is-active .replica__frame');
  await frame.locator('.topnav__tab', { hasText: 'Overview' }).click();
  await expect(frame.locator('.dash h1')).toHaveText('Overview');
  await page.locator('.page.is-active [data-replica-reset]').click();
  await expect(frame.locator('.ws-head')).toContainText('Spring launch');
});

test('clicking around the replica never traps the Back button', async ({ page }) => {
  test.skip(isNarrow(page), 'the replica is not embedded on narrow screens');
  await page.goto('/#/about');
  await page.goto('/#/work/uploader');
  const frame = page.frameLocator('.page.is-active .replica__frame');
  await frame.locator('.topnav__tab', { hasText: 'Launches' }).click();
  await frame.locator('.topnav__tab', { hasText: 'Overview' }).click();
  await expect(frame.locator('.dash h1')).toHaveText('Overview');
  await page.goBack();
  await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'about');
});

test('leaving the work page pauses the video', async ({ page }) => {
  await page.goto('/#/work/uploader');
  const video = page.locator('section[data-page="work-uploader"] [data-replica-video]');
  if (!isNarrow(page)) await page.getByRole('button', { name: 'WATCH IT' }).click();
  await expect.poll(() => video.evaluate((v) => !v.paused || v.readyState === 0)).toBe(true);
  await page.goto('/#/about');
  await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
});

/* ---------- The replica on its own ---------- */

test.describe('the replica', () => {
  test.beforeEach(async ({ page }) => { test.skip(isNarrow(page), 'a desktop tool: the full path runs at laptop width'); });

  test('the golden path: fill, auto-fill, launch, then read the launch in Launches', async ({ page }) => {
    test.setTimeout(90000);
    const outside = watchRequests(page);
    await page.goto('/demos/launch-desk/');
    await expect(page.locator('.ws-head__ready')).toHaveText('1 campaign ready');
    await expect(page.locator('.cell.is-missing').first()).toBeVisible();

    await page.locator('[data-guide-step="1"]').click();
    await expect(page.locator('[data-guide-step="2"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-tool="resolve"]')).toContainText('Create tracking links · 19');

    await page.locator('[data-guide-step="2"]').click();
    await expect(page.locator('.ws-head__ready')).toHaveText('20 campaigns ready', { timeout: 15000 });
    await expect(page.locator('.cell.is-missing')).toHaveCount(0);

    await page.locator('[data-guide-step="3"]').click();
    const dialog = page.getByRole('dialog', { name: 'Confirm launch' });
    await expect(dialog).toContainText('Launch 20 campaigns?');
    await dialog.getByRole('button', { name: 'Launch · 20' }).click();
    await expect(page.locator('.runpanel__sum')).toContainText('Launching', { timeout: 5000 });
    await expect(page.locator('.runpanel__head')).toContainText('of 20 done');
    await expect(page.locator('.runpanel__sum')).toContainText('Launch finished', { timeout: 30000 });
    await expect(page.locator('.runpanel__sum')).toContainText('19 Live');
    await expect(page.locator('.runpanel__sum')).toContainText('1 Failed');
    await expect(page.locator('.run-chip')).toContainText('19 live · 20 total');
    await expect(page.locator('tr[data-status="live"]')).toHaveCount(19);
    await expect(page.locator('tr[data-status="failed"]')).toHaveCount(1);

    await expect(page.locator('[data-tool="open-run"]')).toHaveText('Open in Launches');
    await page.locator('[data-tool="open-run"]').click();
    await expect(page.locator('.topnav__tab.is-active')).toHaveText('Launches');
    const card = page.locator('.runcard.is-active');
    await expect(card).toContainText('#1181');
    await expect(card).toContainText('Partial');
    await expect(page.locator('.detail__title')).toContainText('Launch #1181');
    await page.locator('.tile', { hasText: 'FAILED' }).click();
    await expect(page.locator('.crow')).toHaveCount(1);
    await page.locator('.crow__main').click();
    await expect(page.locator('.crow__more')).toContainText('financial claims');
    await expect(page.locator('.crow__more')).toContainText('LAUNCH TRACE');

    /* Back in the grid: the failed row is offered again, fixing its headline lets it go live. */
    await page.locator('.topnav__tab', { hasText: 'Batches' }).click();
    await expect(page.locator('.guide li.is-done')).toHaveCount(4);
    await page.locator('[data-tool="run"]').click();
    await expect(dialog).toContainText('Launch 1 campaign?');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    const headline = page.locator('tr[data-status="failed"] td[data-key="headline"]');
    await headline.dblclick();
    await page.keyboard.type('Cards with cashback on every purchase');
    await page.keyboard.press('Enter');
    await expect(page.locator('tr[data-status="failed"]')).toHaveCount(0);
    await page.locator('[data-tool="run"]').click();
    await dialog.getByRole('button', { name: 'Launch · 1' }).click();
    await expect(page.locator('tr[data-status="live"]')).toHaveCount(20, { timeout: 10000 });
    await expect(page.locator('.runpanel__sum')).toContainText('Launch finished');
    await page.locator('[data-tool="run"]').click();
    await expect(page.locator('.toast')).toContainText('already live');
    expect(outside, 'the replica asked an outside host for something').toEqual([]);
  });

  test('cells edit by typing, and undo and redo bring changes back', async ({ page }) => {
    await page.goto('/demos/launch-desk/');
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
    await page.goto('/demos/launch-desk/');
    await page.locator('[data-tool="data"]').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Export CSV' }).click()]);
    expect(download.suggestedFilename()).toBe('batch-41.csv');
    const text = await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'));
    expect(text.split('\r\n')[0]).toContain('Campaign name (auto),Geo,Vertical');
    expect(text.trim().split('\r\n')).toHaveLength(2);
  });

  test('batch tabs: New batch adds one, and Ctrl+K jumps to a column', async ({ page }) => {
    await page.goto('/demos/launch-desk/');
    await page.getByRole('button', { name: 'New batch' }).click();
    await expect(page.locator('.tab')).toHaveCount(6);
    await expect(page.locator('.tab.is-active')).toContainText('Batch 6');
    await expect(page.locator('.ws-head')).toContainText('Batch 6');
    await expect(page.locator('.toast')).toContainText('New batch with 20 empty rows');

    await page.locator('tbody tr').first().locator('td[data-key="notes"]').click();
    await page.keyboard.press('Control+k');
    const picker = page.getByRole('dialog', { name: 'Go to column' });
    await expect(picker).toBeVisible();
    await page.keyboard.type('headl');
    await page.keyboard.press('Enter');
    await expect(picker).toHaveCount(0);
    await expect(page.locator('.cellbar__addr')).toHaveText('L1');
  });

  test('the top bar: three tabs switch screens, and the platform, notifications and theme work', async ({ page }) => {
    await page.goto('/demos/launch-desk/');
    const tabs = page.locator('.topbar .topnav__tab');
    await expect(tabs).toHaveText(['Overview', 'Batches', 'Launches']);
    await expect(page.locator('.topnav__tab[aria-current="page"]')).toHaveText('Batches');
    await expect(page.locator('.ws')).toBeVisible();

    await tabs.filter({ hasText: 'Overview' }).click();
    await expect(page.locator('.dash h1')).toHaveText('Overview');
    await expect(page.locator('.topnav__tab[aria-current="page"]')).toHaveText('Overview');
    await expect(page.locator('.plat-row--head .cap')).toHaveText(['Platform', 'Accounts', 'Launches', 'Last launch', 'Status', '']);
    await tabs.filter({ hasText: 'Launches' }).click();
    await expect(page.locator('.hist h1')).toHaveText('Launches');
    await expect(page.locator('.topnav__tab[aria-current="page"]')).toHaveText('Launches');

    await page.locator('.plat-switch').click();
    await page.getByRole('menuitemradio', { name: /TikTok/ }).click();
    await expect(page.locator('.plat-switch')).toContainText('TikTok');
    await expect(page.locator('.hist .note')).toContainText('TikTok campaign statuses');

    await page.getByRole('button', { name: /Notifications, 2 unread/ }).click();
    await expect(page.locator('.panel--notes')).toContainText('noa.k shared a batch with you');
    await page.keyboard.press('Escape');
    await expect(page.locator('.panel--notes')).toHaveCount(0);

    await page.locator('.brand').click();
    await expect(page.locator('.dash h1')).toHaveText('Overview');
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Account menu for Dana Levi' }).click();
    await page.getByRole('menuitem', { name: 'Switch to light mode' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('none of the old product shows: no sidebar, assistant, help or feedback buttons, or the old name', async ({ page }) => {
    await page.goto('/demos/launch-desk/');
    await expect(page).toHaveTitle('Launch Desk · interactive demo');
    await expect(page.locator('.topbar .brand__name')).toHaveText('Launch Desk');
    for (const gone of ['.sidebar', '.nav__item', '.ask', '.ask-btn', '.log-btn', '.floats', '.top-search', '.org', '.id-chip', '.runmode', '.grid-nav']) {
      await expect(page.locator(gone), gone).toHaveCount(0);
    }
    const banned = /Report bug|Request feature|Need help|Run live|Run history|Workspace|Copy from|Clean up|Ask anything/;
    const oldName = ['mega', 'uploader'].join(' ');
    for (const tab of ['Batches', 'Overview', 'Launches']) {
      await page.locator('.topnav__tab', { hasText: tab }).click();
      const text = await page.locator('body').innerText();
      expect(text, tab).not.toMatch(banned);
      expect(text.toLowerCase(), tab).not.toContain(oldName);
      expect(text, tab).not.toMatch(/\bAsk\b/);
    }
    await page.locator('.topnav__tab', { hasText: 'Batches' }).click();
    await page.locator('[data-tool="data"]').click();
    await expect(page.locator('.menu')).not.toContainText(banned);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'More' }).click();
    await expect(page.locator('.menu')).not.toContainText(banned);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+Shift+P');
    await expect(page.locator('.backdrop')).toHaveCount(0);
  });

  test('the full-screen page has a way back to the portfolio', async ({ page }) => {
    await page.goto('/demos/launch-desk/');
    await page.locator('.backlink').click();
    await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'work-uploader');
  });
});
