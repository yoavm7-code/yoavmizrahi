/* Mega Uploader demo: the rules behind the replica. Pure functions, no DOM, so Node can test them.
   Every derived figure (totals, readiness, names, run outcomes) is computed here and only here. */

import { VERTICALS, GEOS, LANGS, ASSETS, ACCOUNTS, FAILURES, SITE, PLATFORMS } from './data.js';

/* ---------- Grid columns ---------- */
/* kind decides how a cell looks and edits. required columns tint red while empty. */

export const COLUMNS = [
  { key: 'name', label: 'Campaign name (auto)', kind: 'auto', width: 230 },
  { key: 'prefix', label: 'Prefix', kind: 'text', width: 110, placeholder: 'buyer, e.g. dl' },
  { key: 'geo', label: 'Geo', kind: 'select', width: 86, required: true, options: GEOS },
  { key: 'vertical', label: 'Vertical', kind: 'select', width: 150, options: VERTICALS.map(function (v) { return v.name; }) },
  { key: 'cv', label: 'Country + Vertical', kind: 'auto', width: 150 },
  { key: 'lang', label: 'Lang', kind: 'select', width: 82, options: ['en', 'de', 'fr', 'it', 'es', 'nl'] },
  { key: 'account', label: 'Account', kind: 'select', width: 150, options: ACCOUNTS },
  { key: 'comments', label: 'Open Comments', kind: 'text', width: 150 },
  { key: 'url', label: 'Website URL', kind: 'link', width: 190, required: true },
  { key: 'offer', label: 'Offer ID', kind: 'text', width: 96, required: true, mono: true },
  { key: 'nwId', label: 'Northwind ID', kind: 'resolved', width: 118 },
  { key: 'site', label: 'Website From Northwind', kind: 'resolved', width: 190 },
  { key: 'destId', label: 'Dest ID', kind: 'resolved', width: 118 },
  { key: 'tracking', label: 'Tracking Code', kind: 'resolved', width: 140 },
  { key: 'asset', label: 'Asset 1 URL', kind: 'asset', width: 190, required: true },
  { key: 'headline', label: 'Headline', kind: 'headline', width: 260, required: true },
  { key: 'description', label: 'Description', kind: 'text', width: 170 },
  { key: 'keywords', label: 'Keywords', kind: 'keywords', width: 190, placeholder: 'kw1, kw2, …' },
  { key: 'kwList', label: 'Keyword List', kind: 'select', width: 120, options: ['—', 'Evergreen', 'Seasonal', 'Brand-safe'] },
  { key: 'bid', label: 'Bid', kind: 'number', width: 96, mono: true },
  { key: 'budget', label: 'Budget', kind: 'number', width: 90, mono: true },
  { key: 'strategy', label: 'Strategy', kind: 'select', width: 126, options: ['Semi · CPC', 'Smart · CPA', 'Max · ROAS', 'Manual · CPC'] },
  { key: 'cpa', label: 'CPA', kind: 'number', width: 96, placeholder: 'target CPA', mono: true },
  { key: 'roas', label: 'ROAS', kind: 'number', width: 96, placeholder: 'target ROAS', mono: true }
];

export const REQUIRED = COLUMNS.filter(function (c) { return c.required; }).map(function (c) { return c.key; });
export const RESOLVED = ['nwId', 'site', 'destId', 'tracking'];

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
export function fmtMoney(n) {
  return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
}
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

/* ---------- Dashboard ---------- */

export function profitTotals(dashboard) {
  var profit = Math.round(sum(dashboard.profit, 'value') * 100) / 100;
  var revenue = Math.round((dashboard.spend + profit) * 100) / 100;
  return { spend: dashboard.spend, revenue: revenue, profit: profit, roas: Math.round(revenue / dashboard.spend * 100) / 100 };
}

export function dashboardKpis(dashboard) {
  return {
    articles: sum(dashboard.libraryByFeed, 'value'),
    platforms: dashboard.platformRows.length,
    accounts: sum(dashboard.platformRows, 'accounts'),
    verticals: dashboard.verticals
  };
}

/* ---------- Rows ---------- */

var nextRowId = 1;
export function blankRow() {
  return {
    id: nextRowId++, prefix: '', geo: '', vertical: '', lang: '', account: 'Auto', comments: '', url: '', offer: '',
    nwId: '', site: '', destId: '', tracking: '', asset: '', headline: '', description: '', keywords: '', kwList: '—',
    bid: '', budget: '', strategy: 'Semi · CPC', cpa: '', roas: '', stale: false, status: 'new', error: ''
  };
}

export function copyRow(row) { var r = JSON.parse(JSON.stringify(row)); r.id = nextRowId++; return r; }

export function isReady(row) { return REQUIRED.every(function (k) { return filled(row[k]); }); }
export function missing(row) { return COLUMNS.filter(function (c) { return c.required && !filled(row[c.key]); }).map(function (c) { return c.label; }); }
export function isResolved(row) { return filled(row.nwId); }
export function canResolve(row) { return filled(row.geo) && filled(row.url) && filled(row.offer) && !isResolved(row); }
export function isBlank(row) {
  return COLUMNS.every(function (c) {
    if (c.kind === 'auto') return true;
    var v = row[c.key];
    return !filled(v) || v === 'Auto' || v === '—' || v === 'Semi · CPC';
  });
}

var PLATFORM_CODES = { outbrain: 'ob', taboola: 'tb', mediago: 'mg', facebook: 'fb', tiktok: 'tt', google: 'gg', pinterest: 'pn', x: 'xx', newsbreak: 'nb', mgid: 'mi', chatgpt: 'cg', revcontent: 'rc' };

/* prefix-geo-vertical-partnerId-mmdd-platform-strategy, the naming every campaign gets. */
export function campaignName(row, platformId, now) {
  if (!filled(row.geo)) return '';
  var v = verticalByName(row.vertical);
  return [
    row.prefix || 'dl',
    row.geo.toLowerCase(),
    v ? v.code : 'gen',
    row.nwId || '0000000',
    pad2(now.getMonth() + 1) + pad2(now.getDate()),
    PLATFORM_CODES[platformId] || 'xx',
    String(row.strategy || 'Semi').split(' ')[0].toLowerCase()
  ].join('-');
}

export function countryVertical(row) {
  if (!filled(row.geo) || !filled(row.vertical)) return '';
  return row.geo + '-' + row.vertical;
}

export function cellValue(row, key, ctx) {
  if (key === 'name') return campaignName(row, ctx.platform, ctx.now);
  if (key === 'cv') return countryVertical(row);
  return row[key];
}

/* The partner fields Resolve fills. Deterministic per row, so undo and redo give the same links. */
export function resolveFields(row) {
  var n = hash('nw:' + row.id + ':' + row.offer + ':' + row.geo);
  var nwId = String(4400000 + (n % 90000));
  var dest = 'dest=' + (n.toString(36) + 'kq7m').slice(0, 6);
  return { nwId: nwId, site: 'https://go.' + SITE + '/d/' + nwId, destId: dest, tracking: dest + '&t=nw' };
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
    prefix: row.prefix || 'dl',
    geo: geo,
    vertical: v.name,
    lang: lang,
    url: 'https://' + SITE + '/' + lang + '/' + slug(v.name) + '-' + (100 + i),
    offer: String(3100 + i * 7),
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

/* ---------- Run live ---------- */

export function runnable(rows) { return rows.filter(function (r) { return isReady(r) && r.status !== 'live'; }); }

function hex(seed, len) {
  var s = '';
  var n = seed;
  while (s.length < len) { n = hash(n + ':x'); s += n.toString(16); }
  return s.slice(0, len);
}

/* What happens to each row when it goes live. A headline with a financial claim is blocked by policy,
   so a careless row fails the way it would in the real tool. */
export function planRun(rows, ctx) {
  return runnable(rows).map(function (row) {
    var name = campaignName(Object.assign({}, row, resolvedOr(row)), ctx.platform, ctx.now);
    var blocked = /guaranteed/i.test(row.headline);
    var campaignId = hex(row.id + ':' + row.offer, 12);
    var lines = [
      { step: 'northwind create', msg: 'northwind campaign created' },
      { step: 'northwind link', msg: 'northwind link ready' }
    ];
    if (blocked) {
      lines.push({ step: 'policy check', msg: 'blocked: financial claims', bad: true });
      lines.push({ step: 'summary', msg: 'FAILED — ' + FAILURES.financial, bad: true });
    } else {
      lines.push({ step: 'platform campaign', msg: 'campaign created' });
      lines.push({ step: 'creatives', msg: '1/1 creatives uploaded' });
      lines.push({ step: 'summary', msg: 'SUCCESS — campaign ' + campaignId + ' (' + strategyType(row) + ', geo=' + row.geo + ') | 1img x 1hl x 1desc = 1 combos | uploaded 1/1' });
    }
    return { rowId: row.id, name: name, ok: !blocked, error: blocked ? FAILURES.financial : '', campaignId: campaignId, lines: lines, row: row };
  });
}

function resolvedOr(row) { return isResolved(row) ? {} : resolveFields(row); }
function strategyType(row) { return String(row.strategy || 'Semi · CPC').split(' · ')[1] || 'CPC'; }

export function runSummary(plan) {
  var live = plan.filter(function (p) { return p.ok; }).length;
  var geos = [];
  plan.forEach(function (p) { if (geos.indexOf(p.row.geo) === -1) geos.push(p.row.geo); });
  var accounts = [];
  plan.forEach(function (p) { var a = p.row.account === 'Auto' ? 'auto:' + p.row.geo : p.row.account; if (accounts.indexOf(a) === -1) accounts.push(a); });
  return {
    campaigns: plan.length,
    live: live,
    failed: plan.length - live,
    geos: geos,
    accounts: accounts.length,
    budget: sum(plan.map(function (p) { return Number(p.row.budget) || 20; }))
  };
}

/* ---------- Run history ---------- */

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
    var nwId = String(4400000 + (seed % 90000));
    var row = { prefix: run.user.slice(0, 2).replace('.', 'x'), geo: geo, vertical: v.name, nwId: nwId, strategy: 'Semi · CPC' };
    items.push({
      name: campaignName(row, run.platform, daysBefore(run.daysAgo, now)),
      vertical: v.name,
      rowNo: 2 + k,
      account: failed ? '' : 'Northwind ' + (LANGS[geo] || 'en').toUpperCase() + ' ' + (1 + (seed % 9)),
      geo: geo,
      task: run.task || '',
      ok: !failed,
      creatives: failed ? 0 : creatives,
      creativesTotal: creatives,
      campaignId: failed ? '' : String(1882630000000000 + (seed % 999999999)),
      error: failed ? (FAILURES[run.platform] || FAILURES.default) : '',
      bid: (0.3 + (seed % 40) / 100).toFixed(2),
      budget: 20,
      keywords: 4 + (seed % 5),
      nwId: nwId,
      article: 'https://' + SITE + '/' + (LANGS[geo] || 'en') + '/articles/' + slug(v.name) + '-' + (seed % 900 + 100),
      trace: failed
        ? [['northwind_create', 'northwind campaign created'], ['northwind_link', 'northwind link ready'], [run.platform + '_platform_campaign', 'failed: ' + (FAILURES[run.platform] || FAILURES.default).split(':')[0]]]
        : [['northwind_create', 'northwind campaign created'], ['northwind_link', 'northwind link ready'], [run.platform + '_platform_campaign', 'campaign created'], [run.platform + '_creatives', creatives + '/' + creatives + ' creatives uploaded'], ['summary', 'SUCCESS — campaign ' + (1882630000000000 + (seed % 999999999)) + ' (geo=' + geo + ') | ' + creatives + 'img x 1hl x 1desc = ' + creatives + ' combos | uploaded ' + creatives + '/' + creatives]]
    });
  }
  return items;
}

/* Turns a finished plan into a run the history list can show, with its own campaigns. */
export function runFromPlan(plan, ctx) {
  var s = runSummary(plan);
  return {
    id: ctx.id,
    platform: ctx.platform,
    feed: ctx.feedName,
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
        name: p.name, vertical: r.vertical || 'General', rowNo: i + 1, account: p.ok ? (r.account === 'Auto' ? 'Northwind ' + (r.lang || 'en').toUpperCase() + ' 3' : r.account) : '',
        geo: r.geo, task: '', ok: p.ok, creatives: p.ok ? 1 : 0, creativesTotal: 1, campaignId: p.ok ? p.campaignId : '', error: p.error,
        bid: r.bid || '0.02', budget: Number(r.budget) || 20, keywords: r.keywords ? r.keywords.split(',').length : 0, nwId: r.nwId, article: r.url,
        trace: p.lines.map(function (l) { return [l.step.replace(/ /g, '_'), l.msg]; })
      };
    })
  };
}

export function filterRuns(runs, f, now) {
  var q = String(f.q || '').trim().toLowerCase().replace(/^#/, '');
  return runs.filter(function (r) {
    if (q) {
      var hay = [r.id, r.user, platformById(r.platform).name, r.feed, r.task || '', r.workspace].join(' ').toLowerCase();
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
