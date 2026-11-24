// Makes the link preview pictures (1200 x 630, what chat apps and social sites show for a shared link).
//   cd tests && npm run share:images
// Writes share.jpg (the desk, for the home page) and demos/toto-mundial/share.jpg (the phone replica
// standing on the desk, since its own poster is tall and would be cropped to a sliver). Commit both.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4175;
const BASE = 'http://127.0.0.1:' + PORT + '/';
const SIZE = { width: 1200, height: 630 };

function log(msg, values) { console.log('[share] ' + msg, values ? JSON.stringify(values) : ''); }

/* The desk as a visitor first sees it, drawn at 1600 x 840 and scaled down so every object fits. */
async function home(browser) {
  const scale = SIZE.width / 1600;
  const page = await browser.newPage({ viewport: { width: 1600, height: 840 }, deviceScaleFactor: scale });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(BASE + '#/');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const path = join(ROOT, 'share.jpg');
  await page.screenshot({ path, type: 'jpeg', quality: 86 });
  log('written', { path });
  await page.close();
}

/* Toto Mundial: its title on the left, the replica's poster in a phone on the right, on the desk. */
async function toto(browser) {
  const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head>
<link rel="stylesheet" href="${BASE}css/style.css">
<style>
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  .share-card { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 110px 0 96px; }
  .share-text { display: flex; flex-direction: column; gap: 22px; max-width: 560px; }
  .title { font-family: var(--display); font-weight: 800; font-size: 92px; line-height: .92; letter-spacing: -0.04em; color: var(--ink); margin: 0; }
  .lead { font-family: var(--body); font-size: 26px; line-height: 1.35; color: var(--ink-3); margin: 0; }
  .site { font-family: var(--mono); font-size: 15px; letter-spacing: .14em; color: var(--muted); }
  .handset { width: 286px; padding: 11px; border-radius: 44px; background: var(--ink); border: 1px solid var(--ink-line); transform: rotate(2.5deg); filter: drop-shadow(0 22px 26px rgba(0,0,0,.22)); }
  .handset img { display: block; width: 100%; border-radius: 34px; }
</style></head><body>
<div class="share-card grid-surface">
  <div class="share-text">
    <span class="label label--accent">02 · WEB APP</span>
    <h1 class="title">Toto Mundial</h1>
    <p class="lead">A World Cup prediction pool for friends. Pick the scores, and the table settles the arguments.</p>
    <span class="site">YOAVMIZRAHI.COM</span>
  </div>
  <div class="handset"><img src="${BASE}demos/toto-mundial/poster.jpg" alt=""></div>
</div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const path = join(ROOT, 'demos', 'toto-mundial', 'share.jpg');
  await page.screenshot({ path, type: 'jpeg', quality: 86 });
  log('written', { path });
  await page.close();
}

const server = spawn(process.execPath, [join(ROOT, 'tests', 'serve.mjs'), String(PORT)], { stdio: 'ignore' });
try {
  await new Promise((r) => setTimeout(r, 600));
  const browser = await chromium.launch();
  await home(browser);
  await toto(browser);
  await browser.close();
} finally {
  server.kill();
}
