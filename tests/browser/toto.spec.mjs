// The Toto Mundial replica: on its work page (a phone-shaped device, clickable on every screen) and on
// its own (every moment a visitor tries: picks with autosave and undo, the dice, past results, the
// Golden Ball picker, the leaderboard, the live match, Hebrew). The browser clock is controlled, so
// the live match runs in a moment instead of forty seconds. Runs at phone, tablet and laptop width.
import { test, expect, watchRequests } from './fixtures.mjs';

const APP = '/demos/toto-mundial/';

/* ---------- On the work page ---------- */

test('the work page holds the replica in a phone, clickable on every screen', async ({ page }) => {
  await page.goto('/#/work/toto');
  const box = page.locator('.page.is-active [data-replica]');
  await expect(box).toHaveAttribute('data-frame', 'phone');
  await expect(box).toHaveAttribute('data-mode', 'try');
  await expect(box.getByRole('button', { name: 'WATCH IT' })).toBeVisible();
  await expect(box.locator('.replica__note')).toHaveCount(0);
  const app = page.frameLocator('.page.is-active .replica__frame');
  await expect(app.locator('.brand-card')).toBeVisible();
  await expect(app.locator('.backlink')).toHaveCount(0);
  const screen = await box.locator('.replica__screen').boundingBox();
  expect(screen.height / screen.width).toBeCloseTo(844 / 390, 1);
  await box.getByRole('button', { name: 'WATCH IT' }).click();
  await expect(box.locator('[data-replica-video]')).toBeVisible();
});

/* ---------- The app ---------- */

test.describe('the Toto Mundial replica', () => {
  test('picks: Up next opens the match, + and - save by themselves, undo takes it back, the dice fills a score', async ({ page }) => {
    await page.clock.install();
    const outside = watchRequests(page);
    await page.goto(APP);
    await expect(page.locator('[data-upnext]')).toContainText(/Brazil vs Japan locks in 1h 4[67]m/);

    await page.locator('[data-upnext]').click();
    await expect(page.locator('[data-tab="bets"]')).toHaveAttribute('aria-current', 'page');
    const row = page.locator('[data-match="u1"]');
    await expect(row.locator('.save')).toHaveText('No pick yet');
    await expect(row.locator('[data-step="0:-1"]')).toBeDisabled();
    await row.locator('[data-step="0:1"]').click();
    await row.locator('[data-step="0:1"]').click();
    await row.locator('[data-step="1:1"]').click();
    await expect(row.locator('.stepper__num')).toHaveText(['2', '1']);
    await page.clock.runFor(700);
    await expect(row.locator('.save')).toContainText('Saving…');
    await page.clock.runFor(600);
    await expect(row.locator('.save')).toContainText('Saved 2-1');

    await row.getByRole('button', { name: 'Undo' }).click();
    await expect(row.locator('.save')).toHaveText('Pick removed');
    await expect(row.locator('.stepper.is-empty')).toHaveCount(2);

    const next = page.locator('[data-match="u2"]');
    await next.getByRole('button', { name: 'Surprise me' }).click();
    await page.clock.runFor(1200);
    await expect(next.locator('.save')).toContainText(/Saved \d-\d/);

    await page.locator('[data-tab="home"]').click();
    await expect(page.locator('[data-upnext]')).toContainText('Brazil vs Japan', { timeout: 2000 });
    expect(outside, 'the replica asked an outside host for something').toEqual([]);
  });

  test('past results show the points each pick earned, with who advances', async ({ page }) => {
    await page.goto(APP);
    await page.locator('[data-tab="bets"]').click();
    await page.locator('[data-tab-id="time-past"]').click();
    const ger = page.locator('[data-past="p8"]');
    await expect(ger).toContainText('2-0');
    await expect(ger.locator('.pts-chip')).toHaveText(['+5', '+10']);
    await expect(page.locator('[data-past="p6"] .pts-chip')).toHaveText('+10');
    await expect(page.locator('[data-past="p6"]')).toContainText('Exact');
    await expect(page.locator('[data-past="p7"] .pts-chip')).toHaveText('0');
  });

  test('the Golden Ball: search the picker, choose, and see what a right answer is worth', async ({ page }) => {
    await page.goto(APP);
    await page.locator('[data-tab="bets"]').click();
    await page.locator('[data-tab-id="cat-tournament"]').click();
    const card = page.locator('[data-question="ball"]');
    await expect(card).toContainText('Not picked yet');
    await card.locator('[data-answer]').click();
    const picker = page.getByRole('dialog', { name: 'Golden Ball' });
    await picker.getByRole('searchbox').fill('zzz');
    await expect(picker).toContainText('No player matches "zzz"');
    await picker.getByRole('searchbox').fill('yam');
    await picker.locator('[data-player="yamal"]').click();
    await expect(picker).toBeHidden();
    await expect(card).toContainText('Lamine Yamal');
    await expect(card.locator('.scen')).toContainText('+24');
    await expect(card.locator('.scen')).toContainText('→ 1,289');
    await expect(card.locator('[data-tour-saved]')).toBeVisible();
    await expect(page.locator('[data-question="champion"]')).toContainText('Locked');
    await page.locator('[data-tour-surprise]').click();
    await expect(page.locator('.toast')).toContainText('Every open question already has your pick');
  });

  test('the leaderboard: the pot split, the Monkey, and your row opening to show the last change', async ({ page }) => {
    await page.goto(APP);
    await page.locator('[data-tab="leaders"]').click();
    await expect(page.locator('.split')).toContainText('1,120 ILS');
    await expect(page.locator('.monkey')).toContainText('22 of 24 are ahead of him');
    const me = page.locator('[data-person="me"]');
    await expect(me.locator('.lb__rank')).toHaveText('5');
    await me.locator('.lb__main').click();
    await expect(me.locator('.lb__main')).toHaveAttribute('aria-expanded', 'true');
    await expect(me.locator('.lb__tiles')).toContainText('1,250');
    await expect(me.locator('.lb-tile--up')).toContainText('+15');
    await expect(me.locator('.last-card')).toContainText('Germany vs Canada');
    await page.locator('[data-lb-cat="live"]').click();
    await expect(page.locator('.monkey')).toHaveCount(0);
  });

  test('live: a goal turns +5 into +10, and full time moves you up the table', async ({ page }) => {
    await page.clock.install();
    await page.goto(APP);
    await page.locator('[data-tab="live"]').click();
    const card = page.locator('[data-live]');
    await expect(card.locator('[data-live-score]')).toHaveText('1-0');
    await expect(card.locator('[data-projected]')).toHaveText('+5');
    await page.clock.runFor(16000);
    await expect(card.locator('[data-live-score]')).toHaveText('2-1');
    await expect(card.locator('[data-projected]')).toHaveText('+10');
    await expect(card).toContainText('Exact');
    await page.clock.runFor(30000);
    await expect(card).toContainText('Full time');
    await expect(card).toContainText('Earned');
    await expect(page.locator('.bank')).toContainText('1,275');
    await page.locator('[data-tab="leaders"]').click();
    await expect(page.locator('[data-person="me"] .lb__rank')).toHaveText('4');
  });

  test('the language button flips everything to Hebrew, right to left, and back', async ({ page }) => {
    await page.goto(APP);
    await page.getByRole('button', { name: 'Switch to Hebrew' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('.brand-card')).toContainText('טוטו מונדיאל');
    await expect(page.locator('[data-tab="bets"]')).toHaveText('הימורים');
    await page.locator('[data-tab="more"]').click();
    await page.getByRole('dialog').getByRole('button', { name: /שפה/ }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('[data-tab="bets"]')).toHaveText('Bets');
  });

  test('?lang=he opens in Hebrew, pages outside the demo say so, and the menu works', async ({ page }) => {
    await page.goto(APP + '?lang=he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await page.locator('[data-tab="more"]').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Transparency' }).click();
    await expect(page.locator('.toast')).toContainText('Transparency is not part of this demo');
    await page.getByRole('button', { name: 'Open your menu' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click();
    await expect(page.locator('.toast')).toContainText('can\'t sign out of a demo');
  });

  test('the full-screen page has a way back to the portfolio on wide screens', async ({ page }) => {
    test.skip(page.viewportSize().width < 1160, 'phones and tablets use the browser\'s own Back');
    await page.goto(APP);
    await page.locator('.backlink').click();
    await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'work-toto');
  });
});
