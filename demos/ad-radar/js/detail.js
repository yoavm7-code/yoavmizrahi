/* Ad Radar demo: one ad in full. The creative on the left; the copy, the competitor's landing
   article and our own versions of it in the middle; the Workflow on the right (star, Draft article,
   board status, brand, owner, linked article and notes). K and J move to the previous and next ad
   in the Ads list's current order. */

import { PEOPLE, OUR_ARTICLES, archiveId } from './data.js';
import { adUrl, cleanUrl, ourUrl, ourVersions, isLongRunner, startDraft, validLink, statusOf, policyLabel, brandOf, BRANDS, ago } from './logic.js';
import { h, icon, toast, log } from './dom.js';
import { creative } from './creative.js';

var LANGS = { EN: 'English', FR: 'French', DE: 'German', ES: 'Spanish', IT: 'Italian', DA: 'Danish', SK: 'Slovak' };

export function createDetail(app) {
  var el = h('section.view.detail', { 'aria-label': 'Ad' });
  var linkError = '';

  function ad() { return app.ads.filter(function (a) { return a.id === app.adId; })[0]; }
  function entry() { return app.work[app.adId] || (app.work[app.adId] = {}); }
  function save(change, message) {
    Object.assign(entry(), change);
    log('workflow', 'save', { ad: app.adId, change: change });
    render();
    if (message) toast(message);
  }

  function render() {
    var a = ad();
    if (!a) { app.go('ads'); return; }
    app.lastAd = a.id;
    app.keepFocus(el, function () {
      el.replaceChildren(h('div.detail__grid', left(a), middle(a), workflow(a)));
    });
  }

  /* ---------- Moving between ads ---------- */

  function step(d) {
    var i = app.order.indexOf(app.adId);
    var next = app.order[i + d];
    if (!next) { toast(d > 0 ? 'That was the last ad in this view.' : 'This is the first ad in this view.'); return; }
    app.adId = next;
    linkError = '';
    render();
    el.querySelector('.detail__middle').scrollTop = 0;
  }

  document.addEventListener('keydown', function (e) {
    if (app.view !== 'ad' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (e.key === 'j' || e.key === 'J') step(1);
    if (e.key === 'k' || e.key === 'K') step(-1);
    if (e.key === 'Escape') app.go('ads');
  });

  /* ---------- Left: the creative ---------- */

  function left(a) {
    var i = app.order.indexOf(a.id);
    return h('div.detail__left',
      h('div.detail__bar',
        h('button.btn.btn--ghost', { type: 'button', 'data-back': '', onclick: function () { app.go('ads'); } }, icon('back', 14), 'All ads'),
        h('span.muted.mono', { text: i >= 0 ? (i + 1) + ' of ' + app.order.length : '' }),
        h('span.fill'),
        h('button.key', { type: 'button', 'data-prev': '', 'aria-label': 'Previous ad (K)', title: 'Previous ad (K)', onclick: function () { step(-1); } }, h('kbd', { text: 'K' }), 'Prev'),
        h('button.key', { type: 'button', 'data-next': '', 'aria-label': 'Next ad (J)', title: 'Next ad (J)', onclick: function () { step(1); } }, h('kbd', { text: 'J' }), 'Next')),
      h('div.stage', creative(a, 'large'), h('span.chip.stage__chip', { text: a.format === 'video' ? 'Video' : 'Image' })),
      h('dl.facts',
        fact('Ad ID', archiveId(a), false, true),
        fact('First seen', a.first ? ago(a.first * 24) : 'this scan'),
        fact('Days running', a.days + 'd' + (isLongRunner(a) ? ' ★ long runner' : ''), isLongRunner(a)),
        fact('Vertical', a.vertical),
        fact('Geo and language', a.country + ' · ' + a.lang, false, true),
        fact('Policy', policyLabel(a))));
  }
  function fact(label, value, hot, mono) { return h('div.fact', h('dt', { text: label }), h('dd' + (hot ? '.accent' : '') + (mono ? '.mono' : ''), { text: value })); }

  /* ---------- Middle: copy, landing article, our versions ---------- */

  function middle(a) {
    var url = adUrl(a);
    var mine = ourVersions(a, OUR_ARTICLES);
    return h('div.detail__middle',
      h('div.detail__who', h('b', { text: a.page }), h('span.mono.muted', { text: a.domain })),
      h('h1.detail__title', { text: a.headline }),
      block('Body text', h('p', { text: a.body })),
      h('div.two', block('Caption', h('p.mono', { text: a.domain })), block('Link description', h('p', { text: a.desc }))),
      h('div.cta',
        h('span.cta__btn', { text: 'Learn more' }),
        h('div.cta__lines', h('span.mono.accent.ellipsis', { title: url, text: url }), h('small.mono.ellipsis', h('span.muted', { text: 'Without tracking: ' }), cleanUrl(url)))),
      h('section.landing',
        h('div.cap-row', h('span.label', { text: 'Their landing article' }), a.dead ? h('span.chip.chip--bad', { 'data-dead': '', text: 'Link dead (404), saved copy' }) : h('span.chip.chip--ok', { text: 'Link opens' })),
        h('h2.landing__title', { text: a.article[0] }),
        a.article.slice(1).map(function (p) { return h('p', { text: p }); })),
      versions(a, mine));
  }
  function block(label, body) { return h('div.block', h('span.label', { text: label }), body); }

  function versions(a, mine) {
    var head = h('div.cap-row', h('span.label', { text: 'Our versions' }), h('span.chip' + (mine.any ? '.chip--ok' : '.chip--gap'), { text: mine.any ? (mine.clones.length + mine.close.length) + ' found' : 'None yet' }));
    if (!mine.any) {
      return h('section.versions', { 'data-versions': 'none' }, head,
        h('p.gap', h('b', { text: 'No version yet. ' }), 'None of our sites has an article on ' + a.vertical + ' for ' + a.country + ' in ' + (LANGS[a.lang] || a.lang) + '. That\'s a gap worth drafting.'));
    }
    return h('section.versions', { 'data-versions': String(mine.clones.length + mine.close.length) }, head,
      mine.clones.length ? [h('span.sublabel', { text: 'Written from this exact page' }), h('p.hint', { text: 'We wrote our own article from this competitor\'s landing page, so these are the closest match.' }), mine.clones.map(card)] : null,
      mine.close.length ? [h('span.sublabel', { text: 'Same topic, country and language' }), mine.close.map(card)] : null);
  }

  function card(article) {
    var url = ourUrl(article);
    var linked = entry().link === url;
    return h('div.version',
      h('div.version__top', h('span.mono', { text: article.domain }), h('span.chip', { text: article.country + ' · ' + article.lang }), h('span.chip', { text: article.vertical })),
      h('b.version__title', { text: article.title }),
      h('small.mono.muted.ellipsis', { text: url }),
      h('div.version__actions',
        h('button.btn.btn--sm', { type: 'button', onclick: function () { toast('Our own sites aren\'t opened from the demo.'); } }, icon('out', 13), 'Open'),
        h('button.btn.btn--sm', { type: 'button', onclick: function () { copy(url); } }, icon('copy', 13), 'Copy URL'),
        h('button.btn.btn--sm.btn--soft' + (linked ? '.is-on' : ''), { type: 'button', 'data-set-linked': '', disabled: linked ? true : null, onclick: function () { linkError = ''; save({ link: url }, 'Linked to ' + article.domain + '.'); } }, icon(linked ? 'check' : 'link', 13), linked ? 'Linked' : 'Set as linked')));
  }

  function copy(text) {
    var done = function () { toast('Copied the URL.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { toast('Copying isn\'t allowed here. The URL is under the buttons.'); });
    else toast('Copying isn\'t allowed here. The URL is under the buttons.');
  }

  /* ---------- Right: the workflow ---------- */

  function workflow(a) {
    var e = entry();
    var status = statusOf(app.work, a.id);
    var brand = brandOf(a, app.work);
    var link = h('input.input', { type: 'url', placeholder: 'https://ourblog.com/…', 'aria-label': 'Linked article URL', value: e.link || '', 'data-link': '', 'data-focus': 'link',
      onchange: function () {
        var v = link.value.trim();
        if (v && !validLink(v)) { linkError = 'Use a full address, like https://ourhub.com/…'; render(); return; }
        linkError = '';
        save({ link: v }, v ? 'Linked article saved.' : 'Linked article removed.');
      } });
    var notes = h('textarea.input', { rows: '4', placeholder: 'An angle worth copying', 'aria-label': 'Notes', 'data-notes': '', 'data-focus': 'notes', maxlength: '600',
      oninput: function () { entry().notes = notes.value; } });
    notes.value = e.notes || '';
    return h('aside.workflow', { 'aria-label': 'Workflow' },
      h('div.workflow__head', h('b', { text: 'Workflow' }),
        h('button.btn.btn--sm' + (e.star ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(!!e.star), 'data-star': '', onclick: function () { save({ star: !e.star }); } }, icon(e.star ? 'starOn' : 'star', 14), e.star ? 'Starred' : 'Star')),
      h('button.draft', { type: 'button', 'data-draft': '', onclick: function () {
        if (status === 'published') { toast('This one is already published.'); return; }
        var me = PEOPLE.filter(function (p) { return p.me; })[0];
        var next = startDraft(e, me.id);
        var owner = PEOPLE.filter(function (p) { return p.id === next.owner; })[0];
        save(next, 'Draft started. It\'s in Drafting on the Board, owned by ' + owner.name + '.');
      } }, icon('pencil', 16), 'Draft article'),
      h('span.label', { text: 'Status' }),
      h('div.radios', { role: 'radiogroup', 'aria-label': 'Status' }, [['idea', 'Idea'], ['drafting', 'Drafting'], ['published', 'Published']].map(function (s) {
        var on = status === s[0];
        return h('button.radio' + (on ? '.is-on' : ''), { type: 'button', role: 'radio', 'aria-checked': String(on), 'data-status': s[0], onclick: function () { save({ status: on ? 'new' : s[0] }); } }, h('span.radio__dot'), s[1]);
      })),
      h('span.label', { text: 'Brand' }),
      h('div.radios', { role: 'radiogroup', 'aria-label': 'Brand' }, BRANDS.map(function (b) {
        var on = brand === b[0];
        var set = e.brand === b[0];
        return h('button.radio' + (on ? '.is-on' : ''), { type: 'button', role: 'radio', 'aria-checked': String(on), 'data-brand': b[0], onclick: function () { save({ brand: set ? null : b[0] }); } },
          h('span.radio__dot'), b[1], on ? h('small.radio__tag', { text: set ? 'Set' : 'Auto' }) : null);
      })),
      h('p.hint', { text: 'Detected from the creative. Click to correct it, or click again to clear.' }),
      h('span.label', { text: 'Owner' }),
      h('div.owners', PEOPLE.map(function (p) {
        var on = e.owner === p.id;
        return h('button.owner' + (on ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(on), 'data-owner': p.id, title: p.full + (p.me ? ' (you)' : ''), onclick: function () { save({ owner: on ? null : p.id }); } },
          h('span.avatar', { text: p.id.toUpperCase() }), p.name);
      })),
      h('span.label', { text: 'Linked article' }), link,
      linkError ? h('p.error', { role: 'alert', text: linkError }) : null,
      h('span.label', { text: 'Notes' }), notes,
      h('p.hint', { text: 'Changes save automatically. In this demo they stay in this tab.' }));
  }

  return { el: el, show: render, render: render };
}
