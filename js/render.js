/* Page generator. Turns content/site.json into the finished index.html and the share pages.
   Used by the admin when publishing and for its live preview, and by tools/generate.mjs.
   Every value is escaped by the html`` tag, so content can never inject markup.
   Plain ES module, no dependencies, works in the browser and in Node. */

import { normalize, runtimeSeconds, isSafeUrl, isMediaPath, SIZES, DESK, DEMOS } from './schema.js';

/* ---------- Safe templating ---------- */

var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(v) { return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }

function Raw(s) { this.s = s; }
function flat(v) {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(flat).join('');
  if (v === null || v === undefined || v === false) return '';
  return esc(v);
}
function html(strings) {
  var out = strings[0];
  for (var i = 1; i < arguments.length; i++) out += flat(arguments[i]) + strings[i];
  return new Raw(out);
}

var PLAY_ICON = new Raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>');

/* ---------- Helpers ---------- */

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function upper(s) { return String(s || '').toUpperCase(); }
function numLabel(i, kind) { return pad2(i + 1) + (kind ? ' · ' + kind : ''); }
function safeHref(url) { return isSafeUrl(url) ? url : ''; }

/* Resolves an asset or media path for the page being generated. */
function makePaths(opts) {
  var root = opts.root || '';
  return {
    asset: function (p) { return root + p; },
    media: function (p) {
      if (!isMediaPath(p)) return '';
      return opts.mediaUrl ? opts.mediaUrl(p) : root + p;
    }
  };
}

function mediaEl(m, paths, eager) {
  if (!m) return '';
  var src = paths.media(m.src);
  if (!src) return '';
  if (m.type === 'video') {
    return html`<video class="media" src="${src}" muted loop autoplay playsinline preload="metadata" aria-label="${m.alt}"></video>`;
  }
  var loading = new Raw(eager ? 'decoding="async"' : 'loading="lazy" decoding="async"');
  return html`<img class="media" src="${src}" alt="${m.alt}"${m.width ? html` width="${m.width}" height="${m.height}"` : ''} ${loading}>`;
}

/* The films reel: each film gets a share of the timeline. Released films split it by runtime when
   every runtime is known, otherwise equally. Films in production take the last fifth. */
export function reelSpans(films) {
  var released = films.filter(function (f) { return !f.soon; });
  var soon = films.filter(function (f) { return f.soon; });
  var releasedShare = soon.length ? (released.length ? 0.8 : 0) : 1;
  var soonShare = 1 - releasedShare;
  var secs = released.map(function (f) { return runtimeSeconds(f.runtime); });
  var useRuntime = released.length > 0 && secs.every(function (s) { return s > 0; });
  var total = secs.reduce(function (a, b) { return a + b; }, 0);
  var pos = 0;
  var spans = {};
  released.forEach(function (f, i) {
    var w = useRuntime ? secs[i] / total * releasedShare : releasedShare / released.length;
    spans[f.id] = [pos, pos + w];
    pos += w;
  });
  soon.forEach(function (f) {
    var w = soonShare / soon.length;
    spans[f.id] = [pos, pos + w];
    pos += w;
  });
  Object.keys(spans).forEach(function (k) { spans[k] = [round(spans[k][0]), round(spans[k][1])]; });
  if (films.length) spans[films[films.length - 1].id][1] = 1;
  return spans;
}
function round(n) { return Math.round(n * 10000) / 10000; }

/* Drops lines that only hold indentation (left behind by empty optional fields). */
function tidy(s) {
  return s.split('\n').filter(function (l) { return !(l.length && !l.trim()); }).join('\n');
}

function filmMeta(f) {
  var parts = [f.genre, f.runtime].filter(Boolean);
  return parts.length ? parts.join(' · ') : (f.soon ? 'IN PRODUCTION' : '');
}

/* ---------- Routes (also read by js/main.js from the markup) ---------- */

export function routes(content) {
  var c = normalize(content);
  var list = [
    { path: '/', page: 'home', label: 'The desk', name: 'THE DESK' },
    { path: '/work', page: 'work', label: 'Work', name: 'WORK' }
  ];
  c.works.forEach(function (w) {
    list.push({ path: '/work/' + w.id, page: 'work-' + w.id, label: w.title, name: 'WORK / ' + upper(w.title) });
  });
  list.push({ path: '/films', page: 'films', label: 'Films', name: 'FILMS' });
  list.push({ path: '/about', page: 'about', label: 'About', name: 'ABOUT' });
  return list;
}

/* ---------- Desk ---------- */

function deskSize(c) {
  var w = DESK.minWidth;
  var h = DESK.minHeight;
  function grow(x, y, size) { w = Math.max(w, x + size.w + 20); h = Math.max(h, y + size.h + 20); }
  grow(c.desk.note.x, c.desk.note.y, SIZES.note);
  grow(c.desk.monitor.x, c.desk.monitor.y, SIZES.monitor);
  c.works.forEach(function (wk) { if (wk.desk.show) grow(wk.desk.x, wk.desk.y, SIZES[wk.style]); });
  c.films.forEach(function (f) { if (f.tape.show) grow(f.tape.x, f.tape.y, SIZES.tape); });
  return { w: w, h: h };
}

function objAttrs(key, pos, order, cursor) {
  return html`data-obj="${key}" data-x="${pos.x}" data-y="${pos.y}" data-r="${pos.r}" data-m="${order}" data-cursor="${cursor || 'drag'}"`;
}

function deskNote(c, order) {
  var n = c.desk.note;
  return html`
      <!-- Note -->
      <div class="obj" ${objAttrs('note', n, order)}>
        <div class="note settle">
          <span class="note__tape" aria-hidden="true"></span>
          <p class="note__hi">${n.hi}</p>
          ${n.line ? html`<p class="note__line">${n.line}</p>` : ''}
          ${n.small ? html`<p class="note__small">${n.small}</p>` : ''}
        </div>
      </div>
`;
}

function deskWork(w, i, order, paths) {
  var delay = ['d1', 'd2', 'd3', 'd4'][i % 4];
  var href = '#/work/' + w.id;
  var label = numLabel(i, w.kind);
  var open = html`<a class="uline mono-link mono-link--light" href="${href}">OPEN PROJECT →</a>`;
  var body;
  if (w.style === 'device') {
    body = html`
        <div class="device${w.demo === 'uploader' ? ' device--uploader' : ''} settle ${delay}">
          <div class="device__screen device__screen--paper">
            <div class="row-between"><span class="label">${label}</span>${w.demo === 'uploader' ? new Raw('<span class="led" data-upload-led aria-hidden="true"></span>') : ''}</div>
            <span class="device__title">${w.title}</span>
            ${w.demo === 'uploader' ? new Raw('<div class="uploader" data-widget="uploader"></div>') : html`<div class="frame frame--device">${mediaEl(w.media, paths) || html`<span class="frame__empty mono">[ SCREENSHOT ]</span>`}</div>`}
          </div>
          <div class="device__foot">${open}</div>
        </div>`;
  } else if (w.style === 'phone') {
    body = html`
        <div class="phone settle ${delay}">
          <div class="phone__screen">
            <span class="phone__notch" aria-hidden="true"></span>
            <div class="stack-4"><span class="label label--dark">${label}</span><span class="phone__title">${w.title}</span></div>
            ${w.demo === 'toto' ? new Raw('<div class="toto" data-widget="toto"></div>') : html`<div class="frame frame--phone">${mediaEl(w.media, paths) || html`<span class="frame__empty mono">[ SCREENSHOT ]</span>`}</div>`}
          </div>
          <div class="phone__foot">${open}</div>
        </div>`;
  } else if (w.style === 'screen') {
    body = html`
        <div class="screen settle ${delay}">
          <div class="screen__display">${mediaEl(w.media, paths) || html`<span class="frame__empty mono">[ SCREENSHOT ]</span>`}</div>
          <div class="screen__foot"><span class="label label--dark">${label}</span><span class="screen__title">${w.title}</span>${open}</div>
        </div>`;
  } else {
    body = html`
        <div class="polaroid settle ${delay}">
          <div class="polaroid__img mono">${mediaEl(w.media, paths) || '[ SCREENSHOT ]'}</div>
          <span class="label">${label}</span>
          <span class="polaroid__title">${w.title}</span>
          <a class="uline mono-link" href="${href}">OPEN PROJECT →</a>
        </div>`;
  }
  return html`
      <!-- ${w.title} -->
      <div class="obj" ${objAttrs('work:' + w.id, w.desk, order)}>${body}
      </div>
`;
}

function deskMonitor(c, order) {
  return html`
      <!-- Monitor -->
      <div class="obj" ${objAttrs('monitor', c.desk.monitor, order)}>
        <div class="monitor settle d1">
          <div class="monitor__screen" data-monitor data-state="empty">
            <span class="scanlines" aria-hidden="true"></span>
            <div class="monitor__empty mono"><span class="monitor__nosignal">NO SIGNAL</span><span class="monitor__hint"><span class="only-wide">DRAG A TAPE IN HERE</span><span class="only-narrow">TAP ▶ ON A TAPE TO PLAY IT</span></span></div>
            <div class="monitor__idle tv-on">
              <span class="credit" data-monitor-presents></span>
              <span class="monitor__title" data-monitor-title></span>
              <span class="credit credit--light" data-monitor-part></span>
              <button class="btn play-btn" type="button" data-monitor-play aria-label="Play film">${PLAY_ICON}</button>
            </div>
            <div class="monitor__playing" data-monitor-player></div>
          </div>
          <div class="monitor__foot">
            <a class="uline mono-link mono-link--light" href="#/films">ALL FILMS →</a>
            <div class="row-gap-12">
              <button class="btn eject" type="button" data-eject>⏏ EJECT</button>
              <span class="power" data-power aria-hidden="true"></span>
            </div>
          </div>
        </div>
      </div>
`;
}

function deskTapes(c, order) {
  var tapes = c.films.filter(function (f) { return f.tape.show; });
  if (!tapes.length) return '';
  return html`
      <!-- Tapes. Each one plays its film on the monitor. -->
      <div class="tapes" data-obj-group="tapes" data-m="${order}">
${tapes.map(function (f, j) {
    var delay = ['d3', 'd4', 'd1', 'd2'][j % 4];
    return html`      <div class="obj" ${objAttrs('tape:' + f.id, f.tape, order)} data-tape
           data-title="${f.title}" data-part="${f.part}" data-presents="${f.presents}" data-youtube="${f.youtube}">
        <div class="tape settle ${delay}">
          <div class="tape__label"><span>${f.tape.label}</span><button class="btn tape__play" type="button" data-insert aria-label="${'Play ' + (f.label || f.title) + ' on the monitor'}">${PLAY_ICON}</button></div>
          <div class="tape__reels" aria-hidden="true"><span></span><span></span></div>
        </div>
      </div>
`;
  })}      </div>
`;
}

function pageHome(c, paths) {
  var size = deskSize(c);
  var order = function (key) { return c.desk.mobileOrder.indexOf(key) + 1; };
  var works = [];
  c.works.forEach(function (w, i) {
    if (w.desk.show) works.push(deskWork(w, i, order('work:' + w.id), paths));
  });
  return html`
<!-- ============ HOME: THE DESK ============ -->
<section class="page page--home" data-page="home" data-route="/" data-label="The desk" data-name="THE DESK" aria-label="The desk">
  <div class="desk-scroll">
    <div class="desk grid-surface" data-desk data-w="${size.w}" data-h="${size.h}">
      <span class="desk__hint mono"><span class="only-wide">${c.desk.hint}</span><span class="only-narrow">${c.desk.hintMobile}</span></span>
${deskNote(c, order('note'))}${works}${deskMonitor(c, order('monitor'))}${deskTapes(c, order('tapes'))}    </div>
  </div>
</section>
`;
}

/* ---------- Work ---------- */

/* What a work card shows behind its title: the replica's poster, with its video loaded and played only
   on hover (js/main.js), else the work's own picture, else nothing and the card stays plain ink. */
function cardShot(w, paths) {
  var replica = replicaOf(w);
  if (replica) {
    return html`<div class="card__shot card__shot--app" aria-hidden="true"><img src="${paths.asset(replica.poster)}" alt="" loading="lazy" decoding="async"><video data-card-video data-src="${paths.asset(replica.video)}" muted loop playsinline preload="none"></video></div>`;
  }
  var media = mediaEl(w.media, paths);
  return media ? html`<div class="card__shot">${media}</div>` : '';
}

function pageWork(c, paths) {
  var cards = c.works.map(function (w, i) {
    var shot = cardShot(w, paths);
    return html`
      <a class="card${shot ? ' card--shot' : ''}" href="${'#/work/' + w.id}" data-cursor="view">
        <div class="card__cover">${shot}<div class="card__inner${shot ? '' : ' grid-dark'}"><span class="card__no">${pad2(i + 1)}</span><span class="card__title">${w.title}</span></div><span class="card__bar" aria-hidden="true"></span></div>
        <div class="card__meta mono"><span>${upper(w.title)}</span><span class="muted">${w.kind}</span></div>
      </a>`;
  });
  cards.push(html`
      <a class="card" href="#/films" data-cursor="view">
        <div class="card__cover"><div class="card__inner grid-dark"><span class="card__no">${pad2(c.works.length + 1)}</span><span class="card__title">Films</span></div><span class="card__bar" aria-hidden="true"></span></div>
        <div class="card__meta mono"><span>FILMS</span><span class="muted">${upper(c.site.channel)}</span></div>
      </a>`);
  return html`
<!-- ============ WORK ============ -->
<section class="page page--work" data-page="work" data-route="/work" data-label="Work" data-name="WORK" aria-label="Work">
  <div class="wrap">
    <div class="page-head">
      <h1 class="display" data-split>Work</h1>
      <a class="uline mono-link up d2" href="#/">← BACK TO THE DESK</a>
    </div>
    <div class="cards up d2">${cards}
    </div>
  </div>
</section>
`;
}

function stageObject(w, paths) {
  if (w.style === 'device') {
    return html`
      <div class="device device--big">
        <div class="device__screen device__screen--paper">
          <div class="row-between"><span class="label">${upper(w.title)}</span></div>
          <div class="frame frame--device">${mediaEl(w.media, paths, true) || html`<span class="frame__empty mono">[ SCREENSHOT OR SCREEN RECORDING ]</span>`}</div>
        </div>
      </div>`;
  }
  if (w.style === 'phone') {
    return html`
      <div class="phone phone--big">
        <div class="phone__screen">
          <span class="phone__notch" aria-hidden="true"></span>
          <span class="phone__title">${w.title}</span>
          ${w.demo === 'toto' ? new Raw('<div class="toto" data-widget="toto"></div>') : html`<div class="frame frame--phone">${mediaEl(w.media, paths, true) || html`<span class="frame__empty mono">[ SCREENSHOT OR SCREEN RECORDING ]</span>`}</div>`}
        </div>
      </div>`;
  }
  if (w.style === 'screen') {
    return html`
      <div class="screen screen--big">
        <div class="screen__display">${mediaEl(w.media, paths, true) || html`<span class="frame__empty mono">[ SCREENSHOT OR SCREEN RECORDING ]</span>`}</div>
        <div class="screen__foot"><span class="screen__title">${w.title}</span><span class="power is-on" aria-hidden="true"></span></div>
      </div>`;
  }
  return html`
      <div class="polaroid polaroid--big">
        <div class="polaroid__img mono">${mediaEl(w.media, paths, true) || '[ SCREENSHOT OR SCREEN RECORDING ]'}</div>
        <span class="polaroid__title">${w.title}</span>
      </div>`;
}

/* The full product on its project page: an ink device holding the interactive replica (TRY IT) and a
   recorded video of it (WATCH IT). js/main.js loads the replica only when the page opens and scales it
   to fit; phones and tablets get the video, with a link to open the replica anyway. */
function replicaOf(w) { return w.demo && DEMOS[w.demo].replica || null; }

function replicaStage(r, paths) {
  var full = paths.asset(r.src);
  return html`
    <div class="stage stage--replica grid-surface grid-surface--deep up d3">
      <span class="stage__label mono">THE REAL THING · FULLY CLICKABLE</span>
      <div class="replica" data-replica data-src="${full}" data-w="${r.width}" data-h="${r.height}" data-title="${r.title}" data-mode="try">
        <div class="replica__bar">
          <span class="replica__title mono"><span class="replica__live" aria-hidden="true"></span>${upper(r.title)} · MADE-UP DATA</span>
          <div class="replica__modes" role="group" aria-label="Demo or video">
            <button class="btn replica__mode" type="button" data-replica-mode="try" aria-pressed="true">TRY IT</button>
            <button class="btn replica__mode" type="button" data-replica-mode="watch" aria-pressed="false">WATCH IT</button>
          </div>
          <div class="replica__actions">
            <button class="btn replica__act" type="button" data-replica-reset>↺ START OVER</button>
            <a class="replica__act" href="${full}" data-replica-full>⤢ FULL SCREEN</a>
          </div>
        </div>
        <div class="replica__screen">
          <div class="replica__viewport" data-replica-viewport data-cursor-off></div>
          <video class="replica__video" data-replica-video src="${paths.asset(r.video)}" poster="${paths.asset(r.poster)}" muted loop playsinline controls preload="none" aria-label="${'A recorded walk through ' + r.title}"></video>
        </div>
        <p class="replica__note mono">The clickable demo is built for a computer screen. <a class="uline" href="${full}">Open it anyway →</a></p>
      </div>
    </div>`;
}

function pageProject(c, w, i, paths) {
  var next = c.works[i + 1];
  var nextHref = next ? '#/work/' + next.id : '#/films';
  var nextTitle = next ? next.title + ' →' : 'The films →';
  var link = safeHref(w.link);
  var replica = replicaOf(w);
  return html`
<!-- ============ PROJECT: ${upper(w.title)} ============ -->
<section class="page page--project" data-page="${'work-' + w.id}" data-route="${'/work/' + w.id}" data-label="${w.title}" data-name="${'WORK / ' + upper(w.title)}" aria-label="${w.title}">
  <div class="wrap">
    <a class="uline mono-link up" href="#/work">← ALL WORK</a>
    <div class="proj-head">
      <span class="label label--accent up">${numLabel(i, w.kind)}</span>
      <h1 class="display" data-split>${w.title}</h1>
    </div>
    <div class="proj-meta up d2">
      ${w.year ? html`<div><span class="label">YEAR</span><span class="strong">${w.year}</span></div>` : ''}
      ${w.madeWith ? html`<div><span class="label">MADE WITH</span><span class="strong">${w.madeWith}</span></div>` : ''}
      ${w.description ? html`<p>${w.description}</p>` : ''}
      ${link ? html`<a class="uline mono-link proj-meta__link" href="${link}" target="_blank" rel="noopener">VISIT THE LIVE PRODUCT ↗</a>` : ''}
    </div>
    ${replica ? replicaStage(replica, paths) : html`<div class="stage grid-surface grid-surface--deep up d3">
      <span class="stage__label mono">${w.demo ? 'ON THE DESK · TRY IT' : 'ON THE DESK'}</span>${stageObject(w, paths)}
    </div>`}
    <a class="next" href="${nextHref}" data-cursor="view"><span class="label">NEXT</span><span class="next__title uline">${nextTitle}</span></a>
  </div>
</section>
`;
}

/* ---------- Films ---------- */

function pageFilms(c) {
  var spans = reelSpans(c.films);
  var clips = c.films.map(function (f) {
    var s = spans[f.id];
    return html`
            <button class="clip${f.soon ? ' clip--soon' : ''}" type="button" data-clip data-id="${f.id}" data-start="${s[0]}" data-end="${s[1]}"
              data-label="${f.label}" data-title="${f.title}" data-part="${f.part}"
              data-presents="${f.presents}" data-meta="${filmMeta(f)}"
              data-file="${f.file}" data-youtube="${f.youtube}"${f.soon ? new Raw(' data-soon') : ''}>${f.label}</button>`;
  });
  return html`
<!-- ============ FILMS ============ -->
<section class="page page--films" data-page="films" data-route="/films" data-label="Films" data-name="FILMS" aria-label="Films">
  <div class="films">
    <div class="films__head">
      <h1 class="display display--films" data-split>Films</h1>
      <span class="timecode mono" data-timecode>00:00:00:00</span>
    </div>

    <div class="viewer up d1">
      <div class="viewer__screen">
        <span class="scanlines" aria-hidden="true"></span>
        <span class="viewer__file mono" data-reel-file></span>
        <div class="viewer__scene" data-reel-scene>
          <div class="viewer__idle">
            <span class="credit" data-reel-presents></span>
            <span class="viewer__title" data-reel-title></span>
            <span class="credit credit--light" data-reel-part></span>
            <button class="btn play-btn play-btn--big" type="button" data-reel-filmplay aria-label="Play film">${PLAY_ICON}</button>
          </div>
          <div class="viewer__player" data-reel-player></div>
        </div>
      </div>
      <div class="transport">
        <button class="btn tbtn" type="button" data-reel-prev aria-label="Previous film"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6z"/><path d="M20 5v14L9 12z"/></svg></button>
        <button class="btn tbtn tbtn--play" type="button" data-reel-toggle aria-label="Play reel">
          <svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14l12-7z"/></svg>
          <svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6z"/><path d="M14 5h4v14h-4z"/></svg>
        </button>
        <button class="btn tbtn" type="button" data-reel-next aria-label="Next film"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2z"/><path d="M4 5v14l11-7z"/></svg></button>
        <span class="transport__label mono" data-reel-label></span>
      </div>
    </div>

    <!-- The reel. Each clip covers data-start to data-end (0 to 1 along the timeline). -->
    <div class="timeline up d2">
      <div class="timeline__inner">
        <div class="timeline__labels mono"><span class="tl-spacer"></span><span class="tl-row">FILMS</span></div>
        <div class="timeline__lanes">
          <button class="ruler" type="button" data-scrub aria-label="Scrub the reel"></button>
          <div class="lane" data-lane>${clips}
          </div>
          <div class="playhead" data-playhead aria-hidden="true"><span class="playhead__head"></span><span class="playhead__line"></span></div>
        </div>
      </div>
    </div>
  </div>
</section>
`;
}

/* ---------- About ---------- */

function contactLinks(c) {
  var items = [];
  if (c.site.email) items.push(html`<a class="uline" href="${'mailto:' + c.site.email}">${c.site.email}</a>`);
  c.site.links.forEach(function (l) {
    var href = safeHref(l.url);
    if (href && l.label) items.push(html`<a class="uline" href="${href}" target="_blank" rel="noopener">${l.label}</a>`);
  });
  return items;
}

function pageAbout(c) {
  var links = contactLinks(c);
  var joined = links.map(function (l, i) { return i ? html` · ${l}` : l; });
  return html`
<!-- ============ ABOUT ============ -->
<section class="page page--about" data-page="about" data-route="/about" data-label="About" data-name="ABOUT" aria-label="About">
  <div class="wrap">
    <h1 class="display" data-split>About</h1>
    <div class="about up d2">
      <p class="about__lead">${c.about.lead}</p>
      <div class="about__side">
        ${c.about.before.length ? html`<span class="label label--accent">BEFORE</span>${c.about.before.map(function (l) { return html`
        <span>${l}</span>`; })}` : ''}
        ${links.length ? html`<span class="label label--accent${c.about.before.length ? ' about__gap' : ''}">ELSEWHERE</span>
        <span>${joined}</span>` : ''}
      </div>
    </div>
  </div>
</section>
`;
}

/* ---------- Document ---------- */

function headMeta(c, paths, opts) {
  var url = c.site.url ? c.site.url + '/' : '';
  return html`<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${c.site.title}</title>
<meta name="description" content="${c.site.description}">
<meta name="theme-color" content="#EDE9E1">
${opts.build ? html`<meta name="build" content="${opts.build}">
` : ''}${url ? html`<link rel="canonical" href="${url}">
<meta property="og:url" content="${url}">
` : ''}<meta property="og:type" content="website">
<meta property="og:title" content="${c.site.title}">
<meta property="og:description" content="${c.site.description}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${paths.asset('favicon.svg')}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;800&family=Inter:wght@400;500;600;700&family=Caveat:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${paths.asset('css/style.css')}">`;
}

/* Returns the full index.html as a string.
   opts.root     prefix for css/js/media paths (the admin preview passes the site's absolute URL)
   opts.build    id written into <meta name="build">, used to tell when a publish is live
   opts.mode     'site' (default), 'preview' or 'arrange'
   opts.mediaUrl maps media/... paths to URLs (the preview uses it for unpublished uploads) */
export function renderSite(content, opts) {
  opts = opts || {};
  var c = normalize(content);
  var paths = makePaths(opts);
  var mode = opts.mode === 'preview' || opts.mode === 'arrange' ? opts.mode : '';
  var email = c.site.email;
  return tidy('<!doctype html>\n' +
'<!-- Generated from content/site.json by js/render.js. Edit content in /admin/, not here. -->\n' + html`<html lang="en"${mode ? html` data-mode="${mode}"` : ''}>
<head>
${headMeta(c, paths, opts)}
</head>
<body data-page="home" data-site-title="${c.site.title}" data-site-name="${c.site.name}">

<header class="site-header">
  <div class="site-header__inner">
    <a class="brand uline" href="#/">${c.site.name}</a>
    <div class="site-header__right">
      <span class="page-name mono" data-page-name>THE DESK</span>
      <button class="btn pill pill--solid" type="button" data-menu-toggle aria-expanded="false" aria-controls="menu">Menu</button>
    </div>
  </div>
</header>

<main>
${pageHome(c, paths)}${pageWork(c, paths)}${c.works.map(function (w, i) { return pageProject(c, w, i, paths); })}${pageFilms(c)}${pageAbout(c)}
</main>

<!-- Menu -->
<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true">
  <div class="menu__top"><button class="btn pill pill--paper" type="button" data-menu-toggle>Close</button></div>
  <nav class="menu__nav">
    <a class="mlink" href="#/"><span class="mlink__in"><span class="mlink__num">01</span>The desk</span></a>
    <a class="mlink" href="#/work"><span class="mlink__in"><span class="mlink__num">02</span>Work</span></a>
    <a class="mlink" href="#/films"><span class="mlink__in"><span class="mlink__num">03</span>Films</span></a>
    <a class="mlink" href="#/about"><span class="mlink__in"><span class="mlink__num">04</span>About</span></a>
  </nav>
  <div class="menu__foot mono"><span>${c.site.tagline}</span>${email ? html`<a class="uline" href="${'mailto:' + email}">${email}</a>` : ''}</div>
</div>

<!-- Page wipe -->
<div class="wipe" data-wipe aria-hidden="true">
  <span class="wipe__kicker mono">NOW OPENING</span>
  <span class="wipe__label" data-wipe-label></span>
</div>

<!-- Custom cursor -->
<div class="cursor" data-cursor-el aria-hidden="true"><span data-cursor-text>VIEW</span></div>

<script src="${paths.asset('js/main.js')}"></script>
</body>
</html>
`.s);
}

/* ---------- Share pages ----------
   One small page per work and film with its own title and link preview, sending people into the site.
   Works live at w/<id>/, films at f/<id>/. */

export function renderSharePages(content) {
  var c = normalize(content);
  var base = c.site.url ? c.site.url + '/' : '';
  var pages = [];
  c.works.forEach(function (w) {
    var replica = replicaOf(w);
    var image = !base ? '' : w.media && w.media.type === 'image' ? base + w.media.src : replica ? base + replica.poster : '';
    pages.push({ path: 'w/' + w.id + '/index.html', html: sharePage(c, w.title, w.description, '#/work/' + w.id, image) });
  });
  c.films.forEach(function (f) {
    var title = [f.title, f.part].filter(Boolean).join(' · ');
    var image = f.youtube ? 'https://i.ytimg.com/vi/' + f.youtube + '/hqdefault.jpg' : '';
    var desc = [f.presents, filmMeta(f)].filter(Boolean).join(' · ');
    pages.push({ path: 'f/' + f.id + '/index.html', html: sharePage(c, title, desc, '#/films/' + f.id, image) });
  });
  return pages;
}

function sharePage(c, title, description, hash, image) {
  var base = c.site.url ? c.site.url + '/' : '';
  var target = '../../' + hash;
  var fullTitle = title + ' — ' + c.site.name;
  return tidy('<!doctype html>\n' +
'<!-- Generated by js/render.js. Edit content in /admin/, not here. -->\n' + html`<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta name="description" content="${description}">
${base ? html`<link rel="canonical" href="${base + hash}">
<meta property="og:url" content="${base + hash}">
` : ''}<meta property="og:type" content="website">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${description}">
${image ? html`<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
` : html`<meta name="twitter:card" content="summary">
`}<meta http-equiv="refresh" content="${'0; url=' + target}">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml">
</head>
<body>
<p><a href="${target}">${fullTitle}</a></p>
</body>
</html>
`.s);
}
