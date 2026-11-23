// The Mega Uploader replica's rules (demos/mega-uploader/js/logic.js) and its made-up data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../../demos/mega-uploader/js/data.js';
import * as L from '../../demos/mega-uploader/js/logic.js';

const NOW = new Date(2026, 10, 23, 12, 0, 0);
const ctx = { platform: 'outbrain', now: NOW };

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

test('dashboard money adds up: revenue = spend + profit, ROAS = revenue / spend', () => {
  const t = L.profitTotals(D.DASHBOARD);
  assert.equal(t.profit, Math.round(D.DASHBOARD.profit.reduce((a, p) => a + p.value, 0) * 100) / 100);
  assert.ok(Math.abs(t.revenue - (t.spend + t.profit)) < 0.005);
  assert.equal(t.roas, Math.round(t.revenue / t.spend * 100) / 100);
});

test('dashboard counts come from the lists they summarise', () => {
  const k = L.dashboardKpis(D.DASHBOARD);
  assert.equal(k.articles, D.DASHBOARD.libraryByFeed.reduce((a, x) => a + x.value, 0));
  assert.equal(k.accounts, D.DASHBOARD.platformRows.reduce((a, x) => a + x.accounts, 0));
  assert.equal(k.platforms, D.DASHBOARD.platformRows.length);
});

test('every run\'s live and failed add up to its campaigns', () => {
  for (const r of D.RUNS) assert.equal(r.live + r.failed, r.campaigns, '#' + r.id);
  assert.equal(new Set(D.RUNS.map((r) => r.id)).size, D.RUNS.length, 'run ids are unique');
});

test('ids are unique and every platform the data mentions exists', () => {
  assert.equal(new Set(D.PLATFORMS.map((p) => p.id)).size, D.PLATFORMS.length);
  assert.equal(new Set(D.FEEDS.map((f) => f.id)).size, D.FEEDS.length);
  const ids = D.PLATFORMS.map((p) => p.id);
  for (const id of [...D.DASHBOARD.profit.map((p) => p.platform), ...D.DASHBOARD.platformRows.map((p) => p.platform), ...D.RUNS.map((r) => r.platform)]) {
    assert.ok(ids.includes(id), id);
  }
});

/* ---------- Grid rules ---------- */

test('column letters run A..Z, then AA', () => {
  assert.equal(L.columnLetter(0), 'A');
  assert.equal(L.columnLetter(25), 'Z');
  assert.equal(L.columnLetter(26), 'AA');
  assert.equal(L.COLUMNS.length, 24);
});

test('a row is ready only when every required column is filled', () => {
  const r = L.blankRow();
  assert.equal(L.isReady(r), false);
  assert.deepEqual(L.missing(r), ['Geo', 'Website URL', 'Offer ID', 'Asset 1 URL', 'Headline']);
  Object.assign(r, { geo: 'US', url: 'https://read.example/x', offer: '1', asset: 'img-x', headline: '   ' });
  assert.equal(L.isReady(r), false, 'whitespace does not count');
  r.headline = 'Hi';
  assert.equal(L.isReady(r), true);
  assert.deepEqual(L.missing(r), []);
});

test('a blank row counts as blank even with its default selects', () => {
  assert.equal(L.isBlank(L.blankRow()), true);
  assert.equal(L.isBlank(Object.assign(L.blankRow(), { prefix: 'x' })), false);
});

test('campaign names follow prefix-geo-vertical-id-date-platform-strategy', () => {
  const r = Object.assign(L.blankRow(), { prefix: 'ab', geo: 'DE', vertical: 'Solar Panels', nwId: '4401234', strategy: 'Smart · CPA' });
  assert.equal(L.campaignName(r, 'taboola', NOW), 'ab-de-solr-4401234-1123-tb-smart');
  assert.equal(L.campaignName(L.blankRow(), 'taboola', NOW), '', 'no geo, no name yet');
  assert.equal(L.campaignName(Object.assign(L.blankRow(), { geo: 'US' }), 'nope', NOW), 'dl-us-gen-0000000-1123-xx-semi');
  assert.equal(L.countryVertical(r), 'DE-Solar Panels');
  assert.equal(L.cellValue(r, 'cv', ctx), 'DE-Solar Panels');
});

test('resolve fills the four partner columns, the same way every time', () => {
  const r = Object.assign(L.blankRow(), { geo: 'US', url: 'https://read.example/a', offer: '77' });
  assert.equal(L.canResolve(r), true);
  const a = L.resolveFields(r);
  assert.deepEqual(a, L.resolveFields(r));
  assert.match(a.nwId, /^44\d{5}$/);
  assert.equal(a.site, 'https://go.read.example/d/' + a.nwId);
  assert.match(a.destId, /^dest=[a-z0-9]{6}$/);
  assert.equal(a.tracking, a.destId + '&t=nw');
  Object.assign(r, a);
  assert.equal(L.canResolve(r), false, 'a resolved row is not resolved twice');
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
  assert.deepEqual(ok.lines.map((l) => l.step), ['northwind create', 'northwind link', 'platform campaign', 'creatives', 'summary']);
  assert.match(ok.lines.at(-1).msg, /^SUCCESS — campaign [0-9a-f]{12} \(CPC, geo=[A-Z]{2}\)/);
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
  const run = L.runFromPlan(plan, { id: 9999, platform: 'outbrain', feedName: 'NORTHWIND RSOC', user: 'dana', workspace: 41, took: '12s', now: NOW });
  assert.equal(run.campaigns, 20);
  assert.equal(run.live, 19);
  assert.equal(run.failed, 1);
  assert.equal(L.runStatus(run), 'partial');
  assert.equal(run.time, '12:00');
  assert.equal(L.runCampaigns(run, NOW), run.items);
  assert.equal(run.items.filter((c) => !c.ok).length, 1);
  assert.ok(run.items.every((c) => c.trace.length >= 4));
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

test('money, numbers and dates format like the real app', () => {
  assert.equal(L.fmtMoney(1284630.2), '1,284,630.20 $');
  assert.equal(L.fmtMoney(-1534.25), '-1,534.25 $');
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
