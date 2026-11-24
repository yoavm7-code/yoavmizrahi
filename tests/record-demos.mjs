// Records the example video and poster for each replica by driving it in a real browser.
// The video shows only the replica's made-up data, so nothing real can end up in it.
//   cd tests && npm run record:demos      (needs ffmpeg on the PATH)
//   cd tests && npm run record:demos -- toto-mundial    (just one demo)
// Writes demos/<name>/demo.mp4 and demos/<name>/poster.jpg (plus its smaller copies, see posters.mjs). Commit them all.
import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makePosterSizes } from './posters.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4174;

function log(msg, values) { console.log('[record] ' + msg, values ? JSON.stringify(values) : ''); }

/* ---------- Launch Desk: fill a batch, launch it, then read the launch ---------- */

async function launchDesk(page, mark) {
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

  /* 2. Launch: confirm, then the log streams and rows turn green (one fails on policy). */
  await click(page.locator('[data-tool="run"]'));
  await pause(1400);
  await click(page.getByRole('dialog').getByRole('button', { name: /^Launch · / }));
  await page.locator('[data-tool="open-run"]').waitFor({ timeout: 60000 });
  await pause(1200);
  await mark('poster');

  /* 3. Launches: the new launch, its failure, and a launch trace. */
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

  /* The overview, to close. */
  await click(page.locator('.topnav__tab', { hasText: 'Overview' }));
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
  await page.mouse.move(720, 420, { steps: 18 });
  await pause(1800);
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

/* ---------- LoreWire: from the streaming home page to a verdict ---------- */

async function lorewire(page, mark) {
  const pause = (ms) => page.waitForTimeout(ms);
  const click = async (target, opts = {}) => {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    await page.mouse.move(box.x + box.width * (opts.x ?? 0.5), box.y + box.height / 2, { steps: 22 });
    await pause(opts.wait ?? 260);
    await target.click();
  };
  const wheel = async (dy, steps = 10) => { for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await pause(60); } };

  await page.mouse.move(720, 300);
  await pause(800);
  await mark('poster');
  await pause(2200);

  /* 1. Home: the hero, then the rows and the Top 10. */
  await page.mouse.move(720, 600, { steps: 12 });
  await wheel(640);
  await pause(1800);

  /* 2. A story: key art, the debate, a vote, then the read-along. */
  await click(page.locator('[data-row="top"] [data-story]').nth(6));
  await pause(1800);
  const modal = page.locator('.modal');
  await modal.hover();
  for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 160); await pause(80); }
  await pause(900);
  await click(page.locator('[data-side="b"]'));
  await pause(2200);
  await click(page.locator('[data-tab="readalong"]'));
  await pause(600);
  await click(page.locator('[data-along-play]'));
  await pause(5200);
  await page.keyboard.press('Escape');
  await pause(900);

  /* 3. Wires: the vertical feed, a verdict in the mini poll, and the next wire. */
  await click(page.locator('[data-nav="wires"]'));
  await pause(4200);
  await click(page.locator('[data-mini="a"]'));
  await pause(1800);
  await click(page.locator('[data-wire-next]'));
  await pause(3800);

  /* 4. Browse by category. */
  await click(page.locator('[data-nav="browse"]'));
  await pause(1400);
  await click(page.locator('[data-cat="Wedding Drama"]'));
  await pause(2600);
}

/* ---------- Ad Radar: the gap, the ad, the trend, the board and a live scan ---------- */

async function adRadar(page, mark) {
  const pause = (ms) => page.waitForTimeout(ms);
  const to = async (target, opts = {}) => {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    await page.mouse.move(box.x + box.width * (opts.x ?? 0.5), box.y + box.height / 2, { steps: 22 });
    await pause(opts.wait ?? 240);
  };
  const click = async (target, opts) => { await to(target, opts); await target.click(); };

  await page.mouse.move(820, 420);
  await pause(800);
  await mark('poster');
  await pause(1800);

  /* 1. The gap: pick our site, show only what we're missing, longest running first. */
  await to(page.locator('[data-our-site]'));
  await page.locator('[data-our-site]').selectOption('ourhub.com');
  await pause(1400);
  await click(page.locator('[data-seg="cov:missing"]'));
  await pause(1300);
  await click(page.locator('[data-sort="days"]'));
  await pause(2000);

  /* 2. One ad: the copy, the competitor's article, then the Workflow. */
  await click(page.locator('tr[data-ad] td.col-headline').first());
  await pause(1600);
  await page.mouse.move(860, 520, { steps: 16 });
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 140); await pause(90); }
  await pause(900);
  await click(page.locator('[data-star]'));
  await pause(400);
  await click(page.locator('[data-status="idea"]'));
  await pause(500);
  await click(page.locator('[data-owner="rk"]'));
  await pause(400);
  await click(page.locator('[data-notes]'));
  await page.keyboard.type('Angle worth copying: a checklist, not a sales pitch.', { delay: 28 });
  await pause(500);
  await click(page.locator('[data-draft]'));
  await pause(2200);

  /* 3. Trends, then the board: drag a card from New to Idea. */
  await click(page.locator('[data-tab="trends"]'));
  await pause(2400);
  await click(page.locator('[data-tab="board"]'));
  await pause(1400);
  const card = page.locator('[data-col="new"] [data-card]').first();
  const target = page.locator('[data-col="idea"] .col__body');
  await to(card, { x: 0.4 });
  const from = await card.boundingBox();
  const drop = await target.boundingBox();
  await page.mouse.down();
  await page.mouse.move(drop.x + drop.width / 2, drop.y + 160, { steps: 40 });
  await pause(250);
  await page.mouse.up();
  await pause(2000);

  /* 4. Scans: scan now and watch new ads come in. */
  await click(page.locator('[data-tab="scans"]'));
  await pause(1000);
  await click(page.locator('[data-run]'));
  await pause(5200);
  await page.mouse.move(from.x + 300, 300, { steps: 16 });
  await pause(1600);
}

/* ---------- I.M Engineering: the hero, a project, the lead form and the accessibility panel ---------- */

async function imEng(page, mark) {
  const pause = (ms) => page.waitForTimeout(ms);
  const to = async (target, opts = {}) => {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    await page.mouse.move(box.x + box.width * (opts.x ?? 0.5), box.y + box.height / 2, { steps: 22 });
    await pause(opts.wait ?? 260);
  };
  const click = async (target, opts) => { await to(target, opts); await target.click(); };
  const wheel = async (dy, steps = 12) => { for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await pause(70); } };

  await page.mouse.move(700, 600);
  await pause(1200);
  await mark('poster');
  await pause(2400);

  /* 1. From the hero card to the projects, then one project with its gallery. */
  await click(page.locator('.hero__cta--float [data-cta="projects"]'));
  await pause(1800);
  await to(page.locator('[data-project="bbb-restaurant"]'));
  await pause(900);
  await to(page.locator('[data-project="factory-cafe-gindi-tlv"]'));
  await pause(700);
  await page.locator('[data-project="factory-cafe-gindi-tlv"]').click();
  await pause(1800);
  await page.mouse.move(720, 500, { steps: 12 });
  await wheel(900);
  await pause(1600);
  await wheel(700);
  await pause(900);
  await click(page.locator('[data-shot="0"]'));
  await pause(1400);
  await click(page.locator('[data-lb="next"]'));
  await pause(1300);
  await page.keyboard.press('Escape');
  await pause(700);

  /* 2. Contact: fill the form and send it (a demo: nothing is sent). */
  await click(page.locator('.rail [data-nav="contact"]'));
  await pause(1600);
  await click(page.locator('#lead-name'));
  await page.keyboard.type('דנה כהן', { delay: 60 });
  await click(page.locator('#lead-phone'));
  await page.keyboard.type('052-1234567', { delay: 45 });
  await click(page.locator('#lead-message'));
  await page.keyboard.type('מחפשים קבלן לעבודות גמר במשרד של 150 מ"ר.', { delay: 30 });
  await pause(400);
  await click(page.locator('[data-send]'));
  await pause(2600);

  /* 3. The accessibility panel: bigger text and high contrast, then back to normal. */
  await click(page.locator('[data-a11y-open]'));
  await pause(900);
  await click(page.locator('[data-size="up"]'));
  await pause(700);
  await click(page.locator('[data-a11y="contrast"]'));
  await pause(1300);
  await click(page.locator('[data-a11y-reset]'));
  await pause(700);
  await click(page.locator('[data-a11y-close]'));
  await pause(1200);
}

/* view is the page size; scale makes the frames sharper; width is the video's width. */
const DEMOS = [
  { name: 'launch-desk', run: launchDesk, view: { width: 1440, height: 900 }, scale: 4 / 3, width: 1440, pointer: '.rec-cursor' },
  { name: 'toto-mundial', run: totoMundial, view: { width: 390, height: 844 }, scale: 2, width: 780, pointer: '.rec-pointer' },
  { name: 'memesh', run: memesh, view: { width: 1440, height: 900 }, scale: 4 / 3, width: 1440, pointer: '.rec-cursor' },
  { name: 'lorewire', run: lorewire, view: { width: 1440, height: 900 }, scale: 4 / 3, width: 1440, pointer: '.rec-cursor' },
  { name: 'ad-radar', run: adRadar, view: { width: 1440, height: 900 }, scale: 4 / 3, width: 1440, pointer: '.rec-cursor' },
  { name: 'im-eng', run: imEng, view: { width: 1440, height: 900 }, scale: 4 / 3, width: 1440, pointer: '.rec-cursor' }
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
      makePosterSizes(demo.name);
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
