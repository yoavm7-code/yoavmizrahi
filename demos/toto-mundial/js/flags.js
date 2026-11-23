/* Toto Mundial demo: round flags, drawn simply on a 24 x 24 grid and clipped to a circle.
   Emoji flags don't render on Windows, so every flag the demo uses is drawn here. */

var R = function (x, y, w, h, fill) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"/>'; };
var V3 = function (a, b, c) { return R(0, 0, 8, 24, a) + R(8, 0, 8, 24, b) + R(16, 0, 8, 24, c); };
var H3 = function (a, b, c) { return R(0, 0, 24, 8, a) + R(0, 8, 24, 8, b) + R(0, 16, 24, 8, c); };
var DOT = function (cx, cy, r, fill) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"/>'; };
var STRIPES = function (n, a, b) {
  var s = '';
  for (var i = 0; i < n; i++) s += R(0, i * 24 / n, 24, 24 / n + 0.2, i % 2 ? b : a);
  return s;
};

var ART = {
  ARG: H3('#74acdf', '#ffffff', '#74acdf') + DOT(12, 12, 2.6, '#f6b40e'),
  BRA: R(0, 0, 24, 24, '#229e45') + '<path d="M12 4.5 21.5 12 12 19.5 2.5 12z" fill="#f8e509"/>' + DOT(12, 12, 4.4, '#2b49a3'),
  CAN: R(0, 0, 24, 24, '#ffffff') + R(0, 0, 6, 24, '#d52b1e') + R(18, 0, 6, 24, '#d52b1e') + '<path d="M12 7l1.2 2.6 2.3-.8-.9 2.6 1.9 1.2-2.6.9.4 2.5H12.6v2h-1.2v-2H9.7l.4-2.5-2.6-.9 1.9-1.2-.9-2.6 2.3.8z" fill="#d52b1e"/>',
  CRO: H3('#ff0000', '#ffffff', '#171796') + R(9, 7, 6, 7, '#ffffff') + R(9, 7, 2, 2, '#ff0000') + R(13, 7, 2, 2, '#ff0000') + R(11, 9, 2, 2, '#ff0000') + R(9, 11, 2, 2, '#ff0000') + R(13, 11, 2, 2, '#ff0000'),
  ENG: R(0, 0, 24, 24, '#ffffff') + R(10, 0, 4, 24, '#ce1124') + R(0, 10, 24, 4, '#ce1124'),
  ESP: R(0, 0, 24, 24, '#aa151b') + R(0, 6, 24, 12, '#f1bf00'),
  FRA: V3('#002395', '#ffffff', '#ed2939'),
  GER: H3('#000000', '#dd0000', '#ffce00'),
  JPN: R(0, 0, 24, 24, '#ffffff') + DOT(12, 12, 5.5, '#bc002d'),
  MAR: R(0, 0, 24, 24, '#c1272d') + '<path d="M12 7.2l1.3 4 4.2 0-3.4 2.5 1.3 4-3.4-2.5-3.4 2.5 1.3-4-3.4-2.5 4.2 0z" fill="none" stroke="#006233" stroke-width="1.1"/>',
  MEX: V3('#006847', '#ffffff', '#ce1126') + DOT(12, 12, 2.4, '#8c6a3c'),
  NED: H3('#ae1c28', '#ffffff', '#21468b'),
  POR: R(0, 0, 24, 24, '#ff0000') + R(0, 0, 10, 24, '#006600') + DOT(10, 12, 3.6, '#ffe000') + DOT(10, 12, 2.2, '#ff0000'),
  SEN: V3('#00853f', '#fdef42', '#e31b23') + '<path d="M12 9.2l.8 2.4 2.5 0-2 1.5.8 2.4-2.1-1.5-2.1 1.5.8-2.4-2-1.5 2.5 0z" fill="#00853f"/>',
  URU: STRIPES(9, '#ffffff', '#0038a8') + R(0, 0, 11, 10.7, '#ffffff') + DOT(5.5, 5.3, 2.8, '#fcd116'),
  USA: STRIPES(7, '#b22234', '#ffffff') + R(0, 0, 11, 10.3, '#3c3b6e')
};

/* An <svg> flag for a team code. The markup comes only from the fixed drawings above. */
export function flag(code, size) {
  var s = size || 24;
  var wrap = document.createElement('span');
  wrap.className = 'flag';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.style.width = wrap.style.height = s + 'px';
  wrap.innerHTML = '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '"><clipPath id="fc-' + code + '"><circle cx="12" cy="12" r="12"/></clipPath>' +
    '<g clip-path="url(#fc-' + code + ')">' + (ART[code] || R(0, 0, 24, 24, '#d9cfc8')) + '</g>' +
    '<circle cx="12" cy="12" r="11.6" fill="none" stroke="#00000022" stroke-width=".8"/></svg>';
  return wrap;
}

export function hasFlag(code) { return Object.prototype.hasOwnProperty.call(ART, code); }
