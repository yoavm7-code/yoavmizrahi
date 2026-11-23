// The Ad Intel replica's rules (demos/ad-intel/js/logic.js) and its made-up data.
// The DOM-free modules only, so this runs in Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../../demos/ad-intel/js/data.js';
import * as L from '../../demos/ad-intel/js/logic.js';

const ad = (id, more) => Object.assign({ id, page: 'Page ' + id, domain: id + '.com', feed: 'F', vertical: 'Used Cars', lang: 'EN', country: 'GB',
  headline: 'Headline ' + id, days: 10, first: 5, dead: false, revenue: null, rpc: null }, more);
const filters = (more) => Object.assign({}, L.EMPTY_FILTERS, { domains: [], feeds: [], verticals: [] }, more);

/* ---------- Our articles ---------- */

test('countries and languages are normalized before comparing (UK is GB, en is EN)', () => {
  assert.equal(L.normCountry('UK'), 'GB');
  assert.equal(L.normCountry(' us '), 'US');
  assert.equal(L.normLang('en'), 'EN');
  assert.equal(L.normLang('English'), 'EN');
  assert.equal(L.normLang('de'), 'DE');
});

test('our versions: exact clones first, then same topic, country and language', () => {
  const articles = [
    { domain: 'a.com', country: 'UK', lang: 'en', vertical: 'Used Cars', clone: 'x1', title: 'Clone' },
    { domain: 'a.com', country: 'UK', lang: 'en', vertical: 'Used Cars', title: 'Close' },
    { domain: 'b.com', country: 'UK', lang: 'en', vertical: 'Used Cars', title: 'Other domain' },
    { domain: 'a.com', country: 'US', lang: 'en', vertical: 'Used Cars', title: 'Wrong country' },
    { domain: 'a.com', country: 'UK', lang: 'fr', vertical: 'Used Cars', title: 'Wrong language' },
    { domain: 'a.com', country: 'UK', lang: 'en', vertical: 'Home Solar', title: 'Wrong topic' }
  ];
  const all = L.ourVersions(ad('x1'), articles);
  assert.deepEqual(all.clones.map((a) => a.title), ['Clone']);
  assert.deepEqual(all.close.map((a) => a.title), ['Close', 'Other domain']);
  assert.equal(all.any, true);
  assert.deepEqual(L.ourVersions(ad('x1'), articles, 'b.com').close.map((a) => a.title), ['Other domain']);
  assert.equal(L.ourVersions(ad('x2', { vertical: 'Pickup Trucks' }), articles, 'a.com').any, false);
});

/* ---------- The feed ---------- */

test('filters: search, landing page, domains, feeds, verticals', () => {
  const ads = [ad('a', { dead: true, feed: 'F1' }), ad('b', { vertical: 'Home Solar', feed: 'F2' }), ad('c', { headline: 'Solar batteries' })];
  const ids = (f) => L.filterAds(ads, filters(f), []).map((a) => a.id);
  assert.deepEqual(ids({}), ['a', 'b', 'c']);
  assert.deepEqual(ids({ query: '  SOLAR ' }), ['b', 'c'], 'headline or vertical, any case');
  assert.deepEqual(ids({ landing: 'hide' }), ['b', 'c']);
  assert.deepEqual(ids({ landing: 'only' }), ['a']);
  assert.deepEqual(ids({ domains: ['b.com', 'c.com'] }), ['b', 'c']);
  assert.deepEqual(ids({ feeds: ['F1'] }), ['a']);
  assert.deepEqual(ids({ verticals: ['Home Solar'] }), ['b']);
});

test('the gap filter: HAVE and MISSING only apply once one of our domains is picked', () => {
  const articles = [{ domain: 'ours.com', country: 'GB', lang: 'en', vertical: 'Used Cars', title: 'T' }];
  const ads = [ad('a'), ad('b', { vertical: 'Home Solar' })];
  const ids = (f) => L.filterAds(ads, filters(f), articles).map((a) => a.id);
  assert.deepEqual(ids({ ourArticle: 'missing' }), ['a', 'b'], 'ignored without a domain');
  assert.deepEqual(ids({ ourDomain: 'ours.com', ourArticle: 'have' }), ['a']);
  assert.deepEqual(ids({ ourDomain: 'ours.com', ourArticle: 'missing' }), ['b']);
  assert.deepEqual(ids({ ourDomain: 'other.com', ourArticle: 'have' }), []);
  assert.equal(L.activeFilters(filters({ ourDomain: 'ours.com', ourArticle: 'missing', feeds: ['F'] })), 3);
});

test('sorting: newest, longest running, best earning (no data last), A to Z', () => {
  const ads = [ad('a', { first: 9, days: 40, revenue: 10, page: 'beta' }), ad('b', { first: 1, days: 70, page: 'Alpha' }), ad('c', { first: 4, days: 5, revenue: 99, page: 'gamma' })];
  const ids = (k) => L.sortAds(ads, k).map((a) => a.id);
  assert.deepEqual(ids('freshness'), ['b', 'c', 'a']);
  assert.deepEqual(ids('days'), ['b', 'a', 'c']);
  assert.deepEqual(ids('revenue'), ['c', 'a', 'b']);
  assert.deepEqual(ids('page'), ['b', 'a', 'c'], 'ignores case');
  assert.deepEqual(ids('nonsense'), ids('freshness'));
  assert.deepEqual(ads.map((a) => a.id), ['a', 'b', 'c'], 'the input is left alone');
});

test('KPIs, sidebar counts and the busiest verticals', () => {
  const ads = [ad('a', { seen: true, first: 2, days: 30 }), ad('b', { first: 8, days: 29, domain: 'a.com' }), ad('c', { vertical: 'Home Solar', first: 7 })];
  assert.deepEqual(L.kpis(ads), { seen: 1, fresh: 2, winners: 1, total: 3, competitors: 2, verticals: 2 });
  assert.deepEqual(L.counts(ads, 'domain'), [{ value: 'a.com', count: 2 }, { value: 'c.com', count: 1 }]);
  assert.deepEqual(L.topVerticals(ads, 1), [{ vertical: 'Used Cars', count: 2, share: 67 }]);
  assert.deepEqual(L.topVerticals([], 3), []);
});

test('trends: sorted by new this week, then total; bars scale to the biggest', () => {
  const ads = [ad('a', { first: 20 }), ad('b', { first: 20, domain: 'z.com' }), ad('c', { vertical: 'Home Solar', first: 1 })];
  const rows = L.trends(ads);
  assert.deepEqual(rows.map((r) => r.vertical), ['Home Solar', 'Used Cars']);
  assert.deepEqual(rows[1], { vertical: 'Used Cars', total: 2, fresh: 0, rivals: 2, competitors: ['a.com', 'z.com'], bar: 1 });
  assert.equal(rows[0].bar, 0.5);
});

/* ---------- Pipeline ---------- */

test('pipeline: everything starts in New, moves right, Draft article never undoes Published', () => {
  const work = { b: { status: 'idea' }, c: { status: 'published' } };
  const cols = L.board([ad('a'), ad('b'), ad('c')], work);
  assert.deepEqual(Object.keys(cols).map((k) => cols[k].map((x) => x.id)), [['a'], ['b'], [], ['c']]);
  assert.equal(L.nextStatus('new'), 'idea');
  assert.equal(L.nextStatus('published'), null);
  assert.deepEqual(L.startDraft({}, 'dl'), { status: 'drafting', owner: 'dl' });
  assert.deepEqual(L.startDraft({ status: 'idea', owner: 'rk' }, 'dl'), { status: 'drafting', owner: 'rk' }, 'keeps the owner');
  assert.equal(L.startDraft({ status: 'published' }, 'dl').status, 'published');
  const entry = { status: 'idea' };
  L.startDraft(entry, 'dl');
  assert.deepEqual(entry, { status: 'idea' }, 'returns a copy');
});

test('a linked article must be a full web address', () => {
  assert.ok(L.validLink('https://ourhub.com/en/articles/x'));
  assert.ok(L.validLink(' http://readnest.com '));
  for (const bad of ['', 'ourhub.com/x', 'javascript:alert(1)', 'https://', 'https://no-dot', 'https://a b.com']) assert.ok(!L.validLink(bad), bad);
});

/* ---------- Control Room ---------- */

test('intervals are whole days from 1 to 365', () => {
  for (const ok of [1, '3', 365]) assert.ok(L.validInterval(ok), String(ok));
  for (const bad of [0, 366, 2.5, '', 'x', -1]) assert.ok(!L.validInterval(bad), String(bad));
});

test('a new tracked row is a cleaned domain or a keyword search', () => {
  assert.deepEqual(L.parseTarget(' https://www.Rival.com/path?x=1 '), { kind: 'domain', value: 'rival.com' });
  assert.deepEqual(L.parseTarget('sub.rival.co.uk'), { kind: 'domain', value: 'sub.rival.co.uk' });
  assert.deepEqual(L.parseTarget('  senior   housing '), { kind: 'query', value: 'senior housing' });
  for (const bad of ['', '   ', 'http://', 'half.', 'x'.repeat(61)]) assert.equal(L.parseTarget(bad), null, bad);
});

test('the scrape schedule: due rows, the next due time, paused rows never run', () => {
  const rows = [{ domain: 'a', every: 3, last: 1, active: true }, { domain: 'b', every: 2, last: 2, active: true }, { domain: 'c', every: 1, last: 9, active: false }];
  assert.equal(L.dueIn(rows[0]), 2);
  assert.deepEqual(L.dueRows(rows).map((r) => r.domain), ['b']);
  assert.equal(L.nextDue(rows), 'now');
  assert.equal(L.nextDue([rows[0]]), 'in 2d');
  assert.equal(L.nextDue([rows[2]]), 'paused');
});

/* ---------- Formatting and export ---------- */

test('formatting: zero-padded counts, money, ratios and ages', () => {
  assert.equal(L.pad(0), '00');
  assert.equal(L.pad(7), '07');
  assert.equal(L.pad(1234), '1,234');
  assert.equal(L.money(1840.2), '$1,840.20');
  assert.equal(L.money(null), '–');
  assert.equal(L.ratio(0.4), '0.40');
  assert.equal(L.ago(0), 'just now');
  assert.equal(L.ago(20), '20h ago');
  assert.equal(L.ago(72), '3d ago');
});

test('links: the clean link drops tracking; CSV quotes what needs quoting', () => {
  const a = D.ADS[0];
  assert.match(L.adUrl(a), /\?utm_source=facebook/);
  assert.equal(L.cleanUrl(L.adUrl(a)), 'https://' + a.domain + '/en/articles/' + a.slug);
  assert.equal(L.cleanUrl('https://x.com/a#b?c'), 'https://x.com/a');
  const out = L.csv([{ t: 'Say "hi", ok', n: 2 }, { t: 'plain', n: null }], [['title', (r) => r.t], ['n', (r) => r.n]]);
  assert.equal(out, 'title,n\n"Say ""hi"", ok",2\nplain,\n');
});

test('labels: policy chips and the brand the team set over the detected one', () => {
  assert.equal(L.policyLabel({ policy: 'clear', vertical: 'Personal Loans' }), 'Clear');
  assert.equal(L.policyLabel({ policy: 'care', vertical: 'Personal Loans' }), 'Financial claims');
  assert.equal(L.policyLabel({ policy: 'care', vertical: 'Home Solar' }), 'Needs care');
  assert.equal(L.brandOf({ id: 'a', brand: 'none' }, {}), 'none');
  assert.equal(L.brandOf({ id: 'a', brand: 'none' }, { a: { brand: 'car' } }), 'car');
  assert.equal(L.brandOf({ id: 'a', brand: 'car' }, { a: { brand: null } }), 'car');
});

/* ---------- The data ---------- */

test('every ad is complete and consistent', () => {
  const ids = new Set();
  const tracked = D.TRACKED.map((r) => r.domain);
  for (const a of D.ADS.concat(D.INCOMING)) {
    assert.ok(!ids.has(a.id), 'unique ' + a.id); ids.add(a.id);
    assert.ok(D.VERTICALS.includes(a.vertical), a.id + ' vertical');
    assert.ok(D.FEEDS.includes(a.feed), a.id + ' feed');
    assert.ok(tracked.includes(a.domain), a.id + ' domain is tracked');
    assert.ok(['image', 'video'].includes(a.format) && ['photo', 'text'].includes(a.look), a.id);
    assert.ok(['none', 'brand', 'car'].includes(a.brand) && ['clear', 'care'].includes(a.policy), a.id);
    assert.ok(a.article.length >= 3 && a.headline && a.body && a.desc && /^[a-z0-9-]+$/.test(a.slug), a.id);
    assert.equal(a.revenue != null, a.feed === D.METRICS_FEED, a.id + ': metrics only come from the metrics feed');
    assert.ok(a.days <= a.first + 1, a.id + ': it can\'t have run longer than we have seen it');
    for (const t of [a.headline, a.body, a.desc, ...a.article]) assert.doesNotMatch(t, /[\\*#<>]|—/, a.id + ': ' + t.slice(0, 40));
  }
  assert.match(D.archiveId(D.ADS[0]), /^9000\d{12}$/);
});

test('the demo has gaps and matches on every one of our domains, so both filters show something', () => {
  for (const d of D.OUR_DOMAINS) {
    const have = L.filterAds(D.ADS, filters({ ourDomain: d.domain, ourArticle: 'have' }), D.OUR_ARTICLES);
    const missing = L.filterAds(D.ADS, filters({ ourDomain: d.domain, ourArticle: 'missing' }), D.OUR_ARTICLES);
    assert.ok(have.length > 0 && missing.length > 0, d.domain);
    assert.equal(have.length + missing.length, D.ADS.length);
  }
  for (const a of D.OUR_ARTICLES) if (a.clone) assert.ok(D.ADS.some((x) => x.id === a.clone), 'clone of a real ad');
  assert.ok(D.ADS.some((a) => a.dead) && D.ADS.some((a) => L.isWinner(a)));
  assert.equal(D.PEOPLE.filter((p) => p.me).length, 1);
});
