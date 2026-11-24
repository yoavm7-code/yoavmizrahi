/* Launch Desk demo: the rules behind the replica. Pure functions, no DOM, so Node can test them.
   Every derived figure (totals, readiness, names, run outcomes) is computed here and only here. */

import { VERTICALS, GEOS, LANGS, ASSETS, ACCOUNTS, REGIONS, STRATEGIES, KEYWORD_LISTS, FAILURES, SITE, PLATFORMS } from './data.js';

/* ---------- Grid columns ---------- */
/* kind decides how a cell looks and edits. required columns tint red while empty. */

export const COLUMNS = [
  { key: 'name', label: 'Campaign name (auto)', kind: 'auto', width: 250 },
  { key: 'geo', label: 'Geo', kind: 'select', width: 86, required: true, options: GEOS },
  { key: 'vertical', label: 'Vertical', kind: 'select', width: 150, options: VERTICALS.map(function (v) { return v.name; }) },
  { key: 'lang', label: 'Lang', kind: 'select', width: 82, options: ['en', 'de', 'fr', 'it', 'es', 'nl'] },
  { key: 'account', label: 'Account', kind: 'select', width: 150, options: ACCOUNTS },
  { key: 'notes', label: 'Notes', kind: 'text', width: 150 },
  { key: 'url', label: 'Landing page', kind: 'link', width: 190, required: true },
  { key: 'product', label: 'Product ID', kind: 'text', width: 104, required: true, mono: true },
  { key: 'linkId', label: 'Link ID', kind: 'resolved', width: 104 },
  { key: 'link', label: 'Tracked link', kind: 'resolved', width: 190 },
  { key: 'asset', label: 'Image', kind: 'asset', width: 190, required: true },
  { key: 'headline', label: 'Headline', kind: 'headline', width: 260, required: true },
  { key: 'description', label: 'Description', kind: 'text', width: 170 },
  { key: 'keywords', label: 'Keywords', kind: 'keywords', width: 190, placeholder: 'kw1, kw2, …' },
  { key: 'kwList', label: 'Keyword List', kind: 'select', width: 120, options: KEYWORD_LISTS },
  { key: 'bid', label: 'Bid', kind: 'number', width: 96, mono: true },
  { key: 'budget', label: 'Budget', kind: 'number', width: 90, mono: true },
  { key: 'strategy', label: 'Strategy', kind: 'select', width: 126, options: STRATEGIES },
  { key: 'cpa', label: 'CPA', kind: 'number', width: 96, placeholder: 'target CPA', mono: true },
  { key: 'roas', label: 'ROAS', kind: 'number', width: 96, placeholder: 'target ROAS', mono: true }
];

export const REQUIRED = COLUMNS.filter(function (c) { return c.required; }).map(function (c) { return c.key; });
export const RESOLVED = ['linkId', 'link'];

/* A1-style letters: 0 -> A, 25 -> Z, 26 -> AA. */
export function columnLetter(i) {
  var s = '';
  i += 1;
  while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}

/* ---------- Small helpers ---------- */

export function hash(text) {
  var h = 0x811c9dc5;
  var s = String(text);
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function filled(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }
export function sum(list, key) { return list.reduce(function (a, x) { return a + (key ? x[key] : x); }, 0); }
export function platformById(id) { return PLATFORMS.filter(function (p) { return p.id === id; })[0] || PLATFORMS[0]; }
export function verticalByName(name) { return VERTICALS.filter(function (v) { return v.name === name; })[0] || null; }
function slug(text) { return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

/* ---------- Formatting ---------- */

export function fmtInt(n) { return Math.round(n).toLocaleString('en-US'); }
export function daysBefore(daysAgo, now) {
  var d = new Date(now.getTime());
  d.setDate(d.getDate() - daysAgo);
  return d;
}
export function dateLabel(daysAgo, now) {
  var d = daysBefore(daysAgo, now);
  return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear();
}
var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDate(daysAgo, now) {
  var d = daysBefore(daysAgo, now);
  return d.getDate() + ' ' + MONTHS[d.getMonth()];
}
export function clock(now) { return pad2(now.getHours()) + ':' + pad2(now.getMinutes()); }
export function clockSeconds(now) { return clock(now) + ':' + pad2(now.getSeconds()); }

/* ---------- Overview ---------- */

export function launchTotals(dashboard) {
  var live = sum(dashboard.launched, 'live');
  var failed = sum(dashboard.launched, 'failed');
  var launched = live + failed;
  return { launched: launched, live: live, failed: failed, rate: launched ? Math.round(live / launched * 1000) / 10 : 0 };
}

export function dashboardKpis(dashboard) {
  return {
    creatives: sum(dashboard.creativesByBrand, 'value'),
    platforms: dashboard.platformRows.length,
    accounts: sum(dashboard.platformRows, 'accounts'),
    verticals: dashboard.verticals
  };
}

/* ---------- Rows ---------- */

var nextRowId = 1;
export function blankRow() {
  return {
    id: nextRowId++, geo: '', vertical: '', lang: '', account: 'Auto', notes: '', url: '', product: '',
    linkId: '', link: '', asset: '', headline: '', description: '', keywords: '', kwList: KEYWORD_LISTS[0],
    bid: '', budget: '', strategy: STRATEGIES[0], cpa: '', roas: '', status: 'new', error: ''
  };
}

export function copyRow(row) { var r = JSON.parse(JSON.stringify(row)); r.id = nextRowId++; return r; }

export function isReady(row) { return REQUIRED.every(function (k) { return filled(row[k]); }); }
export function missing(row) { return COLUMNS.filter(function (c) { return c.required && !filled(row[c.key]); }).map(function (c) { return c.label; }); }
export function isResolved(row) { return filled(row.linkId); }
export function canResolve(row) { return filled(row.geo) && filled(row.url) && filled(row.product) && !isResolved(row); }
export function isBlank(row) {
  return COLUMNS.every(function (c) {
    if (c.kind === 'auto') return true;
    var v = row[c.key];
    return !filled(v) || v === 'Auto' || v === KEYWORD_LISTS[0] || v === STRATEGIES[0];
  });
}

/* GEO · Vertical · day Month · #n, the readable name every campaign gets. n tells same-looking rows apart. */
export function campaignName(row, n, now) {
  if (!filled(row.geo)) return '';
  return [row.geo, row.vertical || 'General', shortDate(0, now), '#' + n].join(' · ');
}

export function cellValue(row, key, ctx) {
  if (key === 'name') return campaignName(row, row.id, ctx.now);
  return row[key];
}

/* The account a row uploads to: its own pick, or the one for its region when it is left on Auto. */
export function accountFor(row) {
  return row.account && row.account !== 'Auto' ? row.account : REGIONS[row.geo] || ACCOUNTS[1];
}

/* The fields Create tracking links fills. Deterministic per row, so undo and redo give the same links. */
export function resolveFields(row) {
  var code = (hash('link:' + row.id + ':' + row.product + ':' + row.geo).toString(36) + 'k7q2mx').slice(0, 6);
  return { linkId: code, link: 'https://go.' + SITE + '/' + code };
}

export function fillPlaceholders(text, now) {
  return String(text).replace(/\{year\}/g, String(now.getFullYear())).replace(/\{city\}/g, 'your area');
}
export function hasPlaceholders(text) { return /\{[a-z]+\}/.test(String(text)); }

export function exampleRow(row, i) {
  var v = VERTICALS[i % VERTICALS.length];
  var geo = GEOS[(i * 3) % GEOS.length];
  var lang = LANGS[geo];
  return Object.assign({}, row, {
    geo: geo,
    vertical: v.name,
    lang: lang,
    url: 'https://' + SITE + '/' + lang + '/' + slug(v.name) + '-' + (100 + i),
    product: String(3100 + i * 7),
    bid: (0.02 + (i % 5) * 0.01).toFixed(2),
    budget: String(20 + (i % 3) * 10)
  });
}

export function autoAsset(row) {
  var v = verticalByName(row.vertical);
  return 'img-' + (v ? v.code : 'gen') + '-' + pad2((hash(row.id + ':' + row.vertical) % 40) + 1);
}
export function assetUrl(asset) { return 'https://img.' + SITE + '/' + asset + '.jpg'; }
export function assetColor(asset) { return ASSETS[hash(asset) % ASSETS.length]; }

/* Rows cycle through the verticals, so the first time a vertical comes up it gets its first headline.
   That puts exactly one "Guaranteed approval" headline (Credit Cards) in a 20-row example grid. */
export function autoHeadline(row, i, now) {
  var v = verticalByName(row.vertical) || VERTICALS[0];
  return fillPlaceholders(v.headlines[Math.floor(i / VERTICALS.length) % v.headlines.length], now);
}
export function autoKeywords(row, max) {
  var v = verticalByName(row.vertical) || VERTICALS[0];
  return v.keywords.slice(0, max || 3).join(', ');
}
export function fixGrammar(text) {
  var t = String(text).trim().replace(/\s+/g, ' ');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/* ---------- Launch ---------- */

export function runnable(rows) { return rows.filter(function (r) { return isReady(r) && r.status !== 'live'; }); }

function hex(seed, len) {
  var s = '';
  var n = seed;
  while (s.length < len) { n = hash(n + ':x'); s += n.toString(16); }
  return s.slice(0, len);
}

/* What happens to each row when it goes live. A headline with a financial claim is blocked by policy,
   so a careless row fails the way a real platform would fail it. */
export function planRun(rows, ctx) {
  return runnable(rows).map(function (row) {
    var name = campaignName(row, row.id, ctx.now);
    var blocked = /guaranteed/i.test(row.headline);
    var campaignId = hex(row.id + ':' + row.product, 12);
    var lines = [{ step: 'tracking link', msg: isResolved(row) ? 'tracking link ready' : 'tracking link created' }];
    if (blocked) {
      lines.push({ step: 'policy check', msg: 'blocked: financial claims', bad: true });
      lines.push({ step: 'summary', msg: 'Not uploaded. ' + FAILURES.financial, bad: true });
    } else {
      lines.push({ step: 'campaign', msg: 'campaign created' });
      lines.push({ step: 'creatives', msg: '1/1 creatives uploaded' });
      lines.push({ step: 'summary', msg: liveSummary(campaignId, row.geo, 1) });
    }
    return { rowId: row.id, name: name, ok: !blocked, error: blocked ? FAILURES.financial : '', campaignId: campaignId, lines: lines, row: row };
  });
}

function resolvedOr(row) { return isResolved(row) ? {} : resolveFields(row); }
function liveSummary(campaignId, geo, creatives) {
  return 'Live: campaign ' + campaignId + ' in ' + geo + ', ' + creatives + (creatives === 1 ? ' ad' : ' ads') + ' (' + creatives + ' × image, 1 headline, 1 description)';
}

export function runSummary(plan) {
  var live = plan.filter(function (p) { return p.ok; }).length;
  var geos = [];
  plan.forEach(function (p) { if (geos.indexOf(p.row.geo) === -1) geos.push(p.row.geo); });
  var accounts = [];
  plan.forEach(function (p) { var a = accountFor(p.row); if (accounts.indexOf(a) === -1) accounts.push(a); });
  return {
    campaigns: plan.length,
    live: live,
    failed: plan.length - live,
    geos: geos,
    accounts: accounts.length,
    budget: sum(plan.map(function (p) { return Number(p.row.budget) || 20; }))
  };
}

/* ---------- Launches ---------- */

export function runStatus(run) {
  if (run.failed >= run.campaigns) return 'failed';
  if (run.failed > 0) return 'partial';
  return 'succeeded';
}

/* The campaigns inside a run. Runs made in this visit carry their own; the seeded ones are generated
   the same way every time from the run id. */
export function runCampaigns(run, now) {
  if (run.items) return run.items;
  var items = [];
  for (var k = 0; k < run.campaigns; k++) {
    var seed = hash(run.id + ':' + k);
    var v = VERTICALS[seed % VERTICALS.length];
    var geo = GEOS[(seed >>> 4) % GEOS.length];
    var failed = k >= run.campaigns - run.failed;
    var creatives = 4 + ((seed >>> 8) % 3);
    var row = { id: 2 + k, geo: geo, vertical: v.name, product: String(seed % 9000 + 1000) };
    var links = resolveFields(row);
    var campaignId = hex(run.id + ':' + k, 12);
    var error = FAILURES[run.platform] || FAILURES.default;
    items.push({
      name: campaignName(row, row.id, daysBefore(run.daysAgo, now)),
      vertical: v.name,
      strategy: STRATEGIES[seed % STRATEGIES.length],
      rowNo: row.id,
      account: failed ? '' : accountFor(row),
      geo: geo,
      task: run.task || '',
      ok: !failed,
      creatives: failed ? 0 : creatives,
      creativesTotal: creatives,
      campaignId: failed ? '' : campaignId,
      error: failed ? error : '',
      bid: (0.3 + (seed % 40) / 100).toFixed(2),
      budget: 20,
      keywords: 4 + (seed % 5),
      linkId: links.linkId,
      landing: 'https://' + SITE + '/' + (LANGS[geo] || 'en') + '/' + slug(v.name) + '-' + (seed % 900 + 100),
      trace: failed
        ? [['tracking_link', 'tracking link created'], ['campaign', 'failed: ' + error.split(':')[0]]]
        : [['tracking_link', 'tracking link created'], ['campaign', 'campaign created'], ['creatives', creatives + '/' + creatives + ' creatives uploaded'], ['summary', liveSummary(campaignId, geo, creatives)]]
    });
  }
  return items;
}

/* Turns a finished plan into a launch the Launches list can show, with its own campaigns. */
export function runFromPlan(plan, ctx) {
  var s = runSummary(plan);
  return {
    id: ctx.id,
    platform: ctx.platform,
    brand: ctx.brand,
    user: ctx.user,
    campaigns: s.campaigns,
    live: s.live,
    failed: s.failed,
    time: clock(ctx.now),
    daysAgo: 0,
    workspace: ctx.workspace,
    took: ctx.took,
    fresh: true,
    items: plan.map(function (p, i) {
      var r = Object.assign({}, p.row, resolvedOr(p.row));
      return {
        name: p.name, vertical: r.vertical || 'General', strategy: r.strategy || STRATEGIES[0], rowNo: i + 1, account: p.ok ? accountFor(r) : '',
        geo: r.geo, task: '', ok: p.ok, creatives: p.ok ? 1 : 0, creativesTotal: 1, campaignId: p.ok ? p.campaignId : '', error: p.error,
        bid: r.bid || '0.02', budget: Number(r.budget) || 20, keywords: r.keywords ? r.keywords.split(',').length : 0, linkId: r.linkId, landing: r.url,
        trace: p.lines.map(function (l) { return [l.step.replace(/ /g, '_'), l.msg]; })
      };
    })
  };
}

export function filterRuns(runs, f, now) {
  var q = String(f.q || '').trim().toLowerCase().replace(/^#/, '');
  return runs.filter(function (r) {
    if (q) {
      var hay = [r.id, r.user, platformById(r.platform).name, r.brand, r.task || '', r.workspace].join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (f.platform && r.platform !== f.platform) return false;
    if (f.status && runStatus(r) !== f.status) return false;
    if (f.user && r.user !== f.user) return false;
    if (f.result === 'live' && !r.live) return false;
    if (f.result === 'failures' && !r.failed) return false;
    if (f.result === 'none' && r.live) return false;
    if (f.mode === 'live' && !r.live) return false;
    if (f.time === 'today' && r.daysAgo !== 0) return false;
    if (f.time === 'yesterday' && r.daysAgo !== 1) return false;
    if (f.time === '7d' && r.daysAgo > 6) return false;
    return true;
  });
}

var SORTS = {
  newest: function (a, b) { return a.daysAgo - b.daysAgo || b.time.localeCompare(a.time) || b.id - a.id; },
  oldest: function (a, b) { return SORTS.newest(b, a); },
  number: function (a, b) { return b.id - a.id; },
  campaigns: function (a, b) { return b.campaigns - a.campaigns; },
  live: function (a, b) { return b.live - a.live; },
  failed: function (a, b) { return b.failed - a.failed; }
};
export function sortRuns(runs, key) { return runs.slice().sort(SORTS[key] || SORTS.newest); }

export function dayGroup(daysAgo) { return daysAgo === 0 ? 'TODAY' : daysAgo === 1 ? 'YESTERDAY' : daysAgo + ' DAYS AGO'; }

/* ---------- CSV ---------- */
/* Quotes every field that needs it, and defuses cells a spreadsheet would run as a formula. */

export function csvCell(v) {
  var s = String(v === undefined || v === null ? '' : v);
  if (/^[=+\-@\t\r]/.test(s)) s = '\'' + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function toCsv(header, rows) {
  return [header].concat(rows).map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
}
