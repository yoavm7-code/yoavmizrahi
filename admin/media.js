/* Prepares screenshots and screen recordings for the site.
   Images are redrawn through a canvas: that resizes them, makes them small, and drops hidden
   data such as the GPS location phones write into photos. Videos are kept as they are. */

import { LIMITS } from './config.js';

export var ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

/* Returns { path, base64, type, width, height, previewUrl } ready to upload, or throws an Error
   whose message is written for a person. */
export async function prepare(file) {
  if (!file) throw new Error('No file was chosen.');
  if (file.size > LIMITS.fileBytes) throw new Error('That file is too big (' + mb(file.size) + '). Use something under ' + mb(LIMITS.fileBytes) + '.');
  if (/^video\/(mp4|webm)$/.test(file.type)) return prepareVideo(file);
  if (/^image\//.test(file.type)) return prepareImage(file);
  throw new Error("This file type isn't supported. Use a JPG, PNG or WebP image, or an MP4 video.");
}

async function prepareImage(file) {
  var url = URL.createObjectURL(file);
  var img = new Image();
  img.src = url;
  try { await img.decode(); }
  catch (e) { URL.revokeObjectURL(url); throw new Error("This image couldn't be opened. Try saving it as a JPG or PNG first.", { cause: e }); }
  var w = img.naturalWidth, hgt = img.naturalHeight;
  var scale = Math.min(1, LIMITS.imageEdge / Math.max(w, hgt));
  w = Math.max(1, Math.round(w * scale));
  hgt = Math.max(1, Math.round(hgt * scale));
  var canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = hgt;
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, hgt);
  URL.revokeObjectURL(url);

  var blob = await toBlob(canvas, 'image/webp', LIMITS.imageQuality);
  var ext = 'webp';
  if (!blob || blob.type !== 'image/webp') { blob = await toBlob(canvas, 'image/jpeg', 0.88); ext = 'jpg'; }
  if (!blob) throw new Error("This image couldn't be prepared. Try a different file.");
  var buf = await blob.arrayBuffer();
  return {
    path: 'media/' + (await hash(buf)) + '.' + ext,
    base64: toBase64(buf),
    type: 'image',
    width: w,
    height: hgt,
    previewUrl: URL.createObjectURL(blob)
  };
}

async function prepareVideo(file) {
  if (file.size > LIMITS.videoBytes) throw new Error('That video is too big (' + mb(file.size) + '). Keep screen recordings under ' + mb(LIMITS.videoBytes) + ', or put longer videos on YouTube.');
  var url = URL.createObjectURL(file);
  var dims = await new Promise(function (resolve) {
    var v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = function () { resolve({ w: v.videoWidth, h: v.videoHeight }); };
    v.onerror = function () { resolve({ w: 0, h: 0 }); };
    v.src = url;
  });
  var buf = await file.arrayBuffer();
  return {
    path: 'media/' + (await hash(buf)) + '.' + (file.type === 'video/webm' ? 'webm' : 'mp4'),
    base64: toBase64(buf),
    type: 'video',
    width: dims.w,
    height: dims.h,
    previewUrl: url
  };
}

function toBlob(canvas, type, quality) {
  return new Promise(function (resolve) { canvas.toBlob(resolve, type, quality); });
}

/* Names files by their content, so the same image is never stored twice. */
async function hash(buf) {
  var digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.prototype.map.call(new Uint8Array(digest).slice(0, 8), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
}

export function toBase64(buf) {
  var bytes = new Uint8Array(buf);
  var out = '';
  for (var i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

export function fromBase64(b64, type) {
  var bin = atob(b64.replace(/\s/g, ''));
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: type });
}

export function mimeFor(path) {
  var ext = path.split('.').pop();
  return { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm' }[ext] || 'application/octet-stream';
}

function mb(bytes) { return Math.round(bytes / 1024 / 1024) + ' MB'; }
