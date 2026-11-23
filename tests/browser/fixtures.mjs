// Shared browser test setup. Nothing leaves the machine: fonts, YouTube, GitHub and the login
// server are answered locally, so a network hiccup can never fail (or pass) a run. Console errors
// and page crashes fail the test, except messages a spec lists in allowedConsole.
import { test as base, expect } from '@playwright/test';

export { expect };

export const test = base.extend({
  allowedConsole: [[], { option: true }],
  page: async ({ page, allowedConsole }, use) => {
    const problems = [];
    page.on('pageerror', (e) => problems.push('page error: ' + e.message));
    page.on('console', (m) => {
      if (m.type() !== 'error' || allowedConsole.some((re) => re.test(m.text()))) return;
      problems.push('console error: ' + m.text());
    });
    await page.route((url) => url.hostname !== '127.0.0.1', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname.endsWith('workers.dev')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
      return route.fulfill({ status: 200, contentType: 'text/html', body: '' });
    });
    await use(page);
    expect(problems, 'the page logged errors').toEqual([]);
  }
});
