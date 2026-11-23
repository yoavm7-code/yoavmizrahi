// The LoreWire replica: on its work page (a desktop window, the video on narrow screens), on the desk,
// and on its own (a story with its poll, read-along and comments, the Wires feed, Browse, search, saving).
// The replica is a desktop window, so the app's own flows run at laptop width.
import { test, expect, watchRequests } from './fixtures.mjs';

const APP = '/demos/lorewire/';
function isNarrow(page) { return page.viewportSize().width <= 900; }

/* ---------- On the portfolio ---------- */

test('the work page shows the replica in a window on wide screens and the video on narrow ones', async ({ page }) => {
  await page.goto('/#/work/lorewire');
  const box = page.locator('.page.is-active [data-replica]');
  await expect(box).toHaveAttribute('data-frame', 'desktop');
  await expect(page.locator('.page.is-active .proj-design p')).toHaveCount(3);
  if (isNarrow(page)) {
    await expect(box).toHaveAttribute('data-mode', 'watch');
    await expect(box.locator('[data-replica-video]')).toBeVisible();
    return;
  }
  const app = page.frameLocator('.page.is-active .replica__frame');
  await expect(app.locator('.hero__title')).toBeVisible();
  await expect(app.locator('[data-row="top"] [data-story]').first()).toBeVisible();
});

test('the desk monitor shows a picture of the replica and opens the project', async ({ page }) => {
  await page.goto('/#/');
  const obj = page.locator('.page.is-active .obj[data-obj="work:lorewire"]');
  await expect(obj.locator('img')).toHaveAttribute('src', 'demos/lorewire/poster.jpg');
  await obj.getByRole('link', { name: /open project/i }).click();
  await expect(page).toHaveURL(/#\/work\/lorewire$/);
});

test('About has the web design section', async ({ page }) => {
  await page.goto('/#/about');
  const section = page.locator('.page.is-active .about__design');
  await expect(section).toBeVisible();
  await expect(section.locator('.about__points li').last()).toContainText('LoreWire');
});

/* ---------- The app ---------- */

test.describe('the LoreWire replica', () => {
  test.beforeEach(async ({ page }) => { test.skip(isNarrow(page), 'a desktop window: its flows run at laptop width'); });

  test('a story: the fiction label, a vote, the read-along and a comment', async ({ page }) => {
    test.setTimeout(60000);
    const outside = watchRequests(page);
    await page.clock.install();
    await page.goto(APP);
    await expect(page.locator('.hero__title')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/\bTRUE\b/);

    await page.locator('[data-hero-watch]').first().click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.pill--label')).toHaveText('Fictionalized story, inspired by real-life situations');

    /* The first vote: the visitor's side wins 100%, and the side buttons lock. */
    await modal.locator('[data-side="b"]').click();
    await expect(modal.locator('[data-side="b"]')).toHaveClass(/is-mine/);
    await expect(modal.locator('[data-side="b"] .side__pct')).toContainText('100% · YOUR VERDICT');
    await expect(modal.locator('[data-side="a"]')).toBeDisabled();
    await expect(modal.locator('[data-poll]')).toContainText('YOU\'RE THE FIRST TO VOTE');
    await expect(modal.locator('.vote-now')).toHaveCount(0);

    /* Read-along: the highlight moves with time and pauses. */
    await modal.locator('[data-tab="readalong"]').click();
    await expect(modal.locator('.along__word.is-now')).toHaveCount(0);
    await modal.locator('[data-along-play]').click();
    await page.clock.runFor(3000);
    await expect(modal.locator('.along__word.is-now')).toHaveCount(1);
    expect(await modal.locator('.along__word.is-read').count()).toBeGreaterThan(4);
    await expect(modal.locator('.along__time')).toContainText('0:03 /');
    await modal.locator('[data-along-play]').click();
    const read = await modal.locator('.along__word.is-read').count();
    await page.clock.runFor(3000);
    await expect(modal.locator('.along__word.is-read')).toHaveCount(read);

    /* Comments: an empty post is refused, a real one shows up. */
    await modal.locator('[data-tab="comments"]').click();
    await modal.getByRole('button', { name: 'Post' }).click();
    await expect(page.locator('.toast')).toContainText('Write something first.');
    await modal.getByLabel('Your name').fill('Sam');
    await modal.getByLabel('Share your take').fill('Walk away, every time.');
    await modal.getByRole('button', { name: 'Post' }).click();
    await expect(modal.locator('.comment')).toContainText('Walk away, every time.');
    await expect(modal).toContainText('Discussion · 1');

    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
    expect(outside).toEqual([]);
  });

  test('saving a story puts it in Saved, and the vote moves it out of the unvoted row', async ({ page }) => {
    await page.goto(APP);
    const first = page.locator('[data-row="unvoted"] [data-story]').first();
    const id = await first.getAttribute('data-story');
    await first.click();
    const modal = page.getByRole('dialog');
    await modal.locator('[data-save]').click();
    await expect(modal.locator('[data-save]')).toHaveAttribute('aria-pressed', 'true');
    await modal.locator('[data-side="a"]').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-row="unvoted"] [data-story="' + id + '"]')).toHaveCount(0);
    await page.locator('[data-nav="saved"]').click();
    await expect(page.locator('.page__title')).toHaveText('SAVED');
    await expect(page.locator('[data-story="' + id + '"]')).toBeVisible();
  });

  test('Wires: a verdict in the feed, the next wire, and the empty state', async ({ page }) => {
    await page.goto(APP + '?view=wires');
    const wire = page.locator('.wire__video');
    await expect(wire).toBeVisible();
    const first = await wire.getAttribute('src');
    await page.locator('[data-mini="a"]').click();
    await expect(page.locator('[data-mini="a"]')).toHaveClass(/is-mine/);
    await page.locator('[data-wire-next]').click();
    await expect(wire).not.toHaveAttribute('src', first);
    for (const key of ['a', 'b']) {
      const open = page.locator('[data-mini="' + key + '"]:not([disabled])');
      if (await open.count()) { await open.click(); break; }
    }
    while (await page.locator('[data-wire-next]:not([disabled])').count()) {
      await page.locator('[data-wire-next]').click();
      if (await page.locator('[data-mini="b"]:not([disabled])').count()) await page.locator('[data-mini="b"]').click();
    }
    await page.locator('[data-nav="home"]').click();
    await page.locator('[data-nav="wires"]').click();
    await expect(page.locator('.wire__empty')).toContainText('You voted on every wire.');
    await page.locator('[data-wires-all]').click();
    await expect(wire).toBeVisible();
  });

  test('Browse filters by category and search finds stories, or says it found none', async ({ page }) => {
    await page.goto(APP);
    await page.locator('[data-nav="browse"]').click();
    await page.locator('[data-cat="Wedding Drama"]').click();
    await expect(page.locator('[data-cat="Wedding Drama"]')).toHaveAttribute('aria-pressed', 'true');
    const shown = page.locator('main [data-story]');
    expect(await shown.count()).toBeGreaterThan(0);
    await page.locator('[data-search]').click();
    await page.locator('.search__input').fill('mara');
    await expect(page.locator('.page__title')).toHaveText('SEARCH');
    await expect(page.locator('[data-story="lw-03d99aff6fb5"]').first()).toBeVisible();
    await page.locator('.search__input').fill('zzzz nothing');
    await expect(page.locator('.empty')).toHaveText('No story matches "zzzz nothing".');
  });

  test('the back link returns to the portfolio project page', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.backlink').click();
    await expect(page).toHaveURL(/#\/work\/lorewire$/);
  });
});
