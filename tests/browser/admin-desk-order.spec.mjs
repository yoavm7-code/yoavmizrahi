// The desk order in the admin: one list for computers, one for phones and tablets.
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
/* The names in the list, with the computer-only note on the tapes left off, so both lists compare. */
async function listNames(page) {
  return (await page.locator('ol.order .order__name').allTextContents()).map((n) => n.replace(/ \(on computers.*\)$/, ''));
}

test('phones get their own desk order, and the preview follows the list', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin/#/desk');
  const computerTab = page.getByRole('button', { name: 'On computers', exact: true });
  const phoneTab = page.getByRole('button', { name: 'On phones and tablets', exact: true });
  const previewPhone = page.locator('.preview__bar').getByRole('button', { name: 'Phone' });
  await expect(computerTab).toHaveAttribute('aria-pressed', 'true');
  const computer = await listNames(page);
  const before = (await draftOf(page)).desk.order;

  await phoneTab.click();
  await expect(phoneTab).toHaveAttribute('aria-pressed', 'true');
  await expect(previewPhone).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Same as on computers right now.')).toBeVisible();
  expect(await listNames(page)).toEqual(computer);

  await page.getByRole('button', { name: 'Move ' + computer[1] + ' up', exact: true }).click();
  await expect(page.getByText('Phones have their own order.')).toBeVisible();
  expect(await listNames(page)).toEqual([computer[1], computer[0]].concat(computer.slice(2)));
  const d = await draftOf(page);
  expect(d.desk.order, 'the computer order is untouched').toEqual(before);
  expect(d.desk.phoneOrder.slice(0, 2)).toEqual([before[1], before[0]]);

  const preview = page.frameLocator('.preview__frame-wrap.is-shown iframe');
  await expect.poll(() => preview.locator('[data-desk]').evaluate((desk) => desk.getAttribute('data-phone-order').split(' ').slice(0, 2))).toEqual([before[1], before[0]]);

  /* The preview's own switch moves the list back to computers. */
  await page.locator('.preview__bar').getByRole('button', { name: 'Desktop' }).click();
  await expect(computerTab).toHaveAttribute('aria-pressed', 'true');
  expect(await listNames(page)).toEqual(computer);

  await phoneTab.click();
  await page.getByRole('button', { name: 'Copy computer order' }).click();
  await expect(page.getByText('Same as on computers right now.')).toBeVisible();
  expect((await draftOf(page)).desk.phoneOrder).toBeNull();
  expect(await listNames(page)).toEqual(computer);
});

test('moving something on computers leaves an own phone order alone', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin/#/desk');
  await page.getByRole('button', { name: 'On phones and tablets', exact: true }).click();
  const names = await listNames(page);
  await page.getByRole('button', { name: 'Move ' + names[names.length - 1] + ' up' }).click();
  const phone = (await draftOf(page)).desk.phoneOrder;
  await page.getByRole('button', { name: 'On computers', exact: true }).click();
  const computer = await listNames(page);
  await page.getByRole('button', { name: 'Move ' + computer[1] + ' up' }).click();
  expect((await draftOf(page)).desk.phoneOrder).toEqual(phone);
});
