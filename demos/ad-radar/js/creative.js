/* Ad Radar demo: the ad creatives, drawn for the demo. No real ad is shown anywhere. A "photo" ad is
   a flat illustration of its subject with the headline in a dark box over it, the way these native
   ads usually look; a "text" ad is the headline in big type on a colored card. The drawings are fixed
   strings written here; the headline always goes in as text. */

import { h } from './dom.js';

/* Each scene: a background and a few flat shapes on a 100 x 125 canvas (a 4:5 feed ad). */
var SCENES = {
  car: '<rect width="100" height="125" fill="#d9dde2"/><rect y="70" width="100" height="55" fill="#bfc5cc"/><rect x="8" y="14" width="84" height="30" fill="#eef1f4"/><path d="M8 44h84" stroke="#9aa3ad" stroke-width="1.2"/>'
    + '<path d="M18 74c2-9 8-13 16-14l8-8c3-3 7-4 11-4h10c5 0 9 2 12 6l6 7c6 1 9 5 9 13v4H18z" fill="#c8ccd2" stroke="#7c848e" stroke-width="1"/><path d="M45 52h17l7 8H38z" fill="#5d6a78"/>'
    + '<circle cx="33" cy="79" r="7" fill="#2a2e33"/><circle cx="73" cy="79" r="7" fill="#2a2e33"/><circle cx="33" cy="79" r="3" fill="#9aa3ad"/><circle cx="73" cy="79" r="3" fill="#9aa3ad"/>',
  truck: '<rect width="100" height="125" fill="#f2c98b"/><circle cx="76" cy="26" r="10" fill="#fbe3b5"/><rect y="78" width="100" height="47" fill="#7a6a58"/>'
    + '<path d="M10 76V60c0-3 2-5 5-5h28l8-11h20c4 0 6 2 7 5l3 11h4c3 0 5 2 5 5v11z" fill="#b8402e"/><path d="M53 47h16l4 12H47z" fill="#30475e"/><rect x="10" y="55" width="34" height="5" fill="#8e2f22"/>'
    + '<circle cx="27" cy="78" r="8" fill="#222"/><circle cx="74" cy="78" r="8" fill="#222"/><circle cx="27" cy="78" r="3.4" fill="#aaa"/><circle cx="74" cy="78" r="3.4" fill="#aaa"/>',
  house: '<rect width="100" height="125" fill="#bcd6e8"/><rect y="88" width="100" height="37" fill="#8fb36f"/><path d="M20 50 50 26l30 24v40H20z" fill="#f4ede1"/><path d="M14 52 50 22l36 30" fill="none" stroke="#a5523d" stroke-width="5" stroke-linejoin="round"/>'
    + '<rect x="28" y="56" width="12" height="11" fill="#5f7d95"/><rect x="60" y="56" width="12" height="11" fill="#5f7d95"/><rect x="44" y="68" width="12" height="22" fill="#8a5a3c"/><rect x="28" y="72" width="12" height="11" fill="#5f7d95"/><rect x="60" y="72" width="12" height="11" fill="#5f7d95"/>',
  kitchen: '<rect width="100" height="125" fill="#efe7dc"/><rect x="6" y="14" width="88" height="26" fill="#ffffff" stroke="#d6cbbb"/><path d="M28 14v26M50 14v26M72 14v26" stroke="#d6cbbb"/>'
    + '<rect y="62" width="100" height="6" fill="#4c4a47"/><rect y="68" width="100" height="40" fill="#5e7c6b"/><path d="M33 68v40M67 68v40" stroke="#4a6556"/><rect x="14" y="84" width="10" height="2" fill="#d9d2c4"/><rect x="76" y="84" width="10" height="2" fill="#d9d2c4"/>'
    + '<rect x="40" y="48" width="20" height="14" rx="3" fill="#c76b4a"/><path d="M60 52h6" stroke="#c76b4a" stroke-width="2"/><rect y="108" width="100" height="17" fill="#cdbfa9"/>',
  money: '<rect width="100" height="125" fill="#1f4d3a"/><g transform="rotate(-12 50 60)"><rect x="18" y="40" width="64" height="34" rx="3" fill="#7fb48a"/><circle cx="50" cy="57" r="9" fill="none" stroke="#2f6b46" stroke-width="2"/><path d="M50 51v12M46.5 54c0-2 7-2 7 0s-7 2-7 4.5 7 2 7 0" fill="none" stroke="#2f6b46" stroke-width="1.6"/></g>'
    + '<g transform="rotate(8 50 70)"><rect x="22" y="56" width="64" height="34" rx="3" fill="#9cc7a3"/><circle cx="54" cy="73" r="9" fill="none" stroke="#2f6b46" stroke-width="2"/></g><circle cx="22" cy="100" r="9" fill="#e2b64f"/><circle cx="30" cy="104" r="9" fill="#efc964"/>',
  smile: '<rect width="100" height="125" fill="#f6d5d3"/><circle cx="50" cy="56" r="30" fill="#fbe9e7"/><path d="M30 52c6 16 34 16 40 0z" fill="#b5463f"/><path d="M33 53h34v5c-4 3-30 3-34 0z" fill="#fff"/><path d="M41 53v5M50 53v5.6M59 53v5" stroke="#e5dcdb" stroke-width="1"/>'
    + '<path d="M24 34c4-5 10-7 14-6M76 34c-4-5-10-7-14-6" stroke="#9e5a52" stroke-width="2" fill="none" stroke-linecap="round"/>',
  study: '<rect width="100" height="125" fill="#d7d0e8"/><rect y="78" width="100" height="47" fill="#8c6f56"/><rect x="22" y="50" width="44" height="28" rx="2" fill="#2d2f36"/><rect x="25" y="53" width="38" height="22" fill="#9fb6d8"/><rect x="18" y="78" width="52" height="3" rx="1" fill="#55575e"/>'
    + '<rect x="72" y="58" width="8" height="20" fill="#c0563f"/><rect x="80" y="62" width="7" height="16" fill="#3f6f9e"/><rect x="87" y="55" width="6" height="23" fill="#e0b04f"/><path d="M38 30 50 24l12 6-12 6z" fill="#2d2f36"/><path d="M44 33v6c4 3 8 3 12 0v-6" fill="#2d2f36"/>',
  garage: '<rect width="100" height="125" fill="#cfe0ea"/><rect y="84" width="100" height="41" fill="#9a9a94"/><path d="M14 46h72v40H14z" fill="#e9e4da"/><path d="M10 48 50 28l40 20" fill="#6f7479"/>'
    + '<rect x="24" y="56" width="52" height="30" fill="#b9bcc0"/><path d="M24 62h52M24 68h52M24 74h52M24 80h52" stroke="#9fa3a8"/><rect x="40" y="86" width="20" height="39" fill="#8d8d87"/>',
  solar: '<rect width="100" height="125" fill="#8ec5ea"/><circle cx="80" cy="20" r="9" fill="#ffd866"/><rect y="92" width="100" height="33" fill="#78a35d"/><path d="M8 70 50 40l42 30v22H8z" fill="#efe6d7"/>'
    + '<path d="M18 63 50 40l32 23" fill="#3b4a5c"/><path d="M26 58 50 41l24 17M34 52.5 50 41.5M50 41.5 66 52.5M42 47l16 0" stroke="#7d9ec2" stroke-width=".8" fill="none"/><rect x="44" y="74" width="12" height="18" fill="#8a5a3c"/>',
  laptop: '<rect width="100" height="125" fill="#e8e1d3"/><rect y="80" width="100" height="45" fill="#b08a64"/><rect x="24" y="48" width="52" height="32" rx="2" fill="#2b2d33"/><rect x="27" y="51" width="46" height="26" fill="#f5f5f2"/>'
    + '<path d="M31 57h30M31 62h38M31 67h24M31 72h32" stroke="#b9bcc3" stroke-width="1.6"/><path d="M18 80h64l-4 5H22z" fill="#4a4c53"/><rect x="80" y="66" width="9" height="14" rx="2" fill="#f1f1ee"/><path d="M89 70c4 0 4 6 0 6" fill="none" stroke="#f1f1ee" stroke-width="1.6"/>',
  clipboard: '<rect width="100" height="125" fill="#cfe3dc"/><rect x="26" y="22" width="48" height="66" rx="3" fill="#a87c52"/><rect x="31" y="30" width="38" height="54" fill="#fff"/><rect x="40" y="18" width="20" height="8" rx="2" fill="#5b6066"/>'
    + '<path d="m35 40 3 3 5-6M35 52l3 3 5-6M35 64l3 3 5-6" fill="none" stroke="#3a8f5b" stroke-width="1.8"/><path d="M47 40h17M47 52h17M47 64h12M35 76h29" stroke="#c4c8cc" stroke-width="2"/>'
};

var PALETTES = { pink: ['#ff4fa3', '#8b3df0'], violet: ['#5b3df0', '#b83dd6'], teal: ['#0f9a8c', '#1c5fd1'], amber: ['#f29d1f', '#e2452f'] };

/* creative(ad, 'thumb' | 'large') */
export function creative(ad, size) {
  var big = size === 'large';
  var el = h('div.creative.creative--' + (size || 'thumb') + '.creative--' + ad.look, { 'aria-hidden': big ? null : 'true' });
  if (ad.look === 'text') {
    var p = PALETTES[ad.palette] || PALETTES.pink;
    el.style.background = 'linear-gradient(150deg,' + p[0] + ',' + p[1] + ')';
    el.appendChild(h('p.creative__words', { text: ad.headline }));
  } else {
    var art = h('div.creative__art');
    art.innerHTML = '<svg viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">' + (SCENES[ad.scene] || SCENES.laptop) + '</svg>';
    el.appendChild(art);
    el.appendChild(h('p.creative__caption', { text: ad.headline }));
  }
  if (ad.format === 'video') el.appendChild(h('span.creative__play', { 'aria-hidden': 'true' }));
  return el;
}
