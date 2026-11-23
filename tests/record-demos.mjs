// Records the example video and poster for each replica by driving it in a real browser.
// The video shows only the replica's made-up data, so nothing real can end up in it.
//   cd tests && npm run record:demos      (needs ffmpeg on the PATH)
// Writes demos/<name>/demo.mp4 and demos/<name>/poster.jpg. Commit both.
import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4174;
const VIEW = { width: 1440, height: 900 };
const SCALE = 4 / 3; /* frames come out at 1920 x 1200 */

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

const DEMOS = [{ name: 'mega-uploader', run: megaUploader }];

/* ---------- Recording ---------- */

async function record(browser, demo) {
  const dir = join(ROOT, 'demos', demo.name);
  const frames = await mkdtemp(join(tmpdir(), 'demo-frames-'));
  const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: SCALE });
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
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1200 });

  await demo.run(page, async (what) => {
    if (what === 'poster') {
      const pointer = page.locator('.rec-cursor');
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
    '-vf', 'scale=1440:-2', '-movflags', '+faststart', '-an', out], { cwd: frames, stdio: 'inherit' });
  await rm(frames, { recursive: true, force: true });
  if (ff.status !== 0) throw new Error('ffmpeg failed for ' + demo.name);
  log('video written', { demo: demo.name, path: out, bytes: (await stat(out)).size });
}

const server = spawn(process.execPath, [join(ROOT, 'tests', 'serve.mjs'), String(PORT)], { stdio: 'ignore' });
try {
  await new Promise((r) => setTimeout(r, 600));
  const browser = await chromium.launch();
  for (const demo of DEMOS) await record(browser, demo);
  await browser.close();
} finally {
  server.kill();
}
