// Browser tests: the built site at the three widths from CLAUDE.md (phone, tablet, laptop).
// Build first: node ../tools/build-site.mjs  (npm run test:browser does both)
import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'browser',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4, // more at once made the admin tests time out on busy machines
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:' + PORT,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true } },
    { name: 'laptop', use: { viewport: { width: 1180, height: 800 } } }
  ],
  webServer: {
    command: 'node serve.mjs ' + PORT,
    url: 'http://127.0.0.1:' + PORT + '/index.html',
    reuseExistingServer: !process.env.CI
  }
});
