// The Memesh replica: on its work page (a desktop window, the video on narrow screens) and on its own
// (the connected story across the three apps, plus cancelling, punching, the profile and English).
// The app is a desktop and tablet system, so the app's own flows run at laptop width.
import { test, expect, watchRequests } from './fixtures.mjs';

const APP = '/demos/memesh/';
function isNarrow(page) { return page.viewportSize().width <= 900; }

/* ---------- On the work page ---------- */

test('the work page shows the replica in a window on wide screens and the video on narrow ones', async ({ page }) => {
  await page.goto('/#/work/memesh');
  const box = page.locator('.page.is-active [data-replica]');
  await expect(box).toHaveAttribute('data-frame', 'desktop');
  if (isNarrow(page)) {
    await expect(box).toHaveAttribute('data-mode', 'watch');
    await expect(box.locator('[data-replica-video]')).toBeVisible();
    return;
  }
  const app = page.frameLocator('.page.is-active .replica__frame');
  await expect(app.locator('.demo-bar')).toBeVisible();
  await expect(app.locator('[data-book]').first()).toBeVisible();
});

test('the desk polaroid shows a picture of the replica', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('.page.is-active .obj[data-obj="work:memesh"] .polaroid__img img')).toHaveAttribute('src', 'demos/memesh/poster.jpg');
});

/* ---------- The app ---------- */

test.describe('the Memesh replica', () => {
  test.beforeEach(async ({ page }) => { test.skip(isNarrow(page), 'a desktop system: its flows run at laptop width'); });

  test('one story: the parent books, the desk checks the ticket in, the manager sees it', async ({ page }) => {
    test.setTimeout(60000);
    const outside = watchRequests(page);
    await page.goto(APP);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const card = page.locator('[data-card="M-20261002-0412"]');
    await expect(card.locator('[data-left]')).toHaveText('10');

    /* The parent books two children into tonight's evening round, with an extra companion. */
    await card.locator('[data-book]').click();
    await expect(page.locator('[data-day="0"]')).toHaveAttribute('aria-selected', 'true');
    await page.locator('[data-round="evening"]').click();
    await page.locator('.stepper-row .step').last().click();
    await expect(page.locator('[data-count]')).toHaveText('2');
    await page.locator('.companion input').check();
    await expect(page.locator('.summary__total')).toContainText('5');
    await page.locator('[data-confirm]').click();
    const rules = page.getByRole('dialog');
    await expect(rules.locator('.rule')).toHaveCount(6);
    await expect(rules.locator('.rule').first()).toContainText('גיל 6');
    await rules.locator('[data-rules-ok]').click();
    await expect(page.locator('.toast')).toContainText('נקלטו');
    const booking = page.locator('.booking.is-open');
    await expect(booking).toContainText('19:00');
    const serial = await booking.getAttribute('data-booking');
    await page.locator('[data-ptab="cards"]').click();
    await expect(card.locator('[data-left]')).toHaveText('8');

    /* At the desk: hold the ticket up, confirm the entry; the evening list shows her arrived. */
    await page.locator('[data-role="desk"]').click();
    await expect(page.locator('[data-stat="entries"]')).toHaveText('15');
    await page.locator('[data-tile="scan"]').click();
    await page.locator('[data-hold="' + serial + '"]').click();
    await page.getByRole('dialog').locator('[data-checkin]').click();
    await expect(page.locator('.toast')).toContainText('עדי אלון');
    await page.locator('[data-dtab="rounds"]').click();
    await page.locator('[data-arrivals="evening"]').click();
    await expect(page.locator('.arr-row.is-in', { hasText: 'עדי אלון' })).toHaveCount(2);
    await page.locator('[data-dtab="till"]').click();
    await expect(page.locator('[data-stat="entries"]')).toHaveText('17');

    /* The manager: the evening round went from 24 to 26, the feed shows the booking, and a walk-in
       added by hand makes it 27. */
    await page.locator('[data-role="manager"]').click();
    await expect(page.locator('[data-kids="evening"]')).toContainText('26 / 40');
    await expect(page.locator('.feed__row').first()).toContainText('עדי אלון');
    await page.locator('[data-manage="evening"]').click();
    await page.locator('[data-add="evening"]').click();
    await page.locator('[data-add-search]').fill('Yon');
    await page.locator('[data-pick="L-2040"]').click();
    await expect(page.locator('[data-kids="evening"]')).toContainText('27 / 40');
    await expect(page.locator('[data-participants="evening"] .part-row').first()).toContainText('יונתן אדלר');
    expect(outside, 'the replica asked an outside host for something').toEqual([]);
  });

  test('a booking a day ahead can be cancelled, and the entries go back to the card', async ({ page }) => {
    await page.goto(APP);
    const card = page.locator('[data-card="M-20261002-0412"]');
    await card.locator('[data-book]').click();
    await page.locator('[data-day="3"]').click();
    await page.locator('[data-round="evening"]').click();
    await page.locator('[data-confirm]').click();
    await page.locator('[data-rules-ok]').click();
    const booking = page.locator('.booking.is-open');
    await booking.locator('[data-cancel]').click();
    await page.locator('[data-confirm-cancel]').click();
    await expect(page.locator('.toast')).toContainText('בוטלה');
    await page.locator('[data-scope="cancelled"]').click();
    await expect(page.locator('.booking')).toHaveCount(2);
    await page.locator('[data-ptab="cards"]').click();
    await expect(card.locator('[data-left]')).toHaveText('10');
  });

  test('today\'s bookings can\'t be cancelled, full rounds offer the waitlist, closed days say so', async ({ page }) => {
    await page.goto(APP);
    await page.locator('[data-book]').first().click();
    await page.locator('[data-day="6"]').click();
    await page.locator('[data-round="evening"]').click();
    await expect(page.locator('.toast')).toContainText('רשימת ההמתנה');
    await page.locator('[data-day="5"]').click();
    await expect(page.locator('.flow__empty')).toContainText('סגור');
    await page.locator('.day-tile--cal').click();
    await expect(page.locator('.cal')).toBeVisible();
    await page.locator('[data-day="0"]').click();
    await page.locator('[data-round="noon"]').click();
    await page.locator('[data-confirm]').click();
    await page.locator('[data-rules-ok]').click();
    await page.locator('.booking.is-open [data-cancel]').click();
    await expect(page.locator('.toast')).toContainText('מאוחר מדי');
  });

  test('the desk finds a customer and punches entries off the card', async ({ page }) => {
    await page.goto(APP + '?role=desk');
    await page.locator('[data-tile="search"]').click();
    await page.getByRole('searchbox').fill('רותם');
    await expect(page.locator('.cust-row')).toHaveCount(1);
    await page.locator('[data-customer="L-2038"]').click();
    await expect(page.locator('[data-left]')).toHaveText('7');
    await page.locator('[data-punch]').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'יותר' }).click();
    await expect(dialog.locator('[data-punch-n]')).toHaveText('2');
    await dialog.locator('[data-punch-go]').click();
    await expect(page.locator('[data-left]')).toHaveText('5');
    await expect(page.locator('.hist-row').first()).toContainText('2 כניסות');
    await page.locator('[data-tile]').count();
    await page.locator('.back-link').click();
    await page.locator('.back-link').click();
    await expect(page.locator('[data-stat="entries"]')).toHaveText('17');
  });

  test('the scanner: a used-up card is refused, a typed serial works, an empty one asks for it', async ({ page }) => {
    await page.goto(APP + '?role=desk');
    await page.locator('[data-tile="scan"]').click();
    await page.getByRole('button', { name: 'הזנת מספר סידורי במקום' }).click();
    await page.locator('[data-serial-input]').press('Enter');
    await expect(page.locator('.toast')).toContainText('נא להזין מספר סידורי');
    await page.locator('[data-serial-input]').fill('M-20260912-0355');
    await page.locator('[data-serial-input]').press('Enter');
    await expect(page.locator('.toast')).toContainText('מנוצלת');
    await page.locator('[data-serial-input]').fill('m-20261115-0488');
    await page.locator('[data-serial-input]').press('Enter');
    await expect(page.getByRole('dialog')).toContainText('כמה כניסות לנקב?');
  });

  test('the profile checks the name and email, and keeps the phone locked', async ({ page }) => {
    await page.goto(APP);
    await page.locator('[data-ptab="profile"]').click();
    await expect(page.locator('[data-field="phone"]')).toHaveAttribute('readonly', '');
    await page.locator('[data-field="first"]').fill('');
    await page.locator('[data-save]').click();
    await expect(page.locator('.toast')).toContainText('שדות חובה');
    await page.locator('[data-field="first"]').fill('עדית');
    await page.locator('[data-field="email"]').fill('not-an-email');
    await page.locator('[data-save]').click();
    await expect(page.locator('.toast')).toContainText('מייל לא תקינה');
    await page.locator('[data-field="email"]').fill('adi@example.com');
    await page.locator('[data-save]').click();
    await expect(page.locator('.toast')).toContainText('הפרטים נשמרו');
    await expect(page.locator('.side-card__name')).toHaveText('עדית אלון');
  });

  test('the manager\'s customers, cards and permissions, and English', async ({ page }) => {
    await page.goto(APP + '?role=manager');
    await page.locator('[data-mpage="customers"]').click();
    await page.locator('[data-crow="L-2037"]').click();
    await expect(page.getByRole('dialog')).toContainText('הדס נחום');
    await page.keyboard.press('Escape');
    await page.locator('[data-mpage="staff"]').click();
    await page.locator('[data-stab="perms"]').click();
    await expect(page.locator('.info-bar')).toContainText('תצוגה בלבד');
    await expect(page.locator('.switch[aria-checked="true"]').first()).toBeVisible();
    await page.locator('[data-mpage="reports"]').click();
    await expect(page.locator('.toast')).toContainText('לא חלק מהדמו');
    await page.locator('[data-lang-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('[data-role="manager"]')).toContainText('Manager');
    await page.locator('[data-mpage="dashboard"]').click();
    await expect(page.locator('.sec-title').first()).toHaveText('Today\'s rounds');
  });

  test('the full-screen page has a way back to the portfolio', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.backlink').click();
    await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'work-memesh');
  });
});
