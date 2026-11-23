/* Content rules shared by the page generator (render.js) and the admin.
   One place that says what valid content looks like. Plain ES module, no dependencies. */

export const SCHEMA_VERSION = 1;

/* Object styles a work can use on the desk and on its project page. */
export const STYLES = {
  device: { name: 'Device', hint: 'A small handheld device with a screen.' },
  phone: { name: 'Phone', hint: 'A phone, for apps and mobile products.' },
  polaroid: { name: 'Polaroid', hint: 'An instant photo, for screenshots.' },
  screen: { name: 'Monitor', hint: 'A small monitor, for desktop products.' }
};

/* Hand-built interactive demos. Only the works that own them can use them.
   A demo with a replica also gets the full product on its project page: an interactive copy
   (demos/<name>/, rendered at width x height and scaled to fit) and a recorded video of it.
   frame 'phone' puts a phone app in a phone-shaped device, which phones can use too. */
export const DEMOS = {
  uploader: {
    name: 'Upload demo',
    style: 'device',
    replica: {
      title: 'Mega Uploader',
      src: 'demos/mega-uploader/',
      video: 'demos/mega-uploader/demo.mp4',
      poster: 'demos/mega-uploader/poster.jpg',
      width: 1440,
      height: 900
    }
  },
  toto: {
    name: 'Score picker demo',
    style: 'phone',
    replica: {
      title: 'Toto Mundial',
      src: 'demos/toto-mundial/',
      video: 'demos/toto-mundial/demo.mp4',
      poster: 'demos/toto-mundial/poster.jpg',
      width: 390,
      height: 844,
      frame: 'phone'
    }
  },
  memesh: {
    name: 'Memesh replica',
    style: 'polaroid',
    replica: {
      title: 'Memesh',
      src: 'demos/memesh/',
      video: 'demos/memesh/demo.mp4',
      poster: 'demos/memesh/poster.jpg',
      width: 1440,
      height: 900
    }
  }
};

/* Approximate size of each desk object in px, used to size the desk and to place new objects. */
export const SIZES = {
  note: { w: 300, h: 250 },
  monitor: { w: 560, h: 400 },
  tape: { w: 210, h: 124 },
  device: { w: 330, h: 400 },
  phone: { w: 260, h: 590 },
  polaroid: { w: 220, h: 280 },
  screen: { w: 420, h: 330 }
};

export const DESK = { minWidth: 1420, minHeight: 820, maxX: 3000, maxY: 2400, maxR: 25 };

export const LIMITS = {
  short: 40,
  title: 60,
  line: 120,
  text: 400,
  lead: 600
};

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const YOUTUBE_RE = /^[A-Za-z0-9_-]{11}$/;
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const MEDIA_RE = /^media\/[a-z0-9-]+\.(?:webp|jpg|jpeg|png|gif|mp4|webm)$/;
const PLACEHOLDER_RE = /\[[^\]]+\]/;

/* ---------- Small helpers ---------- */

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '') || 'item';
}

export function uniqueId(base, taken) {
  var id = slugify(base);
  var n = 2;
  while (taken.indexOf(id) !== -1) { id = slugify(base) + '-' + n; n++; }
  return id;
}

/* Accepts a bare id or any common YouTube link and returns the 11-character id, or ''. */
export function youtubeId(input) {
  var s = String(input || '').trim();
  if (YOUTUBE_RE.test(s)) return s;
  var m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}

export function isSafeUrl(url) {
  return /^(?:https?:\/\/[^\s<>"]+|mailto:[^\s<>"]+)$/i.test(String(url || ''));
}

export function isMediaPath(path) { return MEDIA_RE.test(String(path || '')); }

export function hasPlaceholder(text) { return PLACEHOLDER_RE.test(String(text || '')); }

/* "12:40" or "1:02:05" to seconds, or 0 when it is not a time. */
export function runtimeSeconds(runtime) {
  var m = String(runtime || '').trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  return (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]);
}

function clampNum(v, min, max, fallback) {
  var n = Number(v);
  if (!isFinite(n)) return fallback;
  return Math.round(Math.max(min, Math.min(max, n)));
}
function str(v) { return typeof v === 'string' ? v : (v === null || v === undefined ? '' : String(v)); }
/* A plain object to write into: anything else (missing, a number, a list) becomes a new one. */
function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
/* Fields the design always shows in capitals (mono labels, film credits). Stored the same way. */
function caps(v) { return str(v).trim().toUpperCase(); }

/* ---------- Desk ids ---------- */

/* Every desk item has a key used for the phone stack order. Tapes move together as one group. */
export function deskKeys(content) {
  var keys = ['note', 'monitor'];
  if (content.films.some(function (f) { return f.tape && f.tape.show; })) keys.push('tapes');
  content.works.forEach(function (w) { if (w.desk && w.desk.show) keys.push('work:' + w.id); });
  return keys;
}

/* ---------- Normalize: fill defaults, coerce types, repair order. Never throws. ---------- */

export function normalize(input) {
  var c = obj(JSON.parse(JSON.stringify(input || {})));
  c.schemaVersion = SCHEMA_VERSION;

  var s = c.site = obj(c.site);
  ['name', 'title', 'description', 'channel', 'url', 'email'].forEach(function (k) { s[k] = str(s[k]).trim(); });
  s.tagline = caps(s.tagline);
  s.url = s.url.replace(/\/+$/, '');
  s.links = (Array.isArray(s.links) ? s.links : []).map(function (l) {
    return { label: str(l && l.label).trim(), url: str(l && l.url).trim() };
  });

  var d = c.desk = obj(c.desk);
  d.hint = caps(d.hint);
  d.hintMobile = caps(d.hintMobile);
  d.note = obj(d.note);
  ['hi', 'line', 'small'].forEach(function (k) { d.note[k] = str(d.note[k]); });
  [d.note, d.monitor = obj(d.monitor)].forEach(function (o) {
    o.x = clampNum(o.x, 0, DESK.maxX, 60);
    o.y = clampNum(o.y, 0, DESK.maxY, 40);
    o.r = clampNum(o.r, -DESK.maxR, DESK.maxR, 0);
  });

  c.works = (Array.isArray(c.works) ? c.works : []).map(function (w) {
    w = w || {};
    var out = {
      id: str(w.id),
      title: str(w.title).trim(),
      kind: caps(w.kind),
      year: str(w.year).trim(),
      madeWith: str(w.madeWith).trim(),
      description: str(w.description).trim(),
      link: str(w.link).trim(),
      style: STYLES[w.style] ? w.style : 'polaroid',
      demo: DEMOS[w.demo] ? w.demo : null,
      media: null,
      desk: {
        show: !(w.desk && w.desk.show === false),
        x: clampNum(w.desk && w.desk.x, 0, DESK.maxX, 60),
        y: clampNum(w.desk && w.desk.y, 0, DESK.maxY, 60),
        r: clampNum(w.desk && w.desk.r, -DESK.maxR, DESK.maxR, 0)
      }
    };
    if (out.demo) out.style = DEMOS[out.demo].style;
    if (w.media && w.media.src) {
      out.media = {
        type: w.media.type === 'video' ? 'video' : 'image',
        src: str(w.media.src),
        alt: str(w.media.alt).trim(),
        width: clampNum(w.media.width, 0, 10000, 0),
        height: clampNum(w.media.height, 0, 10000, 0)
      };
    }
    return out;
  });

  c.films = (Array.isArray(c.films) ? c.films : []).map(function (f) {
    f = f || {};
    var t = f.tape || {};
    return {
      id: str(f.id),
      title: caps(f.title),
      part: caps(f.part),
      label: caps(f.label),
      presents: caps(f.presents),
      genre: caps(f.genre),
      runtime: caps(f.runtime),
      file: caps(f.file),
      youtube: youtubeId(f.youtube),
      soon: !!f.soon,
      tape: {
        show: !f.soon && !!t.show,
        label: caps(t.label),
        x: clampNum(t.x, 0, DESK.maxX, 1000),
        y: clampNum(t.y, 0, DESK.maxY, 500),
        r: clampNum(t.r, -DESK.maxR, DESK.maxR, 0)
      }
    };
  });

  var a = c.about = obj(c.about);
  a.lead = str(a.lead).trim();
  a.before = (Array.isArray(a.before) ? a.before : []).map(function (l) { return str(l).trim(); }).filter(Boolean);

  /* Phone order: keep the saved order, drop keys that no longer exist, append new ones. */
  var keys = deskKeys(c);
  var order = (Array.isArray(d.mobileOrder) ? d.mobileOrder : []).filter(function (k, i, arr) {
    return keys.indexOf(k) !== -1 && arr.indexOf(k) === i;
  });
  keys.forEach(function (k) { if (order.indexOf(k) === -1) order.push(k); });
  d.mobileOrder = order;

  return c;
}

/* ---------- Validate: errors block publishing, warnings do not. ---------- */

export function validate(content) {
  var errors = [];
  var warnings = [];
  function err(path, msg) { errors.push({ path: path, msg: msg }); }
  function warn(path, msg) { warnings.push({ path: path, msg: msg }); }
  function need(path, value, label) { if (!value) err(path, label + ' is empty.'); }
  function max(path, value, n, label) { if (value && value.length > n) err(path, label + ' is too long (' + value.length + ' of ' + n + ' characters).'); }
  function placeholder(path, value, label) { if (hasPlaceholder(value)) warn(path, label + ' still has a placeholder: ' + value.match(PLACEHOLDER_RE)[0]); }

  var s = content.site;
  need('site.name', s.name, 'Your name');
  max('site.name', s.name, LIMITS.title, 'Your name');
  need('site.title', s.title, 'Browser tab title');
  max('site.title', s.title, LIMITS.line, 'Browser tab title');
  max('site.description', s.description, LIMITS.text, 'Search description');
  max('site.tagline', s.tagline, LIMITS.line, 'Tagline');
  max('site.channel', s.channel, LIMITS.title, 'Channel name');
  if (s.url && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<>"]*)?$/i.test(s.url)) err('site.url', 'Site address must start with https:// (for example https://yoavmizrahi.com).');
  if (s.email && !EMAIL_RE.test(s.email)) err('site.email', 'Email address does not look right.');
  if (!s.email) warn('site.email', 'No email address yet, so the About page and menu show none.');
  s.links.forEach(function (l, i) {
    var p = 'site.links.' + i;
    if (l.url && !isSafeUrl(l.url)) err(p + '.url', (l.label || 'Link') + ': the address must start with https://');
    if (l.url && !l.label) err(p + '.label', 'A link has an address but no name.');
    if (l.label && !l.url) warn(p + '.url', l.label + ' has no address yet, so it is hidden.');
    max(p + '.label', l.label, LIMITS.short, 'Link name');
  });

  var d = content.desk;
  max('desk.hint', d.hint, LIMITS.line, 'Desk hint');
  max('desk.hintMobile', d.hintMobile, LIMITS.line, 'Phone desk hint');
  need('desk.note.hi', d.note.hi, 'Sticky note greeting');
  max('desk.note.hi', d.note.hi, LIMITS.short, 'Sticky note greeting');
  max('desk.note.line', d.note.line, LIMITS.title, 'Sticky note line');
  max('desk.note.small', d.note.small, LIMITS.line, 'Sticky note small print');

  var ids = [];
  content.works.forEach(function (w, i) {
    var p = 'works.' + i;
    var name = w.title || 'Work ' + (i + 1);
    if (!ID_RE.test(w.id)) err(p + '.id', name + ': the web address name may only use a-z, 0-9 and dashes.');
    if (ids.indexOf(w.id) !== -1) err(p + '.id', name + ': another work already uses the web address "' + w.id + '".');
    ids.push(w.id);
    need(p + '.title', w.title, 'Work title');
    max(p + '.title', w.title, LIMITS.title, 'Work title');
    max(p + '.kind', w.kind, LIMITS.short, name + ' type');
    max(p + '.year', w.year, 12, name + ' year');
    max(p + '.madeWith', w.madeWith, LIMITS.title, name + ' "made with"');
    max(p + '.description', w.description, LIMITS.text, name + ' description');
    if (w.link && !isSafeUrl(w.link)) err(p + '.link', name + ': the live link must start with https://');
    if (w.media) {
      if (!isMediaPath(w.media.src)) err(p + '.media', name + ': the image or video file is not valid.');
      if (w.media.type === 'image' && !w.media.alt) warn(p + '.media.alt', name + ': the image has no description for screen readers.');
    }
    placeholder(p + '.year', w.year, name + ' year');
    placeholder(p + '.description', w.description, name + ' description');
    if (!w.demo && !w.media) warn(p + '.media', name + ' has no screenshot or video yet.');
  });

  var filmIds = [];
  content.films.forEach(function (f, i) {
    var p = 'films.' + i;
    var name = f.label || f.title || 'Film ' + (i + 1);
    if (!ID_RE.test(f.id)) err(p + '.id', name + ': the web address name may only use a-z, 0-9 and dashes.');
    if (filmIds.indexOf(f.id) !== -1) err(p + '.id', name + ': another film already uses the web address "' + f.id + '".');
    filmIds.push(f.id);
    need(p + '.title', f.title, 'Film title');
    max(p + '.title', f.title, LIMITS.short, 'Film title');
    max(p + '.part', f.part, LIMITS.short, name + ' subtitle');
    need(p + '.label', f.label, name + ' timeline label');
    max(p + '.label', f.label, LIMITS.short, name + ' timeline label');
    max(p + '.presents', f.presents, LIMITS.short, name + ' credit line');
    max(p + '.genre', f.genre, LIMITS.short, name + ' genre');
    max(p + '.runtime', f.runtime, 12, name + ' runtime');
    max(p + '.file', f.file, LIMITS.short, name + ' file name');
    if (f.tape.show) {
      need(p + '.tape.label', f.tape.label, name + ' tape label');
      max(p + '.tape.label', f.tape.label, 24, name + ' tape label');
    }
    var fieldNames = { title: 'title', part: 'subtitle', label: 'timeline label', genre: 'genre', runtime: 'runtime' };
    Object.keys(fieldNames).forEach(function (k) { placeholder(p + '.' + k, f[k], name + ' ' + fieldNames[k]); });
    if (!f.soon && !f.youtube) warn(p + '.youtube', name + ' has no YouTube video yet, so it shows a placeholder.');
  });
  if (!content.films.length) warn('films', 'There are no films, so the Films page is empty.');
  if (!content.works.length) warn('works', 'There are no works, so the Work page is empty.');

  need('about.lead', content.about.lead, 'About text');
  max('about.lead', content.about.lead, LIMITS.lead, 'About text');
  content.about.before.forEach(function (l, i) { max('about.before.' + i, l, LIMITS.line, 'Background line'); });

  return { errors: errors, warnings: warnings };
}
