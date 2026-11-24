// The site in a real browser, the way CLAUDE.md asks it to be checked before calling anything done:
// every route, the menu, a tape into the monitor, both demos, the reel, share links and the admin,
// at phone, tablet and laptop width, with no console errors anywhere.
import { test, expect, settled } from './fixtures.mjs';

const ROUTES = [
  ['/', 'home'],
  ['/work', 'work'],
  ['/work/uploader', 'work-uploader'],
  ['/work/toto', 'work-toto'],
  ['/work/memesh', 'work-memesh'],
  ['/films', 'films'],
  ['/about', 'about']
];

function isNarrow(page) { return page.viewportSize().width <= 900; }

/* ---------- Pages ---------- */

for (const [route, name] of ROUTES) {
  test('route #' + route + ' shows its page and fits the screen', async ({ page }) => {
    await page.goto('/#' + route);
    await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', name);
    await expect(page.locator('.page.is-active')).toHaveCount(1);
    await expect(page.locator('body')).toHaveAttribute('data-theme', name === 'films' ? 'dark' : 'light');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(1);
  });
}

test('an unknown route falls back to the desk', async ({ page }) => {
  await page.goto('/#/nowhere');
  await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'home');
});

test('the menu opens, navigates with the page wipe, and closes with Escape', async ({ page }) => {
  await page.goto('/#/');
  const toggle = page.locator('.site-header [data-menu-toggle]');
  await toggle.click();
  await expect(page.locator('#menu')).toHaveAttribute('aria-hidden', 'false');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).toHaveAttribute('aria-hidden', 'true');

  await toggle.click();
  await page.locator('#menu a[href="#/about"]').click();
  await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'about');
  await expect(page.locator('#menu')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-page-name]')).toHaveText('ABOUT');
  await expect(page).toHaveTitle(/^About · /);
});

test('every work card opens its project page', async ({ page }) => {
  await page.goto('/#/work');
  const hrefs = await page.locator('.page.is-active .card').evaluateAll((els) => els.map((a) => a.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(1);
  for (const href of hrefs) {
    await page.goto('/' + href);
    await expect(page.locator('.page.is-active')).toHaveAttribute('data-route', href.slice(1));
  }
});

/* ---------- The desk ---------- */

test('a tape goes into the monitor, plays, and ejects', async ({ page }) => {
  await page.goto('/#/');
  const screen = page.locator('[data-monitor]');
  const tape = page.locator('[data-tape]').first();
  await expect(screen).toHaveAttribute('data-state', 'empty');

  if (isNarrow(page)) {
    await tape.locator('[data-insert]').click();
  } else {
    /* Drag the tape by its label (not its button) and drop it on the monitor, just above the rack. */
    await expect(page.locator('.desk.is-laid')).toBeVisible();
    await tape.scrollIntoViewIfNeeded();
    const from = await tape.locator('.tape__label span').boundingBox();
    const to = await page.locator('[data-obj="monitor"]').boundingBox();
    await page.mouse.move(from.x + 10, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, Math.max(to.y + 40, Math.min(to.y + to.height - 60, 300)), { steps: 12 });
    await page.mouse.up();
  }
  await expect(screen).toHaveAttribute('data-state', 'idle');
  await expect(tape).toHaveClass(/is-inserted/);
  await expect(page.locator('[data-monitor-title]')).toHaveText(await tape.getAttribute('data-title'));

  await page.locator('[data-monitor-play]').click();
  await expect(screen).toHaveAttribute('data-state', 'playing');
  await expect(page.locator('[data-monitor-player] .placeholder-player, [data-monitor-player] iframe')).toHaveCount(1);

  await page.locator('[data-eject]').click();
  await expect(screen).toHaveAttribute('data-state', 'empty');
  await expect(tape).not.toHaveClass(/is-inserted/);
});

test('a second tape replaces the first, even one pressed while the first is still on its way', async ({ page }) => {
  await page.goto('/#/');
  const tapes = page.locator('[data-tape]');
  test.skip(await tapes.count() < 2, 'needs two tapes');
  await tapes.nth(0).locator('[data-insert]').click();
  await tapes.nth(1).locator('[data-insert]').click();
  await expect(tapes.nth(0)).not.toHaveClass(/is-inserted/);
  await expect(tapes.nth(1)).toHaveClass(/is-inserted/);
});

test('a tape flies into the monitor and leaves nothing behind', async ({ page }) => {
  await page.goto('/#/');
  const tape = page.locator('[data-tape]').first();
  await tape.locator('[data-insert]').click();
  await expect(page.locator('.tape-ghost')).toHaveCount(1);
  await expect(tape).toHaveClass(/is-inserted/);
  await expect(page.locator('[data-monitor]')).toHaveAttribute('data-state', 'idle');
  await expect(page.locator('.tape-ghost')).toHaveCount(0);
});

test('with reduced motion a tape goes straight in, with no flight', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/');
  const tape = page.locator('[data-tape]').first();
  await tape.locator('[data-insert]').click();
  await expect(tape).toHaveClass(/is-inserted/);
  expect(await page.locator('.tape-ghost').count()).toBe(0);
});

/* ---------- The monitor on standby ---------- */

function stillsOf(page) {
  return page.locator('[data-standby]').evaluate((el) => el.getAttribute('data-stills').split(' '));
}
function shownStill(page) {
  return page.locator('[data-standby] img.is-on').evaluate((img) => new URL(img.src).pathname.slice(1));
}

test('with no tape in, the monitor stands by on the films\' stills and moves to the next', async ({ page }) => {
  await page.goto('/#/');
  const screen = page.locator('[data-monitor]');
  await expect(screen).toHaveClass(/has-standby/);
  await expect(page.locator('.monitor__standby')).toBeVisible();
  await expect(page.locator('.monitor__off')).toBeHidden();
  const stills = await stillsOf(page);
  expect(await shownStill(page)).toBe(stills[0]);
  await expect.poll(() => shownStill(page), { timeout: 8000 }).toBe(stills[1]);
});

test('the standby hides while a tape is in and comes back on eject', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('[data-monitor]')).toHaveClass(/has-standby/);
  await page.locator('[data-tape] [data-insert]').first().click();
  await expect(page.locator('[data-standby]')).toBeHidden();
  await page.locator('[data-eject]').click();
  await expect(page.locator('[data-standby]')).toBeVisible();
});

test('with reduced motion the standby holds one still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const asked = [];
  page.on('request', (r) => asked.push(new URL(r.url()).pathname));
  await page.goto('/#/');
  await expect(page.locator('[data-monitor]')).toHaveClass(/has-standby/);
  const stills = await stillsOf(page);
  await page.waitForTimeout(5600);
  expect(await shownStill(page)).toBe(stills[0]);
  expect(asked.filter((u) => stills.slice(1).includes(u.slice(1))), 'no other still is fetched').toEqual([]);
});

/* ---------- The first visit's hint ---------- */

/* Notes whether any tape ever got the hint, from the very first moment of the page. */
async function watchNudge(page) {
  await page.addInitScript(() => {
    window.__nudged = false;
    new MutationObserver(() => {
      if (document.querySelector('.is-nudging')) window.__nudged = true;
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
}

test('on a laptop the first tape leans toward the monitor once, and its play button rings', async ({ page }) => {
  test.skip(isNarrow(page), 'the hint is for wide desks');
  await page.setViewportSize({ width: 1440, height: 900 }); // tall enough that the tapes are in view; out of view there is no hint
  await watchNudge(page);
  await page.goto('/#/');
  const tape = page.locator('[data-tape]').first();
  await expect(tape).toHaveClass(/is-nudging/, { timeout: 4000 });
  await expect(tape).not.toHaveClass(/is-nudging/);
});

test('there is no hint on phones and tablets, or with reduced motion', async ({ page }) => {
  if (!isNarrow(page)) await page.emulateMedia({ reducedMotion: 'reduce' });
  await watchNudge(page);
  await page.goto('/#/');
  await page.waitForTimeout(2600);
  expect(await page.evaluate(() => window.__nudged)).toBe(false);
});

test('pressing play before the hint cancels it', async ({ page }) => {
  test.skip(isNarrow(page), 'the hint is for wide desks');
  await page.setViewportSize({ width: 1440, height: 900 });
  await watchNudge(page);
  await page.goto('/#/');
  await page.locator('[data-tape] [data-insert]').nth(1).click();
  await page.waitForTimeout(2600);
  expect(await page.evaluate(() => window.__nudged)).toBe(false);
});

/* ---------- Hover and sound ---------- */

test('with a mouse an object lifts a little under the pointer', async ({ page }) => {
  test.skip(isNarrow(page), 'hover is for fine pointers on wide desks');
  await page.goto('/#/');
  await expect(page.locator('.desk.is-laid')).toBeVisible();
  const note = page.locator('[data-obj="note"]');
  await note.hover();
  await settled(note);
  expect(await note.evaluate((el) => getComputedStyle(el).translate)).toBe('0px -3px');
});

test('sound is off at first and says so, the switch turns it on, and the choice is kept', async ({ page }) => {
  await page.goto('/#/');
  const sw = page.locator('.monitor [data-sound]');
  await expect(sw).toHaveAccessibleName('SOUND OFF');
  await expect(sw.locator('.sound__mute')).toBeVisible();
  await expect(sw.locator('.sound__waves')).toBeHidden();
  await sw.click();
  await expect(sw).toHaveAccessibleName('SOUND ON');
  await expect(sw.locator('.sound__waves')).toBeVisible();
  await expect(sw.locator('.sound__mute')).toBeHidden();
  await page.locator('[data-tape] [data-insert]').first().click();
  await expect(page.locator('[data-monitor]')).toHaveAttribute('data-state', 'idle');
  await page.locator('[data-eject]').click();
  await page.reload();
  await expect(sw).toHaveAccessibleName('SOUND ON');
  await sw.click();
  await expect(sw).toHaveAccessibleName('SOUND OFF');
  expect(await page.evaluate(() => localStorage.getItem('ym-sound'))).toBe('off');
});

/* Real touch events through Chrome's DevTools protocol, so a press, a hold and a move reach the page
   the way a phone sends them. */
async function touch(page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  return {
    async drag(x, y, dx, dy, holdMs) {
      await send('touchStart', x, y);
      if (holdMs) await page.waitForTimeout(holdMs);
      for (let k = 1; k <= 8; k++) await send('touchMove', x + (dx * k) / 8, y + (dy * k) / 8);
      await send('touchEnd');
    }
  };
}

test('anything on the desk drags anywhere, and Tidy up puts it back', async ({ page }) => {
  await page.goto('/#/');
  const note = page.locator('[data-obj="note"]');
  const tidy = page.getByRole('button', { name: 'Tidy up' });
  if (!isNarrow(page)) await expect(page.locator('.desk.is-laid')).toBeVisible();
  await settled(note);
  await expect(tidy).toBeHidden();
  const before = await note.boundingBox();
  const x = before.x + 60, y = before.y + 40;

  if (isNarrow(page)) {
    const finger = await touch(page);
    /* A quick swipe scrolls the page; it never moves the note. */
    await finger.drag(x, y, 80, 0, 0);
    await page.waitForTimeout(300);
    expect(Math.abs((await note.boundingBox()).x - before.x)).toBeLessThan(2);
    await expect(tidy).toBeHidden();
    /* Press and hold, then move: the note follows the finger (down, where a phone has room). */
    await finger.drag(x, y, 20, 120, 500);
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 100, y + 60, { steps: 8 });
    await page.mouse.up();
  }
  await expect.poll(async () => { const after = await note.boundingBox(); return Math.hypot(after.x - before.x, after.y - before.y); }).toBeGreaterThan(50);
  await expect(tidy).toBeVisible();

  await tidy.click();
  await expect(tidy).toBeHidden();
  await expect.poll(async () => { const b = await note.boundingBox(); return Math.hypot(b.x - before.x, b.y - before.y); }, { timeout: 3000 }).toBeLessThan(2);
});

test('after Tidy up, or a click that moves nothing, the tapes stack in their pile order again', async ({ page }) => {
  test.skip(isNarrow(page), 'checked with a mouse on wide screens');
  await page.goto('/#/');
  await expect(page.locator('.desk.is-laid')).toBeVisible();
  const layers = () => page.locator('.desk .obj').evaluateAll((els) => els.map((o) => o.style.zIndex));
  const home = await layers();
  const tape = page.locator('[data-tape]').nth(1);
  await tape.scrollIntoViewIfNeeded();

  /* A click lifts the tape, and putting it down where it was sends it back to its layer. */
  let box = await tape.boundingBox();
  await page.mouse.move(box.x + 50, box.y + 25);
  await page.mouse.down();
  await page.mouse.up();
  expect(await layers()).toEqual(home);

  /* Dragged away it stays on top; Tidy up puts it back in the pile, under the tape that follows it. */
  await page.mouse.move(box.x + 50, box.y + 25);
  await page.mouse.down();
  await page.mouse.move(box.x - 150, box.y + 200, { steps: 8 });
  await page.mouse.up();
  expect(Number(await tape.evaluate((o) => o.style.zIndex))).toBeGreaterThan(Math.max(...home.map(Number)));
  await page.getByRole('button', { name: 'Tidy up' }).click();
  expect(await layers()).toEqual(home);
});

test('the menu numbers keep their own letter spacing, so the digits never overlap', async ({ page }) => {
  await page.goto('/#/');
  await page.locator('.site-header [data-menu-toggle]').click();
  const nums = page.locator('#menu .mlink__num');
  await expect(nums).toHaveCount(4);
  /* The second digit starts at least half a character after the first (the big heading's tight
     spacing, inherited, used to pull it about 5px back over the first). */
  for (const step of await nums.evaluateAll((els) => els.map((el) => {
    const range = document.createRange();
    const text = el.firstChild;
    range.setStart(text, 0); range.setEnd(text, 1);
    const first = range.getBoundingClientRect().left;
    range.setStart(text, 1); range.setEnd(text, 2);
    return (range.getBoundingClientRect().left - first) / parseFloat(getComputedStyle(el).fontSize);
  }))) expect(step).toBeGreaterThan(0.5);
});

test('nothing can be dragged off the desk', async ({ page }) => {
  test.skip(isNarrow(page), 'checked with a mouse on wide screens');
  await page.goto('/#/');
  await expect(page.locator('.desk.is-laid')).toBeVisible();
  const note = page.locator('[data-obj="note"]');
  const box = await note.boundingBox();
  await page.mouse.move(box.x + 60, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(-400, -400, { steps: 8 });
  await page.mouse.up();
  /* Measured where the note comes to rest: off the note, so its 3px hover lift is gone (the browser ends
     the hover on its next frame), and after it has settled from the drag's 4% scale-up, which for a
     moment reaches past the edge. */
  await page.mouse.move(box.x + 600, box.y + 600);
  await expect.poll(() => note.evaluate((el) => getComputedStyle(el).translate)).toBe('none');
  await settled(note);
  const desk = await page.locator('[data-desk]').boundingBox();
  const after = await note.boundingBox();
  expect(after.x).toBeGreaterThanOrEqual(desk.x - 1);
  expect(after.y).toBeGreaterThanOrEqual(desk.y - 1);
});

/* The desk's tilted objects, as boxes: tapes may overlap each other (they're piled), nothing else. */
async function deskBoxes(page) {
  return page.locator('[data-desk] .obj').evaluateAll((els) => els.map((el) => {
    const r = el.getBoundingClientRect();
    return { key: el.getAttribute('data-obj'), x: r.left, y: r.top, w: r.width, h: r.height };
  }));
}
function overlaps(a, b) { return a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1; }

for (const [w, h] of [[1180, 800], [1440, 900], [2560, 1290]]) {
  test(`the desk arranges itself at ${w}px: no overlaps, nothing past the edge`, async ({ page }) => {
    test.skip(isNarrow(page), 'sets its own size');
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/#/');
    await expect(page.locator('.desk.is-laid')).toBeVisible();
    const boxes = await deskBoxes(page);
    expect(boxes.length).toBeGreaterThan(6);
    boxes.forEach((a, i) => {
      expect(a.x, a.key + ' starts on screen').toBeGreaterThanOrEqual(0);
      expect(a.x + a.w, a.key + ' ends on screen').toBeLessThanOrEqual(w);
      boxes.slice(i + 1).forEach((b) => {
        if (a.key.startsWith('tape:') && b.key.startsWith('tape:')) return;
        expect(overlaps(a, b), a.key + ' and ' + b.key + ' overlap').toBe(false);
      });
    });
  });
}

test('on phones the tapes pile up with every label in full', async ({ page }) => {
  test.skip(page.viewportSize().width > 720, 'phone width only');
  await page.goto('/#/');
  const labels = page.locator('[data-tape] .tape__label span');
  const n = await labels.count();
  for (let i = 0; i < n; i++) {
    const full = await labels.nth(i).evaluate((el) => el.scrollWidth <= el.clientWidth);
    expect(full, (await labels.nth(i).textContent()) + ' reads in full').toBe(true);
  }
});

/* ---------- Demos ---------- */

test('the uploader on the desk launches: four go live, Credit Cards fails, then it launches again', async ({ page }) => {
  await page.goto('/#/');
  const demo = page.locator('.page.is-active [data-widget="uploader"]');
  await expect(demo.locator('.u-sum')).toHaveText('5 campaigns ready');
  await demo.getByRole('button', { name: 'LAUNCH', exact: true }).click();
  await expect(demo.getByRole('button', { name: 'LAUNCHING…' })).toBeDisabled();
  await expect(demo.locator('.u-row.is-running')).toHaveCount(1);
  await expect(demo.getByRole('button', { name: 'LAUNCH AGAIN' })).toBeVisible({ timeout: 10000 });
  await expect(demo.locator('.u-sum')).toHaveText('4 live · 1 failed');
  await expect(demo.locator('.u-row.is-failed')).toContainText('AU · Credit Cards');
  await expect(demo.locator('.u-row.is-failed .u-state')).toHaveText('policy');
  await demo.getByRole('button', { name: 'LAUNCH AGAIN' }).click();
  await expect(demo.locator('.u-sum')).toHaveText('0 live · 0 failed');
  await expect(demo.locator('.u-row.is-live')).toHaveCount(0);
});

test('the uploader stays clear of the objects around it on the desk', async ({ page }) => {
  test.skip(isNarrow(page), 'narrow screens stack the desk');
  await page.goto('/#/');
  const link = page.locator('.page.is-active .obj[data-obj="work:uploader"] .device__foot a');
  await link.click();
  await expect(page.locator('.page.is-active')).toHaveAttribute('data-route', '/work/uploader');
});

test('a work card plays its video only on hover, and loads nothing before', async ({ page }) => {
  test.skip(isNarrow(page), 'touch screens keep the still poster');
  await page.goto('/#/work');
  const card = page.locator('.page.is-active .card--shot').first();
  const video = card.locator('[data-card-video]');
  await page.mouse.move(5, 5);
  await expect(card.locator('img')).toBeVisible();
  expect(await video.getAttribute('src')).toBeNull();
  await card.hover();
  await expect(card).toHaveClass(/is-playing/);
  await expect.poll(() => video.evaluate((v) => !v.paused && v.currentTime > 0), { timeout: 10000 }).toBe(true);
  await page.mouse.move(5, 5);
  await expect(card).not.toHaveClass(/is-playing/);
  expect(await video.evaluate((v) => v.paused)).toBe(true);
});

test('the Films card runs its strip of stills on hover, or by itself on touch screens', async ({ page }) => {
  await page.goto('/#/work');
  const card = page.locator('.page.is-active .card--films');
  const strip = card.locator('.strip');
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('.strip__frame img').first()).toBeVisible();
  const state = () => strip.evaluate((el) => getComputedStyle(el).animationPlayState);
  if (isNarrow(page)) {
    expect(await state()).toBe('running');
  } else {
    expect(await state()).toBe('paused');
    await card.hover();
    expect(await state()).toBe('running');
  }
});

test('with reduced motion the film strip holds still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/work');
  const card = page.locator('.page.is-active .card--films');
  await card.scrollIntoViewIfNeeded();
  if (!isNarrow(page)) await card.hover();
  expect(await card.locator('.strip').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});

test('the match pick on the desk saves by itself, undoes, and rolls the dice', async ({ page }) => {
  await page.clock.install();
  await page.goto('/#/');
  await page.clock.pauseAt(Date.now() + 2000); /* only the test moves time, so slow clicks can't save early */
  const demo = page.locator('.page.is-active [data-widget="toto"]');
  const goals = demo.locator('.toto__goals');
  const status = demo.locator('.toto__status');
  await expect(status).toHaveText('No pick yet');
  await expect(goals).toHaveText(['0', '0']);
  await expect(demo.getByRole('button', { name: 'Brazil: one goal fewer' })).toBeDisabled();
  await demo.getByRole('button', { name: 'Brazil: one goal more' }).click();
  await demo.getByRole('button', { name: 'Brazil: one goal more' }).click();
  await demo.getByRole('button', { name: 'Japan: one goal more' }).click();
  await expect(goals).toHaveText(['2', '1']);
  await page.clock.runFor(700);
  await expect(status).toContainText('Saving…');
  await page.clock.runFor(600);
  await expect(status).toContainText('Saved 2-1');
  await demo.getByRole('button', { name: 'Undo' }).click();
  await expect(status).toHaveText('Pick removed');
  await expect(goals).toHaveText(['0', '0']);
  await demo.getByRole('button', { name: /Surprise me/ }).click();
  await page.clock.runFor(1200);
  await expect(status).toContainText(/Saved \d-\d/);
});

/* ---------- Films ---------- */

test('the reel steps through films, plays, and shows a player', async ({ page }) => {
  await page.goto('/#/films');
  const clips = page.locator('[data-clip]');
  const count = await clips.count();
  expect(count).toBeGreaterThan(1);
  await expect(clips.nth(0)).toHaveClass(/is-active/);
  await expect(page.locator('[data-timecode]')).toHaveText('00:00:00:00');

  await page.locator('[data-reel-next]').click();
  await expect(clips.nth(1)).toHaveClass(/is-active/);
  await expect(page.locator('[data-reel-label]')).toContainText(await clips.nth(1).getAttribute('data-label'));
  await expect(page.locator('[data-timecode]')).not.toHaveText('00:00:00:00');
  await page.locator('[data-reel-prev]').click();
  await expect(clips.nth(0)).toHaveClass(/is-active/);

  const toggle = page.locator('[data-reel-toggle]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-label', 'Pause reel');
  await expect(page.locator('[data-timecode]')).not.toHaveText('00:00:00:00');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-label', 'Play reel');

  await clips.nth(0).click();
  await page.locator('[data-reel-filmplay]').click();
  await expect(page.locator('[data-reel-player] .placeholder-player, [data-reel-player] iframe')).toHaveCount(1);
  await page.goto('/#/about');
  await page.goto('/#/films');
  await expect(page.locator('[data-reel-player] > *')).toHaveCount(0);
});

test('a playing film fills the whole screen of the viewer', async ({ page }) => {
  await page.goto('/#/films');
  await page.locator('[data-reel-filmplay]').click();
  const player = page.locator('[data-reel-player]');
  await expect(player.locator('.placeholder-player, iframe')).toHaveCount(1);
  await settled(page.locator('.viewer')); // the viewer slides in when the page opens
  const box = await player.boundingBox();
  const screen = await page.locator('.viewer__screen').boundingBox();
  for (const k of ['x', 'y', 'width', 'height']) expect(Math.abs(box[k] - screen[k]), k).toBeLessThanOrEqual(1);
});

/* Answers the film player with a page that keeps every command the site sends it. */
async function recordingPlayer(page) {
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.fulfill({
    status: 200, contentType: 'text/html',
    body: '<script>window.__got = []; addEventListener("message", function (e) { try { window.__got.push(JSON.parse(e.data).func); } catch (x) {} });</script>'
  }));
  return async () => {
    const frame = page.frames().find((f) => f.url().includes('youtube-nocookie.com/embed/'));
    return frame ? frame.evaluate(() => window.__got) : [];
  };
}

test('playing a film turns the sound on, and the switch mutes and unmutes the film', async ({ page }) => {
  const got = await recordingPlayer(page);
  await page.goto('/#/films');
  const sw = page.locator('.transport [data-sound]');
  await expect(sw).toHaveAccessibleName('SOUND OFF');
  await page.locator('[data-reel-filmplay]').click();
  await expect(sw).toHaveAccessibleName('SOUND ON');
  await expect(page.locator('[data-reel-player] iframe')).toHaveAttribute('src', /enablejsapi=1/);
  await expect.poll(got).toContain('unMute');
  await sw.click();
  await expect(sw).toHaveAccessibleName('SOUND OFF');
  await expect.poll(async () => (await got()).at(-1)).toBe('mute');
  await sw.click();
  await expect.poll(async () => (await got()).at(-1)).toBe('unMute');
});

test('the switch on the desk and the one on the Films page are the same switch', async ({ page }) => {
  await page.goto('/#/');
  await page.locator('.monitor [data-sound]').click();
  await page.goto('/#/films');
  await expect(page.locator('.transport [data-sound]')).toHaveAccessibleName('SOUND ON');
  await page.locator('.transport [data-sound]').click();
  await page.goto('/#/');
  await expect(page.locator('.monitor [data-sound]')).toHaveAccessibleName('SOUND OFF');
});

test('#/films/<id> opens the reel on that film', async ({ page }) => {
  await page.goto('/#/films');
  const last = page.locator('[data-clip]').last();
  const id = await last.getAttribute('data-id');
  await page.goto('/#/films/' + id);
  await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'films');
  await expect(page.locator('[data-clip][data-id="' + id + '"]')).toHaveClass(/is-active/);
});

/* ---------- Share links ---------- */

test('share links land on the right page', async ({ page }) => {
  await page.goto('/w/toto/');
  await expect(page).toHaveURL(/\/#\/work\/toto$/);
  await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'work-toto');
  await page.goto('/f/the-last-warning/');
  await expect(page).toHaveURL(/\/#\/films\/the-last-warning$/);
  await expect(page.locator('[data-clip][data-id="the-last-warning"]')).toHaveClass(/is-active/);
});

/* ---------- Admin ---------- */

test('the admin opens on its sign-in screen', async ({ page }) => {
  await page.goto('/admin/');
  await expect(page.locator('#username')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
});

test('the rescue page opens', async ({ page }) => {
  await page.goto('/admin/rescue.html');
  await expect(page.locator('body')).not.toBeEmpty();
  await expect(page).toHaveTitle(/Rescue/);
});

/* ---------- Logs ---------- */

test('the console stays quiet for visitors, and ?debug turns the logs on, in the demos too', async ({ page }) => {
  const infos = [];
  page.on('console', (m) => { if (m.type() === 'info') infos.push(m.text()); });
  await page.goto('/#/work/memesh');
  await expect(page.locator('.page.is-active')).toHaveAttribute('data-page', 'work-memesh');
  await page.waitForLoadState('networkidle');
  expect(infos, 'no logs without ?debug').toEqual([]);

  await page.goto('/?debug#/work/memesh');
  await expect.poll(() => infos.some((t) => t.startsWith('[site replica]'))).toBe(true);
  if (!isNarrow(page)) {
    await expect(page.locator('.page.is-active .replica__frame')).toHaveAttribute('src', 'demos/memesh/?debug');
    await expect.poll(() => infos.some((t) => t.startsWith('[mm-demo '))).toBe(true);
  }
});
