// The I.M Engineering replica: on its work page (a Desktop / Phone switch on wide screens, the phone
// view on narrow ones), on the desk, and on its own (the contact form, projects and gallery, the
// accessibility panel, links that stay in the demo, and the phone layout).
import { test, expect, watchRequests } from './fixtures.mjs';

const APP = '/demos/im-eng/';
/* The portfolio switches to the phone view at 900px; the site itself goes to its phone layout under 768px. */
function isNarrow(page) { return page.viewportSize().width <= 900; }
function isPhoneLayout(page) { return page.viewportSize().width < 768; }

/* ---------- On the portfolio ---------- */

test('the work page shows the site, with a phone view to switch to, or straight in it on narrow screens', async ({ page }) => {
  await page.goto('/#/work/im-eng');
  const box = page.locator('.page.is-active [data-replica]');
  const frame = page.frameLocator('.page.is-active .replica__frame');
  await expect(box).toHaveAttribute('data-mode', 'try');
  if (isNarrow(page)) {
    await expect(box).toHaveAttribute('data-frame', 'phone');
    await expect(box.locator('[data-replica-view]').first()).toBeHidden();
    await expect(frame.locator('.tabbar')).toBeVisible();
    await box.locator('[data-replica-mode="watch"]').click();
    await expect(box.locator('[data-replica-video]')).toBeVisible();
    await box.locator('[data-replica-mode="try"]').click();
    await expect(box).toHaveAttribute('data-frame', 'phone');
    return;
  }
  await expect(box).toHaveAttribute('data-frame', 'desktop');
  await expect(frame.locator('.rail')).toBeVisible();
  await box.locator('[data-replica-view="phone"]').click();
  await expect(box).toHaveAttribute('data-frame', 'phone');
  await expect(box).toHaveClass(/replica--phone/);
  await expect(page.locator('.page.is-active .replica__frame')).toHaveAttribute('width', '390');
  await expect(frame.locator('.tabbar')).toBeVisible();
  await expect(frame.locator('.rail')).toBeHidden();
  /* The video is the desktop recording, so watching uses the wide device. */
  await box.locator('[data-replica-mode="watch"]').click();
  await expect(box).not.toHaveClass(/replica--phone/);
  await box.locator('[data-replica-mode="try"]').click();
  await expect(box).toHaveClass(/replica--phone/);
  await box.locator('[data-replica-view="desktop"]').click();
  await expect(page.locator('.page.is-active .replica__frame')).toHaveAttribute('width', '1440');
  await expect(frame.locator('.rail')).toBeVisible();
});

test('the desk polaroid shows the site and opens the project', async ({ page }) => {
  await page.goto('/#/');
  const obj = page.locator('.page.is-active .obj[data-obj="work:im-eng"]');
  await expect(obj.locator('img')).toHaveAttribute('src', 'demos/im-eng/poster.jpg');
  await obj.getByRole('link', { name: /open project/i }).click();
  await expect(page).toHaveURL(/#\/work\/im-eng$/);
});

/* ---------- The site ---------- */

test.describe('the I.M replica', () => {
  test('the contact form: required fields, bad formats, sending, thanks, and again', async ({ page }) => {
    const outside = watchRequests(page);
    await page.clock.install();
    await page.goto(APP);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.locator('[data-send]').scrollIntoViewIfNeeded();
    await page.locator('[data-send]').click();
    await expect(page.locator('#lead-name-err')).toHaveText('שדה חובה');
    await expect(page.locator('#lead-phone-err')).toHaveText('שדה חובה');
    await expect(page.locator('#lead-name')).toBeFocused();

    await page.locator('#lead-name').fill('דנה כהן');
    await expect(page.locator('#lead-name-err')).toHaveCount(0);
    await page.locator('#lead-phone').fill('12345');
    await page.locator('#lead-email').fill('dana@');
    await page.locator('[data-send]').click();
    await expect(page.locator('#lead-phone-err')).toHaveText('מספר טלפון לא תקין');
    await expect(page.locator('#lead-email-err')).toHaveText('כתובת אימייל לא תקינה');

    await page.locator('#lead-phone').fill('052-1234567');
    await page.locator('#lead-email').fill('');
    await page.locator('#lead-message').fill('משרד של 150 מ"ר');
    await page.locator('[data-send]').click();
    await expect(page.locator('[data-send]')).toBeDisabled();
    await expect(page.locator('[data-send]')).toContainText('שולח…');
    await page.clock.runFor(900);
    await expect(page.locator('.thanks')).toContainText('תודה! הפנייה התקבלה');
    await expect(page.locator('.toast')).toContainText('nothing was sent');

    await page.locator('[data-again]').click();
    await expect(page.locator('#lead-name')).toHaveValue('');
    await expect(page.locator('#lead-name')).toBeFocused();
    expect(outside).toEqual([]);
  });

  test('a failed send shows the error with the phone number', async ({ page }) => {
    await page.clock.install();
    await page.goto(APP + '?form=fail');
    await page.locator('#lead-name').fill('דנה');
    await page.locator('#lead-phone').fill('0521234567');
    await page.locator('[data-send]').click();
    await page.clock.runFor(900);
    await expect(page.locator('.form__error')).toContainText('משהו השתבש');
    await expect(page.locator('.form__error')).toContainText('054-2806344');
    await expect(page.locator('[data-send]')).toBeEnabled();
  });

  test('projects: the home six, all seven, a project page with its details, gallery and the next one', async ({ page }) => {
    await page.goto(APP);
    await expect(page.locator('.page--home [data-project]')).toHaveCount(6);
    await page.locator('[data-all-projects]').click();
    await expect(page.locator('.page--projects [data-project]')).toHaveCount(7);
    await expect(page.locator('h1')).toContainText('הפרויקטים');
    await page.locator('[data-project="monday-com-offices"]').click();
    await expect(page.locator('.project__title')).toHaveText('משרדי Monday.com – מתחם ילדים ועבודות גמר, תל אביב');
    await expect(page.locator('.spec')).toHaveCount(5);
    await expect(page.locator('.spec').filter({ hasText: 'שטח' })).toContainText('220 מ"ר');
    await expect(page.locator('.project__h').filter({ hasText: 'האתגר' })).toBeVisible();

    /* The lightbox: open, next, wrap round, Escape gives focus back. */
    await page.locator('[data-shot="0"]').click();
    const box = page.getByRole('dialog', { name: 'גלריית תמונות' });
    /* Arrows on a computer; on a phone you swipe (right is next, as the page reads right to left). */
    const next = async () => {
      if (!isPhoneLayout(page)) return box.locator('[data-lb="next"]').click();
      const img = await box.locator('img').boundingBox();
      await page.mouse.move(img.x + 40, img.y + img.height / 2);
      await page.mouse.down();
      await page.mouse.move(img.x + 200, img.y + img.height / 2, { steps: 6 });
      await page.mouse.up();
    };
    await expect(box).toContainText('1 / 2');
    await next();
    await expect(box).toContainText('2 / 2');
    await next();
    await expect(box).toContainText('1 / 2');
    await page.keyboard.press('Escape');
    await expect(box).toBeHidden();
    await expect(page.locator('[data-shot="0"]')).toBeFocused();

    await page.locator('[data-next-project]').click();
    await expect(page.locator('.project__title')).toContainText('גורן לביאוב');
    await page.locator('[data-back]').click();
    await expect(page.locator('.page--projects')).toBeVisible();
  });

  test('links that would leave the site explain instead of opening', async ({ page }) => {
    const outside = watchRequests(page);
    await page.goto(APP);
    await page.locator('[data-whatsapp="float"]').click();
    await expect(page.locator('.toast')).toContainText('WhatsApp chat with Ido');
    await page.locator('[data-info="phone"]').click();
    await expect(page.locator('.toast')).toContainText('054-2806344');
    await page.locator('[data-info="instagram"]').click();
    await expect(page.locator('.toast')).toContainText('@im.construction_');
    expect(outside).toEqual([]);
  });

  test('the accessibility panel: text size, switches, reset, Escape', async ({ page }) => {
    await page.goto(APP);
    const html = page.locator('html');
    const panel = page.getByRole('dialog', { name: 'הגדרות נגישות' });
    await expect(panel).toBeHidden();
    await page.locator('[data-a11y-open]').click();
    await expect(panel).toBeVisible();
    await page.locator('[data-size="up"]').click();
    await page.locator('[data-size="up"]').click();
    await expect(page.locator('[data-size-now]')).toHaveText('120%');
    expect(await html.evaluate((e) => getComputedStyle(e).fontSize)).toBe('19.2px');
    for (const key of ['contrast', 'links', 'guide', 'still']) {
      await page.locator('[data-a11y="' + key + '"]').click();
      await expect(page.locator('[data-a11y="' + key + '"]')).toHaveAttribute('aria-pressed', 'true');
      await expect(html).toHaveClass(new RegExp('a11y-' + key));
    }
    await expect(page.locator('.reading-guide')).toBeVisible();
    await expect(page.locator('.a11y')).toHaveCSS('filter', 'none');
    await page.locator('[data-a11y-reset]').click();
    await expect(html).not.toHaveClass(/a11y-/);
    await expect(page.locator('[data-size-now]')).toHaveText('100%');
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.locator('[data-a11y-open]')).toBeFocused();
  });

  test('the nav takes you to each section and the phone layout swaps the rail for a tab bar', async ({ page }) => {
    await page.goto(APP);
    const nav = isPhoneLayout(page) ? page.locator('.tabbar') : page.locator('.rail');
    await expect(nav).toBeVisible();
    await expect(isPhoneLayout(page) ? page.locator('.rail') : page.locator('.tabbar')).toBeHidden();
    await nav.locator('[data-nav="contact"]').click();
    await expect(page.locator('#contact')).toBeInViewport();
    await expect(nav.locator('[data-nav="contact"]')).toHaveAttribute('aria-current', 'true');
    if (isPhoneLayout(page)) {
      await expect(page.locator('.topbar')).toHaveClass(/is-shown/);
      await expect(nav.locator('[data-nav="contact"]')).toContainText('צור קשר');
    }
    await nav.locator('[data-nav="projects"]').click();
    await expect(page.locator('.page--projects')).toBeVisible();
    await page.locator('.page--projects [data-project]').first().click();
    await expect(page.locator('.project__title')).toBeVisible();
  });

  test('the back link returns to the portfolio project page', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.backlink').click();
    await expect(page).toHaveURL(/#\/work\/im-eng$/);
  });
});
