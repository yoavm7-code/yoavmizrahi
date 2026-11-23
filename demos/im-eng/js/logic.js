/* I.M demo: the rules behind the replica. Pure functions, no DOM, so Node can test them.
   The contact form's checks, the project lists and the accessibility text size. */

import { PROJECTS } from './data.js';

/* ---------- Projects ---------- */

export function bySlug(slug) { return PROJECTS.filter(function (p) { return p.slug === slug; })[0] || null; }
export function homeProjects() { return PROJECTS.filter(function (p) { return p.home; }); }

/* The next project in the list, wrapping round, for the link at the end of a project page. */
export function nextProject(slug) {
  var i = PROJECTS.findIndex(function (p) { return p.slug === slug; });
  return PROJECTS[(i + 1) % PROJECTS.length];
}

/* The title split for the two-tone headings: everything but the last word, then the last word. */
export function twoTone(text) {
  var words = String(text).trim().split(/\s+/);
  return [words.slice(0, -1).join(' '), words[words.length - 1]];
}

/* ---------- Contact form ---------- */

/* Israeli numbers: mobile 05X plus 7 digits, landlines 0X plus 7, 07X plus 7. +972 counts as 0. */
export function cleanPhone(value) {
  return String(value || '').replace(/[\s\-().]/g, '').replace(/^\+?972/, '0');
}
export function validPhone(value) { return /^0(5\d|7\d|[2-489])\d{7}$/.test(cleanPhone(value)); }
export function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim()); }

/* Field errors for a lead: name and phone are required; email is optional but must look right. */
export function checkLead(lead) {
  var errors = {};
  if (!String(lead.name || '').trim()) errors.name = 'שדה חובה';
  if (!String(lead.phone || '').trim()) errors.phone = 'שדה חובה';
  else if (!validPhone(lead.phone)) errors.phone = 'מספר טלפון לא תקין';
  if (String(lead.email || '').trim() && !validEmail(lead.email)) errors.email = 'כתובת אימייל לא תקינה';
  return errors;
}

/* The email the real site sends Ido for each lead. The demo shows it but never sends it. */
export function leadEmail(lead) {
  return {
    to: 'Ido@im-eng.co.il',
    subject: 'פנייה חדשה מהאתר – ' + String(lead.name).trim(),
    body: ['שם: ' + String(lead.name).trim(), 'טלפון: ' + cleanPhone(lead.phone), 'אימייל: ' + (String(lead.email || '').trim() || '–'), 'הודעה: ' + (String(lead.message || '').trim() || '–')].join('\n')
  };
}

/* ---------- Accessibility ---------- */

/* Text size moves in 10% steps between 80% and 150%. */
export var TEXT_STEPS = [0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5];
export function textSize(current, step) {
  var i = TEXT_STEPS.indexOf(current);
  if (i === -1) i = TEXT_STEPS.indexOf(1);
  return TEXT_STEPS[Math.max(0, Math.min(TEXT_STEPS.length - 1, i + step))];
}
