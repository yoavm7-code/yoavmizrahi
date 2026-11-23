/* Memesh demo: what was set for this replica in the admin (its logo and any wording changes).
   Read once at start-up from the site's published content, same origin. If it can't be read, the
   replica simply uses its own defaults. */

var LOGO_RE = /^media\/[a-z0-9-]+\.(?:webp|jpg|jpeg|png|gif)$/;

export async function loadSettings(demo) {
  try {
    var res = await fetch('../../content/site.json', { cache: 'no-cache' });
    if (!res.ok) return empty();
    var site = await res.json();
    var work = (site.works || []).filter(function (w) { return w && w.demo === demo; })[0];
    var r = work && work.replica;
    if (!r || typeof r !== 'object') return empty();
    return {
      logo: r.logo && LOGO_RE.test(r.logo.src) ? '../../' + r.logo.src : null,
      strings: r.strings && typeof r.strings === 'object' ? r.strings : {}
    };
  } catch (e) {
    return empty();
  }
}

function empty() { return { logo: null, strings: {} }; }
