// The Ad Intel replica: on its work page (a desktop window, the video on narrow screens), on the desk,
// and on its own (the gap filter, an ad and its Workflow, Trends, the Pipeline and the Control Room).
// The replica is a desktop window, so the app's own flows run at laptop width.
import { test, expect, watchRequests } from './fixtures.mjs';

const APP = '/demos/ad-intel/';
function isNarrow(page) { return page.viewportSize().width <= 900; }

/* ---------- On the portfolio ---------- */

test('the work page shows the replica in a window on wide screens and the video on narrow ones', async ({ page }) => {
  await page.goto('/#/work/ad-intel');
  const box = page.locator('.page.is-active [data-replica]');
  await expect(box).toHaveAttribute('data-frame', 'desktop');
  await expect(page.locator('.page.is-active .proj-design p')).toHaveCount(2);
  if (isNarrow(page)) {
    await expect(box).toHaveAttribute('data-mode', 'watch');
    await expect(box.locator('[data-replica-video]')).toBeVisible();
    return;
  }
  const app = page.frameLocator('.page.is-active .replica__frame');
  await expect(app.locator('tr[data-ad]').first()).toBeVisible();
});

test('the desk monitor shows a picture of the replica and opens the project', async ({ page }) => {
  await page.goto('/#/');
  const obj = page.locator('.page.is-active .obj[data-obj="work:ad-intel"]');
  await expect(obj.locator('img')).toHaveAttribute('src', 'demos/ad-intel/poster.jpg');
  await obj.getByRole('link', { name: /open project/i }).click();
  await expect(page).toHaveURL(/#\/work\/ad-intel$/);
});

/* ---------- The app ---------- */

test.describe('the Ad Intel replica', () => {
  test.beforeEach(async ({ page }) => { test.skip(isNarrow(page), 'a desktop window: its flows run at laptop width'); });

  test('the gap filter: pick our domain, then HAVE and MISSING split the feed', async ({ page }) => {
    const outside = watchRequests(page);
    await page.goto(APP);
    const rows = page.locator('tr[data-ad]');
    const total = await rows.count();
    expect(total).toBeGreaterThan(20);
    await expect(page.locator('[data-seg="our:missing"]')).toBeDisabled();
    await expect(page.locator('td.col-our').first()).toHaveText('–');

    await page.locator('[data-our-domain]').selectOption('ourhub.com');
    await page.locator('[data-seg="our:have"]').click();
    const have = await rows.count();
    await expect(page.locator('[data-our="missing"]')).toHaveCount(0);
    await page.locator('[data-seg="our:missing"]').click();
    const missing = await rows.count();
    await expect(page.locator('[data-our="have"]')).toHaveCount(0);
    expect(have).toBeGreaterThan(0);
    expect(have + missing).toBe(total);
    await expect(page.locator('[data-clear]')).toHaveText('CLEAR (2)');

    /* Longest running first, then clear everything. */
    await page.locator('[data-sort="days"]').click();
    const days = await page.locator('tr[data-ad] td:nth-child(10)').allInnerTexts();
    const n = days.map((d) => Number(d.replace(/\D/g, '')));
    expect(n).toEqual([...n].sort((a, b) => b - a));
    await page.locator('[data-clear]').click();
    await expect(rows).toHaveCount(total);
    await expect(page.locator('[data-our-domain]')).toHaveValue('');
    expect(outside).toEqual([]);
  });

  test('filters and search narrow the feed, and an empty result offers a way out', async ({ page }) => {
    await page.goto(APP);
    const rows = page.locator('tr[data-ad]');
    await page.locator('[data-check="verticals:Used Cars"]').check();
    await expect(page.locator('tr[data-ad] td:nth-child(13)').first()).toHaveText('Used Cars');
    const cars = await rows.count();
    await page.locator('[data-seg="landing:only"]').click();
    await expect(rows).toHaveCount(0);
    await expect(page.locator('td.empty')).toContainText('No ads match these filters.');
    await page.locator('td.empty button').click();
    await page.locator('[data-search]').fill('solar');
    await expect(rows).toHaveCount(2);
    await page.locator('[data-search]').fill('');
    expect(cars).toBeGreaterThan(1);
  });

  test('an ad: our versions, a linked article, the Workflow, J and K', async ({ page }) => {
    await page.goto(APP + '?view=feed');
    await page.locator('tr[data-ad="ad-1001"] td.col-headline').click();
    await expect(page.locator('.detail__title')).toHaveText('Ex-lease cars after 65: what to check');
    await expect(page.locator('[data-versions]')).toHaveAttribute('data-versions', '2');
    await expect(page.locator('.versions')).toContainText('EXACT CLONE OF THIS URL');

    /* Set as linked fills the Workflow's linked article. */
    await page.locator('[data-set-linked]').first().click();
    await expect(page.locator('[data-link]')).toHaveValue(/^https:\/\/readnest\.com\//);

    /* A bad address is refused with a message. */
    await page.locator('[data-link]').fill('not a link');
    await page.locator('[data-link]').press('Enter');
    await expect(page.locator('.workflow .error')).toContainText('Use a full address');

    /* Status, brand, owner, notes and Draft article. */
    await page.locator('[data-status="idea"]').click();
    await expect(page.locator('[data-status="idea"]')).toHaveAttribute('aria-checked', 'true');
    await page.locator('[data-status="idea"]').click();
    await expect(page.locator('[data-status="idea"]')).toHaveAttribute('aria-checked', 'false');
    await page.locator('[data-brand="car"]').click();
    await expect(page.locator('[data-brand="car"]')).toContainText('SET');
    await page.locator('[data-brand="car"]').click();
    await expect(page.locator('[data-brand="none"]')).toContainText('AUTO');
    await page.locator('[data-notes]').fill('A checklist angle.');
    await page.locator('[data-draft]').click();
    await expect(page.locator('.toast')).toContainText('owned by Dana L.');
    await expect(page.locator('[data-status="drafting"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('[data-owner="dl"]')).toHaveAttribute('aria-pressed', 'true');

    /* J and K move through the feed; the work on this ad is kept. */
    const title = page.locator('.detail__title');
    await page.locator('body').click({ position: { x: 5, y: 300 } });
    await page.keyboard.press('j');
    await expect(title).not.toHaveText('Ex-lease cars after 65: what to check');
    await page.keyboard.press('k');
    await expect(title).toHaveText('Ex-lease cars after 65: what to check');
    await expect(page.locator('[data-notes]')).toHaveValue('A checklist angle.');

    /* A gap says so, and a dead link shows its saved copy. */
    await page.locator('[data-back]').click();
    await page.locator('tr[data-ad="ad-1011"] td.col-headline').click();
    await expect(page.locator('[data-dead]')).toBeVisible();
    await expect(page.locator('[data-versions="none"]')).toContainText('That\'s a gap');
  });

  test('Trends opens the feed on a vertical; the Pipeline moves cards by drag or button', async ({ page }) => {
    await page.goto(APP + '?view=trends');
    await page.locator('tr[data-vertical="Home Solar"]').click();
    await expect(page.locator('[data-tab="feed"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('[data-check="verticals:Home Solar"]')).toBeChecked();

    await page.locator('[data-tab="pipeline"]').click();
    const count = (s) => page.locator('[data-count="' + s + '"]');
    await expect(count('idea')).toHaveText('00');
    const card = page.locator('[data-col="new"] [data-card]').first();
    const id = await card.getAttribute('data-card');
    const from = await card.boundingBox();
    const to = await page.locator('[data-col="drafting"] .col__body').boundingBox();
    await page.mouse.move(from.x + 40, from.y + 20);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + 80, { steps: 12 });
    await page.mouse.up();
    await expect(page.locator('[data-col="drafting"] [data-card="' + id + '"]')).toBeVisible();
    await expect(count('drafting')).toHaveText('01');

    await page.locator('[data-col="drafting"] [data-card="' + id + '"] [data-move="published"]').click();
    await expect(count('published')).toHaveText('01');
    await expect(page.locator('[data-col="published"] [data-move]')).toHaveCount(0);

    /* A plain click opens the ad. */
    await page.locator('[data-col="new"] [data-card] .pcard__title').first().click();
    await expect(page.locator('.detail__title')).toBeVisible();
  });

  test('Control Room: a run adds new ads to the feed, Stop keeps what it saved, rows are validated', async ({ page }) => {
    await page.clock.install();
    await page.goto(APP + '?view=control');
    await page.locator('[data-run]').click();
    await expect(page.locator('[data-stop]')).toBeEnabled();
    await expect(page.locator('[data-live]')).toContainText('SCRAPING');
    await page.clock.runFor(60000);
    await expect(page.locator('[data-run]')).toHaveText('RUN NOW');
    await expect(page.locator('[data-log]')).toContainText('Run finished: +2 new ads');
    await expect(page.locator('[data-stat="TOTAL RUNS"]')).toHaveText('11');
    await expect(page.locator('[data-live]')).toContainText('just now');

    /* A second run finds nothing new; stop it partway. */
    await page.locator('[data-run]').click();
    await page.clock.runFor(1400);
    await page.locator('[data-stop]').click();
    await expect(page.locator('[data-log]')).toContainText('Stopped after');
    await page.locator('[data-tab="feed"]').click();
    await expect(page.locator('tr[data-ad="ad-1033"]')).toBeVisible();
    await page.locator('[data-tab="control"]').click();

    /* Adding rows: bad input, a duplicate, a keyword. */
    const target = page.locator('[data-add-target]');
    await target.fill('http://');
    await page.locator('[data-add]').click();
    await expect(page.locator('.control .error')).toContainText('Enter a domain');
    await target.fill('https://www.RivalPost.com/page');
    await page.locator('[data-add]').click();
    await expect(page.locator('.control .error')).toContainText('rivalpost.com is already tracked.');
    await target.fill('kitchen deals');
    await page.locator('[data-add]').click();
    await expect(page.locator('[data-tracked="kitchen deals"]')).toBeVisible();
    await expect(page.locator('[data-tracked-count]')).toHaveText('12 of 12');

    /* Intervals: bad values are refused, good ones stick; pause and remove. */
    const every = page.locator('[data-every="rivalpost.com"]');
    await every.fill('400');
    await every.press('Enter');
    await expect(every).toHaveValue('3');
    await every.fill('10');
    await every.press('Enter');
    await expect(every).toHaveValue('10');
    await page.locator('[data-toggle="rivalpost.com"]').click();
    await expect(page.locator('[data-toggle="rivalpost.com"]')).toHaveText('○ PAUSED');
    await page.locator('[data-remove="kitchen deals"]').click();
    await expect(page.locator('[data-tracked="kitchen deals"]')).toHaveCount(0);

    /* Search filters the table. */
    await page.locator('[data-search]').fill('kestrel');
    await expect(page.locator('[data-tracked-count]')).toHaveText('2 of 11');
  });

  test('screens outside the demo say so, and the back link returns to the portfolio', async ({ page }) => {
    await page.goto(APP);
    await page.locator('[data-tab="review"]').click();
    await expect(page.locator('.note__box')).toContainText('isn\'t part of the demo');
    await page.locator('.note__box button').click();
    await expect(page.locator('tr[data-ad]').first()).toBeVisible();
    await page.locator('.backlink').click();
    await expect(page).toHaveURL(/#\/work\/ad-intel$/);
  });
});
