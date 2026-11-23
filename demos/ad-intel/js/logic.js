/* Ad Intel demo: the rules behind the replica. Pure functions, no DOM, so Node can test them.
   Filters and sorting for the feed, matching ads against our own articles, trends, the pipeline,
   and the scrape schedule. */

/* ---------- Formatting ---------- */

export function num(n) { return Math.round(n).toLocaleString('en-US'); }
/* Counts are zero-padded in the real tool: 0 shows as 00. */
export function pad(n) { return n < 10 ? '0' + n : num(n); }
export function money(n) { return n == null ? '–' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
export function ratio(n) { return n == null ? '–' : n.toFixed(2); }
export function ago(hours) {
  if (hours < 1) return 'just now';
  if (hours < 48) return Math.round(hours) + 'h ago';
  return Math.round(hours / 24) + 'd ago';
}

/* ---------- Links ---------- */

export function adUrl(ad) {
  return 'https://' + ad.domain + '/' + ad.lang.toLowerCase() + '/articles/' + ad.slug + '?utm_source=facebook&utm_medium=paid&utm_campaign=' + ad.id;
}
/* The landing URL without tracking: no query string, no fragment. */
export function cleanUrl(url) { return String(url).split('#')[0].split('?')[0]; }
export function ourUrl(article) { return 'https://' + article.domain + '/' + article.lang + '/articles/' + article.slug; }

/* ---------- Our articles ----------
   Our articles database writes countries and languages its own way (UK, en); ads are stored as
   GB, EN. Always normalize before comparing. */

var COUNTRY_ALIASES = { UK: 'GB' };
var LANG_NAMES = { english: 'EN', french: 'FR', german: 'DE', spanish: 'ES', italian: 'IT', danish: 'DA', slovak: 'SK' };

export function normCountry(c) { var u = String(c || '').trim().toUpperCase(); return COUNTRY_ALIASES[u] || u; }
export function normLang(l) { var s = String(l || '').trim().toLowerCase(); return LANG_NAMES[s] || s.toUpperCase(); }

/* Our versions of an ad: exact clones built from its landing URL, then articles on the same topic,
   in the same country and language. With a domain, only articles on that domain count. */
export function ourVersions(ad, articles, domain) {
  var mine = articles.filter(function (a) { return !domain || a.domain === domain; });
  var clones = mine.filter(function (a) { return a.clone === ad.id; });
  var close = mine.filter(function (a) {
    return a.clone !== ad.id && a.vertical === ad.vertical && normCountry(a.country) === normCountry(ad.country) && normLang(a.lang) === normLang(ad.lang);
  });
  return { clones: clones, close: close, any: clones.length + close.length > 0 };
}

/* ---------- The feed ---------- */

export var EMPTY_FILTERS = { query: '', ourDomain: '', ourArticle: 'all', landing: 'all', domains: [], feeds: [], verticals: [] };

export function activeFilters(f) {
  return (f.ourDomain ? 1 : 0) + (f.ourArticle !== 'all' ? 1 : 0) + (f.landing !== 'all' ? 1 : 0) + f.domains.length + f.feeds.length + f.verticals.length;
}

export function filterAds(ads, f, articles) {
  var q = String(f.query || '').trim().toLowerCase();
  return ads.filter(function (ad) {
    if (q && (ad.headline + ' ' + ad.page + ' ' + ad.domain + ' ' + ad.vertical).toLowerCase().indexOf(q) === -1) return false;
    if (f.landing === 'hide' && ad.dead) return false;
    if (f.landing === 'only' && !ad.dead) return false;
    if (f.domains.length && f.domains.indexOf(ad.domain) === -1) return false;
    if (f.feeds.length && f.feeds.indexOf(ad.feed) === -1) return false;
    if (f.verticals.length && f.verticals.indexOf(ad.vertical) === -1) return false;
    if (f.ourDomain && f.ourArticle !== 'all') {
      var have = ourVersions(ad, articles, f.ourDomain).any;
      if (f.ourArticle === 'have' && !have) return false;
      if (f.ourArticle === 'missing' && have) return false;
    }
    return true;
  });
}

/* Sorts: newest first, longest running first, best earning first, or A to Z. Ads without a value
   always go last. Ties keep a stable order by id. */
export var SORTS = [
  ['freshness', 'freshness'], ['days', 'days running'], ['revenue', 'revenue'], ['rpc', 'rpc'],
  ['page', 'page'], ['domain', 'domain'], ['vertical', 'vertical']
];
export function sortAds(ads, key) {
  var by = {
    freshness: function (a) { return a.first; },
    days: function (a) { return -a.days; },
    revenue: function (a) { return a.revenue == null ? null : -a.revenue; },
    rpc: function (a) { return a.rpc == null ? null : -a.rpc; },
    page: function (a) { return a.page.toLowerCase(); },
    domain: function (a) { return a.domain; },
    vertical: function (a) { return a.vertical.toLowerCase(); }
  }[key] || function (a) { return a.first; };
  return ads.slice().sort(function (a, b) {
    var x = by(a), y = by(b);
    if (x === null && y !== null) return 1;
    if (y === null && x !== null) return -1;
    if (x < y) return -1;
    if (x > y) return 1;
    return a.id < b.id ? -1 : 1;
  });
}

/* How many ads carry each value of a field, biggest first, for the sidebar lists. */
export function counts(ads, field) {
  var map = {};
  ads.forEach(function (a) { map[a[field]] = (map[a[field]] || 0) + 1; });
  return Object.keys(map).map(function (k) { return { value: k, count: map[k] }; })
    .sort(function (a, b) { return b.count - a.count || (a.value < b.value ? -1 : 1); });
}

/* An ad that keeps running is usually making money. */
export var WINNER_DAYS = 30;
export function isWinner(ad) { return ad.days >= WINNER_DAYS; }

export function kpis(ads) {
  return {
    seen: ads.filter(function (a) { return a.seen; }).length,
    fresh: ads.filter(function (a) { return a.first <= 7; }).length,
    winners: ads.filter(isWinner).length,
    total: ads.length,
    competitors: counts(ads, 'domain').length,
    verticals: counts(ads, 'vertical').length
  };
}

/* The busiest verticals and their share of all ads, in whole percent. */
export function topVerticals(ads, n) {
  return counts(ads, 'vertical').slice(0, n).map(function (c) {
    return { vertical: c.value, count: c.count, share: ads.length ? Math.round(c.count / ads.length * 100) : 0 };
  });
}

/* ---------- Trends ---------- */

/* Each vertical: how many ads, how many new this week, how many rivals push it and who, sorted by
   fresh activity (new this week, then total). bar is the share of the biggest total, 0 to 1. */
export function trends(ads) {
  var rows = counts(ads, 'vertical').map(function (c) {
    var mine = ads.filter(function (a) { return a.vertical === c.value; });
    var rivals = counts(mine, 'domain').map(function (d) { return d.value; });
    return { vertical: c.value, total: c.count, fresh: mine.filter(function (a) { return a.first <= 7; }).length, rivals: rivals.length, competitors: rivals };
  });
  var top = rows.reduce(function (m, r) { return Math.max(m, r.total); }, 0);
  rows.forEach(function (r) { r.bar = top ? r.total / top : 0; });
  return rows.sort(function (a, b) { return b.fresh - a.fresh || b.total - a.total || (a.vertical < b.vertical ? -1 : 1); });
}

/* ---------- Pipeline ---------- */

export var STATUSES = ['new', 'idea', 'drafting', 'published'];
export function statusOf(work, id) { return (work[id] && work[id].status) || 'new'; }
export function board(ads, work) {
  var cols = { new: [], idea: [], drafting: [], published: [] };
  ads.forEach(function (a) { cols[statusOf(work, a.id)].push(a); });
  return cols;
}
/* The next column to the right, or null at the end. */
export function nextStatus(s) { var i = STATUSES.indexOf(s); return i >= 0 && i < STATUSES.length - 1 ? STATUSES[i + 1] : null; }

/* Pressing Draft article: it moves the ad to Drafting (never back from Published) and gives it an
   owner if it has none. */
export function startDraft(entry, me) {
  var e = Object.assign({}, entry);
  if (e.status !== 'published') e.status = 'drafting';
  if (!e.owner) e.owner = me;
  return e;
}

/* A linked article must be a full web address. */
export function validLink(url) { return /^https?:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/i.test(String(url || '').trim()); }

/* ---------- Control Room ---------- */

export function validInterval(n) { var v = Number(n); return Number.isInteger(v) && v >= 1 && v <= 365; }

/* What a new row tracks: a domain (cleaned of protocol, www and path) or a keyword search. */
export function parseTarget(input) {
  var s = String(input || '').trim().toLowerCase();
  if (!s) return null;
  var d = s.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) return { kind: 'domain', value: d };
  if (/^https?:|[/.]/.test(s) || s.length > 60) return null;
  return { kind: 'query', value: s.replace(/\s+/g, ' ') };
}

/* Days until a tracked row is due again (0 means due now). Paused rows are never due. */
export function dueIn(row) { return row.active ? Math.max(0, row.every - row.last) : Infinity; }
export function dueRows(rows) { return rows.filter(function (r) { return dueIn(r) === 0; }); }
export function nextDue(rows) {
  var d = rows.reduce(function (m, r) { return Math.min(m, dueIn(r)); }, Infinity);
  return d === Infinity ? 'paused' : d === 0 ? 'now' : 'in ' + d + 'd';
}

/* ---------- Export ---------- */

export function csv(rows, columns) {
  var cell = function (v) { var s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [columns.map(function (c) { return cell(c[0]); }).join(',')]
    .concat(rows.map(function (r) { return columns.map(function (c) { return cell(c[1](r)); }).join(','); }))
    .join('\n') + '\n';
}

/* ---------- Labels ---------- */

/* The policy chip: clear, or the kind of care the topic needs if we monetise our own article on it. */
var CARE = { 'Personal Loans': 'Financial claims', 'Used Cars': 'Financial claims', 'Dental Implants': 'Health claims',
  'Bad Breath Remedy': 'Health claims', 'Medicare Plans': 'Health claims', 'Remote Jobs': 'Income claims' };
export function policyLabel(ad) { return ad.policy === 'clear' ? 'Clear' : CARE[ad.vertical] || 'Needs care'; }

export var BRANDS = [['none', 'No brand'], ['brand', 'Brand'], ['car', 'Car brand']];
/* The brand label: what the team set, else what was detected from the creative. */
export function brandOf(ad, work) { return (work[ad.id] && work[ad.id].brand) || ad.brand; }
