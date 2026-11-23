// Records the example video and poster for each replica by driving it in a real browser.
// The video shows only the replica's made-up data, so nothing real can end up in it.
//   cd tests && npm run record:demos      (needs ffmpeg on the PATH)
//   cd tests && npm run record:demos -- toto-mundial    (just one demo)
// Writes demos/<name>/demo.mp4 and demos/<name>/poster.jpg. Commit both.
import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4174;

function log(msg, values) { console.log('[record] ' + msg, values ? JSON.stringify(values) : ''); }

/* ---------- Mega Uploader: the three best moments from the UI tour ---------- */

async function megaUploader(page, mark) {
  const pause = (ms) => page.waitForTimeout(ms);
  const point = async (target, opts = {}) => {
    const box = await target.boundingBox();
    await page.mouse.move(box.x + box.width * (opts.x ?? 0.5), box.y + box.height / 2, { steps: opts.steps ?? 24 });
    await pause(opts.wait ?? 260);
  };
  const click = async (target, opts) => { await point(target, opts); await target.click(); };
  const dataItem = async (label) => {
    await click(page.locator('[data-tool="data"]'));
    await pause(350);
    await click(page.locator('.menu__item', { hasText: label }), { x: 0.3 });
  };

  await page.mouse.move(720, 450);
  await pause(1600);

  /* 1. The grid fills itself and the red cells clear. */
  await dataItem('Fill example data');
  await pause(2200);
  await dataItem('Auto-fill creatives');
  await pause(2000);
  await dataItem('Auto-generate headlines');
  await pause(2000);
  const grid = page.locator('.grid-scroll');
  await point(grid, { wait: 200 });
  for (let i = 0; i < 8; i++) { await page.mouse.wheel(260, 0); await pause(90); }
  await pause(1500);
  for (let i = 0; i < 8; i++) { await page.mouse.wheel(-260, 0); await pause(60); }
  await pause(500);
  await click(page.locator('[data-tool="resolve"]'));
  await pause(2200);

  /* 2. Run live: confirm, then the log streams and rows turn green (one fails on policy). */
  await click(page.locator('[data-tool="run"]'));
  await pause(1400);
  await click(page.locator('.btn--danger-solid'));
  await page.locator('[data-tool="open-run"]').waitFor({ timeout: 60000 });
  await pause(1200);
  await mark('poster');

  /* 3. Run history: the new run, its failure, and an upload trace. */
  await click(page.locator('[data-tool="open-run"]'));
  await pause(1600);
  await click(page.locator('.tile', { hasText: 'FAILED' }));
  await pause(900);
  await click(page.locator('.crow__main').first(), { x: 0.3 });
  await pause(2600);
  await click(page.locator('.tile', { hasText: 'LIVE' }));
  await pause(700);
  await click(page.locator('.crow__main').first(), { x: 0.3 });
  await pause(2600);

  /* The dashboard, to close. */
  await click(page.locator('.nav__item', { hasText: 'Dashboard' }).first());
  await pause(2400);
}

/* ---------- Toto Mundial: a phone app, recorded at phone size ---------- */

async function totoMundial(page, mark) {
  const pause = (ms) => page.waitForTimeout(ms);
  const tap = async (target, opts = {}) => {
    const box = await target.boundingBox();
    await page.mouse.move(box.x + box.width * (opts.x ?? 0.5), box.y + box.height / 2, { steps: 18 });
    await pause(opts.wait ?? 220);
    await target.click();
  };
  const scroll = async (dy, steps = 8) => {
    await page.mouse.move(195, 420);
    for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await pause(40); }
  };

  await page.mouse.move(195, 600);
  await pause(800);
  await mark('poster');
  await pause(1600);

  /* 1. Home says a match locks soon; one tap opens the pick. + and - set it, and it saves by itself. */
  await scroll(520);
  await pause(1400);
  await tap(page.locator('[data-upnext]'));
  await pause(1200);
  const brazil = page.locator('[data-match="u1"]');
  await tap(brazil.locator('[data-step="0:1"]'), { wait: 160 });
  await tap(brazil.locator('[data-step="0:1"]'), { wait: 160 });
  await tap(brazil.locator('[data-step="1:1"]'), { wait: 160 });
  await page.locator('[data-match="u1"] .save--saved').waitFor();
  await pause(1500);
  await tap(page.locator('[data-match="u2"] [data-dice]'));
  await page.locator('[data-match="u2"] .save--saved').waitFor();
  await pause(1400);

  /* 2. Past results with the points they earned. */
  await tap(page.locator('[data-tab-id="time-past"]'));
  await pause(1200);
  await scroll(360);
  await pause(1600);

  /* 3. The leaderboard: the pot split, the Monkey, and your own row opened up. */
  await tap(page.locator('[data-tab="leaders"]'));
  await pause(1200);
  await scroll(700, 12);
  await pause(1200);
  await scroll(520, 10);
  await pause(600);
  await tap(page.locator('[data-person="me"] .lb__main'), { x: 0.4 });
  await pause(2400);

  /* 4. Live: the match runs, a goal goes in, and "Right now" turns from +5 into +10. */
  await tap(page.locator('[data-tab="live"]'));
  await page.locator('[data-projected]', { hasText: '+10' }).waitFor({ timeout: 30000 });
  await pause(2600);

  /* 5. The same app in Hebrew, right to left. */
  await tap(page.locator('[data-lang-toggle]'));
  await pause(1600);
  await tap(page.locator('[data-tab="home"]'));
  await pause(2600);
}

/* ---------- Memesh: one story across the three apps ---------- */

async function memesh(page, mark) {
  const pause = (ms) => page.waitForTimeout(ms);
  const click = async (target, opts = {}) => {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    await page.mouse.move(box.x + box.width * (opts.x ?? 0.5), box.y + box.height / 2, { steps: 22 });
    await pause(opts.wait ?? 240);
    await target.click();
  };

  await page.mouse.move(720, 450);
  await pause(1800);

  /* 1. The parent books tonight's evening round from a punch card. */
  await click(page.locator('[data-book]').first());
  await pause(1400);
  await click(page.locator('[data-round="evening"]'));
  await pause(700);
  await click(page.locator('.stepper-row .step').last());
  await pause(500);
  await click(page.locator('.companion input'));
  await pause(1100);
  await click(page.locator('[data-confirm]'));
  await pause(1300);
  await click(page.locator('.rule__head').nth(1), { x: 0.6 });
  await pause(1400);
  await click(page.locator('[data-rules-ok]'));
  await pause(2600);

  /* 2. At the desk: hold that ticket to the camera and confirm the entry. */
  await click(page.locator('[data-role="desk"]'));
  await pause(1600);
  await click(page.locator('[data-tile="scan"]'));
  await pause(1300);
  await click(page.locator('[data-hold^="R-"]'));
  await pause(1500);
  await click(page.locator('[data-checkin]'));
  await pause(1600);
  await click(page.locator('[data-dtab="rounds"]'));
  await pause(900);
  await click(page.locator('[data-arrivals="evening"]'));
  await pause(2200);

  /* 3. The manager's dashboard: the round fills, a walk-in is added by hand, the feed shows it all. */
  await click(page.locator('[data-role="manager"]'));
  await pause(1500);
  await mark('poster');
  await click(page.locator('[data-manage="evening"]'));
  await pause(1000);
  await click(page.locator('[data-add]'));
  await pause(500);
  await page.keyboard.type('Yon', { delay: 120 });
  await pause(700);
  await click(page.locator('[data-pick]').first());
  await pause(1800);
  await page.mouse.move(720, 600, { steps: 10 });
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 120); await pause(70); }
  await pause(2200);
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 120); await pause(70); }
  await pause(2400);

  /* 4. The same system in English. */
  await click(page.locator('[data-lang-toggle]'));
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(2600);
}

/* view is the page size; scale makes the frames sharper; width is the video's width. */
const DEMOS = [
  { name: 'mega-uploader', run: megaUploader, view: { width: 1440, height: 900 }, scale: 4 / 3, width: 1440, pointer: '.rec-cursor' },
  { name: 'toto-mundial', run: totoMundial, view: { width: 390, height: 844 }, scale: 2, width: 780, pointer: '.rec-pointer' },
  { name: 'memesh', run: memesh, view: { width: 1440, height: 900 }, scale: 4 / 3, width: 1440, pointer: '.rec-cursor' }
];
const ONLY = process.argv.slice(2);

/* ---------- Recording ---------- */

async function record(browser, demo) {
  const dir = join(ROOT, 'demos', demo.name);
  const frames = await mkdtemp(join(tmpdir(), 'demo-frames-'));
  const page = await browser.newPage({ viewport: demo.view, deviceScaleFactor: demo.scale });
  page.on('pageerror', (e) => { throw e; });
  await page.goto('http://127.0.0.1:' + PORT + '/demos/' + demo.name + '/?record');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  const cdp = await page.context().newCDPSession(page);
  const shots = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    shots.push({ data, t: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: Math.round(demo.view.width * demo.scale), maxHeight: Math.round(demo.view.height * demo.scale) });

  await demo.run(page, async (what) => {
    if (what === 'poster') {
      const pointer = page.locator(demo.pointer);
      await pointer.evaluate((el) => { el.style.visibility = 'hidden'; });
      await page.screenshot({ path: join(dir, 'poster.jpg'), type: 'jpeg', quality: 80, scale: 'css' });
      await pointer.evaluate((el) => { el.style.visibility = ''; });
      log('poster written', { demo: demo.name });
    }
  });
  await cdp.send('Page.stopScreencast');
  await page.close();

  /* Each frame lasts until the next one arrived; ffmpeg turns that into a steady 30 fps video. */
  const list = [];
  for (let i = 0; i < shots.length; i++) {
    const name = 'f' + String(i).padStart(5, '0') + '.jpg';
    await writeFile(join(frames, name), Buffer.from(shots[i].data, 'base64'));
    const next = shots[i + 1] ? shots[i + 1].t : shots[i].t + 1;
    list.push("file '" + name + "'", 'duration ' + Math.max(0.001, next - shots[i].t).toFixed(4));
  }
  list.push("file 'f" + String(shots.length - 1).padStart(5, '0') + ".jpg'");
  await writeFile(join(frames, 'list.txt'), list.join('\n'));
  log('frames captured', { demo: demo.name, frames: shots.length, seconds: Math.round(shots[shots.length - 1].t - shots[0].t) });

  const out = join(dir, 'demo.mp4');
  const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'list.txt',
    '-fps_mode', 'cfr', '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p',
    '-vf', 'scale=' + demo.width + ':-2', '-movflags', '+faststart', '-an', out], { cwd: frames, stdio: 'inherit' });
  await rm(frames, { recursive: true, force: true });
  if (ff.status !== 0) throw new Error('ffmpeg failed for ' + demo.name);
  log('video written', { demo: demo.name, path: out, bytes: (await stat(out)).size });
}

const server = spawn(process.execPath, [join(ROOT, 'tests', 'serve.mjs'), String(PORT)], { stdio: 'ignore' });
try {
  await new Promise((r) => setTimeout(r, 600));
  const browser = await chromium.launch();
  for (const demo of DEMOS) if (!ONLY.length || ONLY.includes(demo.name)) await record(browser, demo);
  await browser.close();
} finally {
  server.kill();
}
