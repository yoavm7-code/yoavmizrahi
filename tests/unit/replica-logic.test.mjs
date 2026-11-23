// The Mega Uploader replica's rules (demos/mega-uploader/js/logic.js) and its made-up data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../../demos/mega-uploader/js/data.js';
import * as L from '../../demos/mega-uploader/js/logic.js';

const NOW = new Date(2026, 10, 23, 12, 0, 0);
const ctx = { platform: 'facebook', now: NOW };

function filledGrid(n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    let r = L.exampleRow(L.blankRow(), i);
    r.asset = L.autoAsset(r);
    r.headline = L.autoHeadline(r, i, NOW);
    rows.push(r);
  }
  return rows;
}

/* ---------- The data adds up ---------- */

test('dashboard launches add up: launched = live + failed, rate = live / launched', () => {
  const t = L.launchTotals(D.DASHBOARD);
  assert.equal(t.live, D.DASHBOARD.launched.reduce((a, p) => a + p.live, 0));
  assert.equal(t.failed, D.DASHBOARD.launched.reduce((a, p) => a + p.failed, 0));
  assert.equal(t.launched, t.live + t.failed);
  assert.equal(t.rate, Math.round(t.live / t.launched * 1000) / 10);
  assert.deepEqual(L.launchTotals({ launched: [] }), { launched: 0, live: 0, failed: 0, rate: 0 });
});

test('the dashboard shows no money: nothing about spend, revenue or profit', () => {
  assert.deepEqual(Object.keys(D.DASHBOARD).filter((k) => /spend|revenue|profit|roas/i.test(k)), []);
});

test('dashboard counts come from the lists they summarise', () => {
  const k = L.dashboardKpis(D.DASHBOARD);
  assert.equal(k.creatives, D.DASHBOARD.creativesByBrand.reduce((a, x) => a + x.value, 0));
  assert.equal(k.accounts, D.DASHBOARD.platformRows.reduce((a, x) => a + x.accounts, 0));
  assert.equal(k.platforms, D.DASHBOARD.platformRows.length);
});

test('every run\'s live and failed add up to its campaigns', () => {
  for (const r of D.RUNS) assert.equal(r.live + r.failed, r.campaigns, '#' + r.id);
  assert.equal(new Set(D.RUNS.map((r) => r.id)).size, D.RUNS.length, 'run ids are unique');
});

test('ids are unique and every platform the data mentions exists', () => {
  assert.equal(new Set(D.PLATFORMS.map((p) => p.id)).size, D.PLATFORMS.length);
  assert.equal(new Set(D.BRANDS.map((b) => b.id)).size, D.BRANDS.length);
  assert.ok(D.BRANDS.some((b) => b.id === D.WORKSPACE.brand), 'the workspace brand exists');
  assert.ok(D.PLATFORMS.some((p) => p.id === D.WORKSPACE.platform), 'the workspace platform exists');
  const brands = D.BRANDS.map((b) => b.name);
  for (const r of D.RUNS) assert.ok(brands.includes(r.brand), '#' + r.id + ' ' + r.brand);
  const ids = D.PLATFORMS.map((p) => p.id);
  for (const id of [...D.DASHBOARD.launched.map((p) => p.platform), ...D.DASHBOARD.platformRows.map((p) => p.platform), ...D.RUNS.map((r) => r.platform)]) {
    assert.ok(ids.includes(id), id);
  }
});

/* ---------- Grid rules ---------- */

test('column letters run A..Z, then AA', () => {
  assert.equal(L.columnLetter(0), 'A');
  assert.equal(L.columnLetter(25), 'Z');
  assert.equal(L.columnLetter(26), 'AA');
  assert.equal(L.COLUMNS.length, 20);
});

test('a row is ready only when every required column is filled', () => {
  const r = L.blankRow();
  assert.equal(L.isReady(r), false);
  assert.deepEqual(L.missing(r), ['Geo', 'Landing page', 'Product ID', 'Image', 'Headline']);
  Object.assign(r, { geo: 'US', url: 'https://brand.example/x', product: '1', asset: 'img-x', headline: '   ' });
  assert.equal(L.isReady(r), false, 'whitespace does not count');
  r.headline = 'Hi';
  assert.equal(L.isReady(r), true);
  assert.deepEqual(L.missing(r), []);
});

test('a blank row counts as blank even with its default selects', () => {
  assert.equal(L.isBlank(L.blankRow()), true);
  assert.equal(L.isBlank(Object.assign(L.blankRow(), { notes: 'x' })), false);
});

test('campaign names read as geo, vertical, date and a row number', () => {
  const r = Object.assign(L.blankRow(), { geo: 'DE', vertical: 'Meal Kits' });
  assert.equal(L.campaignName(r, 7, NOW), 'DE · Meal Kits · 23 Nov · #7');
  assert.equal(L.campaignName(L.blankRow(), 7, NOW), '', 'no geo, no name yet');
  assert.equal(L.campaignName(Object.assign(L.blankRow(), { geo: 'US' }), 2, NOW), 'US · General · 23 Nov · #2');
  assert.equal(L.cellValue(r, 'name', ctx), 'DE · Meal Kits · 23 Nov · #' + r.id);
});

test('two rows with the same geo and vertical still get different names', () => {
  const names = L.planRun(filledGrid(20), ctx).map((p) => p.name);
  assert.equal(new Set(names).size, names.length);
});

test('Auto accounts are picked by region, a chosen account is kept', () => {
  assert.equal(L.accountFor({ geo: 'US', account: 'Auto' }), 'North America 1');
  assert.equal(L.accountFor({ geo: 'IT', account: 'Auto' }), 'Europe 2');
  assert.equal(L.accountFor({ geo: 'DE', account: 'APAC 1' }), 'APAC 1');
  assert.equal(L.accountFor({ geo: '', account: 'Auto' }), D.ACCOUNTS[1], 'no geo falls back to the first real account');
  for (const geo of D.GEOS) assert.ok(D.ACCOUNTS.includes(D.REGIONS[geo]), geo);
});

test('tracking links fill Link ID and Tracked link, the same way every time', () => {
  const r = Object.assign(L.blankRow(), { geo: 'US', url: 'https://brand.example/a', product: '77' });
  assert.equal(L.canResolve(r), true);
  const a = L.resolveFields(r);
  assert.deepEqual(a, L.resolveFields(r));
  assert.deepEqual(Object.keys(a), L.RESOLVED);
  assert.match(a.linkId, /^[a-z0-9]{6}$/);
  assert.equal(a.link, 'https://go.brand.example/' + a.linkId);
  Object.assign(r, a);
  assert.equal(L.canResolve(r), false, 'a row with a link does not get a second one');
});

test('placeholders and grammar fixes', () => {
  assert.equal(L.fillPlaceholders('Best of {year} in {city}', NOW), 'Best of 2026 in your area');
  assert.equal(L.hasPlaceholders('a {city}'), true);
  assert.equal(L.hasPlaceholders('plain'), false);
  assert.equal(L.fixGrammar('  hello   world '), 'Hello world');
  assert.equal(L.fixGrammar(''), '');
});

/* ---------- Run live ---------- */

test('a filled 20-row example grid runs 20 campaigns with exactly one policy failure', () => {
  const rows = filledGrid(20);
  assert.ok(rows.every(L.isReady));
  const plan = L.planRun(rows, ctx);
  assert.equal(plan.length, 20);
  const failed = plan.filter((p) => !p.ok);
  assert.equal(failed.length, 1);
  assert.equal(failed[0].row.vertical, 'Credit Cards');
  assert.equal(failed[0].error, D.FAILURES.financial);
  assert.equal(failed[0].lines.at(-1).bad, true);
  const ok = plan.find((p) => p.ok);
  assert.deepEqual(ok.lines.map((l) => l.step), ['tracking link', 'campaign', 'creatives', 'summary']);
  assert.match(ok.lines.at(-1).msg, /^Live: campaign [0-9a-f]{12} in [A-Z]{2}, 1 ad /);
  assert.deepEqual(failed[0].lines.map((l) => l.step), ['tracking link', 'policy check', 'summary']);
});

test('rows that are not ready, or already live, are left out of a run', () => {
  const rows = filledGrid(3);
  rows[0].status = 'live';
  rows[1].headline = '';
  const plan = L.planRun(rows, ctx);
  assert.deepEqual(plan.map((p) => p.rowId), [rows[2].id]);
  assert.deepEqual(L.planRun([], ctx), []);
});

test('the run summary counts geos, accounts and budget', () => {
  const rows = filledGrid(4);
  rows[0].budget = '';
  const s = L.runSummary(L.planRun(rows, ctx));
  assert.equal(s.campaigns, 4);
  assert.equal(s.live + s.failed, 4);
  assert.deepEqual(s.geos, [...new Set(rows.map((r) => r.geo))]);
  assert.equal(s.budget, 20 + rows.slice(1).reduce((a, r) => a + Number(r.budget), 0), 'an empty budget counts as the default 20');
});

test('a finished plan becomes a history run with its own campaigns', () => {
  const plan = L.planRun(filledGrid(20), ctx);
  const run = L.runFromPlan(plan, { id: 9999, platform: 'facebook', brand: 'Brightside Home', user: 'dana', workspace: 41, took: '12s', now: NOW });
  assert.equal(run.campaigns, 20);
  assert.equal(run.live, 19);
  assert.equal(run.failed, 1);
  assert.equal(L.runStatus(run), 'partial');
  assert.equal(run.time, '12:00');
  assert.equal(L.runCampaigns(run, NOW), run.items);
  assert.equal(run.items.filter((c) => !c.ok).length, 1);
  assert.equal(run.brand, 'Brightside Home');
  assert.ok(run.items.every((c) => c.trace.length === (c.ok ? 4 : 3)));
  assert.ok(run.items.filter((c) => c.ok).every((c) => c.account && c.linkId && c.landing));
});

/* ---------- Run history ---------- */

test('run status: all failed, some failed, none failed', () => {
  assert.equal(L.runStatus({ campaigns: 3, live: 0, failed: 3 }), 'failed');
  assert.equal(L.runStatus({ campaigns: 3, live: 2, failed: 1 }), 'partial');
  assert.equal(L.runStatus({ campaigns: 3, live: 3, failed: 0 }), 'succeeded');
});

test('seeded runs list the right number of campaigns and failures, the same way every time', () => {
  for (const r of D.RUNS) {
    const items = L.runCampaigns(r, NOW);
    assert.equal(items.length, r.campaigns, '#' + r.id);
    assert.equal(items.filter((c) => !c.ok).length, r.failed, '#' + r.id);
    assert.deepEqual(items, L.runCampaigns(r, NOW));
    assert.ok(items.every((c) => c.ok ? /^[0-9a-f]{12}$/.test(c.campaignId) && c.account : !c.campaignId && c.error), '#' + r.id);
  }
});

test('history filters and sorts', () => {
  const runs = D.RUNS;
  const first = runs[0];
  assert.deepEqual(L.filterRuns(runs, { q: '#' + first.id }, NOW).map((r) => r.id), [first.id]);
  assert.ok(L.filterRuns(runs, { platform: 'google' }, NOW).every((r) => r.platform === 'google'));
  assert.ok(L.filterRuns(runs, { result: 'none' }, NOW).every((r) => r.live === 0));
  assert.ok(L.filterRuns(runs, { result: 'failures' }, NOW).every((r) => r.failed > 0));
  assert.ok(L.filterRuns(runs, { status: 'succeeded' }, NOW).every((r) => r.failed === 0));
  assert.ok(L.filterRuns(runs, { time: 'today' }, NOW).every((r) => r.daysAgo === 0));
  assert.ok(L.filterRuns(runs, { time: '7d' }, NOW).every((r) => r.daysAgo <= 6));
  assert.ok(L.filterRuns(runs, { mode: 'live' }, NOW).every((r) => r.live > 0));
  assert.deepEqual(L.filterRuns(runs, { q: 'no such thing' }, NOW), []);
  const byFailed = L.sortRuns(runs, 'failed');
  assert.ok(byFailed[0].failed >= byFailed.at(-1).failed);
  const newest = L.sortRuns(runs, 'newest');
  assert.ok(newest.every((r, i) => i === 0 || newest[i - 1].daysAgo <= r.daysAgo));
  assert.deepEqual(L.sortRuns(runs, 'oldest').map((r) => r.id), newest.map((r) => r.id).reverse());
  assert.equal(L.dayGroup(0), 'TODAY');
  assert.equal(L.dayGroup(1), 'YESTERDAY');
  assert.equal(L.dayGroup(3), '3 DAYS AGO');
});

/* ---------- Formatting and CSV ---------- */

test('numbers and dates format the same way everywhere', () => {
  assert.equal(L.fmtInt(84615), '84,615');
  assert.equal(L.dateLabel(0, NOW), '23.11.2026');
  assert.equal(L.dateLabel(23, NOW), '31.10.2026');
  assert.equal(L.shortDate(2, NOW), '21 Nov');
});

test('CSV quotes what needs quoting and defuses spreadsheet formulas', () => {
  assert.equal(L.csvCell('plain'), 'plain');
  assert.equal(L.csvCell('a,b'), '"a,b"');
  assert.equal(L.csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(L.csvCell('two\nlines'), '"two\nlines"');
  assert.equal(L.csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(L.csvCell('+1'), '\'+1');
  assert.equal(L.csvCell('@cmd'), '\'@cmd');
  assert.equal(L.csvCell(null), '');
  assert.equal(L.toCsv(['A', 'B'], [[1, 'x,y']]), 'A,B\r\n1,"x,y"\r\n');
});
