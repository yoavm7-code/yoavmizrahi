// Page generator in js/render.js: escaping, routes, the reel and the share pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderSite, renderSharePages, routes, reelSpans, SITE_CSP, structuredData } from '../../js/render.js';
import { normalize, DEMOS, POSTER_WIDTHS, posterSizes } from '../../js/schema.js';

const site = JSON.parse(await readFile(new URL('../../content/site.json', import.meta.url), 'utf8'));

function base() {
  return {
    site: { name: 'Yoav Mizrahi', title: 'Yoav Mizrahi', url: 'https://yoavmizrahi.com', email: 'hi@example.com', links: [] },
    desk: { note: { hi: 'Hi' } },
    works: [{ id: 'one', title: 'One', style: 'polaroid' }],
    films: [{ id: 'film', title: 'Film', label: 'FILM', tape: { show: true, label: 'FILM' } }],
    about: { lead: 'About me.' }
  };
}
function count(haystack, needle) { return haystack.split(needle).length - 1; }

/* ---------- Escaping ---------- */

test('content can never inject markup', () => {
  const evil = '<img src=x onerror=alert(1)>"\'&';
  const raw = base();
  raw.site.name = evil;
  raw.site.title = evil;
  raw.site.description = evil;
  raw.desk.note.hi = evil;
  raw.works[0].title = evil;
  raw.works[0].description = evil;
  raw.films[0].label = evil;
  raw.about.lead = evil;
  raw.about.before = [evil];
  const page = renderSite(raw);
  assert.ok(!page.includes('<img src=x'), 'raw tag leaked into the page');
  assert.ok(page.includes('&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;'));
  for (const share of renderSharePages(raw)) assert.ok(!share.html.includes('<img src=x'), share.path);
});

test('unsafe links are dropped, not rendered', () => {
  const raw = base();
  raw.works[0].link = 'javascript:alert(1)';
  raw.site.links = [{ label: 'Bad', url: 'javascript:alert(2)' }, { label: 'Good', url: 'https://example.com/me' }];
  const page = renderSite(raw);
  assert.ok(!/javascript:/i.test(page));
  assert.ok(!page.includes('VISIT THE LIVE PRODUCT'));
  assert.ok(page.includes('href="https://example.com/me"'));
  assert.ok(!page.includes('>Bad<'));
});

test('a media path outside media/ is never used', () => {
  const raw = base();
  raw.works[0].media = { type: 'image', src: '../../etc/passwd.png', alt: 'x' };
  const page = renderSite(raw);
  assert.ok(!page.includes('passwd'));
  assert.ok(page.includes('[ SCREENSHOT ]'));
});

/* ---------- The page ---------- */

test('every route has exactly one page section', () => {
  const page = renderSite(site);
  const list = routes(site);
  assert.deepEqual(list.map((r) => r.path), ['/', '/work', ...normalize(site).works.map((w) => '/work/' + w.id), '/films', '/about']);
  for (const r of list) assert.equal(count(page, 'data-route="' + r.path + '"'), 1, r.path);
  assert.equal(count(page, '<section class="page'), list.length);
});

test('the build id is written only when given', () => {
  assert.ok(renderSite(site, { build: 'abc123' }).includes('<meta name="build" content="abc123">'));
  assert.ok(!renderSite(site).includes('name="build"'));
});

test('the desk is rendered in the desk order, without positions, with the layout script first', () => {
  const raw = base();
  raw.works.push({ id: 'two', title: 'Two', style: 'phone' });
  raw.desk.order = ['work:two', 'tapes', 'note', 'monitor', 'work:one'];
  const page = renderSite(raw, {});
  const keys = [...page.matchAll(/data-obj="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(keys, ['work:two', 'tape:film', 'note', 'monitor', 'work:one']);
  assert.ok(!/data-(x|y|r|m|w|h)="/.test(page), 'no positions in the markup');
  assert.ok(page.indexOf('js/desk-layout.js') < page.indexOf('js/main.js'));
  assert.ok(page.includes('data-tidy hidden>Tidy up</button>'));
});

test('a work taken off the desk is not rendered on it', () => {
  const raw = base();
  raw.works[0].desk = { show: false };
  assert.ok(!renderSite(raw, {}).includes('data-obj="work:one"'));
});

test('the site carries its content security policy, the admin preview does not', () => {
  const page = renderSite(site);
  assert.equal(count(page, 'http-equiv="Content-Security-Policy"'), 1);
  assert.ok(page.indexOf('Content-Security-Policy') < page.indexOf('<link'), 'the policy comes before anything it governs');
  assert.ok(page.includes('content="' + SITE_CSP.replace(/'/g, '&#39;') + '"'));
  assert.ok(!renderSite(site, { mode: 'preview' }).includes('Content-Security-Policy'));
});

test('the policy allows only the site and YouTube, and no inline script', () => {
  const hosts = SITE_CSP.match(/https:\/\/[^\s;]+/g);
  assert.deepEqual([...new Set(hosts)].sort(), ['https://i.ytimg.com', 'https://www.youtube-nocookie.com']);
  assert.ok(SITE_CSP.includes("font-src 'self'") && SITE_CSP.includes("style-src 'self';"), 'fonts come from the site itself');
  assert.ok(!/unsafe-inline|unsafe-eval|\*/.test(SITE_CSP));
  assert.ok(SITE_CSP.includes("script-src 'self'") && SITE_CSP.includes("object-src 'none'"));
});

test('the home page has one main heading, a skip link to the content, and a large link preview', () => {
  const page = renderSite(site);
  assert.ok(page.includes('<h1 class="note__hi">'), 'the sticky note is the home page heading');
  assert.ok(page.includes('href="#main" data-skip') && page.includes('<main id="main">'));
  assert.ok(page.indexOf('data-skip') < page.indexOf('<header'), 'the skip link is the first stop');
  assert.ok(page.includes('<meta property="og:image" content="https://yoavmizrahi.com/share.jpg">'));
  assert.ok(page.includes('<meta name="twitter:card" content="summary_large_image">'));
  const raw = base();
  raw.site.url = '';
  assert.ok(!renderSite(raw).includes('og:image'), 'no address, no preview image');
});

test('the reel ruler is a slider a keyboard can reach', () => {
  const page = renderSite(site);
  assert.ok(/<div class="ruler" data-scrub role="slider" tabindex="0" aria-label="Reel position" aria-valuemin="0" aria-valuemax="150"/.test(page));
});

function ldOf(page) {
  const m = page.match(/<script type="application\/ld\+json">(.*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
}

test('the page tells search engines who it is about: the person, the site and the profiles', () => {
  const ld = ldOf(renderSite(site));
  const [person, web] = ld['@graph'];
  assert.equal(ld['@context'], 'https://schema.org');
  assert.equal(person['@type'], 'Person');
  assert.equal(person.name, site.site.name);
  assert.equal(person.url, site.site.url + '/');
  assert.deepEqual(person.sameAs, site.site.links.map((l) => l.url));
  assert.equal(web['@type'], 'WebSite');
  assert.equal(web.author['@id'], person['@id']);
});

test('structured data drops unsafe links, escapes markup, and is left out without an address', () => {
  const raw = base();
  raw.site.name = 'Yoav </script><script>alert(1)</script>';
  raw.site.links = [{ label: 'Bad', url: 'javascript:alert(1)' }, { label: 'Good', url: 'https://example.com/me' }];
  const page = renderSite(raw);
  assert.equal((page.match(/<\/script>/g) || []).length, (page.match(/<script/g) || []).length, 'no script was closed early');
  const ld = ldOf(page);
  assert.equal(ld['@graph'][0].name, raw.site.name, 'the name survives the escaping');
  assert.deepEqual(ld['@graph'][0].sameAs, ['https://example.com/me']);
  raw.site.url = '';
  assert.equal(structuredData(normalize(raw)), '');
  assert.ok(!renderSite(raw).includes('application/ld+json'));
});

test('the page is deterministic: same content, same page', () => {
  assert.equal(renderSite(site, { build: 'x' }), renderSite(site, { build: 'x' }));
});

test('root and mode options are applied', () => {
  const page = renderSite(site, { root: 'https://yoavmizrahi.com/', mode: 'preview' });
  assert.ok(page.includes('<html lang="en" data-mode="preview">'));
  assert.ok(page.includes('src="https://yoavmizrahi.com/js/main.js"'));
  assert.ok(renderSite(site, { mode: 'arrange' }).includes('<html lang="en">'), 'arranging by hand is gone');
  assert.ok(page.includes('href="https://yoavmizrahi.com/css/style.css"'));
  assert.ok(renderSite(site, { mode: 'evil' }).includes('<html lang="en">'));
});

test('the desk has one object per shown work, the note, the monitor and the tapes', () => {
  const c = normalize(site);
  const page = renderSite(site);
  const shown = c.works.filter((w) => w.desk.show);
  assert.equal(count(page, 'data-obj="work:'), shown.length);
  assert.equal(count(page, 'data-obj="note"'), 1);
  assert.equal(count(page, 'data-obj="monitor"'), 1);
  assert.equal(count(page, 'data-tape\n'), c.films.filter((f) => f.tape.show).length);
});

test('a work taken off the desk keeps its project page', () => {
  const raw = base();
  raw.works[0].desk = { show: false };
  const page = renderSite(raw);
  assert.ok(!page.includes('data-obj="work:one"'));
  assert.ok(page.includes('data-route="/work/one"'));
});

test('no tapes means no tape group', () => {
  const raw = base();
  raw.films[0].tape.show = false;
  assert.ok(!renderSite(raw).includes('data-obj-group="tapes"'));
});

test('a work whose demo has a replica gets the replica stage instead of the desk object', () => {
  const raw = base();
  raw.works = [{ id: 'up', title: 'Up', demo: 'uploader' }, { id: 'pic', title: 'Pic', style: 'polaroid' }];
  const page = renderSite(raw);
  const r = DEMOS.uploader.replica;
  assert.equal(count(page, 'data-replica '), 1);
  assert.ok(page.includes('data-src="' + r.src + '" data-w="' + r.width + '" data-h="' + r.height + '"'));
  assert.ok(page.includes('src="' + r.video + '" data-poster="' + r.poster + '"'), 'the video gets its poster only when its page opens');
  assert.ok(!/<video[^>]* poster=/.test(page), 'no video poster is fetched on first load');
  assert.ok(page.includes('href="' + r.src + '" data-replica-full'));
  assert.equal(count(page, 'data-widget="uploader"'), 1, 'the desk keeps its Launch widget, the project page does not');
  assert.ok(page.includes('ON THE DESK</span>'), 'a work without a replica keeps the desk stage');
});

test('a work card shows the replica poster with a video that loads only on hover', () => {
  const raw = base();
  raw.works = [{ id: 'up', title: 'Up', demo: 'uploader' }];
  const page = renderSite(raw);
  const r = DEMOS.uploader.replica;
  const at = page.indexOf('<a class="card card--shot" href="#/work/up"');
  assert.ok(at >= 0, 'the card is marked as a picture card');
  const card = page.slice(at);
  const set = POSTER_WIDTHS.map((w) => r.poster.replace('.jpg', '-' + w + '.webp') + ' ' + w + 'w').join(', ');
  assert.ok(card.includes('<img src="' + r.poster + '" srcset="' + set + '" sizes="100vw" alt="" loading="lazy"'));
  assert.ok(card.includes('<video data-card-video data-src="' + r.video + '" muted loop playsinline preload="none">'));
  assert.ok(!card.slice(0, card.indexOf('</a>')).includes(' src="' + r.video + '"'), 'no video src until hover');
});

test('a work card uses the work\'s own picture, or stays plain ink without one', () => {
  const raw = base();
  raw.works = [
    { id: 'pic', title: 'Pic', style: 'polaroid', media: { type: 'image', src: 'media/shot.webp', alt: 'Shot' } },
    { id: 'none', title: 'None', style: 'polaroid' }
  ];
  const page = renderSite(raw);
  assert.ok(page.includes('<a class="card card--shot" href="#/work/pic"'));
  assert.ok(page.includes('<div class="card__shot"><img class="media" src="media/shot.webp" alt="Shot"'));
  assert.ok(page.includes('<a class="card" href="#/work/none"'));
  assert.ok(page.includes('<div class="card__inner grid-dark"><span class="card__no">02</span><span class="card__title">None</span>'));
});

test('the Films card runs the stills of every film along a strip, twice over so the loop has no seam', () => {
  const raw = base();
  raw.films = [
    { id: 'a', title: 'A', label: 'A', stills: ['media/a1.webp', 'media/a2.webp'] },
    { id: 'b', title: 'B', label: 'B', soon: true },
    { id: 'c', title: 'C', label: 'C', stills: ['media/c1.webp'] }
  ];
  const page = renderSite(raw);
  const at = page.indexOf('<a class="card card--shot card--films" href="#/films"');
  assert.ok(at >= 0, 'the Films card is a picture card');
  const card = page.slice(at, page.indexOf('</a>', at));
  assert.ok(card.includes('<div class="card__shot card__shot--strip" aria-hidden="true"><div class="strip">'));
  const srcs = [...card.matchAll(/<img src="([^"]+)" alt="" loading="lazy"/g)].map((m) => m[1]);
  assert.deepEqual(srcs, ['media/a1.webp', 'media/a2.webp', 'media/c1.webp', 'media/a1.webp', 'media/a2.webp', 'media/c1.webp']);
  assert.ok(card.includes('<div class="card__inner"><span class="card__no">02</span><span class="card__title">Films</span>'));
});

test('without stills the Films card stays plain ink', () => {
  const page = renderSite(base());
  assert.ok(page.includes('<a class="card" href="#/films"'));
  assert.ok(page.includes('<div class="card__inner grid-dark"><span class="card__no">02</span><span class="card__title">Films</span>'));
  assert.equal(count(page, 'class="strip"'), 0);
});

test('the admin preview loads stills through its own media address', () => {
  const raw = base();
  raw.films[0].stills = ['media/a1.webp'];
  const page = renderSite(raw, { root: '../', mediaUrl: (p) => 'blob:' + p });
  assert.ok(page.includes('<span class="strip__frame"><img src="blob:media/a1.webp"'));
});

test('a phone replica sits in a phone-shaped device and its card shows a standing phone', () => {
  const raw = base();
  raw.works = [{ id: 'up', title: 'Up', demo: 'uploader' }, { id: 'tm', title: 'Tm', demo: 'toto' }];
  const page = renderSite(raw);
  const r = DEMOS.toto.replica;
  assert.equal(r.frame, 'phone');
  assert.ok(page.includes('<div class="replica replica--phone" data-replica data-src="' + r.src + '" data-w="390" data-h="844" data-frame="phone"'));
  assert.ok(page.includes('<div class="replica" data-replica data-src="' + DEMOS.uploader.replica.src + '" data-w="1440" data-h="900" data-frame="desktop"'));
  assert.ok(!/<[^>]+ style="/.test(page), 'no inline styles: the admin preview blocks them');
  assert.equal(count(page, 'class="replica__note'), 1, 'only the desktop replica says it is built for a computer');
  assert.ok(page.includes('<a class="card card--shot card--phone" href="#/work/tm"'));
  assert.ok(page.includes('<div class="card__shot card__shot--phone grid-dark" aria-hidden="true"><img src="' + r.poster + '"'));
  assert.equal(count(page, 'data-widget="toto"'), 1, 'the desk keeps its score picker, the project page does not');
});

test('a site with a phone view gets a Desktop / Phone switch and no "built for a computer" note', () => {
  const raw = base();
  raw.works = [{ id: 'im', title: 'Im', demo: 'imeng' }, { id: 'up', title: 'Up', demo: 'uploader' }];
  const page = renderSite(raw);
  const r = DEMOS.imeng.replica;
  assert.deepEqual(r.phone, { width: 390, height: 844 });
  assert.ok(page.includes('data-frame="desktop" data-phone-w="390" data-phone-h="844" data-title="' + r.title + '"'));
  assert.equal(count(page, 'data-replica-view="phone"'), 1, 'only the site with a phone view has the switch');
  assert.equal(count(page, 'class="replica__note'), 1, 'only the desktop-only replica says it needs a computer');
});

test('the device bar says where the content comes from', () => {
  const raw = base();
  raw.works = [{ id: 'im', title: 'Im', demo: 'imeng' }, { id: 'lw', title: 'Lw', demo: 'lorewire' }, { id: 'up', title: 'Up', demo: 'uploader' }];
  const page = renderSite(raw);
  assert.ok(page.includes('I.M ENGINEERING · THE LIVE SITE&#39;S CONTENT'));
  assert.ok(page.includes('LOREWIRE · LOREWIRE&#39;S OWN STORIES'));
  assert.ok(page.includes('LAUNCH DESK · MADE-UP DATA'));
});

test('a replica card can crop its poster from the left edge', () => {
  const raw = base();
  raw.works = [{ id: 'up', title: 'Up', demo: 'uploader' }, { id: 'lw', title: 'Lw', demo: 'lorewire' }];
  const page = renderSite(raw);
  assert.equal(DEMOS.lorewire.replica.card, 'start');
  assert.ok(page.includes('<div class="card__shot card__shot--app card__shot--start" aria-hidden="true"><img src="' + DEMOS.lorewire.replica.poster + '"'));
  assert.ok(page.includes('<div class="card__shot card__shot--app" aria-hidden="true"><img src="' + DEMOS.uploader.replica.poster + '"'));
});

test('design notes show on the project page as paragraphs, only when there are some', () => {
  const raw = base();
  raw.works = [{ id: 'a', title: 'A', design: 'First <b>idea</b>.\n\n  \r\n\r\nSecond idea.\nSame paragraph.' }, { id: 'b', title: 'B' }];
  const page = renderSite(raw);
  assert.equal(count(page, '<section class="proj-design '), 1);
  assert.ok(page.includes('<div class="proj-design__text"><p>First &lt;b&gt;idea&lt;/b&gt;.</p><p>Second idea.\nSame paragraph.</p></div>'));
  const a = page.indexOf('data-page="work-a"');
  const b = page.indexOf('data-page="work-b"');
  const at = page.indexOf('<section class="proj-design ');
  assert.ok(a < at && at < b, 'the notes belong to work A');
});

test('the About page shows the web design section only when it has text', () => {
  const raw = base();
  assert.ok(!renderSite(raw).includes('about__design'));
  raw.about.design = { lead: 'I design in the browser.', points: ['One <i>point</i>', 'Two'] };
  const page = renderSite(raw);
  assert.ok(page.includes('<p class="about__design-lead">I design in the browser.</p>'));
  assert.ok(page.includes('<ul class="about__points"><li>One &lt;i&gt;point&lt;/i&gt;</li><li>Two</li></ul>'));
  raw.about.design = { lead: '', points: ['Only a point'] };
  const points = renderSite(raw);
  assert.ok(points.includes('class="about__design') && !points.includes('about__design-lead'));
});

test('replica paths follow the root option, for the admin preview', () => {
  const raw = base();
  raw.works = [{ id: 'up', title: 'Up', demo: 'uploader' }];
  const page = renderSite(raw, { root: 'https://yoavmizrahi.com/' });
  assert.ok(page.includes('data-src="https://yoavmizrahi.com/demos/launch-desk/"'));
  assert.ok(page.includes('poster="https://yoavmizrahi.com/demos/launch-desk/poster.jpg"'));
});

test('no lines are left holding only indentation', () => {
  const page = renderSite(base());
  assert.ok(!page.split('\n').some((l) => l.length && !l.trim()));
});

/* ---------- The reel ---------- */

test('reel: equal shares when any runtime is unknown', () => {
  const spans = reelSpans(normalize({ films: [{ id: 'a' }, { id: 'b', runtime: '10:00' }] }).films);
  assert.deepEqual(spans, { a: [0, 0.5], b: [0.5, 1] });
});

test('reel: shares follow runtimes when all are known', () => {
  const spans = reelSpans(normalize({ films: [{ id: 'a', runtime: '30:00' }, { id: 'b', runtime: '10:00' }] }).films);
  assert.deepEqual(spans, { a: [0, 0.75], b: [0.75, 1] });
});

test('reel: films in production take the last fifth', () => {
  const spans = reelSpans(normalize({ films: [{ id: 'a' }, { id: 'b' }, { id: 'c', soon: true }] }).films);
  assert.deepEqual(spans, { a: [0, 0.4], b: [0.4, 0.8], c: [0.8, 1] });
});

test('reel: only films in production fill the whole track', () => {
  assert.deepEqual(reelSpans(normalize({ films: [{ id: 'a', soon: true }] }).films), { a: [0, 1] });
});

test('reel: no films, no spans', () => {
  assert.deepEqual(reelSpans([]), {});
});

test('reel: the live films always end at 1 with no gaps', () => {
  const films = normalize(site).films;
  const spans = reelSpans(films);
  let pos = 0;
  for (const f of films) {
    assert.ok(Math.abs(spans[f.id][0] - pos) < 0.0002, f.id);
    pos = spans[f.id][1];
  }
  assert.equal(pos, 1);
});

/* ---------- Share pages ---------- */

test('one share page per work and film, at w/<id>/ and f/<id>/', () => {
  const c = normalize(site);
  const paths = renderSharePages(site).map((p) => p.path);
  assert.deepEqual(paths, [...c.works.map((w) => 'w/' + w.id + '/index.html'), ...c.films.map((f) => 'f/' + f.id + '/index.html')]);
});

test('share pages send people into the right place in the site', () => {
  const pages = renderSharePages(base());
  const work = pages.find((p) => p.path === 'w/one/index.html').html;
  const film = pages.find((p) => p.path === 'f/film/index.html').html;
  assert.ok(work.includes('<meta http-equiv="refresh" content="0; url=../../#/work/one">'));
  assert.ok(work.includes('<link rel="canonical" href="https://yoavmizrahi.com/#/work/one">'));
  assert.ok(film.includes('url=../../#/films/film'));
});

test('share pages get a large preview only when there is an image', () => {
  const raw = base();
  raw.films[0].youtube = 'dQw4w9WgXcQ';
  raw.works[0].media = { type: 'image', src: 'media/shot.webp', alt: 'Shot' };
  const pages = renderSharePages(raw);
  assert.ok(pages[0].html.includes('content="https://yoavmizrahi.com/media/shot.webp"'));
  assert.ok(pages[1].html.includes('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'));
  assert.ok(pages.every((p) => p.html.includes('summary_large_image')));
  assert.ok(renderSharePages(base()).every((p) => p.html.includes('content="summary"')));
});

test('a work with a replica uses its poster as the link preview', () => {
  const raw = base();
  raw.works = [{ id: 'up', title: 'Up', demo: 'uploader' }];
  const html = renderSharePages(raw)[0].html;
  assert.ok(html.includes('<meta property="og:image" content="https://yoavmizrahi.com/' + DEMOS.uploader.replica.poster + '">'));
  raw.site.url = '';
  assert.ok(!renderSharePages(raw)[0].html.includes('og:image'), 'no address, no preview image');
});

test('a phone replica uses its landscape share picture instead of its tall poster', () => {
  const raw = base();
  raw.works = [{ id: 'toto', title: 'Toto', demo: 'toto' }];
  assert.ok(DEMOS.toto.replica.share);
  assert.ok(renderSharePages(raw)[0].html.includes('<meta property="og:image" content="https://yoavmizrahi.com/' + DEMOS.toto.replica.share + '">'));
});

test('desk pictures of a replica offer the smaller poster copies; a phone replica has none', () => {
  const raw = base();
  raw.works = [{ id: 'mem', title: 'Mem', demo: 'memesh', style: 'polaroid' }];
  const page = renderSite(raw);
  const r = DEMOS.memesh.replica;
  assert.ok(page.includes('<img class="media" src="' + r.poster + '" srcset="' + posterSizes(r).map((s) => s.src + ' ' + s.width + 'w').join(', ') + '" sizes="(max-width: 900px) 340px, 410px"'));
  assert.deepEqual(posterSizes(DEMOS.toto.replica), []);
  assert.ok(!renderSite(Object.assign(base(), { works: [{ id: 't', title: 'T', demo: 'toto' }] })).includes('srcset'));
});

test('share pages leave out the address when the site has none', () => {
  const raw = base();
  raw.site.url = '';
  const html = renderSharePages(raw)[0].html;
  assert.ok(!html.includes('canonical'));
  assert.ok(!html.includes('og:url'));
});
